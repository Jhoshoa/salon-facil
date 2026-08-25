export class ReviewEntity {
  id!: string;
  venueId!: string;
  clientId!: string;
  bookingId!: string;
  rating!: number;
  comment: string | null = null;
  isVerified: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;

  client?: { id: string; fullName: string };

  constructor(partial: Partial<ReviewEntity>) {
    Object.assign(this, partial);
  }
}
