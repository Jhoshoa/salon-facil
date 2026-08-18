# 📅 Sprint 5: Reservas y Calendario de Disponibilidad

**Proyecto:** SalónFácil — Plataforma de Alquiler de Locales para Eventos  
**Fase:** 1 — Setup y Fundación  
**Sprint:** 5 de 6  
**Duración estimada:** 3–4 días  
**Stack:** NestJS + Prisma + Clean Architecture + Precios Dinámicos

---

## 📋 Índice

1. [Objetivo del Sprint](#1-objetivo-del-sprint)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Arquitectura del Módulo Booking](#3-arquitectura-del-módulo-booking)
4. [Entidades de Dominio](#4-entidades-de-dominio)
5. [DTOs y Validación](#5-dtos-y-validación)
6. [Repository Interface e Implementación](#6-repository-interface-e-implementación)
7. [Servicios de Negocio](#7-servicios-de-negocio)
8. [Cálculo de Precios Dinámicos](#8-cálculo-de-precios-dinámicos)
9. [Verificación de Disponibilidad](#9-verificación-de-disponibilidad)
10. [Use Cases](#10-use-cases)
11. [Controller REST](#11-controller-rest)
12. [Módulo de Calendario](#12-módulo-de-calendario)
13. [Tests](#13-tests)
14. [Criterios de Aceptación](#14-criterios-de-aceptación)
15. [Precauciones y Mejores Prácticas](#15-precauciones-y-mejores-prácticas)
16. [Checklist de Completitud](#16-checklist-de-completitud)

---

## 1. Objetivo del Sprint

Implementar el sistema completo de reservas con:
- ✅ Solicitud de reserva por parte del cliente
- ✅ Cálculo automático de precios dinámicos (base, weekend, season, holiday)
- ✅ Verificación de disponibilidad de fechas (sin conflictos)
- ✅ Aprobación/rechazo por parte del dueño
- ✅ Gestión de estados de reserva (PENDING → APPROVED → DEPOSIT_PAID → COMPLETED)
- ✅ Bloqueo automático de fechas en calendario
- ✅ Cancelación con políticas de reembolso
- ✅ Recordatorios automáticos programados

**Al finalizar este sprint, un cliente debe poder solicitar una reserva para una fecha específica y el dueño debe poder aprobarla o rechazarla.**

---

## 2. Prerrequisitos

- Sprint 1–4 completados
- Auth funcional con roles CLIENT y OWNER
- CRUD de venues funcional con precios configurados
- Seed data con venues y users existentes

---

## 3. Arquitectura del Módulo Booking

```
modules/booking/
├── domain/
│   ├── entities/
│   │   └── booking.entity.ts
│   └── repositories/
│       └── booking.repository.interface.ts
├── application/
│   ├── dto/
│   │   ├── create-booking.dto.ts
│   │   ├── update-booking-status.dto.ts
│   │   ├── booking-response.dto.ts
│   │   └── availability-check.dto.ts
│   ├── services/
│   │   ├── booking.service.ts
│   │   ├── price-calculator.service.ts
│   │   └── availability.service.ts
│   └── use-cases/
│       ├── request-booking.use-case.ts
│       ├── approve-booking.use-case.ts
│       ├── reject-booking.use-case.ts
│       ├── cancel-booking.use-case.ts
│       └── check-availability.use-case.ts
├── infrastructure/
│   └── repositories/
│       └── booking.repository.ts
└── interface/
    ├── booking.controller.ts
    └── booking.module.ts
```

---

## 4. Entidades de Dominio

```typescript
// modules/booking/domain/entities/booking.entity.ts

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  FULLY_PAID = 'FULLY_PAID',
  CANCELLED_BY_CLIENT = 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_OWNER = 'CANCELLED_BY_OWNER',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export class BookingEntity {
  id: string;
  venueId: string;
  clientId: string;
  eventType: string;
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: BookingStatus;
  specialRequests: string | null;
  contractUrl: string | null;
  contractSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<BookingEntity>) {
    Object.assign(this, partial);
  }

  canBeApproved(): boolean {
    return this.status === BookingStatus.PENDING;
  }

  canBeCancelled(): boolean {
    return [
      BookingStatus.PENDING,
      BookingStatus.APPROVED,
      BookingStatus.DEPOSIT_PAID,
    ].includes(this.status);
  }

  canBeCompleted(): boolean {
    return this.status === BookingStatus.DEPOSIT_PAID || this.status === BookingStatus.FULLY_PAID;
  }

  getDepositPercentage(): number {
    return this.totalPrice > 0 ? (this.depositAmount / this.totalPrice) * 100 : 0;
  }

  isUpcoming(): boolean {
    return new Date(this.eventDate) >= new Date();
  }

  daysUntilEvent(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(this.eventDate);
    event.setHours(0, 0, 0, 0);
    const diffTime = event.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

---

## 5. DTOs y Validación

```typescript
// modules/booking/application/dto/create-booking.dto.ts
import { IsString, IsNumber, Min, Max, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  venueId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  eventType: string;

  @IsDateString()
  eventDate: string; // YYYY-MM-DD

  @IsString()
  startTime: string; // HH:MM

  @IsString()
  endTime: string; // HH:MM

  @IsNumber()
  @Min(1)
  @Max(5000)
  guestCount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;
}
```

```typescript
// modules/booking/application/dto/update-booking-status.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '../../domain/entities/booking.entity';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsString()
  reason?: string; // Para rechazos o cancelaciones
}
```

```typescript
// modules/booking/application/dto/availability-check.dto.ts
import { IsUUID, IsDateString } from 'class-validator';

export class AvailabilityCheckDto {
  @IsUUID()
  venueId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD
}
```

```typescript
// modules/booking/application/dto/booking-response.dto.ts
import { BookingStatus } from '../../domain/entities/booking.entity';

export class BookingResponseDto {
  id: string;
  venueId: string;
  venueName: string;
  venueSlug: string;
  clientId: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: BookingStatus;
  specialRequests: string | null;
  createdAt: string;
}
```

---

## 6. Repository Interface e Implementación

```typescript
// modules/booking/domain/repositories/booking.repository.interface.ts
import { BookingEntity } from '../entities/booking.entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface IBookingRepository {
  findById(id: string): Promise<BookingEntity | null>;
  findByVenue(venueId: string): Promise<BookingEntity[]>;
  findByClient(clientId: string): Promise<BookingEntity[]>;
  findByVenueAndDate(venueId: string, date: Date): Promise<BookingEntity[]>;
  create(data: any): Promise<BookingEntity>;
  updateStatus(id: string, status: string, data?: any): Promise<BookingEntity>;
  findUpcomingBookings(days: number): Promise<BookingEntity[]>;
  existsActiveBooking(venueId: string, date: Date): Promise<boolean>;
}
```

```typescript
// modules/booking/infrastructure/repositories/booking.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true } },
      },
    });
    return booking ? this.toEntity(booking) : null;
  }

  async findByVenue(venueId: string): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { venueId },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true } },
      },
      orderBy: { eventDate: 'asc' },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async findByClient(clientId: string): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { clientId },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async findByVenueAndDate(venueId: string, date: Date): Promise<BookingEntity[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        venueId,
        eventDate: date,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID],
        },
      },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async create(data: any): Promise<BookingEntity> {
    const booking = await this.prisma.booking.create({
      data,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true } },
      },
    });
    return this.toEntity(booking);
  }

  async updateStatus(id: string, status: string, additionalData?: any): Promise<BookingEntity> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status, ...additionalData },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true } },
      },
    });
    return this.toEntity(booking);
  }

  async findUpcomingBookings(days: number): Promise<BookingEntity[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        eventDate: targetDate,
        status: { in: [BookingStatus.APPROVED, BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID] },
      },
      include: {
        venue: { select: { id: true, name: true } },
        client: { select: { id: true, fullName: true, phone: true } },
      },
    });
    return bookings.map((b) => this.toEntity(b));
  }

  async existsActiveBooking(venueId: string, date: Date): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        venueId,
        eventDate: date,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID],
        },
      },
    });
    return count > 0;
  }

  private toEntity(prismaBooking: any): BookingEntity {
    return new BookingEntity({
      id: prismaBooking.id,
      venueId: prismaBooking.venueId,
      clientId: prismaBooking.clientId,
      eventType: prismaBooking.eventType,
      eventDate: prismaBooking.eventDate,
      startTime: prismaBooking.startTime,
      endTime: prismaBooking.endTime,
      guestCount: prismaBooking.guestCount,
      basePrice: Number(prismaBooking.basePrice),
      appliedPrice: Number(prismaBooking.appliedPrice),
      totalPrice: Number(prismaBooking.totalPrice),
      depositAmount: Number(prismaBooking.depositAmount),
      depositPaid: prismaBooking.depositPaid,
      status: prismaBooking.status as BookingStatus,
      specialRequests: prismaBooking.specialRequests,
      contractUrl: prismaBooking.contractUrl,
      contractSentAt: prismaBooking.contractSentAt,
      createdAt: prismaBooking.createdAt,
      updatedAt: prismaBooking.updatedAt,
    });
  }
}
```

---

## 7. Servicios de Negocio

### 7.1 Price Calculator Service

```typescript
// modules/booking/application/services/price-calculator.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PriceType } from '../../../venue/domain/entities/venue-price.entity';

