import { apiRequest, buildQueryString } from './client';
import type { PaginatedResponse, Venue, VenueSearchParams } from '@/types/api';

export const searchVenues = async (
  params: VenueSearchParams = {},
): Promise<PaginatedResponse<Venue>> => {
  return apiRequest<PaginatedResponse<Venue>>(`/venues${buildQueryString(params)}`, {
    auth: false,
  });
};

export const getVenueBySlug = async (slug: string): Promise<Venue> => {
  return apiRequest<Venue>(`/venues/${slug}`, { auth: false });
};

export const getMyVenues = async (): Promise<Venue[]> => {
  return apiRequest<Venue[]>('/venues/my/venues');
};
