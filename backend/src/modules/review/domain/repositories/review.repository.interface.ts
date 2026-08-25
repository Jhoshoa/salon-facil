import { ReviewEntity } from '../entities/review.entity';

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

export interface CreateReviewData {
  venueId: string;
  clientId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface IReviewRepository {
  create(data: CreateReviewData): Promise<ReviewEntity>;
  findByBookingId(bookingId: string): Promise<ReviewEntity | null>;
  findByVenue(
    venueId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ReviewEntity[]; total: number }>;
}