export interface PriceBreakdown {
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  priceType: string;
  discountApplied: number;
  discountLabel: string | null;
}

@Injectable()
export class PriceCalculatorService {
  constructor(private prisma: PrismaService) {}

  async calculatePrice(venueId: string, date: Date): Promise<PriceBreakdown> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Obtener todos los precios activos del venue
    const prices = await this.prisma.venuePrice.findMany({
      where: { venueId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Encontrar el precio aplicable con mayor especificidad
    let applicablePrice = this.findApplicablePrice(prices, targetDate);

    // Si no hay precio específico, usar BASE
    if (!applicablePrice) {
      applicablePrice = prices.find((p) => p.priceType === PriceType.BASE);
    }

    if (!applicablePrice) {
      throw new Error(`No se encontró precio base para el venue ${venueId}`);
    }

    const basePrice = Number(applicablePrice.price);
    let finalPrice = basePrice;
    let discountApplied = 0;
    let discountLabel = null;

    // Verificar descuento early bird (>3 meses de anticipación)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthsDiff = (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff > 3) {
      const earlyBird = prices.find((p) => p.priceType === PriceType.EARLY_BIRD);
      if (earlyBird?.discountPercent) {
        discountApplied = (basePrice * Number(earlyBird.discountPercent)) / 100;
        finalPrice = basePrice - discountApplied;
        discountLabel = earlyBird.discountLabel;
      }
    }

    // Seña: 30% del precio total
    const depositAmount = Math.round(finalPrice * 0.3 * 100) / 100;

    return {
      basePrice,
      appliedPrice: finalPrice,
      totalPrice: finalPrice,
      depositAmount,
      priceType: applicablePrice.priceType,
      discountApplied,
      discountLabel,
    };
  }

  private findApplicablePrice(prices: any[], date: Date): any {
    const dayOfWeek = date.getDay(); // 0=domingo, 6=sábado

    // Orden de especificidad (más específico primero)
    const specificityOrder = [
      PriceType.CUSTOM_DATE,
      PriceType.HOLIDAY,
      PriceType.SEASON_HIGH,
      PriceType.WEEKEND,
      PriceType.BASE,
    ];

    for (const priceType of specificityOrder) {
      const price = prices.find((p) => {
        if (p.priceType !== priceType) return false;

        switch (priceType) {
          case PriceType.CUSTOM_DATE:
            if (!p.specificDate) return false;
            const specific = new Date(p.specificDate);
            specific.setHours(0, 0, 0, 0);
            return date.getTime() === specific.getTime();

          case PriceType.HOLIDAY:
            if (!p.specificDate) return false;
            const holiday = new Date(p.specificDate);
            holiday.setHours(0, 0, 0, 0);
            return date.getTime() === holiday.getTime();

          case PriceType.SEASON_HIGH:
            if (!p.startDate || !p.endDate) return false;
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return date >= start && date <= end;

          case PriceType.WEEKEND:
            return p.dayOfWeek === dayOfWeek;

          case PriceType.BASE:
            return true;

          default:
            return false;
        }
      });

      if (price) return price;
    }

    return null;
  }
}
```

### 7.2 Availability Service

```typescript
// modules/booking/application/services/availability.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus } from '../../domain/entities/booking.entity';

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  conflictingBooking?: {
    id: string;
    status: string;
    clientName: string;
  };
  blockedReason?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async checkAvailability(venueId: string, date: Date): Promise<AvailabilityResult> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 1. Verificar si hay bloqueo de calendario
    const block = await this.prisma.calendarBlock.findUnique({
      where: {
        venueId_date: {
          venueId,
          date: targetDate,
        },
      },
    });

