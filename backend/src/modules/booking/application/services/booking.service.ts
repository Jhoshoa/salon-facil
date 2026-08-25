import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
  CreateBookingData,
  CreateCalendarBlockData,
} from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';
import { CalendarBlockEntity } from '../../domain/entities/calendar-block.entity';
import { VenueService } from '../../../venue/application/services/venue.service';
import { PriceCalculatorService, RangePriceCalculationResult } from './price-calculator.service';
import { AvailabilityService } from './availability.service';
import { UserRole } from '../../../auth/domain/entities/user.entity';

const MAX_CALENDAR_RANGE_DAYS = 120;
const MAX_BOOKING_RANGE_DAYS = 30;

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly venueService: VenueService,
    private readonly priceCalculator: PriceCalculatorService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async requestBooking(
    venueId: string,
    clientId: string,
    dto: {
      eventType: string;
      eventDate: string;
      endDate?: string;
      startTime: string;
      endTime: string;
      guestCount: number;
      specialRequests?: string;
    },
  ): Promise<{ booking: BookingEntity; priceCalculation: RangePriceCalculationResult }> {
    const venue = await this.venueService.getVenueById(venueId);

    if (dto.guestCount > venue.capacityMax) {
      throw new BadRequestException(
        `El número de invitados (${dto.guestCount}) excede la capacidad máxima del local (${venue.capacityMax})`,
      );
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    const startDate = new Date(dto.eventDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : startDate;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Fecha invalida');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      throw new BadRequestException('La fecha del evento no puede ser en el pasado');
    }
    if (endDate < startDate) {
      throw new BadRequestException('La fecha de fin debe ser igual o posterior a la de inicio');
    }

    const isMultiDay = endDate.getTime() !== startDate.getTime();
    if (isMultiDay && !venue.allowsMultipleDays) {
      throw new BadRequestException('Este local no permite reservas de mas de un dia');
    }

    const dates = this.buildDateSequence(startDate, endDate);
    if (dates.length > MAX_BOOKING_RANGE_DAYS) {
      throw new BadRequestException(
        `El rango de la reserva no puede superar los ${MAX_BOOKING_RANGE_DAYS} dias`,
      );
    }

    const [bookedDates, blockedDates] = await Promise.all([
      this.bookingRepository.findBookedDatesInRange(venueId, startDate, endDate),
      this.bookingRepository.getCalendarBlocks(venueId, startDate, endDate),
    ]);
    if (bookedDates.length > 0) {
      throw new ConflictException(
        `Las siguientes fechas ya estan reservadas: ${bookedDates.join(', ')}`,
      );
    }
    if (blockedDates.length > 0) {
      throw new ConflictException(
        `Las siguientes fechas estan bloqueadas por el propietario: ${blockedDates
          .map((block) => this.toDateOnly(block.date))
          .join(', ')}`,
      );
    }

    const hoursPerDay = this.computeHoursBetween(dto.startTime, dto.endTime);
    const priceCalculation = this.priceCalculator.calculateRange(
      venue.prices ?? [],
      dates,
      venue.priceUnit,
      hoursPerDay,
    );

    const bookingData: CreateBookingData = {
      venueId,
      clientId,
      eventType: dto.eventType,
      startDate,
      endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      guestCount: dto.guestCount,
      basePrice: priceCalculation.basePrice,
      appliedPrice: priceCalculation.appliedPrice,
      totalPrice: priceCalculation.totalPrice,
      depositAmount: priceCalculation.depositAmount,
      specialRequests: dto.specialRequests,
      dailyBreakdown: priceCalculation.days.map((day) => ({
        date: new Date(day.date),
        appliedPrice: day.appliedPrice,
      })),
    };

    let booking: BookingEntity;
    try {
      booking = await this.bookingRepository.create(bookingData);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Una o mas fechas de este rango ya no estan disponibles. Elegi otro rango.',
        );
      }
      throw error;
    }

    return { booking, priceCalculation };
  }

  /** Read-only price preview (no availability check, no write) so the client can see the total before submitting. */
  async previewPrice(
    venueId: string,
    dto: { eventDate: string; endDate?: string; startTime: string; endTime: string },
  ): Promise<RangePriceCalculationResult> {
    const venue = await this.venueService.getVenueById(venueId);

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    const startDate = new Date(dto.eventDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : startDate;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Fecha invalida');
    }
    if (endDate < startDate) {
      throw new BadRequestException('La fecha de fin debe ser igual o posterior a la de inicio');
    }

    const dates = this.buildDateSequence(startDate, endDate);
    if (dates.length > MAX_BOOKING_RANGE_DAYS) {
      throw new BadRequestException(
        `El rango de la reserva no puede superar los ${MAX_BOOKING_RANGE_DAYS} dias`,
      );
    }

    const hoursPerDay = this.computeHoursBetween(dto.startTime, dto.endTime);
    return this.priceCalculator.calculateRange(
      venue.prices ?? [],
      dates,
      venue.priceUnit,
      hoursPerDay,
    );
  }

  /** Calendar-day sequence from start to end, inclusive. */
  private buildDateSequence(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  private computeHoursBetween(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    return Math.round((minutes / 60) * 100) / 100;
  }

  async getBookingById(id: string, userId?: string, userRole?: UserRole): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${id}' no encontrada`);
    }

    if (userId && userRole) {
      const isClient = booking.clientId === userId;
      const venue = await this.venueService.getVenueById(booking.venueId);

      if (!isClient && !venue.canBeEditedBy(userId, userRole)) {
        throw new ForbiddenException('No tienes permiso para ver esta reserva');
      }
    }

    return booking;
  }

  async getMyBookings(clientId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.findByClient(clientId);
  }

  async getVenueBookings(
    venueId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<BookingEntity[]> {
    const venue = await this.venueService.getVenueById(venueId);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para ver las reservas de este local');
    }

    return this.bookingRepository.findByVenue(venueId);
  }

  async approveBooking(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (!booking.canBeApproved()) {
      throw new BadRequestException('Esta reserva no puede ser aprobada');
    }

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para aprobar esta reserva');
    }

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.APPROVED);
  }

  async rejectBooking(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
    _reason?: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar reservas pendientes');
    }

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para rechazar esta reserva');
    }

    const updated = await this.bookingRepository.updateStatus(
      bookingId,
      BookingStatus.CANCELLED_BY_OWNER,
    );
    await this.bookingRepository.deleteBookingDatesByBookingId(bookingId);
    return updated;
  }

  async cancelBookingByClient(bookingId: string, clientId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('No puedes cancelar una reserva que no es tuya');
    }

    if (!booking.canBeCancelledByClient()) {
      throw new BadRequestException(
        'Esta reserva no puede ser cancelada. Solo se pueden cancelar reservas pendientes o aprobadas.',
      );
    }

    const updated = await this.bookingRepository.updateStatus(
      bookingId,
      BookingStatus.CANCELLED_BY_CLIENT,
    );
    await this.bookingRepository.deleteBookingDatesByBookingId(bookingId);
    return updated;
  }

  async markDepositPaid(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Solo se puede registrar seña en reservas aprobadas');
    }

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para registrar la seña de esta reserva');
    }

    return this.bookingRepository.markDepositPaid(bookingId);
  }

  async markAsCompleted(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (!booking.canBeCompleted()) {
      throw new BadRequestException('Esta reserva no puede ser marcada como completada');
    }

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.COMPLETED);
  }

  async markAsNoShow(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Solo se puede marcar como no show reservas aprobadas');
    }

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.NO_SHOW);
  }

  // Calendar Block methods
  async createCalendarBlock(
    venueId: string,
    data: Omit<CreateCalendarBlockData, 'venueId'>,
    userId: string,
    userRole: UserRole,
  ): Promise<CalendarBlockEntity> {
    const venue = await this.venueService.getVenueById(venueId);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para bloquear este local');
    }

    const isBlocked = await this.bookingRepository.isDateBlocked(venueId, data.date);
    if (isBlocked) {
      throw new ConflictException('Esta fecha ya está bloqueada');
    }

    const hasBooking = await this.bookingRepository.hasConflict(venueId, data.date);
    if (hasBooking) {
      throw new ConflictException('No se puede bloquear una fecha con una reserva activa');
    }

    return this.bookingRepository.createCalendarBlock({ ...data, venueId });
  }

  async getCalendarBlocks(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarBlockEntity[]> {
    return this.bookingRepository.getCalendarBlocks(venueId, startDate, endDate);
  }

  async getCalendar(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    venueId: string;
    startDate: string;
    endDate: string;
    bookings: {
      id: string;
      date: string;
      type: 'booking';
      status: BookingStatus;
      eventType: string;
    }[];
    blocks: {
      id: string;
      date: string;
      type: 'block';
      reason: string | null;
    }[];
  }> {
    this.validateCalendarRange(startDate, endDate);

    const [bookings, blocks] = await Promise.all([
      this.bookingRepository.findActiveByVenueInRange(venueId, startDate, endDate),
      this.bookingRepository.getCalendarBlocks(venueId, startDate, endDate),
    ]);

    return {
      venueId,
      startDate: this.toDateOnly(startDate),
      endDate: this.toDateOnly(endDate),
      bookings: bookings.map((entry) => ({
        id: entry.bookingId,
        date: this.toDateOnly(entry.date),
        type: 'booking',
        status: entry.status,
        eventType: entry.eventType,
      })),
      blocks: blocks.map((block) => ({
        id: block.id,
        date: this.toDateOnly(block.date),
        type: 'block',
        reason: block.reason,
      })),
    };
  }

  async deleteCalendarBlock(blockId: string, userId: string, userRole: UserRole): Promise<void> {
    const block = await this.bookingRepository.findCalendarBlockById(blockId);

    if (!block) {
      throw new NotFoundException(`Bloqueo con ID '${blockId}' no encontrado`);
    }

    const venue = await this.venueService.getVenueById(block.venueId);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para eliminar este bloqueo');
    }

    await this.bookingRepository.deleteCalendarBlock(blockId);
  }

  async checkAvailability(venueId: string, eventDate: Date) {
    return this.availabilityService.checkAvailability(venueId, eventDate);
  }

  async checkAvailabilityRange(venueId: string, startDate: Date, endDate: Date) {
    this.validateCalendarRange(startDate, endDate);
    return this.availabilityService.checkAvailabilityRange(venueId, startDate, endDate);
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private validateCalendarRange(startDate: Date, endDate: Date): void {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Rango de fechas invalido');
    }

    if (endDate < startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    const rangeDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > MAX_CALENDAR_RANGE_DAYS) {
      throw new BadRequestException(
        `El rango de fechas no puede superar los ${MAX_CALENDAR_RANGE_DAYS} dias`,
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
