import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, PriceUnit } from '@prisma/client';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
  CreateBookingData,
  CreateCalendarBlockData,
  ReminderField,
} from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';
import { CalendarBlockEntity } from '../../domain/entities/calendar-block.entity';
import { VenueEntity } from '../../../venue/domain/entities/venue.entity';
import { VenueService } from '../../../venue/application/services/venue.service';
import { PriceCalculatorService, RangePriceCalculationResult } from './price-calculator.service';
import { AvailabilityService } from './availability.service';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { NotificationService } from '../../../notification/application/services/notification.service';

const MAX_CALENDAR_RANGE_DAYS = 120;
const MAX_BOOKING_RANGE_DAYS = 30;

const REMINDER_TIERS: { type: NotificationType; days: number; field: ReminderField }[] = [
  { type: NotificationType.REMINDER_7_DAYS, days: 7, field: 'reminder7SentAt' },
  { type: NotificationType.REMINDER_3_DAYS, days: 3, field: 'reminder3SentAt' },
  { type: NotificationType.REMINDER_1_DAY, days: 1, field: 'reminder1SentAt' },
];

interface DailyScheduleEntry {
  date: string;
  startTime: string;
  endTime: string;
}

interface ResolvedDay {
  date: Date;
  unit: PriceUnit;
  hours?: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly venueService: VenueService,
    private readonly priceCalculator: PriceCalculatorService,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Fire-and-forget: a notification failing to send should never break the booking flow
   * that triggered it (the row still lands in the recipient's in-app inbox either way). */
  private notify(params: Parameters<NotificationService['enqueue']>[0]): void {
    this.notificationService.enqueue(params).catch(() => {});
  }

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
      dailySchedule?: DailyScheduleEntry[];
    },
  ): Promise<{ booking: BookingEntity; priceCalculation: RangePriceCalculationResult }> {
    const venue = await this.venueService.getVenueById(venueId);

    if (dto.guestCount > venue.capacityMax) {
      throw new BadRequestException(
        `El número de invitados (${dto.guestCount}) excede la capacidad máxima del local (${venue.capacityMax})`,
      );
    }

    if (this.timeToMinutes(dto.startTime) >= this.endTimeToMinutes(dto.endTime)) {
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

    const schedule = this.resolveDailySchedule(venue, dates, dto);
    const priceCalculation = this.priceCalculator.calculateRange(
      venue.prices ?? [],
      venue.priceUnit,
      schedule.map((day) => ({ date: day.date, hours: day.hours })),
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
      dailyBreakdown: priceCalculation.days.map((day, index) => ({
        date: new Date(day.date),
        appliedPrice: day.appliedPrice,
        startTime: schedule[index].startTime,
        endTime: schedule[index].endTime,
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

    const ownerContact = await this.venueService.getOwnerContact(venueId);
    if (ownerContact) {
      this.notify({
        userId: ownerContact.id,
        type: NotificationType.BOOKING_REQUEST,
        title: `Nueva solicitud de reserva: ${venue.name}`,
        content: `${dto.eventType} para ${dto.guestCount} invitados, del ${this.toDateOnly(startDate)} al ${this.toDateOnly(endDate)}. Revisala en tu panel de reservas.`,
        recipientEmail: ownerContact.email,
      });
    }

    return { booking, priceCalculation };
  }

  /** Read-only price preview (no availability check, no write) so the client can see the total before submitting. */
  async previewPrice(
    venueId: string,
    dto: {
      eventDate: string;
      endDate?: string;
      startTime: string;
      endTime: string;
      dailySchedule?: DailyScheduleEntry[];
    },
  ): Promise<RangePriceCalculationResult> {
    const venue = await this.venueService.getVenueById(venueId);

    if (this.timeToMinutes(dto.startTime) >= this.endTimeToMinutes(dto.endTime)) {
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

    const schedule = this.resolveDailySchedule(venue, dates, dto);
    return this.priceCalculator.calculateRange(
      venue.prices ?? [],
      venue.priceUnit,
      schedule.map((day) => ({ date: day.date, hours: day.hours })),
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
    const minutes = this.endTimeToMinutes(endTime) - this.timeToMinutes(startTime);
    return Math.round((minutes / 60) * 100) / 100;
  }

  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  /** Same as timeToMinutes, except "00:00" is treated as 24:00 (end of day) — the only sane
   * reading when it appears as an end-of-range value (a closing time or a booking's end time). */
  private endTimeToMinutes(time: string): number {
    return time === '00:00' ? 24 * 60 : this.timeToMinutes(time);
  }

  /**
   * Resolves the effective unit, hours (for HOUR days) and start/end time for every day in
   * the range. Days whose unit resolves to HOUR require a schedule — from `dto.dailySchedule`
   * if the client sent one (validated to cover exactly those days, see below), otherwise the
   * booking's global startTime/endTime is used for all of them (single-day bookings, and
   * multi-day bookings where every HOUR day shares the same time, never need to send one).
   * DAY/EVENT days use the venue's opening hours for that weekday as an informative time
   * range (never affects price); if the venue hasn't configured hours for that weekday, the
   * global startTime/endTime is used as a fallback so the day still has *some* recorded time.
   */
  private resolveDailySchedule(
    venue: VenueEntity,
    dates: Date[],
    dto: { startTime: string; endTime: string; dailySchedule?: DailyScheduleEntry[] },
  ): ResolvedDay[] {
    const prices = venue.prices ?? [];
    const openingByWeekday = new Map((venue.openingHours ?? []).map((h) => [h.dayOfWeek, h]));
    const scheduleByDate = new Map((dto.dailySchedule ?? []).map((entry) => [entry.date, entry]));

    if (dto.dailySchedule) {
      const hourDateKeys = new Set(
        dates
          .filter(
            (date) =>
              this.priceCalculator.resolveUnitForDate(prices, date, venue.priceUnit) ===
              PriceUnit.HOUR,
          )
          .map((date) => this.toDateOnly(date)),
      );
      const providedKeys = dto.dailySchedule.map((entry) => entry.date);
      const duplicates = providedKeys.filter((key, index) => providedKeys.indexOf(key) !== index);
      if (duplicates.length > 0) {
        throw new BadRequestException(
          `Horario duplicado para: ${[...new Set(duplicates)].join(', ')}`,
        );
      }
      const providedSet = new Set(providedKeys);
      const missing = [...hourDateKeys].filter((key) => !providedSet.has(key));
      const extra = providedKeys.filter((key) => !hourDateKeys.has(key));
      if (missing.length > 0) {
        throw new BadRequestException(`Falta el horario para: ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        throw new BadRequestException(
          `Se envio horario para dias que no lo necesitan o fuera del rango: ${extra.join(', ')}`,
        );
      }
    }

    return dates.map((date) => {
      const dateKey = this.toDateOnly(date);
      const unit = this.priceCalculator.resolveUnitForDate(prices, date, venue.priceUnit);
      const opening = openingByWeekday.get(date.getUTCDay());

      if (unit === PriceUnit.HOUR) {
        const entry = scheduleByDate.get(dateKey) ?? {
          startTime: dto.startTime,
          endTime: dto.endTime,
        };
        if (!opening || opening.isClosed) {
          throw new BadRequestException(`El local esta cerrado el ${dateKey}`);
        }
        // "00:00" as a closing/end time means "open until midnight" (end of day), not "closes
        // right at the start of the day" — compare in minutes-since-midnight with that one
        // value promoted to 24:00 so it always reads as the *latest* possible time, not the
        // earliest. Only applies to end-of-range values (closesAt / entry.endTime); a start
        // time of "00:00" is genuinely midnight and needs no such treatment.
        const startMinutes = this.timeToMinutes(entry.startTime);
        const endMinutes = this.endTimeToMinutes(entry.endTime);
        const opensMinutes = this.timeToMinutes(opening.opensAt);
        const closesMinutes = this.endTimeToMinutes(opening.closesAt);

        if (startMinutes >= endMinutes) {
          throw new BadRequestException(
            `La hora de inicio debe ser anterior a la de fin (${dateKey})`,
          );
        }
        if (startMinutes < opensMinutes || endMinutes > closesMinutes) {
          throw new BadRequestException(
            `El ${dateKey} el local abre de ${opening.opensAt} a ${opening.closesAt}`,
          );
        }
        return {
          date,
          unit,
          hours: this.computeHoursBetween(entry.startTime, entry.endTime),
          startTime: entry.startTime,
          endTime: entry.endTime,
        };
      }

      const startTime = opening && !opening.isClosed ? opening.opensAt : dto.startTime;
      const endTime = opening && !opening.isClosed ? opening.closesAt : dto.endTime;
      return { date, unit, startTime, endTime };
    });
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

    const updated = await this.bookingRepository.updateStatus(bookingId, BookingStatus.APPROVED);
    if (booking.client) {
      this.notify({
        userId: booking.client.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `Tu reserva en ${venue.name} fue aprobada`,
        content: `El propietario aprobo tu solicitud para el ${this.toDateOnly(booking.eventDate)}. Ya podes subir el comprobante de la sena desde "Mis reservas".`,
        recipientEmail: booking.client.email,
      });
    }
    return updated;
  }

  async rejectBooking(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
    reason?: string,
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

    if (booking.client) {
      this.notify({
        userId: booking.client.id,
        type: NotificationType.BOOKING_CANCELLED,
        title: `Tu reserva en ${venue.name} fue rechazada`,
        content: reason
          ? `El propietario rechazo tu solicitud del ${this.toDateOnly(booking.eventDate)}. Motivo: ${reason}`
          : `El propietario rechazo tu solicitud del ${this.toDateOnly(booking.eventDate)}.`,
        recipientEmail: booking.client.email,
      });
    }
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

    const ownerContact = await this.venueService.getOwnerContact(booking.venueId);
    if (ownerContact) {
      const venueName = booking.venue?.name ?? 'tu local';
      this.notify({
        userId: ownerContact.id,
        type: NotificationType.BOOKING_CANCELLED,
        title: `Reserva cancelada en ${venueName}`,
        content: `El cliente cancelo su reserva del ${this.toDateOnly(booking.eventDate)}. Las fechas quedaron liberadas en tu calendario.`,
        recipientEmail: ownerContact.email,
      });
    }
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

    const updated = await this.bookingRepository.updateStatus(bookingId, BookingStatus.COMPLETED);
    if (booking.client) {
      const venueName = booking.venue?.name ?? 'el local';
      this.notify({
        userId: booking.client.id,
        type: NotificationType.REVIEW_REQUEST,
        title: `¿Que tal estuvo tu evento en ${venueName}?`,
        content: 'Contanos tu experiencia — tu resena ayuda a otros a elegir mejor.',
        recipientEmail: booking.client.email,
      });
    }
    return updated;
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

  /** Called once a day by BookingReminderScheduler. Finds confirmed bookings whose event is
   * exactly 7, 3, or 1 day(s) away and haven't had that tier's reminder sent yet, notifies
   * each client, and marks the tier as sent so a re-run (or a slow day) never double-sends.
   * Returns how many reminders went out, purely for the scheduler's log line. */
  async sendDueReminders(): Promise<number> {
    let sentCount = 0;

    for (const tier of REMINDER_TIERS) {
      const targetDate = this.addUtcDays(new Date(), tier.days);
      const bookings = await this.bookingRepository.findBookingsDueForReminder(
        targetDate,
        tier.field,
      );

      for (const booking of bookings) {
        if (booking.client) {
          const venueName = booking.venue?.name ?? 'tu local';
          this.notify({
            userId: booking.clientId,
            type: tier.type,
            title: `Tu evento en ${venueName} es en ${tier.days} dia${tier.days === 1 ? '' : 's'}`,
            content: `Recordatorio: tu reserva "${booking.eventType}" en ${venueName} es el ${this.toDateOnly(booking.eventDate)}. Prepara todo para tu evento.`,
            recipientEmail: booking.client.email,
          });
        }

        await this.bookingRepository.markReminderSent(booking.id, tier.field);
        sentCount++;
      }
    }

    return sentCount;
  }

  private addUtcDays(date: Date, days: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
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
