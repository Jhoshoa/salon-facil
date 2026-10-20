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
  // Only populated by the admin-moderation listing -- the per-venue listing already scopes to
  // one venue, so repeating its name/slug on every row there would be redundant.
  venue?: { id: string; name: string; slug: string };

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
