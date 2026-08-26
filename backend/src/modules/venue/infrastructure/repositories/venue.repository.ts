import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AmenityCatalogItem,
  CatalogItem,
  CatalogItemInput,
  IVenueRepository,
  SeasonalEventCatalogItem,
  SeasonalEventInput,
} from '../../domain/repositories/venue.repository.interface';
import { VenueEntity, VenueMediaEntity, VenueStatus } from '../../domain/entities/venue.entity';
import { VenueServiceEntity } from '../../domain/entities/venue-service.entity';
import { VenuePriceEntity } from '../../domain/entities/venue-price.entity';
import { VenueFilterDto, SortField } from '../../application/dto/venue-filter.dto';
import { AmenityCategory, Prisma, PriceType, PriceUnit, VenueMediaType } from '@prisma/client';

interface RawVenueAmenity {
  id: string;
  isIncluded: boolean;
  extraCost: Prisma.Decimal | number | null;
  notes: string | null;
  amenity: {
    id: string;
    key: string;
    name: string;
    category: AmenityCategory;
    icon: string | null;
  };
}

interface RawCatalogItem {
  id: string;
  key: string;
  name: string;
  icon: string | null;
}

interface RawVenueUse {
  id: string;
  useTypeId: string;
  useType: RawCatalogItem;
  isPrimary: boolean;
}

interface RawVenueOpeningHour {
  id: string;
  dayOfWeek: number;
  opensAt: Date | string;
  closesAt: Date | string;
  isClosed: boolean;
}

interface RawVenueMedia {
  id: string;
  type: VenueMediaType;
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
}