    if (block) {
      return {
        available: false,
        blockedReason: block.reason || 'Fecha no disponible',
      };
    }

    // 2. Verificar si hay reserva activa
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        venueId,
        eventDate: targetDate,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.APPROVED,
            BookingStatus.DEPOSIT_PAID,
            BookingStatus.FULLY_PAID,
          ],
        },
      },
      include: {
        client: { select: { fullName: true } },
      },
    });

    if (existingBooking) {
      return {
        available: false,
        reason: 'Ya existe una reserva para esta fecha',
        conflictingBooking: {
          id: existingBooking.id,
          status: existingBooking.status,
          clientName: existingBooking.client.fullName,
        },
      };
    }

    // 3. Verificar que la fecha no sea en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return {
        available: false,
        reason: 'No se pueden reservar fechas pasadas',
      };
    }

    return { available: true };
  }

  async getAvailableDates(venueId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    const dates: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const check = await this.checkAvailability(venueId, new Date(current));
      if (check.available) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}
```

### 7.3 Booking Service

```typescript
// modules/booking/application/services/booking.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../domain/entities/booking.entity';
import { PriceCalculatorService } from './price-calculator.service';
import { AvailabilityService } from './availability.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private bookingRepository: IBookingRepository,
    private priceCalculator: PriceCalculatorService,
    private availabilityService: AvailabilityService,
  ) {}

  async requestBooking(dto: CreateBookingDto, clientId: string): Promise<BookingEntity> {
    const eventDate = new Date(dto.eventDate);

    // 1. Verificar disponibilidad
    const availability = await this.availabilityService.checkAvailability(dto.venueId, eventDate);
    if (!availability.available) {
      throw new ConflictException(availability.reason || availability.blockedReason || 'Fecha no disponible');
    }

    // 2. Calcular precio
    const priceBreakdown = await this.priceCalculator.calculatePrice(dto.venueId, eventDate);

    // 3. Crear reserva
    const booking = await this.bookingRepository.create({
      venueId: dto.venueId,
      clientId,
      eventType: dto.eventType,
      eventDate: dto.eventDate,
      startTime: this.parseTime(dto.startTime),
      endTime: this.parseTime(dto.endTime),
      guestCount: dto.guestCount,
      basePrice: priceBreakdown.basePrice,
      appliedPrice: priceBreakdown.appliedPrice,
      totalPrice: priceBreakdown.totalPrice,
      depositAmount: priceBreakdown.depositAmount,
      depositPaid: false,
      status: BookingStatus.PENDING,
      specialRequests: dto.specialRequests || null,
    });

    // 4. Bloquear fecha en calendario (como "reserva pendiente")
    // Esto se hace en el use case o con un evento

    return booking;
  }

  async approveBooking(bookingId: string, ownerId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (!booking.canBeApproved()) {
      throw new BadRequestException(`No se puede aprobar una reserva en estado ${booking.status}`);
    }

    // TODO: Verificar que el owner es dueño del venue

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.APPROVED);
  }

  async rejectBooking(bookingId: string, ownerId: string, reason?: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.CANCELLED_BY_OWNER, {
      specialRequests: reason ? `[RECHAZADA: ${reason}] ${booking.specialRequests || ''}` : booking.specialRequests,
    });
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: UserRole,
    reason?: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (!booking.canBeCancelled()) {
      throw new BadRequestException(`No se puede cancelar una reserva en estado ${booking.status}`);
    }

    // Verificar permisos
    const isClient = booking.clientId === userId;
    const isAdmin = userRole === UserRole.ADMIN;
    if (!isClient && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para cancelar esta reserva');
    }

    const status = isClient ? BookingStatus.CANCELLED_BY_CLIENT : BookingStatus.CANCELLED_BY_OWNER;

    return this.bookingRepository.updateStatus(bookingId, status, {
      specialRequests: reason ? `[CANCELADA: ${reason}] ${booking.specialRequests || ''}` : booking.specialRequests,
    });
  }

  async completeBooking(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (!booking.canBeCompleted()) {
      throw new BadRequestException('La reserva no puede ser completada');
    }

    return this.bookingRepository.updateStatus(bookingId, BookingStatus.COMPLETED);
  }

  async getBookingDetails(bookingId: string, userId: string, userRole: UserRole): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que el usuario puede ver esta reserva
    const isClient = booking.clientId === userId;
    const isAdmin = userRole === UserRole.ADMIN;
    // TODO: Verificar si el user es owner del venue

    if (!isClient && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }

    return booking;
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
```

---

## 8. Use Cases

```typescript
// modules/booking/application/use-cases/request-booking.use-case.ts
import { Injectable } from '@nestjs/common';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingEntity } from '../../domain/entities/booking.entity';

