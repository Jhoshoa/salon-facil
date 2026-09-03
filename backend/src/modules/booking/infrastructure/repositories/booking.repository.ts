import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IBookingRepository,
  CreateBookingData,
  CreateCalendarBlockData,
  OccupiedDateEntry,
  ReminderField,
} from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';
import { CalendarBlockEntity } from '../../domain/entities/calendar-block.entity';
import { Prisma } from '@prisma/client';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.DEPOSIT_PAID,
  BookingStatus.FULLY_PAID,
];

// PENDING excluded on purpose — an owner hasn't approved it yet, so it's not a confirmed
// event to remind the client about.
const CONFIRMED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.APPROVED,
  BookingStatus.DEPOSIT_PAID,
  BookingStatus.FULLY_PAID,
];

const BOOKING_INCLUDE = {
  venue: {
    select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
  },
  client: {
    select: { id: true, fullName: true, email: true, phone: true },
  },
  payments: true,
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: BOOKING_INCLUDE,
    });
    return booking ? this.toEntity(booking) : null;
  }

  async findByVenueAndDate(venueId: string, eventDate: Date): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        venueId,
        eventDate,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      include: BOOKING_INCLUDE,
    });
    return booking ? this.toEntity(booking) : null;
  }

  async findByClient(clientId: string): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { clientId },
      include: {
        venue: {
          select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async findByVenue(venueId: string): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { venueId },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
      orderBy: { eventDate: 'asc' },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async findActiveByVenueInRange(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OccupiedDateEntry[]> {
    const rows = await this.prisma.bookingDate.findMany({
      where: {
        venueId,
        date: { gte: startDate, lte: endDate },
        booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
      },
      include: {
        booking: { select: { id: true, status: true, eventType: true } },
      },
      orderBy: { date: 'asc' },
    });

    return rows.map((row) => ({
      bookingId: row.booking.id,
      date: row.date,
      status: row.booking.status as BookingStatus,
      eventType: row.booking.eventType,
    }));
  }

  async findBookedDatesInRange(venueId: string, startDate: Date, endDate: Date): Promise<string[]> {
    const rows = await this.prisma.bookingDate.findMany({
      where: {
        venueId,
        date: { gte: startDate, lte: endDate },
        booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
      },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => row.date.toISOString().split('T')[0]);
  }

  async findByVenueAndStatus(venueId: string, status: BookingStatus): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { venueId, status },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
      orderBy: { eventDate: 'asc' },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async create(data: CreateBookingData): Promise<BookingEntity> {
    const startTime = this.timeToDate(data.startTime);
    const endTime = this.timeToDate(data.endTime);

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          venueId: data.venueId,
          clientId: data.clientId,
          eventType: data.eventType,
          eventDate: data.startDate,
          endDate: data.endDate,
          startTime,
          endTime,
          guestCount: data.guestCount,
          basePrice: new Prisma.Decimal(data.basePrice),
          appliedPrice: new Prisma.Decimal(data.appliedPrice),
          totalPrice: new Prisma.Decimal(data.totalPrice),
          depositAmount: new Prisma.Decimal(data.depositAmount),
          specialRequests: data.specialRequests,
        },
      });

      // One row per day; the (venueId, date) unique constraint is what actually
      // prevents a double booking under concurrent requests — this insert either
      // succeeds for every day atomically or the whole transaction rolls back.
      // Each day carries its own start/end time (a DAY-unit day uses the venue's opening
      // hours, an HOUR-unit day uses whatever the client picked for that specific day).
      await tx.bookingDate.createMany({
        data: data.dailyBreakdown.map((day) => ({
          bookingId: created.id,
          venueId: data.venueId,
          date: day.date,
          startTime: this.timeToDate(day.startTime),
          endTime: this.timeToDate(day.endTime),
          appliedPrice: new Prisma.Decimal(day.appliedPrice),
        })),
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: created.id },
        include: BOOKING_INCLUDE,
      });
    });
    return this.toEntity(booking);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingEntity> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: BOOKING_INCLUDE,
    });
    return this.toEntity(booking);
  }

  async markDepositPaid(id: string): Promise<BookingEntity> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.DEPOSIT_PAID,
        depositPaid: true,
      },
      include: BOOKING_INCLUDE,
    });
    return this.toEntity(booking);
  }

  async hasConflict(venueId: string, eventDate: Date, excludeBookingId?: string): Promise<boolean> {
    const where: Prisma.BookingDateWhereInput = {
      venueId,
      date: eventDate,
      booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
    };

    if (excludeBookingId) {
      where.bookingId = { not: excludeBookingId };
    }

    const count = await this.prisma.bookingDate.count({ where });
    return count > 0;
  }

  private timeToDate(value: string): Date {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  async deleteBookingDatesByBookingId(bookingId: string): Promise<void> {
    await this.prisma.bookingDate.deleteMany({ where: { bookingId } });
  }

  async createCalendarBlock(data: CreateCalendarBlockData): Promise<CalendarBlockEntity> {
    const block = await this.prisma.calendarBlock.create({
      data: {
        venueId: data.venueId,
        date: data.date,
        reason: data.reason,
        isRecurring: data.isRecurring ?? false,
        recurringRule: data.recurringRule as Prisma.InputJsonValue | undefined,
      },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });
    return this.toCalendarBlockEntity(block);
  }

  async getCalendarBlocks(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarBlockEntity[]> {
    const blocks = await this.prisma.calendarBlock.findMany({
      where: {
        venueId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        venue: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
    return blocks.map((b) => this.toCalendarBlockEntity(b));
  }

  async findCalendarBlockById(id: string): Promise<CalendarBlockEntity | null> {
    const block = await this.prisma.calendarBlock.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });
    return block ? this.toCalendarBlockEntity(block) : null;
  }

  async deleteCalendarBlock(id: string): Promise<void> {
    await this.prisma.calendarBlock.delete({ where: { id } });
  }

  async isDateBlocked(venueId: string, date: Date): Promise<boolean> {
    const block = await this.prisma.calendarBlock.findFirst({
      where: { venueId, date },
    });
    return block !== null;
  }

  async countByVenueAndStatus(venueId: string, status: BookingStatus): Promise<number> {
    return this.prisma.booking.count({
      where: { venueId, status },
    });
  }

  async countPendingByOwner(ownerId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        status: BookingStatus.PENDING,
        venue: { ownerId },
      },
    });
  }

  async countAllPending(): Promise<number> {
    return this.prisma.booking.count({
      where: { status: BookingStatus.PENDING },
    });
  }

  async incrementVenueBookingCount(venueId: string): Promise<void> {
    await this.prisma.venue.update({
      where: { id: venueId },
      data: { bookingCount: { increment: 1 } },
    });
  }

  async findBookingsDueForReminder(
    eventDate: Date,
    reminderField: ReminderField,
  ): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventDate,
        status: { in: CONFIRMED_BOOKING_STATUSES },
        [reminderField]: null,
      },
      include: BOOKING_INCLUDE,
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async markReminderSent(id: string, reminderField: ReminderField): Promise<void> {
    await this.prisma.booking.update({
      where: { id },
      data: { [reminderField]: new Date() },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(raw: any): BookingEntity {
    return new BookingEntity({
      id: raw.id,
      venueId: raw.venueId,
      clientId: raw.clientId,
      eventType: raw.eventType,
      eventDate: raw.eventDate,
      endDate: raw.endDate,
      startTime: raw.startTime,
      endTime: raw.endTime,
      guestCount: raw.guestCount,
      basePrice: Number(raw.basePrice),
      appliedPrice: Number(raw.appliedPrice),
      totalPrice: Number(raw.totalPrice),
      depositAmount: Number(raw.depositAmount),
      depositPaid: raw.depositPaid,
      status: raw.status as BookingStatus,
      specialRequests: raw.specialRequests,
      contractUrl: raw.contractUrl,
      contractSentAt: raw.contractSentAt,
      reminder7SentAt: raw.reminder7SentAt,
      reminder3SentAt: raw.reminder3SentAt,
      reminder1SentAt: raw.reminder1SentAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      venue: raw.venue,
      client: raw.client,
      payments: raw.payments,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toCalendarBlockEntity(raw: any): CalendarBlockEntity {
    return new CalendarBlockEntity({
      id: raw.id,
      venueId: raw.venueId,
      date: raw.date,
      reason: raw.reason,
      isRecurring: raw.isRecurring,
      recurringRule: raw.recurringRule,
      createdAt: raw.createdAt,
      venue: raw.venue,
    });
  }
}
