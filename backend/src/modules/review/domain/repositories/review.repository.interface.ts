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
  findById(id: string): Promise<ReviewEntity | null>;
  findByBookingId(bookingId: string): Promise<ReviewEntity | null>;
  findByVenue(
    venueId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ReviewEntity[]; total: number }>;
  update(id: string, data: { rating?: number; comment?: string | null }): Promise<ReviewEntity>;
  delete(id: string): Promise<void>;
  setOwnerResponse(id: string, response: string): Promise<ReviewEntity>;
}
