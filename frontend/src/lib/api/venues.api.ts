import { apiRequest, buildQueryString } from './client';
import type {
  AmenityCatalog,
  PaginatedResponse,
  Venue,
  VenueCompletion,
  VenueFormPayload,
  VenueMedia,
  VenueSearchParams,
  VenueSpaceType,
  VenueUseType,
} from '@/types/api';

const buildVenueFormData = (payload: VenueFormPayload, files: File[] = []): FormData => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      formData.set(key, JSON.stringify(value));
      return;
    }

    formData.set(key, String(value));
  });

  files.forEach((file) => formData.append('photos', file));

  return formData;
};

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

export const createVenue = async (payload: VenueFormPayload, files: File[] = []): Promise<Venue> => {
  return apiRequest<Venue>('/venues', {
    method: 'POST',
    body: buildVenueFormData(payload, files),
  });
};

export const updateVenue = async (
  id: string,
  payload: Partial<VenueFormPayload>,
  files: File[] = [],
): Promise<Venue> => {
  return apiRequest<Venue>(`/venues/${id}`, {
    method: 'PUT',
    body: buildVenueFormData(payload as VenueFormPayload, files),
  });
};

export const deleteVenue = async (id: string): Promise<void> => {
  return apiRequest<void>(`/venues/${id}`, { method: 'DELETE' });
};

export const getVenueCompletion = async (id: string): Promise<VenueCompletion> => {
  return apiRequest<VenueCompletion>(`/venues/${id}/completion`);
};

export const publishVenue = async (id: string): Promise<Venue> => {
  return apiRequest<Venue>(`/venues/${id}/publish`, { method: 'PUT' });
};

export const addVenueMedia = async (id: string, files: File[]): Promise<VenueMedia[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));

  return apiRequest<VenueMedia[]>(`/venues/${id}/media`, {
    method: 'POST',
    body: formData,
  });
};

export const deleteVenueMedia = async (id: string, mediaId: string): Promise<void> => {
  return apiRequest<void>(`/venues/${id}/media/${mediaId}`, { method: 'DELETE' });
};

export const reorderVenueMedia = async (
  id: string,
  order: string[],
  coverId?: string,
): Promise<VenueMedia[]> => {
  return apiRequest<VenueMedia[]>(`/venues/${id}/media/order`, {
    method: 'PUT',
    body: JSON.stringify({ order, coverId }),
  });
};
