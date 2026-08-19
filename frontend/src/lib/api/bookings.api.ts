import { apiRequest } from './client';
import type {
  AvailabilityResult,
  Booking,
  CreateBookingPayload,
  CreateBookingResponse,
} from '@/types/api';

export const createBooking = async (
  venueId: string,
  payload: CreateBookingPayload,
): Promise<CreateBookingResponse> => {
  return apiRequest<CreateBookingResponse>(`/venues/${venueId}/bookings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const checkAvailability = async (
  venueId: string,
  date: string,
): Promise<AvailabilityResult> => {
  return apiRequest<AvailabilityResult>(`/venues/${venueId}/bookings/availability?date=${date}`, {
    auth: false,
  });
};

export const getMyBookings = async (): Promise<Booking[]> => {
  return apiRequest<Booking[]>('/bookings/my-bookings');
};

export const getBooking = async (id: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}`);
};

export const cancelBooking = async (id: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}/cancel`, { method: 'PUT' });
};

export const getVenueBookings = async (venueId: string): Promise<Booking[]> => {
  return apiRequest<Booking[]>(`/venues/${venueId}/bookings`);
};

export const approveBooking = async (id: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}/approve`, { method: 'PUT' });
};

export const rejectBooking = async (id: string, reason: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
};
