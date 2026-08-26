export class ReviewEntity {
  id!: string;
  venueId!: string;
  clientId!: string;
  bookingId!: string;
  rating!: number;
  comment: string | null = null;
  isVerified: boolean = true;
  ownerResponse: string | null = null;
  ownerResponseAt: Date | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  client?: { id: string; fullName: string; email?: string };

  constructor(partial: Partial<ReviewEntity>) {
    Object.assign(this, partial);
  }

  canBeEditedBy(userId: string): boolean {
    return this.clientId === userId;
  }

  hasOwnerResponse(): boolean {
    return this.ownerResponse != null;
  }
}
