import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IBookingRepository,
  CreateBookingData,
  CreateCalendarBlockData,
} from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';
import { CalendarBlockEntity } from '../../domain/entities/calendar-block.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        venue: {
          select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
    });
    return booking ? this.toEntity(booking) : null;
  }

  async findByVenueAndDate(venueId: string, eventDate: Date): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        venueId,
        eventDate,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.APPROVED,
            BookingStatus.DEPOSIT_PAID,
            BookingStatus.FULLY_PAID,
          ],
        },
      },
      include: {
        venue: {
          select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
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
  ): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        venueId,
        eventDate: { gte: startDate, lte: endDate },
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.APPROVED,
            BookingStatus.DEPOSIT_PAID,
            BookingStatus.FULLY_PAID,
          ],
        },
      },
      orderBy: { eventDate: 'asc' },
    });
    return bookings.map((b) => this.toEntity(b));
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
    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          venueId: data.venueId,
          clientId: data.clientId,
          eventType: data.eventType,
          eventDate: data.eventDate,
          startTime: data.startTime,
          endTime: data.endTime,
          guestCount: data.guestCount,
          basePrice: new Prisma.Decimal(data.basePrice),
          appliedPrice: new Prisma.Decimal(data.appliedPrice),
          totalPrice: new Prisma.Decimal(data.totalPrice),
          depositAmount: new Prisma.Decimal(data.depositAmount),
          specialRequests: data.specialRequests,
        },
      });

      await tx.calendarBlock.create({
        data: {
          venueId: data.venueId,
          date: data.eventDate,
          reason: `Reserva ${created.id}`,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          venue: {
            select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
          },
          client: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          payments: true,
        },
      });
    });
    return this.toEntity(booking);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingEntity> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        venue: {
          select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
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
      include: {
        venue: {
          select: { id: true, name: true, slug: true, photos: true, capacityMax: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        payments: true,
      },
    });
    return this.toEntity(booking);
  }

  async hasConflict(venueId: string, eventDate: Date, excludeBookingId?: string): Promise<boolean> {
    const where: Prisma.BookingWhereInput = {
      venueId,
      eventDate,
      status: {
        in: [
          BookingStatus.PENDING,
          BookingStatus.APPROVED,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.FULLY_PAID,
        ],
      },
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const count = await this.prisma.booking.count({ where });
    return count > 0;
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

  async deleteCalendarBlockByVenueAndDate(venueId: string, date: Date): Promise<void> {
    await this.prisma.calendarBlock.deleteMany({
      where: { venueId, date },
    });
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

  async incrementVenueBookingCount(venueId: string): Promise<void> {
    await this.prisma.venue.update({
      where: { id: venueId },
      data: { bookingCount: { increment: 1 } },
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
