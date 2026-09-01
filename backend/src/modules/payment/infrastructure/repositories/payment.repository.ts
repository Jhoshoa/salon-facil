import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreatePaymentData,
  IPaymentRepository,
} from '../../domain/repositories/payment.repository.interface';
import { PaymentEntity, PaymentStatus } from '../../domain/entities/payment.entity';

const paymentInclude = {
  booking: {
    select: {
      id: true,
      venueId: true,
      clientId: true,
      eventType: true,
      eventDate: true,
      totalPrice: true,
      depositAmount: true,
      depositPaid: true,
      status: true,
      venue: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
        },
      },
      client: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: paymentInclude,
    });
    return payment ? this.toEntity(payment) : null;
  }

  async findByBooking(bookingId: string): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: { bookingId },
      include: paymentInclude,
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => this.toEntity(payment));
  }

  async findByClient(clientId: string): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: { booking: { clientId } },
      include: paymentInclude,
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => this.toEntity(payment));
  }

  async findPendingByOwner(ownerId: string): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        booking: { venue: { ownerId } },
      },
      include: paymentInclude,
      orderBy: { createdAt: 'asc' },
    });
    return payments.map((payment) => this.toEntity(payment));
  }

  async findAllPending(): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      include: paymentInclude,
      orderBy: { createdAt: 'asc' },
    });
    return payments.map((payment) => this.toEntity(payment));
  }

  async create(data: CreatePaymentData): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: new Prisma.Decimal(data.amount),
        paymentType: data.paymentType,
        method: data.method,
        transactionReference: data.transactionReference,
        notes: data.notes,
      },
      include: paymentInclude,
    });
    return this.toEntity(payment);
  }

  async uploadProof(id: string, comprobanteUrl: string): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        comprobanteUrl,
        comprobanteUploadedAt: new Date(),
      },
      include: paymentInclude,
    });
    return this.toEntity(payment);
  }

  async confirm(id: string, ownerId: string, notes?: string): Promise<PaymentEntity> {
    const payment = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.COMPLETED,
          confirmedByOwnerId: ownerId,
          confirmedAt: new Date(),
          paidAt: new Date(),
          notes,
        },
        include: paymentInclude,
      });

      // A DEPOSIT only ever moves an APPROVED booking to DEPOSIT_PAID (never regresses one
      // that's already further along); FULL/REMAINING always land on FULLY_PAID, since that's
      // the terminal payment state regardless of what came before. Done in the same
      // transaction as the payment update so the two can never disagree.
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: updatedPayment.bookingId },
        select: { status: true },
      });
      const targetStatus = updatedPayment.paymentType === 'DEPOSIT' ? 'DEPOSIT_PAID' : 'FULLY_PAID';
      const isForwardTransition =
        targetStatus === 'FULLY_PAID'
          ? booking.status !== 'FULLY_PAID'
          : booking.status === 'APPROVED';

      if (isForwardTransition) {
        await tx.booking.update({
          where: { id: updatedPayment.bookingId },
          data: {
            status: targetStatus,
            depositPaid: targetStatus === 'DEPOSIT_PAID' ? true : undefined,
          },
        });
      }

      return updatedPayment;
    });

    return this.toEntity(payment);
  }

  async reject(id: string, reason: string): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.FAILED,
        notes: reason,
      },
      include: paymentInclude,
    });
    return this.toEntity(payment);
  }

  async getOwnerEarningsSummary(
    ownerId: string,
  ): Promise<{ totalEarned: number; paymentCount: number }> {
    const result = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.COMPLETED, booking: { venue: { ownerId } } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      totalEarned: Number(result._sum.amount ?? 0),
      paymentCount: result._count._all,
    };
  }

  async getOwnerEarningsByVenueAndMonth(
    ownerId: string,
    monthsBack: number,
  ): Promise<{ venueId: string; venueName: string; month: Date; total: number; count: number }[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      { venueId: string; venueName: string; month: Date; total: Prisma.Decimal; count: bigint }[]
    >(Prisma.sql`
      SELECT v.id as "venueId", v.name as "venueName",
             date_trunc('month', p.paid_at) as month,
             SUM(p.amount) as total, COUNT(*) as count
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN venues v ON v.id = b.venue_id
      WHERE p.status = 'COMPLETED' AND v.owner_id = ${ownerId}
        AND p.paid_at >= ${since}
      GROUP BY v.id, v.name, month
      ORDER BY month DESC, v.name ASC
    `);

    return rows.map((row) => ({
      venueId: row.venueId,
      venueName: row.venueName,
      month: row.month,
      total: Number(row.total),
      count: Number(row.count),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(raw: any): PaymentEntity {
    return new PaymentEntity({
      id: raw.id,
      bookingId: raw.bookingId,
      amount: Number(raw.amount),
      paymentType: raw.paymentType,
      method: raw.method,
      status: raw.status,
      comprobanteUrl: raw.comprobanteUrl,
      comprobanteUploadedAt: raw.comprobanteUploadedAt,
      confirmedByOwnerId: raw.confirmedByOwnerId,
      confirmedAt: raw.confirmedAt,
      notes: raw.notes,
      stripePaymentIntentId: raw.stripePaymentIntentId,
      stripeChargeId: raw.stripeChargeId,
      transactionReference: raw.transactionReference,
      paidAt: raw.paidAt,
      createdAt: raw.createdAt,
      booking: raw.booking
        ? {
            ...raw.booking,
            totalPrice: Number(raw.booking.totalPrice),
            depositAmount: Number(raw.booking.depositAmount),
          }
        : undefined,
    });
  }
}
