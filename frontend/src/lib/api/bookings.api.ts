import { apiRequest } from './client';
import type {
  AvailabilityRangeEntry,
  AvailabilityResult,
  Booking,
  CreateBookingPayload,
  CreateBookingResponse,
  RangePriceCalculation,
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

export const checkAvailabilityRange = async (
  venueId: string,
  startDate: string,
  endDate: string,
): Promise<AvailabilityRangeEntry[]> => {
  return apiRequest<AvailabilityRangeEntry[]>(
    `/venues/${venueId}/bookings/availability-range?startDate=${startDate}&endDate=${endDate}`,
    { auth: false },
  );
};

export const previewBookingPrice = async (
  venueId: string,
  params: { eventDate: string; endDate?: string; startTime: string; endTime: string },
): Promise<RangePriceCalculation> => {
  const search = new URLSearchParams({
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    ...(params.endDate ? { endDate: params.endDate } : {}),
  });
  return apiRequest<RangePriceCalculation>(
    `/venues/${venueId}/bookings/preview-price?${search.toString()}`,
    { auth: false },
  );
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
