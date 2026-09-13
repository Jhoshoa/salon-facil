import { VenueServiceEntity } from './venue-service.entity';
import { VenuePriceEntity } from './venue-price.entity';
import { AmenityCategory, Departamento, PriceUnit, VenueMediaType } from '@prisma/client';

/** Business rule, not an infra/upload concern -- lives in domain so both the controller (single
 * upload batch) and the service (running total across every addMedia call ever made) enforce the
 * exact same number. Also drives the "X/20 fotos" label in the owner-facing media manager. */
export const MAX_VENUE_PHOTOS = 20;

/** Shared shape for the admin-managed catalogs (space types, use types). */
export interface CatalogItemEntity {
  id: string;
  key: string;
  name: string;
  icon: string | null;
}

export enum VenueStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
}

export class VenueEntity {
  id!: string;
  ownerId!: string;
  name!: string;
  slug!: string;
  description: string | null = null;
  shortDescription: string | null = null;
  address!: string;
  district!: string;
  departamento!: Departamento;
  country: string = 'Bolivia';
  contactPhone: string | null = null;
  facebookUrl: string | null = null;
  instagramUrl: string | null = null;
  tiktokUrl: string | null = null;
  latitude: number | null = null;
  longitude: number | null = null;
  capacityMin: number = 0;
  capacityMax!: number;
  spaceTypeId: string | null = null;
  minimumHours: number = 4;
  priceUnit: PriceUnit = PriceUnit.EVENT;
  instantBooking: boolean = false;
  allowsMultipleDays: boolean = false;
  squareMeters: number | null = null;
  photos: string[] = [];
  videoUrl: string | null = null;
  rules: string | null = null;
  cancellationPolicy: string | null = null;
  status: VenueStatus = VenueStatus.DRAFT;
  isVerified: boolean = false;
  verifiedAt: Date | null = null;
  verifiedById: string | null = null;
  isFeatured: boolean = false;
  featuredUntil: Date | null = null;
  viewCount: number = 0;
  bookingCount: number = 0;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt: Date | null = null;

  services?: VenueServiceEntity[];
  prices?: VenuePriceEntity[];
  amenities?: VenueAmenityEntity[];
  uses?: VenueUseEntity[];
  spaceType?: CatalogItemEntity | null;
  openingHours?: VenueOpeningHourEntity[];
  media?: VenueMediaEntity[];
  owner?: { id: string; fullName: string; phone: string; avatarUrl: string | null };
  reviewCount?: number;
  averageRating?: number;

  constructor(partial: Partial<VenueEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === VenueStatus.ACTIVE;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  isPublic(): boolean {
    return this.status === VenueStatus.ACTIVE && this.isVerified && !this.isDeleted();
  }

  canBeEditedBy(userId: string, userRole: string): boolean {
    return this.ownerId === userId || userRole === 'ADMIN';
  }

  getMainPhoto(): string | null {
    return this.photos.length > 0 ? this.photos[0] : null;
  }
}

export interface VenueAmenityEntity {
  id: string;
  isIncluded: boolean;
  extraCost: number | null;
  notes: string | null;
  amenity: {
    id: string;
    key: string;
    name: string;
    category: AmenityCategory;
    icon: string | null;
  };
}

export interface VenueUseEntity {
  id: string;
  useTypeId: string;
  useType: CatalogItemEntity;
  isPrimary: boolean;
}

export interface VenueOpeningHourEntity {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface VenueMediaEntity {
  id: string;
  type: VenueMediaType;
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
}
