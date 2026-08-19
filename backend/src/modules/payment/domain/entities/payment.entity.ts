export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  FULL = 'FULL',
  REMAINING = 'REMAINING',
}

export enum PaymentMethod {
  QR_BANK = 'QR_BANK',
  BANK_TRANSFER = 'BANK_TRANSFER',
  TIGO_MONEY = 'TIGO_MONEY',
  CARD = 'CARD',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIAL = 'PARTIAL',
}

export class PaymentEntity {
  id!: string;
  bookingId!: string;
  amount!: number;
  paymentType!: PaymentType;
  method!: PaymentMethod;
  status: PaymentStatus = PaymentStatus.PENDING;
  comprobanteUrl: string | null = null;
  comprobanteUploadedAt: Date | null = null;
  confirmedByOwnerId: string | null = null;
  confirmedAt: Date | null = null;
  notes: string | null = null;
  stripePaymentIntentId: string | null = null;
  stripeChargeId: string | null = null;
  transactionReference: string | null = null;
  paidAt: Date | null = null;
  createdAt!: Date;

  booking?: {
    id: string;
    venueId: string;
    clientId: string;
    eventType: string;
    eventDate: Date;
    totalPrice: number;
    depositAmount: number;
    depositPaid: boolean;
    status: string;
    venue?: {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
    };
    client?: {
      id: string;
      fullName: string;
      email: string;
    };
  };

  constructor(partial: Partial<PaymentEntity>) {
    Object.assign(this, partial);
  }

  canBeConfirmed(): boolean {
    return this.status === PaymentStatus.PENDING && Boolean(this.comprobanteUrl);
  }
}
