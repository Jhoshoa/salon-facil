import { VenueServiceEntity } from './venue-service.entity';
import { VenuePriceEntity } from './venue-price.entity';

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
  description!: string;
  shortDescription: string | null = null;
  address!: string;
  district!: string;
  city: string = 'El Alto';
  state: string = 'La Paz';
  country: string = 'Bolivia';
  latitude: number | null = null;
  longitude: number | null = null;
  capacityMin: number = 0;
  capacityMax!: number;
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

  services?: VenueServiceEntity[];
  prices?: VenuePriceEntity[];
  owner?: { id: string; fullName: string; phone: string; avatarUrl: string | null };
  reviewCount?: number;
  averageRating?: number;

  constructor(partial: Partial<VenueEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === VenueStatus.ACTIVE;
  }

  isPublic(): boolean {
    return this.status === VenueStatus.ACTIVE && this.isVerified;
  }

  canBeEditedBy(userId: string, userRole: string): boolean {
    return this.ownerId === userId || userRole === 'ADMIN';
  }

  getMainPhoto(): string | null {
    return this.photos.length > 0 ? this.photos[0] : null;
  }
}
