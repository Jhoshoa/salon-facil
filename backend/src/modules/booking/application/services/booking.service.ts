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
import { PriceCalculatorService, PriceCalculationResult } from './price-calculator.service';
import { AvailabilityService } from './availability.service';
import { UserRole } from '../../../auth/domain/entities/user.entity';

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
      startTime: string;
      endTime: string;
      guestCount: number;
      specialRequests?: string;
    },
  ): Promise<{ booking: BookingEntity; priceCalculation: PriceCalculationResult }> {
    const venue = await this.venueService.getVenueById(venueId);

    if (dto.guestCount > venue.capacityMax) {
      throw new BadRequestException(
        `El número de invitados (${dto.guestCount}) excede la capacidad máxima del local (${venue.capacityMax})`,
      );
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    const eventDate = new Date(dto.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      throw new BadRequestException('La fecha del evento no puede ser en el pasado');
    }

    const availability = await this.availabilityService.checkAvailability(venueId, eventDate);
    if (!availability.available) {
      throw new ConflictException(availability.reason);
    }

    const priceCalculation = this.priceCalculator.calculate(venue.prices ?? [], eventDate);

    const bookingData: CreateBookingData = {
      venueId,
      clientId,
      eventType: dto.eventType,
      eventDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      guestCount: dto.guestCount,
      basePrice: priceCalculation.basePrice,
      appliedPrice: priceCalculation.appliedPrice,
      totalPrice: priceCalculation.totalPrice,
      depositAmount: priceCalculation.depositAmount,
      specialRequests: dto.specialRequests,
    };

    let booking: BookingEntity;
    try {
      booking = await this.bookingRepository.create(bookingData);
    } catch (error) {
      if (this.isUniqueCalendarBlockError(error)) {
        throw new ConflictException('Fecha no disponible');
      }
      throw error;
    }

    return { booking, priceCalculation };
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
    await this.bookingRepository.deleteCalendarBlockByVenueAndDate(
      booking.venueId,
      booking.eventDate,
    );
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
    await this.bookingRepository.deleteCalendarBlockByVenueAndDate(
      booking.venueId,
      booking.eventDate,
    );
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
    const [bookings, blocks] = await Promise.all([
      this.bookingRepository.findActiveByVenueInRange(venueId, startDate, endDate),
      this.bookingRepository.getCalendarBlocks(venueId, startDate, endDate),
    ]);

    return {
      venueId,
      startDate: this.toDateOnly(startDate),
      endDate: this.toDateOnly(endDate),
      bookings: bookings.map((booking) => ({
        id: booking.id,
        date: this.toDateOnly(booking.eventDate),
        type: 'booking',
        status: booking.status,
        eventType: booking.eventType,
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

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isUniqueCalendarBlockError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
