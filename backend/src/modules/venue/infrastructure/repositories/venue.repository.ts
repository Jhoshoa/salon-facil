import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IVenueRepository } from '../../domain/repositories/venue.repository.interface';
import { VenueEntity, VenueStatus } from '../../domain/entities/venue.entity';
import { VenueServiceEntity } from '../../domain/entities/venue-service.entity';
import { VenuePriceEntity } from '../../domain/entities/venue-price.entity';
import { VenueFilterDto, SortField } from '../../application/dto/venue-filter.dto';
import { Prisma, PriceType } from '@prisma/client';

@Injectable()
export class VenueRepository implements IVenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<VenueEntity | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });
    return venue ? this.toEntity(venue) : null;
  }

  async findBySlug(slug: string): Promise<VenueEntity | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });
    return venue ? this.toEntity(venue) : null;
  }

  async findByOwner(ownerId: string): Promise<VenueEntity[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
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
        { services: { some: { name: { contains: filters.query, mode: 'insensitive' } } } },
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
    if (filters.maxCapacity != null) {
      where.capacityMin = { lte: filters.maxCapacity };
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
      where.AND = [
        {
          bookings: {
            none: {
              eventDate: {
                gte: startDate,
                lte: endDate,
              },
              status: {
                in: ['PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID'],
              },
            },
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
      ];
    }

    // For price/rating sort, we can't sort directly in Prisma.
    // Fetch with a reasonable sort then sort in-memory.
    const needsPostSort = filters.sortBy === SortField.PRICE || filters.sortBy === SortField.RATING;

    const prismaSortBy = needsPostSort
      ? 'createdAt'
      : filters.sortBy === SortField.CAPACITY
        ? 'capacityMax'
        : (filters.sortBy ?? 'createdAt');
    const prismaSortDir = (filters.sortOrder ?? 'desc') as Prisma.SortOrder;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: {
          services: { orderBy: { sortOrder: 'asc' } },
          prices: { where: { isActive: true } },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true } },
        },
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

  async create(data: Record<string, unknown>, ownerId: string): Promise<VenueEntity> {
    const { services: rawServices, prices: rawPrices, photos, ...venueData } = data;

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
      rules: venueData.rules as string | undefined,
      cancellationPolicy: venueData.cancellationPolicy as string | undefined,
      owner: { connect: { id: ownerId } },
    };

    if (Array.isArray(photos)) {
      (createData as Record<string, unknown>).photos = photos;
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
          discountPercent:
            p.discountPercent != null ? new Prisma.Decimal(p.discountPercent as number) : undefined,
          discountLabel: p.discountLabel as string | undefined,
        })),
      };
    }

    const venue = await this.prisma.venue.create({
      data: createData,
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });

    return this.toEntity(venue);
  }

  async update(id: string, data: Record<string, unknown>): Promise<VenueEntity> {
    const { services: rawServices, prices: rawPrices, ...venueData } = data;

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
    if (venueData.rules != null) updateInput.rules = venueData.rules;
    if (venueData.cancellationPolicy != null)
      updateInput.cancellationPolicy = venueData.cancellationPolicy;
    if (venueData.status != null) updateInput.status = venueData.status as VenueStatus;
    if (venueData.photos != null) updateInput.photos = venueData.photos;
    if (venueData.videoUrl != null) updateInput.videoUrl = venueData.videoUrl;

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
          discountPercent:
            p.discountPercent != null ? new Prisma.Decimal(p.discountPercent as number) : undefined,
          discountLabel: (p.discountLabel as string) ?? undefined,
        })),
      };
    }

    const venue = await this.prisma.venue.update({
      where: { id },
      data: updateInput,
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });

    return this.toEntity(venue);
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
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: { select: { reviews: true } },
      },
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
    const dir = sortOrder === 'asc' ? 1 : -1;

    return entities
      .map((entity, i) => {
        const raw = rawVenues[i];
        let sortValue: number;

        if (sortBy === SortField.PRICE) {
          const prices = (raw as Record<string, unknown>).prices as
            | Record<string, unknown>[]
            | undefined;
          sortValue = prices && prices.length > 0 ? Number(prices[0].price ?? 0) : 0;
        } else if (sortBy === SortField.RATING) {
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
        (s: any) => new VenueServiceEntity(s),
      ),
      prices: raw.prices?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          new VenuePriceEntity({
            ...p,
            price: Number(p.price),
          }),
      ),
      owner: raw.owner,
      reviewCount: raw._count?.reviews ?? 0,
    });
  }
}
