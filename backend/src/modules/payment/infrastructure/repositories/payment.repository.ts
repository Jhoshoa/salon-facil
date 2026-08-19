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

      if (updatedPayment.paymentType === 'DEPOSIT') {
        await tx.booking.update({
          where: { id: updatedPayment.bookingId },
          data: {
            status: 'DEPOSIT_PAID',
            depositPaid: true,
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
