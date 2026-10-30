import {
  VenueEntity,
  VenueMediaEntity,
  VenueRentalItemCategoryEntity,
  VenueRentalItemEntity,
  VenueStatus,
} from '../entities/venue.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';
import { AmenityCategory, Departamento } from '@prisma/client';

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

export interface CreateRentalItemInput {
  name: string;
  categoryId: string;
  description?: string;
  photoUrl?: string;
  photoPublicId?: string;
  pricePerUnit: number;
  unitLabel?: string;
  stockQty?: number;
  sortOrder?: number;
}

export interface UpdateRentalItemInput {
  name?: string;
  categoryId?: string;
  description?: string | null;
  photoUrl?: string;
  photoPublicId?: string;
  removePhoto?: boolean;
  pricePerUnit?: number;
  unitLabel?: string;
  stockQty?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateRentalItemCategoryInput {
  name: string;
  sortOrder?: number;
}

export interface UpdateRentalItemCategoryInput {
  name?: string;
  sortOrder?: number;
}

export interface IVenueRepository {
  findById(id: string): Promise<VenueEntity | null>;
  findBySlug(slug: string): Promise<VenueEntity | null>;
  findByOwner(ownerId: string): Promise<VenueEntity[]>;
  findByStatus(status: string): Promise<VenueEntity[]>;
  findAllForAdmin(filters: {
    query?: string;
    departamento?: Departamento;
    status?: VenueStatus;
    page?: number;
    limit?: number;
  }): Promise<{ venues: VenueEntity[]; total: number }>;
  countByStatus(filters: {
    query?: string;
    departamento?: Departamento;
  }): Promise<Record<VenueStatus, number>>;
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
  updateStatus(
    id: string,
    status: string,
    verifiedById?: string,
    rejectionReason?: string,
  ): Promise<VenueEntity>;
  addMedia(
    venueId: string,
    uploads: { url: string; publicId: string }[],
  ): Promise<VenueMediaEntity[]>;
  deleteMedia(venueId: string, mediaId: string): Promise<{ cloudinaryId: string | null } | null>;
  reorderMedia(venueId: string, order: string[], coverId?: string): Promise<VenueMediaEntity[]>;
  listRentalItems(
    venueId: string,
    options?: { activeOnly?: boolean },
  ): Promise<VenueRentalItemEntity[]>;
  createRentalItem(
    venueId: string,
    data: CreateRentalItemInput,
  ): Promise<VenueRentalItemEntity | 'category_not_found'>;
  /** `previousPhotoPublicId` is the Cloudinary id that was replaced or cleared by this update
   * (or `null` if the photo didn't change) -- the caller best-effort-deletes it from Cloudinary,
   * same as `deleteRentalItem` already does for a fully deleted item. */
  updateRentalItem(
    venueId: string,
    itemId: string,
    data: UpdateRentalItemInput,
  ): Promise<
    | { entity: VenueRentalItemEntity; previousPhotoPublicId: string | null }
    | 'not_found'
    | 'category_not_found'
  >;
  deleteRentalItem(
    venueId: string,
    itemId: string,
  ): Promise<{ photoPublicId: string | null } | null>;
  reorderRentalItems(venueId: string, order: string[]): Promise<VenueRentalItemEntity[]>;
  listRentalItemCategories(venueId: string): Promise<VenueRentalItemCategoryEntity[]>;
  createRentalItemCategory(
    venueId: string,
    data: CreateRentalItemCategoryInput,
  ): Promise<VenueRentalItemCategoryEntity | 'duplicate_name'>;
  updateRentalItemCategory(
    venueId: string,
    categoryId: string,
    data: UpdateRentalItemCategoryInput,
  ): Promise<VenueRentalItemCategoryEntity | 'not_found' | 'duplicate_name'>;
  /** Deletes the category only when it has zero items -- otherwise leaves it untouched and
   * reports how many items are blocking the delete, so the service can surface a clear 409. */
  deleteRentalItemCategory(
    venueId: string,
    categoryId: string,
  ): Promise<{ itemCount: number } | 'not_found'>;
  /** `order` must list every category of the venue exactly once -- a partial list would leave the
   * ones it omits with a `sortOrder` that collides with the new positions. */
  reorderRentalItemCategories(
    venueId: string,
    order: string[],
  ): Promise<VenueRentalItemCategoryEntity[] | 'invalid_order'>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  /** Only for the admin "attach a real owner" flow -- not exposed through the generic update(),
   * which never touches ownerId on purpose (an owner editing their own venue has no business
   * changing who owns it). */
  reassignOwner(id: string, ownerId: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
  /** Internal use only (notifications) — never serialize this beyond the triggering service.
   * The public venue shape deliberately excludes the owner's email/phone from API responses. */
  findOwnerContact(
    venueId: string,
  ): Promise<{ id: string; email: string; phone: string; fullName: string } | null>;

  // --- Favorites (private per-user bookmarks, see VenueFavorite) ---
  addFavorite(userId: string, venueId: string): Promise<void>;
  removeFavorite(userId: string, venueId: string): Promise<void>;
  findFavoritedByUser(userId: string): Promise<VenueEntity[]>;
  findFavoritedVenueIds(userId: string): Promise<string[]>;

  // --- Preview links (ADMIN sharing a read-only venue preview, see VenuePreviewToken) ---
  createPreviewToken(venueId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findVenueIdByPreviewToken(tokenHash: string): Promise<string | null>;
}
