import { VenueEntity, VenueMediaEntity } from '../entities/venue.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';
import { AmenityCategory } from '@prisma/client';

export const VENUE_REPOSITORY = Symbol('VENUE_REPOSITORY');

export interface CatalogItem {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface AmenityCatalogItem {
  id: string;
  key: string;
  name: string;
  category: AmenityCategory;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogItemInput {
  key: string;
  name: string;
  icon?: string;
  sortOrder?: number;
}

export interface SeasonalEventCatalogItem {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SeasonalEventInput {
  name: string;
  startDate: Date;
  endDate: Date;
  note?: string;
  sortOrder?: number;
}

export interface IVenueRepository {
  findById(id: string): Promise<VenueEntity | null>;
  findBySlug(slug: string): Promise<VenueEntity | null>;
  findByOwner(ownerId: string): Promise<VenueEntity[]>;
  findByStatus(status: string): Promise<VenueEntity[]>;
  search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }>;
  findSimilar(venue: VenueEntity, limit: number): Promise<VenueEntity[]>;
  findAmenities(includeInactive?: boolean): Promise<AmenityCatalogItem[]>;
  createAmenity(
    data: CatalogItemInput & { category: AmenityCategory },
  ): Promise<AmenityCatalogItem>;
  updateAmenity(
    id: string,
    data: Partial<CatalogItemInput> & { category?: AmenityCategory; isActive?: boolean },
  ): Promise<AmenityCatalogItem>;
  findSpaceTypes(includeInactive?: boolean): Promise<CatalogItem[]>;
  createSpaceType(data: CatalogItemInput): Promise<CatalogItem>;
  updateSpaceType(
    id: string,
    data: Partial<CatalogItemInput> & { isActive?: boolean },
  ): Promise<CatalogItem>;
  findUseTypes(includeInactive?: boolean): Promise<CatalogItem[]>;
  createUseType(data: CatalogItemInput): Promise<CatalogItem>;
  updateUseType(
    id: string,
    data: Partial<CatalogItemInput> & { isActive?: boolean },
  ): Promise<CatalogItem>;
  findSeasonalEvents(includeInactive?: boolean): Promise<SeasonalEventCatalogItem[]>;
  createSeasonalEvent(data: SeasonalEventInput): Promise<SeasonalEventCatalogItem>;
  updateSeasonalEvent(
    id: string,
    data: Partial<SeasonalEventInput> & { isActive?: boolean },
  ): Promise<SeasonalEventCatalogItem>;
  create(data: Record<string, unknown>, ownerId: string): Promise<VenueEntity>;
  update(id: string, data: Record<string, unknown>): Promise<VenueEntity>;
  updateStatus(id: string, status: string, verifiedById?: string): Promise<VenueEntity>;
  addMedia(
    venueId: string,
    uploads: { url: string; publicId: string }[],
  ): Promise<VenueMediaEntity[]>;
  deleteMedia(venueId: string, mediaId: string): Promise<{ cloudinaryId: string | null } | null>;
  reorderMedia(venueId: string, order: string[], coverId?: string): Promise<VenueMediaEntity[]>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
  /** Internal use only (notifications) — never serialize this beyond the triggering service.
   * The public venue shape deliberately excludes the owner's email/phone from API responses. */
  findOwnerContact(
    venueId: string,
  ): Promise<{ id: string; email: string; phone: string; fullName: string } | null>;
}