@Injectable()
export class VenueRepository implements IVenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly venueInclude = {
    services: { orderBy: { sortOrder: 'asc' as const } },
    prices: { where: { isActive: true } },
    amenities: {
      include: { amenity: true },
      orderBy: { amenity: { sortOrder: 'asc' as const } },
    },
    uses: {
      include: { useType: true },
      orderBy: [{ isPrimary: 'desc' as const }, { useType: { name: 'asc' as const } }],
    },
    spaceType: true,
    openingHours: { orderBy: { dayOfWeek: 'asc' as const } },
    media: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
    owner: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
      },
    },
    _count: { select: { reviews: true } },
    reviews: { select: { rating: true } },
  };

  async findById(id: string): Promise<VenueEntity | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: this.venueInclude,
    });
    return venue ? this.toEntity(venue) : null;
  }

  async findBySlug(slug: string): Promise<VenueEntity | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      include: this.venueInclude,
    });
    return venue ? this.toEntity(venue) : null;
  }

  async findByOwner(ownerId: string): Promise<VenueEntity[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      include: this.venueInclude,
      orderBy: { createdAt: 'desc' },
    });
    return venues.map((v) => this.toEntity(v));
  }

  async search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VenueWhereInput = {
      status: VenueStatus.ACTIVE,
      isVerified: true,
    };
    const andFilters: Prisma.VenueWhereInput[] = [];

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.district) {
      where.district = { contains: filters.district, mode: 'insensitive' };
    }
    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { district: { contains: filters.query, mode: 'insensitive' } },
        { city: { contains: filters.query, mode: 'insensitive' } },
        { services: { some: { name: { contains: filters.query, mode: 'insensitive' } } } },
        {
          amenities: {
            some: { amenity: { name: { contains: filters.query, mode: 'insensitive' } } },
          },
        },
      ];
    }
    if (filters.services) {
      const serviceNames = filters.services
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean);

      if (serviceNames.length > 0) {
        where.services = {
          some: {
            OR: serviceNames.map((service) => ({
              name: { contains: service, mode: 'insensitive' },
            })),
          },
        };
      }
    }
    if (filters.minCapacity != null) {
      where.capacityMax = { gte: filters.minCapacity };
    }
    if (filters.guestCount != null) {
      where.capacityMax = {
        ...((where.capacityMax as Record<string, unknown>) ?? {}),
        gte: filters.guestCount,
      };
    }
    if (filters.maxCapacity != null) {
      where.capacityMin = { lte: filters.maxCapacity };
    }

    if (filters.spaceTypes?.length) {
      where.spaceTypeId = { in: filters.spaceTypes };
    }

    if (filters.useTypes?.length) {
      where.uses = { some: { useTypeId: { in: filters.useTypes } } };
    }

    if (filters.amenities?.length) {
      andFilters.push(
        ...filters.amenities.map((key) => ({
          amenities: {
            some: {
              isIncluded: true,
              amenity: { key },
            },
          },
        })),
      );
    }

    if (filters.hasParking === true || filters.parkingCapacity != null) {
      andFilters.push({
        amenities: {
          some: {
            isIncluded: true,
            amenity: { category: AmenityCategory.PARKING },
          },
        },
      });
    }

    if (filters.hasCatering === true) {
      andFilters.push({
        amenities: {
          some: {
            isIncluded: true,
            amenity: { category: AmenityCategory.CATERING_DRINKS },
          },
        },
      });
    }

    if (filters.allowsAlcohol === true) {
      andFilters.push(this.hasAmenityKey('alcohol-allowed'));
    }

    if (filters.allowsExternalCatering === true) {
      andFilters.push(this.hasAmenityKey('external-catering'));
    }

    if (filters.instantBooking != null) {
      where.instantBooking = filters.instantBooking;
    }

    if (filters.priceUnit) {
      where.priceUnit = filters.priceUnit;
    }

    if (
      filters.north != null &&
      filters.south != null &&
      filters.east != null &&
      filters.west != null
    ) {
      where.latitude = {
        gte: new Prisma.Decimal(filters.south),
        lte: new Prisma.Decimal(filters.north),
      };
      where.longitude = {
        gte: new Prisma.Decimal(filters.west),
        lte: new Prisma.Decimal(filters.east),
      };
    }

    // Price filters: venues with at least one BASE price in range
    if (filters.minPrice != null || filters.maxPrice != null) {
      const priceFilter: Prisma.VenuePriceWhereInput = {
        priceType: PriceType.BASE,
        isActive: true,
      };
      if (filters.minPrice != null) {
        priceFilter.price = { gte: new Prisma.Decimal(filters.minPrice) };
      }
      if (filters.maxPrice != null) {
        priceFilter.price = {
          ...((priceFilter.price as Record<string, unknown>) ?? {}),
          lte: new Prisma.Decimal(filters.maxPrice),
        };
      }
      where.prices = { some: priceFilter };
    }

    // Availability filter: exclude venues with active bookings or calendar blocks.
    // `date` is kept for backwards compatibility; new UI sends startDate/endDate.
    const requestedStartDate = filters.startDate ?? filters.date;
    if (requestedStartDate) {
      const startDate = new Date(requestedStartDate);
      const endDate = filters.endDate ? new Date(filters.endDate) : startDate;
      const bookingFilter: Prisma.BookingWhereInput = {
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID'],
        },
      };

      if (filters.startTime && filters.endTime) {
        bookingFilter.startTime = { lt: this.timeToDate(filters.endTime) };
        bookingFilter.endTime = { gt: this.timeToDate(filters.startTime) };
      }

      andFilters.push(
        {
          bookings: {
            none: bookingFilter,
          },
        },
        {
          calendarBlocks: {
            none: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      );
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    // For price/rating sort, we can't sort directly in Prisma.
    // Fetch with a reasonable sort then sort in-memory.
    const needsPostSort = [
      SortField.PRICE,
      SortField.PRICE_ASC,
      SortField.PRICE_DESC,
      SortField.RATING,
      SortField.RATING_DESC,
    ].includes(filters.sortBy as SortField);

    const prismaSortBy = needsPostSort
      ? 'createdAt'
      : filters.sortBy === SortField.CAPACITY || filters.sortBy === SortField.CAPACITY_DESC
        ? 'capacityMax'
        : filters.sortBy === SortField.FEATURED
          ? 'isFeatured'
          : 'createdAt';
    const prismaSortDir = this.resolveSortDirection(filters.sortBy, filters.sortOrder);

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: this.venueInclude,
        orderBy: { [prismaSortBy]: prismaSortDir },
        skip: needsPostSort ? 0 : skip,
        take: needsPostSort ? 1000 : limit,
      }),
      this.prisma.venue.count({ where }),
    ]);

    let entities = venues.map((v) => this.toEntity(v));

    // Post-query sort for price/rating
    if (needsPostSort) {
      entities = this.applyPostSort(entities, venues, filters.sortBy!, filters.sortOrder ?? 'desc');
      entities = entities.slice(skip, skip + limit);
    }

    return { venues: entities, total };
  }

  async findSimilar(venue: VenueEntity, limit: number): Promise<VenueEntity[]> {
    const venues = await this.prisma.venue.findMany({
      where: {
        id: { not: venue.id },
        status: VenueStatus.ACTIVE,
        isVerified: true,
        OR: [
          { spaceTypeId: venue.spaceTypeId },
          { district: venue.district },
          { city: venue.city },
        ],
      },
      include: this.venueInclude,
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      take: limit,
    });

    return venues.map((v) => this.toEntity(v));
  }

  async findAmenities(includeInactive = false): Promise<AmenityCatalogItem[]> {
    return this.prisma.amenity.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        icon: true,
        sortOrder: true,
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createAmenity(
    data: CatalogItemInput & { category: AmenityCategory },
  ): Promise<AmenityCatalogItem> {
    return this.prisma.amenity.create({
      data: {
        key: data.key,
        name: data.name,
        category: data.category,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateAmenity(
    id: string,
    data: Partial<CatalogItemInput> & { category?: AmenityCategory; isActive?: boolean },
  ): Promise<AmenityCatalogItem> {
    return this.prisma.amenity.update({ where: { id }, data });
  }

  async findSpaceTypes(includeInactive = false): Promise<CatalogItem[]> {
    return this.prisma.spaceType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createSpaceType(data: CatalogItemInput): Promise<CatalogItem> {
    return this.prisma.spaceType.create({
      data: { key: data.key, name: data.name, icon: data.icon, sortOrder: data.sortOrder ?? 0 },
    });
  }

  async updateSpaceType(
    id: string,
    data: Partial<CatalogItemInput> & { isActive?: boolean },
  ): Promise<CatalogItem> {
    return this.prisma.spaceType.update({ where: { id }, data });
  }

  async findUseTypes(includeInactive = false): Promise<CatalogItem[]> {
    return this.prisma.useType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createUseType(data: CatalogItemInput): Promise<CatalogItem> {
    return this.prisma.useType.create({
      data: { key: data.key, name: data.name, icon: data.icon, sortOrder: data.sortOrder ?? 0 },
    });
  }

  async updateUseType(
    id: string,
    data: Partial<CatalogItemInput> & { isActive?: boolean },
  ): Promise<CatalogItem> {
    return this.prisma.useType.update({ where: { id }, data });
  }

  async findSeasonalEvents(includeInactive = false): Promise<SeasonalEventCatalogItem[]> {
    return this.prisma.suggestedSeasonalEvent.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
    });
  }

  async createSeasonalEvent(data: SeasonalEventInput): Promise<SeasonalEventCatalogItem> {
    return this.prisma.suggestedSeasonalEvent.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateSeasonalEvent(
    id: string,
    data: Partial<SeasonalEventInput> & { isActive?: boolean },
  ): Promise<SeasonalEventCatalogItem> {
    return this.prisma.suggestedSeasonalEvent.update({ where: { id }, data });
  }

  async findByStatus(status: string): Promise<VenueEntity[]> {
    const venues = await this.prisma.venue.findMany({
      where: { status: status as VenueStatus },
      include: this.venueInclude,
      orderBy: { createdAt: 'asc' },
    });
    return venues.map((v) => this.toEntity(v));
  }

  async create(data: Record<string, unknown>, ownerId: string): Promise<VenueEntity> {
    const {
      services: rawServices,
      prices: rawPrices,
      amenities: rawAmenities,
      useTypes: rawUseTypes,
      openingHours: rawOpeningHours,
      photos,
      ...venueData
    } = data;

    const createData: Prisma.VenueCreateInput = {
      name: venueData.name as string,
      slug: venueData.slug as string,
      description: venueData.description as string,
      shortDescription: venueData.shortDescription as string | undefined,
      address: venueData.address as string,
      district: venueData.district as string,
      city: (venueData.city as string) ?? 'El Alto',
      latitude:
        venueData.latitude != null ? new Prisma.Decimal(venueData.latitude as number) : undefined,
      longitude:
        venueData.longitude != null ? new Prisma.Decimal(venueData.longitude as number) : undefined,
      capacityMax: venueData.capacityMax as number,
      capacityMin: (venueData.capacityMin as number) ?? 0,
      squareMeters: venueData.squareMeters as number | undefined,
      spaceType: venueData.spaceTypeId
        ? { connect: { id: venueData.spaceTypeId as string } }
        : undefined,
      priceUnit: venueData.priceUnit as PriceUnit | undefined,
      minimumHours: venueData.minimumHours as number | undefined,
      instantBooking: venueData.instantBooking as boolean | undefined,
      allowsMultipleDays: venueData.allowsMultipleDays as boolean | undefined,
      rules: venueData.rules as string | undefined,
      cancellationPolicy: venueData.cancellationPolicy as string | undefined,
      owner: { connect: { id: ownerId } },
    };

    if (Array.isArray(photos)) {
      (createData as Record<string, unknown>).photos = photos;

      if (photos.length > 0) {
        createData.media = {
          create: (photos as string[]).map((url, index) => ({
            type: VenueMediaType.IMAGE,
            url,
            sortOrder: index,
            isCover: index === 0,
          })),
        };
      }
    }

    if (Array.isArray(rawServices) && rawServices.length > 0) {
      createData.services = {
        create: rawServices.map((s) => ({
          name: s.name as string,
          icon: s.icon as string | undefined,
          description: s.description as string | undefined,
          isIncluded: (s.isIncluded as boolean) ?? true,
          extraCost: s.extraCost != null ? new Prisma.Decimal(s.extraCost as number) : undefined,
          sortOrder: (s.sortOrder as number) ?? 0,
        })),
      };
    }

    if (Array.isArray(rawPrices) && rawPrices.length > 0) {
      createData.prices = {
        create: rawPrices.map((p) => ({
          priceType: p.priceType as PriceType,
          dayOfWeek: p.dayOfWeek as number | undefined,
          specificDate: p.specificDate ? new Date(p.specificDate as string) : undefined,
          startDate: p.startDate ? new Date(p.startDate as string) : undefined,
          endDate: p.endDate ? new Date(p.endDate as string) : undefined,
          price: new Prisma.Decimal(p.price as number),
          unit: (p.unit as PriceUnit | undefined) ?? undefined,
          discountPercent:
            p.discountPercent != null ? new Prisma.Decimal(p.discountPercent as number) : undefined,
          discountLabel: p.discountLabel as string | undefined,
        })),
      };
    }

    if (Array.isArray(rawAmenities) && rawAmenities.length > 0) {
      createData.amenities = {
        create: rawAmenities.map((a) => ({
          amenity: { connect: { id: a.amenityId as string } },
          isIncluded: (a.isIncluded as boolean) ?? true,
          extraCost: a.extraCost != null ? new Prisma.Decimal(a.extraCost as number) : undefined,
          notes: a.notes as string | undefined,
        })),
      };
    }

    if (Array.isArray(rawUseTypes) && rawUseTypes.length > 0) {
      createData.uses = {
        create: rawUseTypes.map((u) => ({
          useType: { connect: { id: u.useTypeId as string } },
          isPrimary: (u.isPrimary as boolean) ?? false,
        })),
      };
    }

    if (Array.isArray(rawOpeningHours) && rawOpeningHours.length > 0) {
      createData.openingHours = {
        create: rawOpeningHours.map((h) => ({
          dayOfWeek: h.dayOfWeek as number,
          opensAt: this.timeToDate((h.opensAt as string) ?? '09:00'),
          closesAt: this.timeToDate((h.closesAt as string) ?? '18:00'),
          isClosed: (h.isClosed as boolean) ?? false,
        })),
      };
    }

    const venue = await this.prisma.venue.create({
      data: createData,
      include: this.venueInclude,
    });

    return this.toEntity(venue);
  }

  async update(id: string, data: Record<string, unknown>): Promise<VenueEntity> {
    const {
      services: rawServices,
      prices: rawPrices,
      amenities: rawAmenities,
      useTypes: rawUseTypes,
      openingHours: rawOpeningHours,
      ...venueData
    } = data;

    const updateInput: Prisma.VenueUpdateInput = {};
    if (venueData.name != null) updateInput.name = venueData.name;
    if (venueData.slug != null) updateInput.slug = venueData.slug;
    if (venueData.description != null) updateInput.description = venueData.description;
    if (venueData.shortDescription != null)
      updateInput.shortDescription = venueData.shortDescription;
    if (venueData.address != null) updateInput.address = venueData.address;
    if (venueData.district != null) updateInput.district = venueData.district;
    if (venueData.city != null) updateInput.city = venueData.city;
    if (venueData.latitude != null)
      updateInput.latitude = new Prisma.Decimal(venueData.latitude as number);
    if (venueData.longitude != null)
      updateInput.longitude = new Prisma.Decimal(venueData.longitude as number);
    if (venueData.capacityMax != null) updateInput.capacityMax = venueData.capacityMax;
    if (venueData.capacityMin != null) updateInput.capacityMin = venueData.capacityMin;
    if (venueData.squareMeters != null) updateInput.squareMeters = venueData.squareMeters;
    if (venueData.spaceTypeId != null) {
      updateInput.spaceType = { connect: { id: venueData.spaceTypeId as string } };
    }
    if (venueData.priceUnit != null) updateInput.priceUnit = venueData.priceUnit as PriceUnit;
    if (venueData.minimumHours != null) updateInput.minimumHours = venueData.minimumHours as number;
    if (venueData.instantBooking != null)
      updateInput.instantBooking = venueData.instantBooking as boolean;
    if (venueData.allowsMultipleDays != null)
      updateInput.allowsMultipleDays = venueData.allowsMultipleDays as boolean;
    if (venueData.rules != null) updateInput.rules = venueData.rules;
    if (venueData.cancellationPolicy != null)
      updateInput.cancellationPolicy = venueData.cancellationPolicy;
    if (venueData.status != null) updateInput.status = venueData.status as VenueStatus;
    if (venueData.photos != null) updateInput.photos = venueData.photos;
    if (venueData.videoUrl != null) updateInput.videoUrl = venueData.videoUrl;

    // Replace amenities if provided
    if (Array.isArray(rawAmenities)) {
      updateInput.amenities = {
        deleteMany: {},
        create: rawAmenities.map((a: Record<string, unknown>) => ({
          amenity: { connect: { id: a.amenityId as string } },
          isIncluded: (a.isIncluded as boolean) ?? true,
          extraCost: a.extraCost != null ? new Prisma.Decimal(a.extraCost as number) : undefined,
          notes: a.notes as string | undefined,
        })),
      };
    }

    // Replace use types if provided
    if (Array.isArray(rawUseTypes)) {
      updateInput.uses = {
        deleteMany: {},
        create: rawUseTypes.map((u: Record<string, unknown>) => ({
          useType: { connect: { id: u.useTypeId as string } },
          isPrimary: (u.isPrimary as boolean) ?? false,
        })),
      };
    }

    // Replace opening hours if provided
    if (Array.isArray(rawOpeningHours)) {
      updateInput.openingHours = {
        deleteMany: {},
        create: rawOpeningHours.map((h: Record<string, unknown>) => ({
          dayOfWeek: h.dayOfWeek as number,
          opensAt: this.timeToDate((h.opensAt as string) ?? '09:00'),
          closesAt: this.timeToDate((h.closesAt as string) ?? '18:00'),
          isClosed: (h.isClosed as boolean) ?? false,
        })),
      };
    }

    // Replace services if provided
    if (Array.isArray(rawServices)) {
      updateInput.services = {
        deleteMany: {},
        create: rawServices.map((s: Record<string, unknown>) => ({
          name: s.name as string,
          icon: (s.icon as string) ?? undefined,
          description: (s.description as string) ?? undefined,
          isIncluded: (s.isIncluded as boolean) ?? true,
          extraCost: s.extraCost != null ? new Prisma.Decimal(s.extraCost as number) : undefined,
          sortOrder: (s.sortOrder as number) ?? 0,
        })),
      };
    }

    // Replace prices if provided
    if (Array.isArray(rawPrices)) {
      updateInput.prices = {
        deleteMany: {},
        create: rawPrices.map((p: Record<string, unknown>) => ({
          priceType: p.priceType as PriceType,
          dayOfWeek: p.dayOfWeek as number | undefined,
          specificDate: p.specificDate ? new Date(p.specificDate as string) : undefined,
          startDate: p.startDate ? new Date(p.startDate as string) : undefined,
          endDate: p.endDate ? new Date(p.endDate as string) : undefined,
          price: new Prisma.Decimal(p.price as number),
          unit: (p.unit as PriceUnit | undefined) ?? undefined,
          discountPercent:
            p.discountPercent != null ? new Prisma.Decimal(p.discountPercent as number) : undefined,
          discountLabel: (p.discountLabel as string) ?? undefined,
        })),
      };
    }

    const venue = await this.prisma.venue.update({
      where: { id },
      data: updateInput,
      include: this.venueInclude,
    });

    return this.toEntity(venue);
  }

  async addMedia(venueId: string, urls: string[]): Promise<VenueMediaEntity[]> {
    const existing = await this.prisma.venueMedia.findMany({
      where: { venueId },
      select: { sortOrder: true, isCover: true },
    });
    const hasCover = existing.some((item) => item.isCover);
    const nextSortOrder = existing.length
      ? Math.max(...existing.map((item) => item.sortOrder)) + 1
      : 0;

    await this.prisma.venueMedia.createMany({
      data: urls.map((url, index) => ({
        venueId,
        type: VenueMediaType.IMAGE,
        url,
        sortOrder: nextSortOrder + index,
        isCover: !hasCover && index === 0,
      })),
    });

    return this.listMedia(venueId);
  }

  async deleteMedia(venueId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.venueMedia.findFirst({ where: { id: mediaId, venueId } });
    if (!media) return;

    await this.prisma.venueMedia.delete({ where: { id: mediaId } });

    if (media.isCover) {
      const next = await this.prisma.venueMedia.findFirst({
        where: { venueId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.venueMedia.update({ where: { id: next.id }, data: { isCover: true } });
      }
    }
  }

  async reorderMedia(
    venueId: string,
    order: string[],
    coverId?: string,
  ): Promise<VenueMediaEntity[]> {
    await this.prisma.$transaction(
      order.map((mediaId, index) =>
        this.prisma.venueMedia.updateMany({
          where: { id: mediaId, venueId },
          data: {
            sortOrder: index,
            ...(coverId ? { isCover: mediaId === coverId } : {}),
          },
        }),
      ),
    );

    return this.listMedia(venueId);
  }

  private async listMedia(venueId: string): Promise<VenueMediaEntity[]> {
    const media = await this.prisma.venueMedia.findMany({
      where: { venueId },
      orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
    });

    return media.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      alt: item.alt,
      sortOrder: item.sortOrder,
      isCover: item.isCover,
    }));
  }

  async updateStatus(id: string, status: string, verifiedById?: string): Promise<VenueEntity> {
    const updateData: Prisma.VenueUpdateInput = {
      status: status as VenueStatus,
    };

    if (status === 'ACTIVE' && verifiedById) {
      updateData.isVerified = true;
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = { connect: { id: verifiedById } };
    } else if (status === 'REJECTED') {
      updateData.isVerified = false;
      updateData.verifiedAt = null;
      updateData.verifiedBy = { disconnect: true };
    }

    const venue = await this.prisma.venue.update({
      where: { id },
      data: updateData,
      include: this.venueInclude,
    });

    return this.toEntity(venue);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.venue.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.INACTIVE },
    });
  }

  async findOwnerContact(
    venueId: string,
  ): Promise<{ id: string; email: string; phone: string; fullName: string } | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { owner: { select: { id: true, email: true, phone: true, fullName: true } } },
    });
    return venue?.owner ?? null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      select: { id: true },
    });
    return venue !== null;
  }

  private applyPostSort(
    entities: VenueEntity[],
    rawVenues: Record<string, unknown>[],
    sortBy: SortField,
    sortOrder: string,
  ): VenueEntity[] {
    const dir =
      sortBy === SortField.PRICE_ASC
        ? 1
        : sortBy === SortField.PRICE_DESC || sortBy === SortField.RATING_DESC
          ? -1
          : sortOrder === 'asc'
            ? 1
            : -1;

    return entities
      .map((entity, i) => {
        const raw = rawVenues[i];
        let sortValue: number;

        if (
          sortBy === SortField.PRICE ||
          sortBy === SortField.PRICE_ASC ||
          sortBy === SortField.PRICE_DESC
        ) {
          const prices = (raw as Record<string, unknown>).prices as
            | Record<string, unknown>[]
            | undefined;
          sortValue = prices && prices.length > 0 ? Number(prices[0].price ?? 0) : 0;
        } else if (sortBy === SortField.RATING || sortBy === SortField.RATING_DESC) {
          const reviews = (raw as Record<string, unknown>).reviews as
            | Record<string, unknown>[]
            | undefined;
          if (reviews && reviews.length > 0) {
            const sum = reviews.reduce(
              (acc: number, r: Record<string, unknown>) => acc + (Number(r.rating) || 0),
              0,
            );
            sortValue = sum / reviews.length;
          } else {
            sortValue = 0;
          }
        } else {
          sortValue = 0;
        }

        return { entity, sortValue };
      })
      .sort((a, b) => (a.sortValue - b.sortValue) * dir)
      .map((item) => item.entity);
  }

  private hasAmenityKey(key: string): Prisma.VenueWhereInput {
    return {
      amenities: {
        some: {
          isIncluded: true,
          amenity: { key },
        },
      },
    };
  }

  private timeToDate(value: string): Date {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  private resolveSortDirection(sortBy?: SortField, sortOrder?: string): Prisma.SortOrder {
    if (
      sortBy === SortField.CAPACITY_DESC ||
      sortBy === SortField.FEATURED ||
      sortBy === SortField.NEWEST
    ) {
      return 'desc';
    }

    return (sortOrder ?? 'desc') as Prisma.SortOrder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(raw: any): VenueEntity {
    const photos = raw.photos;
    return new VenueEntity({
      id: raw.id,
      ownerId: raw.ownerId,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      shortDescription: raw.shortDescription,
      address: raw.address,
      district: raw.district,
      city: raw.city,
      state: raw.state,
      country: raw.country,
      latitude: raw.latitude != null ? Number(raw.latitude) : null,
      longitude: raw.longitude != null ? Number(raw.longitude) : null,
      capacityMin: raw.capacityMin,
      capacityMax: raw.capacityMax,
      spaceTypeId: raw.spaceTypeId,
      spaceType: raw.spaceType
        ? {
            id: raw.spaceType.id,
            key: raw.spaceType.key,
            name: raw.spaceType.name,
            icon: raw.spaceType.icon,
          }
        : null,
      minimumHours: raw.minimumHours,
      priceUnit: raw.priceUnit,
      instantBooking: raw.instantBooking,
      allowsMultipleDays: raw.allowsMultipleDays,
      squareMeters: raw.squareMeters,
      photos: Array.isArray(photos)
        ? (photos as string[])
        : typeof photos === 'string'
          ? (() => {
              try {
                return JSON.parse(photos) as string[];
              } catch {
                return [];
              }
            })()
          : [],
      videoUrl: raw.videoUrl,
      rules: raw.rules,
      cancellationPolicy: raw.cancellationPolicy,
      status: raw.status as VenueStatus,
      isVerified: raw.isVerified,
      verifiedAt: raw.verifiedAt,
      verifiedById: raw.verifiedById,
      isFeatured: raw.isFeatured,
      featuredUntil: raw.featuredUntil,
      viewCount: raw.viewCount,
      bookingCount: raw.bookingCount,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      services: raw.services?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) =>
          new VenueServiceEntity({
            ...s,
            extraCost: s.extraCost != null ? Number(s.extraCost) : null,
          }),
      ),
      prices: raw.prices?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          new VenuePriceEntity({
            ...p,
            price: Number(p.price),
            discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
          }),
      ),
      amenities: raw.amenities?.map((item: RawVenueAmenity) => ({
        id: item.id,
        isIncluded: item.isIncluded,
        extraCost: item.extraCost != null ? Number(item.extraCost) : null,
        notes: item.notes,
        amenity: {
          id: item.amenity.id,
          key: item.amenity.key,
          name: item.amenity.name,
          category: item.amenity.category,
          icon: item.amenity.icon,
        },
      })),
      uses: raw.uses?.map((item: RawVenueUse) => ({
        id: item.id,
        useTypeId: item.useTypeId,
        useType: {
          id: item.useType.id,
          key: item.useType.key,
          name: item.useType.name,
          icon: item.useType.icon,
        },
        isPrimary: item.isPrimary,
      })),
      openingHours: raw.openingHours?.map((item: RawVenueOpeningHour) => ({
        id: item.id,
        dayOfWeek: item.dayOfWeek,
        opensAt: this.formatTime(item.opensAt),
        closesAt: this.formatTime(item.closesAt),
        isClosed: item.isClosed,
      })),
      media: raw.media?.map((item: RawVenueMedia) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        alt: item.alt,
        sortOrder: item.sortOrder,
        isCover: item.isCover,
      })),
      owner: raw.owner,
      reviewCount: raw._count?.reviews ?? 0,
      averageRating: this.computeAverageRating(raw.reviews),
    });
  }

  private computeAverageRating(reviews?: { rating: number }[]): number | undefined {
    if (!reviews?.length) return undefined;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  private formatTime(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 5);
    }

    return value.toISOString().slice(11, 16);
  }
}
