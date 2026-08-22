import { apiRequest, buildQueryString } from './client';
import type {
  AmenityCatalog,
  PaginatedResponse,
  Venue,
  VenueSearchParams,
  VenueSpaceType,
  VenueUseType,
} from '@/types/api';

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

export const getSimilarVenues = async (slug: string, limit = 4): Promise<Venue[]> => {
  return apiRequest<Venue[]>(`/venues/${slug}/similar?limit=${limit}`, { auth: false });
};

export const getAmenitiesCatalog = async (): Promise<AmenityCatalog> => {
  return apiRequest<AmenityCatalog>('/venues/catalog/amenities', { auth: false });
};

export const getSpaceTypesCatalog = async (): Promise<VenueSpaceType[]> => {
  return apiRequest<VenueSpaceType[]>('/venues/catalog/space-types', { auth: false });
};

export const getUseTypesCatalog = async (): Promise<VenueUseType[]> => {
  return apiRequest<VenueUseType[]>('/venues/catalog/use-types', { auth: false });
};

export const getMyVenues = async (): Promise<Venue[]> => {
  return apiRequest<Venue[]>('/venues/my/venues');
};
