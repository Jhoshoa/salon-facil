import { apiRequest } from './client';
import type { VenueCalendar } from '@/types/api';

export interface CreateCalendarBlockPayload {
  date: string;
  reason?: string;
}

export const getVenueCalendar = async (venueId: string, month: string): Promise<VenueCalendar> => {
  return apiRequest<VenueCalendar>(`/venues/${venueId}/calendar?month=${month}`, { auth: false });
};

export const createCalendarBlock = async (
  venueId: string,
  payload: CreateCalendarBlockPayload,
): Promise<unknown> => {
  return apiRequest(`/venues/${venueId}/calendar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const deleteCalendarBlock = async (venueId: string, blockId: string): Promise<void> => {
  return apiRequest<void>(`/venues/${venueId}/calendar/${blockId}`, { method: 'DELETE' });
};
