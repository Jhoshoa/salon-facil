import { apiRequest, buildQueryString } from './client';
import type {
  Amenity,
  AmenityCatalog,
  CatalogAmenityInput,
  CatalogItem,
  CatalogItemInput,
  PaginatedResponse,
  UpdateCatalogAmenityPayload,
  UpdateCatalogItemPayload,
  Venue,
  VenueCompletion,
  VenueFormPayload,
  VenueMedia,
  VenueSearchParams,
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

export const getSpaceTypesCatalog = async (): Promise<CatalogItem[]> => {
  return apiRequest<CatalogItem[]>('/venues/catalog/space-types', { auth: false });
};

export const getUseTypesCatalog = async (): Promise<CatalogItem[]> => {
  return apiRequest<CatalogItem[]>('/venues/catalog/use-types', { auth: false });
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

export const verifyVenue = async (id: string, approve: boolean): Promise<Venue> => {
  return apiRequest<Venue>(`/venues/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ approve }),
  });
};

// ========== ADMIN ==========

export const getPendingVenues = async (): Promise<Venue[]> => {
  return apiRequest<Venue[]>('/venues/admin/pending');
};

export const getAdminSpaceTypes = async (): Promise<CatalogItem[]> => {
  return apiRequest<CatalogItem[]>('/venues/admin/catalog/space-types');
};

export const createAdminSpaceType = async (data: CatalogItemInput): Promise<CatalogItem> => {
  return apiRequest<CatalogItem>('/venues/admin/catalog/space-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAdminSpaceType = async (
  id: string,
  data: UpdateCatalogItemPayload,
): Promise<CatalogItem> => {
  return apiRequest<CatalogItem>(`/venues/admin/catalog/space-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getAdminUseTypes = async (): Promise<CatalogItem[]> => {
  return apiRequest<CatalogItem[]>('/venues/admin/catalog/use-types');
};

export const createAdminUseType = async (data: CatalogItemInput): Promise<CatalogItem> => {
  return apiRequest<CatalogItem>('/venues/admin/catalog/use-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAdminUseType = async (
  id: string,
  data: UpdateCatalogItemPayload,
): Promise<CatalogItem> => {
  return apiRequest<CatalogItem>(`/venues/admin/catalog/use-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getAdminAmenities = async (): Promise<Amenity[]> => {
  return apiRequest<Amenity[]>('/venues/admin/catalog/amenities');
};

export const createAdminAmenity = async (data: CatalogAmenityInput): Promise<Amenity> => {
  return apiRequest<Amenity>('/venues/admin/catalog/amenities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAdminAmenity = async (
  id: string,
  data: UpdateCatalogAmenityPayload,
): Promise<Amenity> => {
  return apiRequest<Amenity>(`/venues/admin/catalog/amenities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
