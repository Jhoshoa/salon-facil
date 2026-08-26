import { apiRequest } from './client';
import type { CreateReviewPayload, PaginatedResponse, Review } from '@/types/api';

export const getVenueReviews = async (
  venueId: string,
  page = 1,
  limit = 10,
): Promise<PaginatedResponse<Review>> => {
  return apiRequest<PaginatedResponse<Review>>(
    `/venues/${venueId}/reviews?page=${page}&limit=${limit}`,
    { auth: false },
  );
};

export const getBookingReview = async (bookingId: string): Promise<Review | null> => {
  return apiRequest<Review | null>(`/bookings/${bookingId}/review`);
};

export const createReview = async (
  bookingId: string,
  payload: CreateReviewPayload,
): Promise<Review> => {
  return apiRequest<Review>(`/bookings/${bookingId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateReview = async (
  reviewId: string,
  payload: { rating?: number; comment?: string },
): Promise<Review> => {
  return apiRequest<Review>(`/reviews/${reviewId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  return apiRequest<void>(`/reviews/${reviewId}`, { method: 'DELETE' });
};

export const respondToReview = async (reviewId: string, response: string): Promise<Review> => {
  return apiRequest<Review>(`/reviews/${reviewId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
};
