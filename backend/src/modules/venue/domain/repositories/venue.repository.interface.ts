import { VenueEntity, VenueMediaEntity } from '../entities/venue.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';
import { AmenityCategory, VenueSpaceType, VenueUseType } from '@prisma/client';

export const VENUE_REPOSITORY = Symbol('VENUE_REPOSITORY');

export interface IVenueRepository {
  findById(id: string): Promise<VenueEntity | null>;
  findBySlug(slug: string): Promise<VenueEntity | null>;
  findByOwner(ownerId: string): Promise<VenueEntity[]>;
  search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }>;
  findSimilar(venue: VenueEntity, limit: number): Promise<VenueEntity[]>;
  findAmenities(): Promise<
    Array<{
      id: string;
      key: string;
      name: string;
      category: AmenityCategory;
      icon: string | null;
      sortOrder: number;
    }>
  >;
  getSpaceTypes(): VenueSpaceType[];
  getUseTypes(): VenueUseType[];
  create(data: Record<string, unknown>, ownerId: string): Promise<VenueEntity>;
  update(id: string, data: Record<string, unknown>): Promise<VenueEntity>;
  updateStatus(id: string, status: string, verifiedById?: string): Promise<VenueEntity>;
  addMedia(venueId: string, urls: string[]): Promise<VenueMediaEntity[]>;
  deleteMedia(venueId: string, mediaId: string): Promise<void>;
  reorderMedia(venueId: string, order: string[], coverId?: string): Promise<VenueMediaEntity[]>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
}
