import { PaymentEntity, PaymentMethod, PaymentType } from '../entities/payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  findById(id: string): Promise<PaymentEntity | null>;
  findByBooking(bookingId: string): Promise<PaymentEntity[]>;
  findByClient(clientId: string): Promise<PaymentEntity[]>;
  findPendingByOwner(ownerId: string): Promise<PaymentEntity[]>;
  findAllPending(): Promise<PaymentEntity[]>;
  create(data: CreatePaymentData): Promise<PaymentEntity>;
  uploadProof(id: string, comprobanteUrl: string): Promise<PaymentEntity>;
  confirm(id: string, ownerId: string, notes?: string): Promise<PaymentEntity>;
  reject(id: string, reason: string): Promise<PaymentEntity>;
  getOwnerEarningsSummary(
    ownerId: string,
    venueId?: string,
  ): Promise<{ totalEarned: number; paymentCount: number }>;
  getOwnerEarningsByVenueAndMonth(
    ownerId: string,
    monthsBack: number,
    venueId?: string,
  ): Promise<{ venueId: string; venueName: string; month: Date; total: number; count: number }[]>;
  getOwnerEarningsByMethod(
    ownerId: string,
    monthsBack: number,
    venueId?: string,
  ): Promise<
    { venueId: string; venueName: string; method: string; total: number; count: number }[]
  >;
  /** Backs the earnings-detail drawer: the underlying COMPLETED payments for a venue/month/method
   * breakdown row the owner clicked. `month` ('YYYY-MM') wins over `monthsBack` when both are
   * given -- a monthly-breakdown row passes `month`, a by-method row passes `monthsBack` (the
   * same lookback window the parent earnings view is scoped to). */
  findCompletedByOwner(
    ownerId: string,
    filters: { venueId?: string; method?: string; month?: string; monthsBack?: number },
  ): Promise<PaymentEntity[]>;
}

export interface CreatePaymentData {
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}
