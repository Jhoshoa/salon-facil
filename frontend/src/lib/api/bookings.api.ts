import { apiRequest, buildQueryString } from './client';
import type {
  AvailabilityRangeEntry,
  Booking,
  BookingStatus,
  CreateBookingPayload,
  CreateBookingResponse,
  DailyScheduleEntry,
  PaginatedResponse,
  RangePriceCalculation,
  RentalItemSelectionEntry,
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

/** How a venue that isn't public yet gets a quote: the owner/admin through their session, a visitor
 * through the share-preview link they opened. Without it, only a public venue answers. */
export type PricePreviewAccess = { mode: 'manage' } | { mode: 'share'; token: string };

export const previewBookingPrice = async (
  venueId: string,
  params: {
    eventDate: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    dailySchedule?: DailyScheduleEntry[];
    selectedRentalItems?: RentalItemSelectionEntry[];
  },
  access?: PricePreviewAccess,
): Promise<RangePriceCalculation> => {
  const search = new URLSearchParams({
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    ...(params.endDate ? { endDate: params.endDate } : {}),
    ...(params.dailySchedule?.length
      ? { dailySchedule: JSON.stringify(params.dailySchedule) }
      : {}),
    ...(params.selectedRentalItems?.length
      ? { selectedRentalItems: JSON.stringify(params.selectedRentalItems) }
      : {}),
    ...(access?.mode === 'share' ? { previewToken: access.token } : {}),
  });
  if (access?.mode === 'manage') {
    return apiRequest<RangePriceCalculation>(
      `/venues/${venueId}/bookings/preview-price/manage?${search.toString()}`,
    );
  }
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

export const markBookingCompleted = async (id: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}/complete`, { method: 'PUT' });
};

export const markBookingNoShow = async (id: string): Promise<Booking> => {
  return apiRequest<Booking>(`/bookings/${id}/no-show`, { method: 'PUT' });
};

export const getPendingOwnerBookingsCount = async (): Promise<number> => {
  const result = await apiRequest<{ count: number }>('/bookings/owner/pending-count');
  return result.count;
};

// ========== ADMIN ==========

export interface AdminBookingsParams {
  search?: string;
  status?: BookingStatus;
  venueId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const getAdminBookings = async (
  params: AdminBookingsParams = {},
): Promise<PaginatedResponse<Booking>> => {
  return apiRequest<PaginatedResponse<Booking>>(`/admin/bookings${buildQueryString(params)}`);
};
