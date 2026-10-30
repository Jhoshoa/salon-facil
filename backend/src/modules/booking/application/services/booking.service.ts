import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CalendarBlockStatus,
  NotificationType,
  PriceUnit,
  RentalItemChargeBasis,
} from '@prisma/client';
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
import type { SelectedExtra, SelectedRentalItem } from '../../domain/entities/booking.entity';
import { VenueService } from '../../../venue/application/services/venue.service';
import {
  PriceCalculatorService,
  RangePriceCalculationResult,
} from '../../../venue/application/services/price-calculator.service';
import { AvailabilityService } from './availability.service';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { NotificationService } from '../../../notification/application/services/notification.service';
import type { NotificationEmailMetadata } from '../../../notification/infrastructure/templates/notification-email.templates';

const MAX_CALENDAR_RANGE_DAYS = 120;
const MAX_BOOKING_RANGE_DAYS = 30;
// Booking.totalPrice is Decimal(12, 2): anything above this would make the insert fail.
const MAX_BOOKING_TOTAL = 9999999999.99;

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

interface RentalItemSelectionEntry {
  rentalItemId: string;
  quantity: number;
}

/** The date-based price calculation plus whatever extra-cost amenities and catalog items the
 * client picked — `totalPrice`/`depositAmount` here already include `extrasTotal` and
 * `rentalItemsTotal`, unlike the raw calculator result. */
