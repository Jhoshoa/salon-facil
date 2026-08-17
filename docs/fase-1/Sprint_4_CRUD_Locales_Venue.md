# 🏛️ Sprint 4: CRUD de Locales (Venue) — Crear, Leer, Actualizar, Buscar

**Proyecto:** SalónFácil — Plataforma de Alquiler de Locales para Eventos  
**Fase:** 1 — Setup y Fundación  
**Sprint:** 4 de 6  
**Duración estimada:** 3–4 días  
**Stack:** NestJS + Prisma + Clean Architecture + Cloudinary

---

## 📋 Índice

1. [Objetivo del Sprint](#1-objetivo-del-sprint)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Arquitectura del Módulo Venue](#3-arquitectura-del-módulo-venue)
4. [Entidades de Dominio](#4-entidades-de-dominio)
5. [DTOs y Validación](#5-dtos-y-validación)
6. [Repository Interface e Implementación](#6-repository-interface-e-implementación)
7. [Servicios de Negocio](#7-servicios-de-negocio)
8. [Use Cases](#8-use-cases)
9. [Upload de Fotos (Cloudinary)](#9-upload-de-fotos-cloudinary)
10. [Controller REST](#10-controller-rest)
11. [Search y Filtros](#11-search-y-filtros)
12. [Tests](#12-tests)
13. [Criterios de Aceptación](#13-criterios-de-aceptación)
14. [Precauciones y Mejores Prácticas](#14-precauciones-y-mejores-prácticas)
15. [Checklist de Completitud](#15-checklist-de-completitud)

---

## 1. Objetivo del Sprint

Implementar el módulo completo de locales con:
- ✅ CRUD de locales (crear, leer, actualizar, eliminar lógico)
- ✅ Gestión de servicios incluidos por local
- ✅ Configuración de precios dinámicos (base, weekend, season, holiday)
- ✅ Upload de fotos a Cloudinary
- ✅ Búsqueda con filtros (ubicación, capacidad, precio, disponibilidad)
- ✅ Slug SEO-friendly automático
- ✅ Protección por ownership (solo el dueño puede editar su local)
- ✅ Verificación por admin antes de publicar

**Al finalizar este sprint, los dueños deben poder registrar sus locales y los clientes deben poder buscarlos con filtros.**

---

## 2. Prerrequisitos

- Sprint 1, 2, 3 completados
- Auth funcional (JWT, roles, guards)
- Cloudinary account creado (cloud name, API key, API secret)
- Seed data con usuarios OWNER existentes

---

## 3. Arquitectura del Módulo Venue

```
modules/venue/
├── domain/
│   ├── entities/
│   │   ├── venue.entity.ts
│   │   ├── venue-service.entity.ts
│   │   └── venue-price.entity.ts
│   └── repositories/
│       └── venue.repository.interface.ts
├── application/
│   ├── dto/
│   │   ├── create-venue.dto.ts
│   │   ├── update-venue.dto.ts
│   │   ├── venue-filter.dto.ts
│   │   ├── venue-response.dto.ts
│   │   ├── create-venue-service.dto.ts
│   │   └── create-venue-price.dto.ts
│   ├── services/
│   │   ├── venue.service.ts
│   │   ├── venue-search.service.ts
│   │   └── slug.service.ts
│   └── use-cases/
│       ├── create-venue.use-case.ts
│       ├── update-venue.use-case.ts
│       ├── get-venue-by-slug.use-case.ts
│       ├── search-venues.use-case.ts
│       └── delete-venue.use-case.ts
├── infrastructure/
│   ├── repositories/
│   │   └── venue.repository.ts
│   └── search/
│       └── venue-search.builder.ts
└── interface/
    ├── venue.controller.ts
    └── venue.module.ts
```

---

## 4. Entidades de Dominio

```typescript
// modules/venue/domain/entities/venue.entity.ts
import { UserEntity } from '../../auth/domain/entities/user.entity';

export enum VenueStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
}

export class VenueEntity {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  address: string;
  district: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  capacityMin: number;
  capacityMax: number;
  squareMeters: number | null;
  photos: string[];
  videoUrl: string | null;
  rules: string | null;
  cancellationPolicy: string | null;
  status: VenueStatus;
  isVerified: boolean;
  verifiedAt: Date | null;
  verifiedById: string | null;
  isFeatured: boolean;
  featuredUntil: Date | null;
  viewCount: number;
  bookingCount: number;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  services?: VenueServiceEntity[];
  prices?: VenuePriceEntity[];
  owner?: UserEntity;

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

// modules/venue/domain/entities/venue-service.entity.ts
export class VenueServiceEntity {
  id: string;
  venueId: string;
  name: string;
  icon: string | null;
  description: string | null;
  isIncluded: boolean;
  extraCost: number | null;
  sortOrder: number;
  createdAt: Date;

  constructor(partial: Partial<VenueServiceEntity>) {
    Object.assign(this, partial);
  }
}

// modules/venue/domain/entities/venue-price.entity.ts
export enum PriceType {
  BASE = 'BASE',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
  CUSTOM_DATE = 'CUSTOM_DATE',
  SEASON_HIGH = 'SEASON_HIGH',
  EARLY_BIRD = 'EARLY_BIRD',
}

export class VenuePriceEntity {
  id: string;
  venueId: string;
  priceType: PriceType;
  dayOfWeek: number | null;
  specificDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  price: number;
  currency: string;
  discountPercent: number | null;
  discountLabel: string | null;
  isActive: boolean;
  createdAt: Date;

  constructor(partial: Partial<VenuePriceEntity>) {
    Object.assign(this, partial);
  }

  isApplicable(date: Date): boolean {
    if (!this.isActive) return false;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Fecha específica
    if (this.specificDate) {
      const specific = new Date(this.specificDate);
      specific.setHours(0, 0, 0, 0);
      return checkDate.getTime() === specific.getTime();
    }

    // Rango de fechas
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    }

    // Día de la semana
    if (this.dayOfWeek !== null) {
      return checkDate.getDay() === this.dayOfWeek;
    }

    return true; // BASE price
  }
}
```

---

## 5. DTOs y Validación

```typescript
// modules/venue/application/dto/create-venue.dto.ts
import { IsString, MinLength, MaxLength, IsNumber, Min, Max, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class CreateVenueServiceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isIncluded?: boolean = true;

  @IsOptional()
  @IsNumber()
  extraCost?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class CreateVenuePriceDto {
  @IsString()
  priceType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  specificDate?: Date;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  discountLabel?: string;
}

export class CreateVenueDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsString()
  @MinLength(20, { message: 'La descripción debe tener al menos 20 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shortDescription?: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsString()
  district: string;

  @IsOptional()
  @IsString()
  city?: string = 'El Alto';

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsNumber()
  @Min(1)
  @Max(5000)
  capacityMax: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityMin?: number = 0;

  @IsOptional()
  @IsNumber()
  squareMeters?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[] = [];

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVenueServiceDto)
  services?: CreateVenueServiceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVenuePriceDto)
  prices?: CreateVenuePriceDto[];
}
```

```typescript
// modules/venue/application/dto/update-venue.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateVenueDto } from './create-venue.dto';

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}
```

```typescript
// modules/venue/application/dto/venue-filter.dto.ts
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortField {
  PRICE = 'price',
  CAPACITY = 'capacity',
  RATING = 'rating',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class VenueFilterDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  query?: string; // Búsqueda por nombre

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => parseInt(value))
  minCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => parseInt(value))
  maxCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  maxPrice?: number;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  date?: Date; // Verificar disponibilidad

  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}
```

---

## 6. Repository Interface e Implementación

```typescript
// modules/venue/domain/repositories/venue.repository.interface.ts
import { VenueEntity } from '../entities/venue.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';

export const VENUE_REPOSITORY = Symbol('VENUE_REPOSITORY');

export interface IVenueRepository {
  findById(id: string): Promise<VenueEntity | null>;
  findBySlug(slug: string): Promise<VenueEntity | null>;
  findByOwner(ownerId: string): Promise<VenueEntity[]>;
  search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }>;
  create(data: any, ownerId: string): Promise<VenueEntity>;
  update(id: string, data: any): Promise<VenueEntity>;
  updateStatus(id: string, status: string): Promise<VenueEntity>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
}
```

```typescript
// modules/venue/infrastructure/repositories/venue.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IVenueRepository } from '../../domain/repositories/venue.repository.interface';
import { VenueEntity, VenueStatus } from '../../domain/entities/venue.entity';
import { VenueServiceEntity } from '../../domain/entities/venue-service.entity';
import { VenuePriceEntity, PriceType } from '../../domain/entities/venue-price.entity';
import { VenueFilterDto } from '../../application/dto/venue-filter.dto';

@Injectable()
export class VenueRepository implements IVenueRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<VenueEntity | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        services: { orderBy: { sortOrder: 'asc' } },
        prices: { where: { isActive: true } },
        owner: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
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
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
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
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return venues.map((v) => this.toEntity(v));
  }

  async search(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number }> {
    const where: any = {
      status: VenueStatus.ACTIVE,
      isVerified: true,
    };

    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.district) where.district = { contains: filters.district, mode: 'insensitive' };
    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }
    if (filters.minCapacity) where.capacityMax = { gte: filters.minCapacity };
    if (filters.maxCapacity) where.capacityMax = { lte: filters.maxCapacity };

    // Filtro por disponibilidad de fecha
    if (filters.date) {
      where.NOT = {
        bookings: {
          some: {
            eventDate: filters.date,
            status: { in: ['PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID'] },
          },
        },
      };
      where.calendarBlocks = {
        none: { date: filters.date },
      };
    }

    const skip = (filters.page - 1) * filters.limit;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: {
          services: { where: { isIncluded: true }, take: 5 },
          prices: { where: { priceType: 'BASE' }, take: 1 },
          reviews: { select: { rating: true }, take: 1 },
        },
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      venues: venues.map((v) => this.toEntity(v)),
      total,
    };
  }

  async create(data: any, ownerId: string): Promise<VenueEntity> {
    const { services, prices, ...venueData } = data;

    const venue = await this.prisma.venue.create({
      data: {
        ...venueData,
        ownerId,
        status: VenueStatus.DRAFT,
        services: services?.length
          ? { create: services }
          : undefined,
        prices: prices?.length
          ? { create: prices }
          : undefined,
      },
      include: {
        services: true,
        prices: true,
      },
    });

    return this.toEntity(venue);
  }

  async update(id: string, data: any): Promise<VenueEntity> {
    const { services, prices, ...venueData } = data;

    const venue = await this.prisma.venue.update({
      where: { id },
      data: {
        ...venueData,
        ...(services && {
          services: {
            deleteMany: {},
            create: services,
          },
        }),
        ...(prices && {
          prices: {
            deleteMany: {},
            create: prices,
          },
        }),
      },
      include: {
        services: true,
        prices: true,
      },
    });

    return this.toEntity(venue);
  }

  async updateStatus(id: string, status: string): Promise<VenueEntity> {
    const venue = await this.prisma.venue.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACTIVE' && { isVerified: true, verifiedAt: new Date() }),
      },
      include: { services: true, prices: true },
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
      data: { status: VenueStatus.INACTIVE, isActive: false },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.venue.count({ where: { slug } });
    return count > 0;
  }

  private toEntity(prismaVenue: any): VenueEntity {
    return new VenueEntity({
      id: prismaVenue.id,
      ownerId: prismaVenue.ownerId,
      name: prismaVenue.name,
      slug: prismaVenue.slug,
      description: prismaVenue.description,
      shortDescription: prismaVenue.shortDescription,
      address: prismaVenue.address,
      district: prismaVenue.district,
      city: prismaVenue.city,
      state: prismaVenue.state,
      country: prismaVenue.country,
      latitude: prismaVenue.latitude ? Number(prismaVenue.latitude) : null,
      longitude: prismaVenue.longitude ? Number(prismaVenue.longitude) : null,
      capacityMin: prismaVenue.capacityMin,
      capacityMax: prismaVenue.capacityMax,
      squareMeters: prismaVenue.squareMeters,
      photos: Array.isArray(prismaVenue.photos) ? prismaVenue.photos : JSON.parse(prismaVenue.photos || '[]'),
      videoUrl: prismaVenue.videoUrl,
      rules: prismaVenue.rules,
      cancellationPolicy: prismaVenue.cancellationPolicy,
      status: prismaVenue.status as VenueStatus,
      isVerified: prismaVenue.isVerified,
      verifiedAt: prismaVenue.verifiedAt,
      verifiedById: prismaVenue.verifiedById,
      isFeatured: prismaVenue.isFeatured,
      featuredUntil: prismaVenue.featuredUntil,
      viewCount: prismaVenue.viewCount,
      bookingCount: prismaVenue.bookingCount,
      createdAt: prismaVenue.createdAt,
      updatedAt: prismaVenue.updatedAt,
      services: prismaVenue.services?.map((s: any) => new VenueServiceEntity(s)),
      prices: prismaVenue.prices?.map((p: any) => new VenuePriceEntity({
        ...p,
        price: Number(p.price),
        extraCost: p.extraCost ? Number(p.extraCost) : null,
      })),
      owner: prismaVenue.owner,
    });
  }
}
```

---

## 7. Servicios de Negocio

### 7.1 Slug Service

```typescript
// modules/venue/application/services/slug.service.ts
import { Injectable } from '@nestjs/common';
import { IVenueRepository, VENUE_REPOSITORY } from '../../domain/repositories/venue.repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class SlugService {
  constructor(
    @Inject(VENUE_REPOSITORY)
    private venueRepository: IVenueRepository,
  ) {}

  async generateSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.venueRepository.existsBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private slugify(text: string): string {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '') // Remove accents
      .toLowerCase()
      .trim()
      .replace(/\\s+/g, '-')           // Replace spaces with -
      .replace(/[^\\w\\-]+/g, '')       // Remove non-word chars
      .replace(/\\-\\-+/g, '-');        // Replace multiple - with single -
  }
}
```

### 7.2 Venue Service

```typescript
// modules/venue/application/services/venue.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IVenueRepository, VENUE_REPOSITORY } from '../../domain/repositories/venue.repository.interface';
import { VenueEntity, VenueStatus } from '../../domain/entities/venue.entity';
import { SlugService } from './slug.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@Injectable()
export class VenueService {
  constructor(
    @Inject(VENUE_REPOSITORY)
    private venueRepository: IVenueRepository,
    private slugService: SlugService,
  ) {}

  async create(dto: CreateVenueDto, ownerId: string): Promise<VenueEntity> {
    const slug = await this.slugService.generateSlug(dto.name);

    const venue = await this.venueRepository.create(
      {
        ...dto,
        slug,
        photos: dto.photos || [],
      },
      ownerId,
    );

    return venue;
  }

  async findBySlug(slug: string): Promise<VenueEntity> {
    const venue = await this.venueRepository.findBySlug(slug);
    if (!venue) {
      throw new NotFoundException(`Local con slug '${slug}' no encontrado`);
    }

    // Incrementar contador de vistas (async, no bloquea response)
    this.venueRepository.incrementViewCount(venue.id).catch(() => {});

    return venue;
  }

  async findById(id: string): Promise<VenueEntity> {
    const venue = await this.venueRepository.findById(id);
    if (!venue) {
      throw new NotFoundException(`Local con ID '${id}' no encontrado`);
    }
    return venue;
  }

  async findByOwner(ownerId: string): Promise<VenueEntity[]> {
    return this.venueRepository.findByOwner(ownerId);
  }

  async update(
    id: string,
    dto: UpdateVenueDto,
    userId: string,
    userRole: UserRole,
  ): Promise<VenueEntity> {
    const venue = await this.findById(id);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }

    // Si cambia el nombre, regenerar slug
    let slug = venue.slug;
    if (dto.name && dto.name !== venue.name) {
      slug = await this.slugService.generateSlug(dto.name);
    }

    return this.venueRepository.update(id, { ...dto, slug });
  }

  async delete(id: string, userId: string, userRole: UserRole): Promise<void> {
    const venue = await this.findById(id);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para eliminar este local');
    }

    await this.venueRepository.softDelete(id);
  }

  async verifyVenue(id: string, adminId: string): Promise<VenueEntity> {
    return this.venueRepository.updateStatus(id, VenueStatus.ACTIVE);
  }
}
```

---

## 8. Use Cases

```typescript
// modules/venue/application/use-cases/create-venue.use-case.ts
import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { VenueEntity } from '../../domain/entities/venue.entity';

@Injectable()
export class CreateVenueUseCase {
  constructor(private venueService: VenueService) {}

  async execute(dto: CreateVenueDto, ownerId: string): Promise<VenueEntity> {
    return this.venueService.create(dto, ownerId);
  }
}
```

```typescript
// modules/venue/application/use-cases/get-venue-by-slug.use-case.ts
import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { VenueEntity } from '../../domain/entities/venue.entity';

@Injectable()
export class GetVenueBySlugUseCase {
  constructor(private venueService: VenueService) {}

  async execute(slug: string): Promise<VenueEntity> {
    return this.venueService.findBySlug(slug);
  }
}
```

```typescript
// modules/venue/application/use-cases/search-venues.use-case.ts
import { Injectable } from '@nestjs/common';
import { VenueRepository } from '../../infrastructure/repositories/venue.repository';
import { VenueFilterDto } from '../dto/venue-filter.dto';
import { VenueEntity } from '../../domain/entities/venue.entity';

@Injectable()
export class SearchVenuesUseCase {
  constructor(private venueRepository: VenueRepository) {}

  async execute(filters: VenueFilterDto): Promise<{ venues: VenueEntity[]; total: number; page: number; totalPages: number }> {
    const { venues, total } = await this.venueRepository.search(filters);
    const totalPages = Math.ceil(total / filters.limit);

    return { venues, total, page: filters.page, totalPages };
  }
}
```

---

## 9. Upload de Fotos (Cloudinary)

```typescript
// modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadModule {}
```

```typescript
// modules/upload/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder: string,
    filename: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.config.get('CLOUDINARY_FOLDER')}/${folder}`,
          public_id: filename,
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto:good', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  async uploadMultiple(
    files: Array<{ buffer: Buffer; originalname: string }>,
    folder: string,
  ): Promise<string[]> {
    const uploads = files.map((file, index) =>
      this.uploadImage(file.buffer, folder, `${Date.now()}-${index}`),
    );
    return Promise.all(uploads);
  }
}
```

---

## 10. Controller REST

```typescript
// modules/venue/interface/venue.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserEntity, UserRole } from '../../../auth/domain/entities/user.entity';
import { CreateVenueUseCase } from '../application/use-cases/create-venue.use-case';
import { GetVenueBySlugUseCase } from '../application/use-cases/get-venue-by-slug.use-case';
import { SearchVenuesUseCase } from '../application/use-cases/search-venues.use-case';
import { VenueService } from '../application/services/venue.service';
import { CloudinaryService } from '../../upload/cloudinary.service';
import { CreateVenueDto } from '../application/dto/create-venue.dto';
import { UpdateVenueDto } from '../application/dto/update-venue.dto';
import { VenueFilterDto } from '../application/dto/venue-filter.dto';

@ApiTags('Venues')
@Controller('venues')
export class VenueController {
  constructor(
    private createVenueUseCase: CreateVenueUseCase,
    private getVenueBySlugUseCase: GetVenueBySlugUseCase,
    private searchVenuesUseCase: SearchVenuesUseCase,
    private venueService: VenueService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ========== PUBLIC ENDPOINTS ==========

  @Get()
  @ApiOperation({ summary: 'Buscar locales con filtros' })
  async search(@Query() filters: VenueFilterDto) {
    return this.searchVenuesUseCase.execute(filters);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener local por slug' })
  async getBySlug(@Param('slug') slug: string) {
    return this.getVenueBySlugUseCase.execute(slug);
  }

  // ========== PROTECTED ENDPOINTS (OWNER) ==========

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Crear nuevo local' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateVenueDto,
    @CurrentUser() user: UserEntity,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Subir fotos si hay
    if (files?.length) {
      const fileBuffers = files.map((f) => ({ buffer: f.buffer, originalname: f.originalname }));
      const photoUrls = await this.cloudinaryService.uploadMultiple(fileBuffers, `venues/${user.id}`);
      dto.photos = [...(dto.photos || []), ...photoUrls];
    }

    return this.createVenueUseCase.execute(dto, user.id);
  }

  @Get('my/venues')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener mis locales' })
  async getMyVenues(@CurrentUser() user: UserEntity) {
    return this.venueService.findByOwner(user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Actualizar local' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: UserEntity,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) {
      const fileBuffers = files.map((f) => ({ buffer: f.buffer, originalname: f.originalname }));
      const photoUrls = await this.cloudinaryService.uploadMultiple(fileBuffers, `venues/${user.id}`);
      dto.photos = [...(dto.photos || []), ...photoUrls];
    }

    return this.venueService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar local (soft delete)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    await this.venueService.delete(id, user.id, user.role);
  }

  // ========== ADMIN ENDPOINTS ==========

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verificar local (admin)' })
  async verify(
    @Param('id') id: string,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.venueService.verifyVenue(id, admin.id);
  }
}
```

---

## 11. Venue Module

```typescript
// modules/venue/interface/venue.module.ts
import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from '../application/services/venue.service';
import { SlugService } from '../application/services/slug.service';
import { CreateVenueUseCase } from '../application/use-cases/create-venue.use-case';
import { GetVenueBySlugUseCase } from '../application/use-cases/get-venue-by-slug.use-case';
import { SearchVenuesUseCase } from '../application/use-cases/search-venues.use-case';
import { VenueRepository } from '../infrastructure/repositories/venue.repository';
import { VENUE_REPOSITORY } from '../domain/repositories/venue.repository.interface';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UploadModule } from '../../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [VenueController],
  providers: [
    VenueService,
    SlugService,
    CreateVenueUseCase,
    GetVenueBySlugUseCase,
    SearchVenuesUseCase,
    {
      provide: VENUE_REPOSITORY,
      useClass: VenueRepository,
    },
  ],
  exports: [VenueService, VENUE_REPOSITORY],
})
export class VenueModule {}
```

---

## 12. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| CA1 | Crear local como OWNER devuelve venue con slug | `POST /api/v1/venues` con token OWNER → 201 con slug generado |
| CA2 | Slug es único y SEO-friendly | Crear 2 locales con mismo nombre → slugs diferentes (`salon`, `salon-1`) |
| CA3 | Buscar locales sin auth funciona | `GET /api/v1/venues` sin token → 200 con lista |
| CA4 | Filtros de búsqueda funcionan | `GET /api/v1/venues?district=Distrito+3&minCapacity=100` → resultados filtrados |
| CA5 | Ver local por slug funciona | `GET /api/v1/venues/salon-imperial` → 200 con datos completos |
| CA6 | Solo OWNER puede editar su local | OWNER A intenta editar local de OWNER B → 403 |
| CA7 | ADMIN puede verificar local | `PUT /api/v1/venues/:id/verify` como ADMIN → status ACTIVE |
| CA8 | Upload de fotos a Cloudinary funciona | `POST /api/v1/venues` con multipart/form-data → fotos en Cloudinary |
| CA9 | Soft delete funciona | `DELETE /api/v1/venues/:id` → local pasa a INACTIVE, no se borra de DB |
| CA10 | Precios dinámicos se guardan | Crear local con prices array → se guardan en venue_prices |
| CA11 | Servicios se guardan con orden | Crear local con services → se ordenan por sortOrder |

---

## 13. Precauciones y Mejores Prácticas

| # | Precaución | Por qué | Cómo mitigar |
|---|-----------|---------|--------------|
| P1 | **Validar tipo MIME de fotos** | Alguien podría subir un ejecutable disfrazado de imagen. | Verificar `file.mimetype` está en `['image/jpeg', 'image/png', 'image/webp']`. |
| P2 | **Límite de tamaño de fotos** | Fotos de 50MB saturan Cloudinary y la app. | `FilesInterceptor` con `limits: { fileSize: 5 * 1024 * 1024 }` (5MB). |
| P3 | **Máximo 20 fotos por local** | Demasiadas fotos = página lenta. | Validar `files.length <= 20` en controller. |
| P4 | **Slug único automático** | Slugs duplicados rompen URLs. | `SlugService` verifica existencia y añade sufijo numérico. |
| P5 | **Sanitizar descripción HTML** | Si permitimos HTML, es riesgo de XSS. | No permitir HTML. Usar texto plano o markdown (futuro). |
| P6 | **No exponer datos del owner** | Teléfono del owner no debe ser público hasta reserva. | En búsqueda pública, solo mostrar nombre del owner. Teléfono solo en detalle post-reserva. |
| P7 | **Índices en campos de filtro** | Búsquedas sin índice escanean toda la tabla. | `@@index([status, city, district])` en schema. |
| P8 | **Paginación obligatoria** | Sin límite, `GET /venues` podría devolver 10,000 registros. | `limit` máximo 50, default 20. |
| P9 | **Transacción para create con services/prices** | Si falla prices después de crear venue, queda inconsistente. | Prisma `create` con nested writes es atómico. |
| P10 | **Soft delete, NO hard delete** | Borrar un venue borra reviews, bookings, historial. | `softDelete` cambia status a INACTIVE. |

---

## 14. Checklist de Completitud

### Entidades
- [ ] `VenueEntity` con métodos de negocio
- [ ] `VenueServiceEntity`
- [ ] `VenuePriceEntity` con método `isApplicable()`

### DTOs
- [ ] `CreateVenueDto` con validación completa
- [ ] `UpdateVenueDto` como PartialType
- [ ] `VenueFilterDto` con paginación y sorting
- [ ] `CreateVenueServiceDto` nested
- [ ] `CreateVenuePriceDto` nested

### Repository
- [ ] `IVenueRepository` interface
- [ ] `VenueRepository` con Prisma
- [ ] Métodos: findById, findBySlug, findByOwner, search, create, update, softDelete
- [ ] Conversión Prisma → Entity

### Servicios
- [ ] `SlugService` genera slugs únicos
- [ ] `VenueService` con lógica de negocio
- [ ] `VenueService` verifica ownership

### Use Cases
- [ ] `CreateVenueUseCase`
- [ ] `GetVenueBySlugUseCase`
- [ ] `SearchVenuesUseCase`

### Upload
- [ ] `CloudinaryService` sube imágenes
- [ ] `CloudinaryService` optimiza automáticamente
- [ ] `UploadModule` exporta el servicio

### Controller
- [ ] `GET /venues` — búsqueda pública
- [ ] `GET /venues/:slug` — detalle público
- [ ] `POST /venues` — crear (OWNER/ADMIN)
- [ ] `GET /venues/my/venues` — mis locales
- [ ] `PUT /venues/:id` — actualizar (OWNER/ADMIN)
- [ ] `DELETE /venues/:id` — soft delete (OWNER/ADMIN)
- [ ] `PUT /venues/:id/verify` — verificar (ADMIN)

### Module
- [ ] `VenueModule` registra todo
- [ ] `AppModule` importa `VenueModule`

### Verificación
- [ ] Crear local como OWNER funciona
- [ ] Buscar locales sin auth funciona
- [ ] Filtros funcionan
- [ ] Slug único funciona
- [ ] Upload de fotos funciona
- [ ] Ownership protegido funciona
- [ ] Admin puede verificar

---

> **"Un local bien presentado es la mitad de la venta. Tu API de venues debe ser igual de impecable."**

---

*Sprint 4 — CRUD de Locales (Venue)*  
*© 2026 — SalónFácil Development Team*