@Injectable()
export class RequestBookingUseCase {
  constructor(private bookingService: BookingService) {}

  async execute(dto: CreateBookingDto, clientId: string): Promise<BookingEntity> {
    return this.bookingService.requestBooking(dto, clientId);
  }
}
```

```typescript
// modules/booking/application/use-cases/approve-booking.use-case.ts
import { Injectable } from '@nestjs/common';
import { BookingService } from '../services/booking.service';
import { BookingEntity } from '../../domain/entities/booking.entity';

@Injectable()
export class ApproveBookingUseCase {
  constructor(private bookingService: BookingService) {}

  async execute(bookingId: string, ownerId: string): Promise<BookingEntity> {
    return this.bookingService.approveBooking(bookingId, ownerId);
  }
}
```

```typescript
// modules/booking/application/use-cases/check-availability.use-case.ts
import { Injectable } from '@nestjs/common';
import { AvailabilityService, AvailabilityResult } from '../services/availability.service';

@Injectable()
export class CheckAvailabilityUseCase {
  constructor(private availabilityService: AvailabilityService) {}

  async execute(venueId: string, date: string): Promise<AvailabilityResult> {
    return this.availabilityService.checkAvailability(venueId, new Date(date));
  }
}
```

---

## 9. Controller REST

```typescript
// modules/booking/interface/booking.controller.ts
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserEntity, UserRole } from '../../../auth/domain/entities/user.entity';
import { RequestBookingUseCase } from '../application/use-cases/request-booking.use-case';
import { ApproveBookingUseCase } from '../application/use-cases/approve-booking.use-case';
import { CheckAvailabilityUseCase } from '../application/use-cases/check-availability.use-case';
import { BookingService } from '../application/services/booking.service';
import { CreateBookingDto } from '../application/dto/create-booking.dto';
import { UpdateBookingStatusDto } from '../application/dto/update-booking-status.dto';
import { AvailabilityCheckDto } from '../application/dto/availability-check.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private requestBookingUseCase: RequestBookingUseCase,
    private approveBookingUseCase: ApproveBookingUseCase,
    private checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private bookingService: BookingService,
  ) {}

  // ========== AVAILABILITY (Public) ==========

  @Get('availability')
  @ApiOperation({ summary: 'Verificar disponibilidad de fecha' })
  async checkAvailability(@Query() dto: AvailabilityCheckDto) {
    return this.checkAvailabilityUseCase.execute(dto.venueId, dto.date);
  }

  // ========== CLIENT ENDPOINTS ==========

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Solicitar reserva' })
  async requestBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.requestBookingUseCase.execute(dto, user.id);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mis reservas (cliente)' })
  async getMyBookings(@CurrentUser() user: UserEntity) {
    return this.bookingService.findByClient(user.id);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar mi reserva' })
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.bookingService.cancelBooking(id, user.id, user.role, reason);
  }

  // ========== OWNER ENDPOINTS ==========

  @Get('venue/:venueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reservas de un local (owner)' })
  async getVenueBookings(@Param('venueId') venueId: string) {
    return this.bookingService.findByVenue(venueId);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Aprobar reserva' })
  async approveBooking(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.approveBookingUseCase.execute(id, user.id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Rechazar reserva' })
  async rejectBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.bookingService.rejectBooking(id, user.id, reason);
  }

  // ========== SHARED ==========

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalle de reserva' })
  async getBooking(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.bookingService.getBookingDetails(id, user.id, user.role);
  }
}
```

---

## 10. Módulo de Calendario

```typescript
// modules/calendar/interface/calendar.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private prisma: PrismaService) {}

  @Get(':venueId')
  @ApiOperation({ summary: 'Obtener calendario de un local' })
  async getCalendar(
    @Param('venueId') venueId: string,
    @Query('month') month: string, // YYYY-MM
  ) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const [bookings, blocks] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          venueId,
          eventDate: { gte: startDate, lte: endDate },
          status: { in: ['PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID'] },
        },
        select: {
          id: true,
          eventDate: true,
          status: true,
          eventType: true,
        },
      }),
      this.prisma.calendarBlock.findMany({
        where: {
          venueId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      venueId,
      month,
      bookings: bookings.map((b) => ({
        date: b.eventDate,
        type: 'booking',
        status: b.status,
        eventType: b.eventType,
      })),
      blocks: blocks.map((b) => ({
        date: b.date,
        type: 'block',
        reason: b.reason,
      })),
    };
  }

  @Post(':venueId/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Bloquear fecha' })
  async blockDate(
    @Param('venueId') venueId: string,
    @Body('date') date: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserEntity,
  ) {
    // TODO: Verificar ownership
    return this.prisma.calendarBlock.create({
      data: {
        venueId,
        date: new Date(date),
        reason,
      },
    });
  }
}
```

---

## 11. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| CA1 | Solicitar reserva calcula precio correcto | `POST /bookings` → precio según fecha (base/weekend/season) |
| CA2 | No se puede reservar fecha ocupada | `POST /bookings` con fecha ya reservada → 409 |
| CA3 | No se puede reservar fecha bloqueada | `POST /bookings` con fecha bloqueada → 409 |
| CA4 | No se puede reservar fecha pasada | `POST /bookings` con fecha ayer → 400 |
| CA5 | Dueño puede aprobar reserva pendiente | `PUT /bookings/:id/approve` → status APPROVED |
| CA6 | Dueño puede rechazar reserva | `PUT /bookings/:id/reject` → status CANCELLED_BY_OWNER |
| CA7 | Cliente puede cancelar su reserva | `PUT /bookings/:id/cancel` → status CANCELLED_BY_CLIENT |
| CA8 | Precio de temporada alta aplica correctamente | Reserva 15 Sep → precio +50% |
| CA9 | Precio de fin de semana aplica correctamente | Reserva sábado → precio +30% |
| CA10 | Calendario muestra bookings y bloqueos | `GET /calendar/:venueId?month=2026-09` → array con ambos |

---

## 12. Precauciones y Mejores Prácticas

| # | Precaución | Por qué | Cómo mitigar |
|---|-----------|---------|--------------|
| P1 | **Transacción atómica para reserva** | Si falla después de crear booking, la fecha queda libre pero hay reserva. | Usar Prisma transaction: crear booking + calendar block en una operación. |
| P2 | **Race condition en disponibilidad** | Dos usuarios pueden solicitar la misma fecha simultáneamente. | UNIQUE constraint en (venueId, date) en calendar_blocks. Segundo request falla. |
| P3 | **Validar horario de evento** | startTime debe ser antes de endTime. | Validación en DTO: comparar ambos campos. |
| P4 | **No permitir cancelación el día del evento** | Cancelación de último momento perjudica al dueño. | Validar `daysUntilEvent() > 7` para cancelación sin penalización. |
| P5 | **Precios en Decimal, no Float** | Errores de redondeo en cálculos monetarios. | Usar `Decimal` en Prisma y convertir a `Number` solo para respuesta. |
| P6 | **Timezone consistente** | Bolivia es UTC-4. Las fechas deben manejarse correctamente. | Almacenar fechas en UTC, mostrar en hora local de Bolivia. |
| P7 | **Guest count vs capacity** | No permitir más invitados que la capacidad del local. | Validar `guestCount <= venue.capacityMax` al crear reserva. |
| P8 | **Soft delete de reservas** | Nunca borrar reservas. Cambiar status a CANCELLED. | Solo update de status, nunca `delete()`. |

---

## 13. Checklist de Completitud

### Entidades
- [ ] `BookingEntity` con métodos de estado
- [ ] Enums de `BookingStatus`

### DTOs
- [ ] `CreateBookingDto` con validación
- [ ] `UpdateBookingStatusDto`
- [ ] `AvailabilityCheckDto`
- [ ] `BookingResponseDto`

### Repository
- [ ] `IBookingRepository` interface
- [ ] `BookingRepository` con Prisma
- [ ] Métodos: findById, findByVenue, findByClient, create, updateStatus

### Servicios
- [ ] `PriceCalculatorService` con lógica de precios dinámicos
- [ ] `AvailabilityService` verifica bookings + calendar blocks
- [ ] `BookingService` con flujo completo de reserva

### Use Cases
- [ ] `RequestBookingUseCase`
- [ ] `ApproveBookingUseCase`
- [ ] `CheckAvailabilityUseCase`

### Controller
- [ ] `GET /calendar/:venueId` — calendario público
- [ ] `GET /bookings/availability` — verificar disponibilidad
- [ ] `POST /bookings` — solicitar reserva (CLIENT)
- [ ] `GET /bookings/my-bookings` — mis reservas
- [ ] `PUT /bookings/:id/cancel` — cancelar (CLIENT)
- [ ] `GET /bookings/venue/:venueId` — reservas del local (OWNER)
- [ ] `PUT /bookings/:id/approve` — aprobar (OWNER)
- [ ] `PUT /bookings/:id/reject` — rechazar (OWNER)

### Verificación
- [ ] Precio base funciona
- [ ] Precio weekend funciona
- [ ] Precio season funciona
- [ ] Disponibilidad rechaza fechas ocupadas
- [ ] Disponibilidad rechaza fechas bloqueadas
- [ ] Flujo completo: solicitar → aprobar → pagar seña

---

> **"Una reserva es un compromiso entre dos personas. Tu sistema debe reflejar esa seriedad."**

---

*Sprint 5 — Reservas y Calendario de Disponibilidad*  
*© 2026 — SalónFácil Development Team*