export interface BookingPriceResult extends RangePriceCalculationResult {
  extras: SelectedExtra[];
  extrasTotal: number;
  rentalItems: SelectedRentalItem[];
  rentalItemsTotal: number;
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
      selectedAmenityIds?: string[];
      selectedRentalItems?: RentalItemSelectionEntry[];
    },
  ): Promise<{ booking: BookingEntity; priceCalculation: BookingPriceResult }> {
    const venue = await this.venueService.getVenueById(venueId);

    // Draft/pending/inactive venues aren't meant to take real bookings yet -- this is the same
    // bar the public slug lookup already uses (see VenueEntity.isPublic / getVenueBySlug), just
    // enforced here too. Without it, anyone who learns a non-public venue's id (an owner-invite
    // or share-preview link, for instance -- both intentionally expose it to someone who isn't
    // the owner yet) could submit a real PENDING booking against it.
    if (!venue.isPublic()) {
      throw new ForbiddenException('Este local todavia no esta disponible para reservas');
    }

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
    const rangeCalculation = this.priceCalculator.calculateRange(
      venue.prices ?? [],
      venue.priceUnit,
      schedule.map((day) => ({ date: day.date, hours: day.hours })),
      venue.paymentPolicy,
      venue.depositPercentage,
    );
    const rentalItems = await this.resolveSelectedRentalItems(
      venueId,
      dto.selectedRentalItems,
      dates.length,
    );
    const priceCalculation = this.applySelectedExtras(
      venue,
      dto.selectedAmenityIds,
      rentalItems,
      rangeCalculation,
    );

    // Si el local tiene reserva inmediata activada, la solicitud nace ya aprobada -- el cliente
    // pasa directo a pagar, sin esperar que el propietario la revise a mano. No cambia nada de
    // la validacion de disponibilidad ni del calculo de precio de arriba, solo el estado inicial.
    // La excepcion son los items del catalogo: su stock no se controla por fecha, asi que alguien
    // tiene que confirmar que estan libres ese dia antes de que el cliente pague por ellos.
    const initialStatus =
      venue.instantBooking && rentalItems.length === 0
        ? BookingStatus.APPROVED
        : BookingStatus.PENDING;

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
      status: initialStatus,
      specialRequests: dto.specialRequests,
      selectedExtras: priceCalculation.extras.length ? priceCalculation.extras : undefined,
      selectedRentalItems: rentalItems.length ? rentalItems : undefined,
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
        title:
          initialStatus === BookingStatus.APPROVED
            ? `Reserva confirmada: ${venue.name}`
            : `Nueva solicitud de reserva: ${venue.name}`,
        content:
          initialStatus === BookingStatus.APPROVED
            ? `${dto.eventType} para ${dto.guestCount} invitados, del ${this.toDateOnly(startDate)} al ${this.toDateOnly(endDate)}. Se confirmo automaticamente porque tenes activada la reserva inmediata.`
            : `${dto.eventType} para ${dto.guestCount} invitados, del ${this.toDateOnly(startDate)} al ${this.toDateOnly(endDate)}.${
                rentalItems.length
                  ? ` Incluye items del catalogo: confirma que los tenes disponibles para esa fecha.`
                  : ''
              } Revisala en tu panel de reservas.`,
        recipientEmail: ownerContact.email,
        metadata: {
          kind: 'bookingRequest',
          venueName: venue.name,
          eventType: dto.eventType,
          guestCount: dto.guestCount,
          startDate: this.toDateOnly(startDate),
          endDate: this.toDateOnly(endDate),
          autoConfirmed: initialStatus === BookingStatus.APPROVED,
          rentalItemCount: rentalItems.length,
        } satisfies NotificationEmailMetadata,
      });
    }

    // En reserva inmediata no hay paso de "aprobar" que dispare la notificacion de siempre
    // (approveBooking) -- se la mandamos aca para que el cliente sepa igual que ya puede pagar.
    if (initialStatus === BookingStatus.APPROVED && booking.client) {
      this.notify({
        userId: booking.client.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `Tu reserva en ${venue.name} fue confirmada`,
        content: `Este local confirma sus reservas al instante. Ya podes subir el comprobante del anticipo desde "Mis reservas".`,
        recipientEmail: booking.client.email,
        metadata: {
          kind: 'bookingConfirmed',
          variant: 'instant',
          venueName: venue.name,
          eventDate: this.toDateOnly(startDate),
          bookingId: booking.id,
        } satisfies NotificationEmailMetadata,
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
      selectedAmenityIds?: string[];
      selectedRentalItems?: RentalItemSelectionEntry[];
    },
  ): Promise<BookingPriceResult> {
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
    const rangeCalculation = this.priceCalculator.calculateRange(
      venue.prices ?? [],
      venue.priceUnit,
      schedule.map((day) => ({ date: day.date, hours: day.hours })),
      venue.paymentPolicy,
      venue.depositPercentage,
    );
    const rentalItems = await this.resolveSelectedRentalItems(
      venueId,
      dto.selectedRentalItems,
      dates.length,
    );
    return this.applySelectedExtras(venue, dto.selectedAmenityIds, rentalItems, rangeCalculation);
  }

  /** Turns the client's catalog selection into the snapshot that gets priced and persisted, using
   * the current price from the database -- never one sent by the client. Stricter than the amenity
   * handling below: dropping an item silently would leave a client believing they had requested
   * something the owner never sees, so a stale selection is an error the form can show. Stock is
   * the venue's total, not what's free on that date, so going over it can never be fulfilled;
   * staying under it is still only an estimate the owner has to confirm. The owner decides per item
   * whether a booking of several days pays for each day or once for the whole event. */
  private async resolveSelectedRentalItems(
    venueId: string,
    selection: RentalItemSelectionEntry[] | undefined,
    bookingDays: number,
  ): Promise<SelectedRentalItem[]> {
    if (!selection?.length) return [];

    const selectedIds = selection.map((entry) => entry.rentalItemId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new BadRequestException('Hay items repetidos en tu seleccion');
    }

    const available = new Map(
      (await this.venueService.listPublicRentalItems(venueId)).map((item) => [item.id, item]),
    );

    return selection.map(({ rentalItemId, quantity }) => {
      const item = available.get(rentalItemId);
      // No stock means an older item the owner hasn't completed: there's nothing to check against.
      if (!item || item.isIncluded || item.pricePerUnit === null || item.stockQty === null) {
        throw new BadRequestException(
          'Uno de los items que elegiste ya no esta disponible. Actualiza tu seleccion.',
        );
      }
      if (quantity > item.stockQty) {
        throw new BadRequestException(
          `El local tiene ${item.stockQty} en total de "${item.name}" y pediste ${quantity}`,
        );
      }
      const billedDays = item.chargeBasis === RentalItemChargeBasis.PER_DAY ? bookingDays : 1;
      return {
        rentalItemId: item.id,
        name: item.name,
        unitLabel: item.unitLabel,
        unitPrice: item.pricePerUnit,
        quantity,
        chargeBasis: item.chargeBasis,
        billedDays,
        subtotal: this.round(item.pricePerUnit * quantity * billedDays),
      };
    });
  }

  /** Folds the client's selected extra-cost amenities and catalog items into a date-based price
   * result: sums them into `totalPrice`/`depositAmount` and attaches the amenity snapshot that
   * gets persisted on the booking. Silently drops any amenity id that isn't an extra-cost amenity
   * on this venue (already included, or not this venue's at all) — same lenient handling the rest
   * of this flow already gives stale/foreign input, rather than erroring on it. */
  private applySelectedExtras(
    venue: VenueEntity,
    selectedAmenityIds: string[] | undefined,
    rentalItems: SelectedRentalItem[],
    priceCalculation: RangePriceCalculationResult,
  ): BookingPriceResult {
    const selectedIds = new Set(selectedAmenityIds ?? []);
    const extras: SelectedExtra[] = (venue.amenities ?? [])
      .filter((item) => !item.isIncluded && selectedIds.has(item.amenity.id))
      .map((item) => ({
        amenityId: item.amenity.id,
        name: item.amenity.name,
        extraCost: item.extraCost ?? 0,
      }));

    const extrasTotal = this.round(extras.reduce((sum, extra) => sum + extra.extraCost, 0));
    const rentalItemsTotal = this.round(rentalItems.reduce((sum, item) => sum + item.subtotal, 0));
    const totalPrice = this.round(priceCalculation.totalPrice + extrasTotal + rentalItemsTotal);
    if (totalPrice > MAX_BOOKING_TOTAL) {
      throw new BadRequestException('El total de la reserva excede el maximo permitido');
    }
    const depositAmount = this.priceCalculator.resolveDeposit(
      venue.paymentPolicy,
      venue.depositPercentage,
      totalPrice,
    );

    return {
      ...priceCalculation,
      totalPrice,
      depositAmount,
      extras,
      extrasTotal,
      rentalItems,
      rentalItemsTotal,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
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

  async getAllBookingsForAdmin(dto: {
    search?: string;
    status?: BookingStatus;
    venueId?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }): Promise<{
    data: BookingEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { items, total } = await this.bookingRepository.findAllForAdmin({
      search: dto.search,
      status: dto.status,
      venueId: dto.venueId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      page: dto.page,
      limit: dto.limit,
    });

    return {
      data: items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
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

  // Mirrors PaymentService.getPendingOwnerPayments: an ADMIN's own id never matches any
  // venue's ownerId, so ADMIN gets the platform-wide pending queue instead of an owner-scoped one.
  async getPendingOwnerBookingsCount(ownerId: string, userRole: UserRole): Promise<number> {
    if (userRole === UserRole.ADMIN) {
      return this.bookingRepository.countAllPending();
    }
    return this.bookingRepository.countPendingByOwner(ownerId);
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

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para aprobar esta reserva');
    }

    if (!booking.canBeApproved()) {
      throw new BadRequestException('Esta reserva no puede ser aprobada');
    }

    const updated = await this.bookingRepository.updateStatus(bookingId, BookingStatus.APPROVED);
    if (booking.client) {
      this.notify({
        userId: booking.client.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `Tu reserva en ${venue.name} fue aprobada`,
        content: `El propietario aprobo tu solicitud para el ${this.toDateOnly(booking.eventDate)}. Ya podes subir el comprobante del anticipo desde "Mis reservas".`,
        recipientEmail: booking.client.email,
        metadata: {
          kind: 'bookingConfirmed',
          variant: 'approved',
          venueName: venue.name,
          eventDate: this.toDateOnly(booking.eventDate),
          bookingId: booking.id,
        } satisfies NotificationEmailMetadata,
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

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para rechazar esta reserva');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar reservas pendientes');
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
        metadata: {
          kind: 'bookingCancelled',
          variant: 'rejectedByOwner',
          venueName: venue.name,
          eventDate: this.toDateOnly(booking.eventDate),
          reason,
        } satisfies NotificationEmailMetadata,
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
        metadata: {
          kind: 'bookingCancelled',
          variant: 'cancelledByClient',
          venueName,
          eventDate: this.toDateOnly(booking.eventDate),
        } satisfies NotificationEmailMetadata,
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

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para registrar el anticipo de esta reserva');
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Solo se puede registrar el anticipo en reservas aprobadas');
    }

    return this.bookingRepository.markDepositPaid(bookingId);
  }

  async markAsCompleted(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para completar esta reserva');
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
        content: 'Contanos tu experiencia — tu reseña ayuda a otros a elegir mejor.',
        recipientEmail: booking.client.email,
        metadata: {
          kind: 'reviewRequest',
          venueName,
          bookingId: booking.id,
        } satisfies NotificationEmailMetadata,
      });
    }
    return updated;
  }

  async markAsNoShow(
    bookingId: string,
    venueOwnerId: string,
    userRole: UserRole,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    const venue = await this.venueService.getVenueById(booking.venueId);
    if (!venue.canBeEditedBy(venueOwnerId, userRole)) {
      throw new ForbiddenException('No tienes permiso para marcar esta reserva como no show');
    }

    if (!booking.canBeMarkedNoShow()) {
      throw new BadRequestException(
        'Solo se puede marcar como no show reservas aprobadas o con pago registrado',
      );
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

    // The dropdown only ever offers the venue's own "Ideal para" use types -- a useTypeId from
    // anywhere else means either a stale selection (the venue's uses changed after the form
    // loaded) or a client bypassing the UI, neither of which should silently get attached to a
    // use type this venue doesn't actually claim to host.
    if (data.useTypeId && !venue.uses?.some((use) => use.useTypeId === data.useTypeId)) {
      throw new BadRequestException('Ese tipo de evento no esta configurado para este local');
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
      status: CalendarBlockStatus;
      useTypeId: string | null;
      useTypeName: string | null;
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
        status: block.status,
        useTypeId: block.useTypeId,
        useTypeName: block.useType?.name ?? null,
        reason: block.reason,
      })),
    };
  }

  async updateCalendarBlock(
    blockId: string,
    data: { status: CalendarBlockStatus; useTypeId?: string },
    userId: string,
    userRole: UserRole,
  ): Promise<CalendarBlockEntity> {
    const block = await this.bookingRepository.findCalendarBlockById(blockId);
    if (!block) {
      throw new NotFoundException(`Fecha marcada con ID '${blockId}' no encontrada`);
    }

    const venue = await this.venueService.getVenueById(block.venueId);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar esta fecha');
    }

    // Same rule as creating a block -- the dropdown only ever offers this venue's own "Ideal
    // para" use types, so anything else means a stale selection or a client bypassing the UI.
    if (data.useTypeId && !venue.uses?.some((use) => use.useTypeId === data.useTypeId)) {
      throw new BadRequestException('Ese tipo de evento no esta configurado para este local');
    }

    return this.bookingRepository.updateCalendarBlock(blockId, data);
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
            metadata: {
              kind: 'reminder',
              venueName,
              eventType: booking.eventType,
              eventDate: this.toDateOnly(booking.eventDate),
              days: tier.days,
              bookingId: booking.id,
            } satisfies NotificationEmailMetadata,
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
