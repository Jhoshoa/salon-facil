import {
  PaymentEntity,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../entities/payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  findById(id: string): Promise<PaymentEntity | null>;
  findByBooking(bookingId: string): Promise<PaymentEntity[]>;
  findByClient(clientId: string): Promise<PaymentEntity[]>;
  findPendingByOwner(ownerId: string): Promise<PaymentEntity[]>;
  create(data: CreatePaymentData): Promise<PaymentEntity>;
  uploadProof(id: string, comprobanteUrl: string): Promise<PaymentEntity>;
  confirm(id: string, ownerId: string, notes?: string): Promise<PaymentEntity>;
  reject(id: string, reason: string): Promise<PaymentEntity>;
  getOwnerEarningsSummary(ownerId: string): Promise<{ totalEarned: number; paymentCount: number }>;
  getOwnerEarningsByVenueAndMonth(
    ownerId: string,
    monthsBack: number,
  ): Promise<{ venueId: string; venueName: string; month: Date; total: number; count: number }[]>;
}

export interface CreatePaymentData {
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  notes?: string;
}
