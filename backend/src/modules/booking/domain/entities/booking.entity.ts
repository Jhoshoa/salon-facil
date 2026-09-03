export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  FULLY_PAID = 'FULLY_PAID',
  CANCELLED_BY_CLIENT = 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_OWNER = 'CANCELLED_BY_OWNER',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

/** Snapshot of one extra-cost amenity picked when the booking was requested. */
export interface SelectedExtra {
  amenityId: string;
  name: string;
  extraCost: number;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: string;
  method: string;
  status: string;
  comprobanteUrl: string | null;
  confirmedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export class BookingEntity {
  id!: string;
  venueId!: string;
  clientId!: string;
  eventType!: string;
  eventDate!: Date;
  endDate!: Date;
  startTime!: string;
  endTime!: string;
  guestCount!: number;
  basePrice!: number;
  appliedPrice!: number;
  totalPrice!: number;
  depositAmount!: number;
  depositPaid: boolean = false;
  status: BookingStatus = BookingStatus.PENDING;
  specialRequests: string | null = null;
  selectedExtras: SelectedExtra[] | null = null;
  contractUrl: string | null = null;
  contractSentAt: Date | null = null;
  reminder7SentAt: Date | null = null;
  reminder3SentAt: Date | null = null;
  reminder1SentAt: Date | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  venue?: { id: string; name: string; slug: string; photos: string[]; capacityMax: number };
  client?: { id: string; fullName: string; email: string; phone: string | null };
  payments?: BookingPayment[];

  constructor(partial: Partial<BookingEntity>) {
    Object.assign(this, partial);
  }

  canBeApproved(): boolean {
    return this.status === BookingStatus.PENDING;
  }

  canBeCancelledByClient(): boolean {
    return [BookingStatus.PENDING, BookingStatus.APPROVED].includes(this.status);
  }

  canBeCancelledByOwner(): boolean {
    return [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.DEPOSIT_PAID].includes(
      this.status,
    );
  }

  canBeCompleted(): boolean {
    return [BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID].includes(this.status);
  }

  daysUntilEvent(): number {
    const now = new Date();
    const event = new Date(this.eventDate);
    const diff = event.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  hasActivePayment(): boolean {
    if (!this.payments || this.payments.length === 0) return false;
    return this.payments.some((p) => p.status === 'COMPLETED');
  }

  isMultiDay(): boolean {
    return new Date(this.eventDate).getTime() !== new Date(this.endDate).getTime();
  }
}
