import { VenueEntity } from '../entities/venue.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';

export const VENUE_REPOSITORY = Symbol('VENUE_REPOSITORY');

export interface IVenueRepository {
  findById(id: string): Promise<VenueEntity | null>;
  findBySlug(slug: string): Promise<VenueEntity | null>;
  findByOwner(ownerId: string): Promise<VenueEntity[]>;
  search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }>;
  create(data: Record<string, unknown>, ownerId: string): Promise<VenueEntity>;
  update(id: string, data: Record<string, unknown>): Promise<VenueEntity>;
  updateStatus(id: string, status: string, verifiedById?: string): Promise<VenueEntity>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
}
