# 🗄️ Sprint 2: Prisma Schema, Migraciones y Seed Data

**Proyecto:** SalónFácil — Plataforma de Alquiler de Locales para Eventos  
**Fase:** 1 — Setup y Fundación  
**Sprint:** 2 de 6  
**Duración estimada:** 2–3 días  
**Stack:** Prisma ORM + PostgreSQL + NestJS

---

## 📋 Índice

1. [Objetivo del Sprint](#1-objetivo-del-sprint)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Instalación y Configuración de Prisma](#3-instalación-y-configuración-de-prisma)
4. [Schema Prisma Completo](#4-schema-prisma-completo)
5. [Migraciones Iniciales](#5-migraciones-iniciales)
6. [Seed Data](#6-seed-data)
7. [Prisma Service (Singleton)](#7-prisma-service-singleton)
8. [Configuración de Base de Datos](#8-configuración-de-base-de-datos)
9. [Testing del Schema](#9-testing-del-schema)
10. [Criterios de Aceptación](#10-criterios-de-aceptación)
11. [Precauciones y Mejores Prácticas](#11-precauciones-y-mejores-prácticas)
12. [Checklist de Completitud](#12-checklist-de-completitud)

---

## 1. Objetivo del Sprint

Crear el modelo de datos completo con:
- ✅ Schema Prisma con todas las entidades, relaciones, índices y constraints
- ✅ Migraciones versionadas ejecutables
- ✅ Seed data realista para desarrollo (usuarios, locales, reservas, pagos)
- ✅ Prisma Service como singleton inyectable en NestJS
- ✅ Configuración de base de datos que funcione en local (Docker) y producción (Supabase)

**Al finalizar este sprint, la base de datos debe estar poblada con datos de prueba y el backend debe poder hacer queries a través de Prisma.**

---

## 2. Prerrequisitos

- Sprint 1 completado (NestJS + Docker + PostgreSQL corriendo)
- PostgreSQL accesible en `localhost:5434` o via Docker
- Prisma CLI instalado: `npm install -D prisma` (hecho en Sprint 1)

---

## 3. Instalación y Configuración de Prisma

### 3.1 Inicializar Prisma

```bash
cd backend

# Inicializar Prisma (ya instalado en Sprint 1)
npx prisma init

# Esto crea:
# - prisma/schema.prisma
# - .env (con DATABASE_URL)
```

### 3.2 Configurar Prisma en NestJS

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // Disponible en todos los módulos sin importar
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🔌 Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Prisma disconnected from database');
  }

  // Helper para limpiar la base de datos en tests
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
```

### 3.3 Registrar PrismaModule en AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,  // 👈 Añadido
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 4. Schema Prisma Completo

```prisma
// prisma/schema.prisma

// ============================================
// GENERATOR & DATASOURCE
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  CLIENT
  OWNER
  ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_VERIFICATION
}

enum VenueStatus {
  DRAFT
  PENDING
  ACTIVE
  INACTIVE
  REJECTED
}

enum BookingStatus {
  PENDING
  APPROVED
  DEPOSIT_PAID
  FULLY_PAID
  CANCELLED_BY_CLIENT
  CANCELLED_BY_OWNER
  COMPLETED
  NO_SHOW
}

enum PaymentType {
  DEPOSIT
  FULL
  REMAINING
}

enum PaymentMethod {
  QR_BANK
  BANK_TRANSFER
  TIGO_MONEY
  CARD
  CASH
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  PARTIAL
}

enum PriceType {
  BASE
  WEEKEND
  HOLIDAY
  CUSTOM_DATE
  SEASON_HIGH
  EARLY_BIRD
}

enum NotificationType {
  BOOKING_REQUEST
  BOOKING_CONFIRMED
  BOOKING_CANCELLED
  PAYMENT_RECEIVED
  REMINDER_7_DAYS
  REMINDER_3_DAYS
  REMINDER_1_DAY
  REVIEW_REQUEST
  WELCOME
}

enum NotificationChannel {
  WHATSAPP
  EMAIL
  PUSH
}

// ============================================
// ENTIDADES
// ============================================

model User {
  id              String     @id @default(uuid())
  email           String     @unique
  phone           String     @unique
  passwordHash    String     @map("password_hash")
  fullName        String     @map("full_name")
  role            UserRole   @default(CLIENT)
  status          UserStatus @default(PENDING_VERIFICATION)
  avatarUrl       String?    @map("avatar_url")
  city            String?
  district        String?
  
  emailVerifiedAt DateTime?  @map("email_verified_at")
  phoneVerifiedAt DateTime?  @map("phone_verified_at")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")
  lastLoginAt     DateTime?  @map("last_login_at")
  
  // Relaciones
  venues          Venue[]
  bookings        Booking[]  @relation("ClientBookings")
  reviews         Review[]
  payments        Payment[]
  notifications   Notification[]
  
  @@index([email])
  @@index([phone])
  @@index([role])
  @@index([status])
  @@map("users")
}

model Venue {
  id               String      @id @default(uuid())
  ownerId          String      @map("owner_id")
  name             String
  slug             String      @unique
  description      String      @db.Text
  shortDescription String?     @map("short_description") @db.VarChar(255)
  
  // Ubicación
  address          String
  district         String
  city             String      @default("El Alto")
  state            String      @default("La Paz")
  country          String      @default("Bolivia")
  latitude         Decimal?    @db.Decimal(10, 8)
  longitude        Decimal?    @db.Decimal(11, 8)
  
  // Capacidad
  capacityMin      Int         @default(0) @map("capacity_min")
  capacityMax      Int         @map("capacity_max")
  squareMeters     Int?        @map("square_meters")
  
  // Media
  photos           Json        @default("[]")
  videoUrl         String?     @map("video_url")
  
  // Reglas
  rules            String?     @db.Text
  cancellationPolicy String?   @map("cancellation_policy") @db.Text
  
  // Estado
  status           VenueStatus @default(DRAFT)
  isVerified       Boolean     @default(false) @map("is_verified")
  verifiedAt       DateTime?   @map("verified_at")
  verifiedById     String?     @map("verified_by_id")
  
  // Publicidad
  isFeatured       Boolean     @default(false) @map("is_featured")
  featuredUntil    DateTime?   @map("featured_until")
  
  // Métricas
  viewCount        Int         @default(0) @map("view_count")
  bookingCount     Int         @default(0) @map("booking_count")
  
  // Timestamps
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")
  
  // Relaciones
  owner            User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  services         VenueService[]
  prices           VenuePrice[]
  bookings         Booking[]
  reviews          Review[]
  calendarBlocks   CalendarBlock[]
  
  @@index([ownerId])
  @@index([slug])
  @@index([city])
  @@index([district])
  @@index([status])
  @@index([isFeatured])
  @@index([latitude, longitude])
  @@map("venues")
}

model VenueService {
  id          String   @id @default(uuid())
  venueId     String   @map("venue_id")
  name        String
  icon        String?
  description String?  @db.Text
  isIncluded  Boolean  @default(true) @map("is_included")
  extraCost   Decimal? @map("extra_cost") @db.Decimal(12, 2)
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  
  venue       Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@index([venueId])
  @@map("venue_services")
}

model VenuePrice {
  id              String    @id @default(uuid())
  venueId         String    @map("venue_id")
  priceType       PriceType @map("price_type")
  dayOfWeek       Int?      @map("day_of_week")
  specificDate    DateTime? @map("specific_date")
  startDate       DateTime? @map("start_date")
  endDate         DateTime? @map("end_date")
  price           Decimal   @db.Decimal(12, 2)
  currency        String    @default("BOB")
  discountPercent Decimal?  @map("discount_percent")
  discountLabel   String?   @map("discount_label")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  
  venue           Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@index([venueId])
  @@index([priceType])
  @@index([specificDate])
  @@index([startDate, endDate])
  @@map("venue_prices")
}

model Booking {
  id              String        @id @default(uuid())
  venueId         String        @map("venue_id")
  clientId        String        @map("client_id")
  
  eventType       String        @map("event_type")
  eventDate       DateTime      @map("event_date") @db.Date
  startTime       DateTime      @map("start_time") @db.Time
  endTime         DateTime      @map("end_time") @db.Time
  guestCount      Int           @map("guest_count")
  
  basePrice       Decimal       @map("base_price") @db.Decimal(12, 2)
  appliedPrice    Decimal       @map("applied_price") @db.Decimal(12, 2)
  totalPrice      Decimal       @map("total_price") @db.Decimal(12, 2)
  depositAmount   Decimal       @map("deposit_amount") @db.Decimal(12, 2)
  depositPaid     Boolean       @default(false) @map("deposit_paid")
  
  status          BookingStatus @default(PENDING)
  
  specialRequests String?       @map("special_requests") @db.Text
  
  contractUrl     String?       @map("contract_url")
  contractSentAt  DateTime?     @map("contract_sent_at")
  
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  
  venue           Venue         @relation(fields: [venueId], references: [id])
  client          User          @relation("ClientBookings", fields: [clientId], references: [id])
  payments        Payment[]
  
  @@index([venueId])
  @@index([clientId])
  @@index([eventDate])
  @@index([status])
  @@index([venueId, eventDate])
  @@map("bookings")
}

model Payment {
  id                    String        @id @default(uuid())
  bookingId             String        @map("booking_id")
  amount                Decimal       @db.Decimal(12, 2)
  paymentType           PaymentType   @map("payment_type")
  method                PaymentMethod
  status                PaymentStatus @default(PENDING)
  
  comprobanteUrl        String?       @map("comprobante_url")
  comprobanteUploadedAt DateTime?     @map("comprobante_uploaded_at")
  confirmedByOwnerId    String?       @map("confirmed_by_owner_id")
  confirmedAt           DateTime?     @map("confirmed_at")
  notes                 String?       @db.Text
  
  stripePaymentIntentId String?       @map("stripe_payment_intent_id")
  stripeChargeId        String?       @map("stripe_charge_id")
  
  transactionReference  String?       @map("transaction_reference")
  paidAt                DateTime?     @map("paid_at")
  createdAt             DateTime      @default(now()) @map("created_at")
  
  booking               Booking       @relation(fields: [bookingId], references: [id])
  confirmedBy           User?         @relation(fields: [confirmedByOwnerId], references: [id])
  
  @@index([bookingId])
  @@index([status])
  @@index([method])
  @@map("payments")
}

model CalendarBlock {
  id          String    @id @default(uuid())
  venueId     String    @map("venue_id")
  date        DateTime  @db.Date
  reason      String?   @db.Text
  isRecurring Boolean   @default(false) @map("is_recurring")
  recurringRule Json?   @map("recurring_rule")
  createdAt   DateTime  @default(now()) @map("created_at")
  
  venue       Venue     @relation(fields: [venueId], references: [id], onDelete: Cascade)
  
  @@unique([venueId, date])
  @@index([venueId])
  @@index([date])
  @@map("calendar_blocks")
}

model Review {
  id          String   @id @default(uuid())
  venueId     String   @map("venue_id")
  clientId    String   @map("client_id")
  bookingId   String   @map("booking_id")
  
  rating      Int
  comment     String?  @db.Text
  
  isVerified  Boolean  @default(false) @map("is_verified")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  venue       Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  client      User     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([venueId])
  @@index([clientId])
  @@index([bookingId])
  @@map("reviews")
}

model Notification {
  id            String              @id @default(uuid())
  userId        String              @map("user_id")
  type          NotificationType
  channel       NotificationChannel
  title         String
  content       String              @db.Text
  
  isRead        Boolean             @default(false) @map("is_read")
  sentAt        DateTime?           @map("sent_at")
  deliveredAt   DateTime?           @map("delivered_at")
  failedAt      DateTime?           @map("failed_at")
  errorMessage  String?             @map("error_message")
  
  metadata      Json?
  
  createdAt     DateTime            @default(now()) @map("created_at")
  
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([type])
  @@index([isRead])
  @@map("notifications")
}
```

### 4.1 Explicación de Decisiones del Schema

| Decisión | Justificación |
|----------|---------------|
| **UUID como PK** | No secuencial = no revela cantidad de registros. Portable entre sistemas. |
| `@map()` para snake_case** | PostgreSQL convención es snake_case. Prisma lo maneja automáticamente. |
| **JSON para fotos** | Array de URLs Cloudinary. Flexible, no necesita tabla aparte. |
| **Decimal(12,2) para precios** | Precisión exacta para moneda. Float causa errores de redondeo. |
| **onDelete: Cascade en relaciones hijas** | Si se borra un venue, se borran sus services, prices, calendarBlocks. |
| **onDelete: Restrict en bookings** | No se puede borrar un venue con reservas activas. |
| **@@unique([venueId, date]) en CalendarBlock** | Un local no puede tener 2 bloqueos el mismo día. |
| **Índices compuestos** | `(venueId, eventDate)` en bookings = verificación de disponibilidad en O(log n). |
| **Enum para estados** | Type safety en DB. No pueden insertarse valores inválidos. |
| **Json para recurringRule** | Reglas de recurrencia flexibles sin tabla normalizada compleja. |

---

## 5. Migraciones Iniciales

### 5.1 Generar Migración

```bash
cd backend

# Generar migración desde schema
npx prisma migrate dev --name init

# Esto:
# 1. Crea prisma/migrations/[timestamp]_init/
# 2. Genera migration.sql con CREATE TABLE, INDEX, FOREIGN KEY
# 3. Aplica la migración a la base de datos
# 4. Genera el cliente Prisma (@prisma/client)
```

### 5.2 Verificar Migración Generada

```bash
# Ver el SQL generado
cat prisma/migrations/*/migration.sql

# Debe contener:
# - CREATE TABLE para cada modelo
# - CREATE INDEX para cada @@index
# - ALTER TABLE ... ADD FOREIGN KEY para relaciones
# - CREATE UNIQUE INDEX para @@unique
```

### 5.3 Script de Migración en Producción

```json
// backend/package.json (añadir scripts)
{
  "scripts": {
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "migrate:reset": "prisma migrate reset",
    "migrate:status": "prisma migrate status",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 6. Seed Data

### 6.1 Crear Script de Seed

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole, UserStatus, VenueStatus, BookingStatus, PriceType, PaymentStatus, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Limpiar datos existentes (solo en desarrollo)
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.venuePrice.deleteMany();
  await prisma.venueService.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database cleaned');

  // ============================================
  // USUARIOS
  // ============================================
  
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@salonfacil.bo',
      phone: '+59177777777',
      passwordHash,
      fullName: 'Administrador SalónFácil',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
  console.log('👤 Created admin:', admin.email);

  // Dueños de locales
  const owners = await prisma.user.createMany({
    data: [
      {
        email: 'mario.quispe@email.com',
        phone: '+59171234567',
        passwordHash,
        fullName: 'Mario Quispe',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        city: 'El Alto',
        district: 'Distrito 8',
      },
      {
        email: 'rosa.mamani@email.com',
        phone: '+59172345678',
        passwordHash,
        fullName: 'Rosa Mamani',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        city: 'El Alto',
        district: 'Distrito 3',
      },
      {
        email: 'carlos.rojas@email.com',
        phone: '+59173456789',
        passwordHash,
        fullName: 'Carlos Rojas',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        city: 'El Alto',
        district: 'Distrito 5',
      },
    ],
  });
  console.log(`👥 Created ${owners.count} owners`);

  // Clientes
  const clients = await prisma.user.createMany({
    data: [
      {
        email: 'cliente1@email.com',
        phone: '+59174567890',
        passwordHash,
        fullName: 'Ana Laura Vargas',
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        city: 'El Alto',
        district: 'Distrito 2',
      },
      {
        email: 'cliente2@email.com',
        phone: '+59175678901',
        passwordHash,
        fullName: 'Pedro Choque',
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        city: 'El Alto',
        district: 'Distrito 4',
      },
    ],
  });
  console.log(`👥 Created ${clients.count} clients`);

  // ============================================
  // LOCALES (VENUES)
  // ============================================

  const ownerMario = await prisma.user.findFirst({ where: { email: 'mario.quispe@email.com' } });
  const ownerRosa = await prisma.user.findFirst({ where: { email: 'rosa.mamani@email.com' } });
  const ownerCarlos = await prisma.user.findFirst({ where: { email: 'carlos.rojas@email.com' } });

  const venue1 = await prisma.venue.create({
    data: {
      ownerId: ownerMario!.id,
      name: 'Salón Imperial',
      slug: 'salon-imperial',
      description: 'Elegante salón para eventos sociales con capacidad hasta 250 personas. Incluye cocina equipada, estacionamiento privado y sistema de sonido profesional. Ideal para bodas, quinceañeras y eventos corporativos.',
      shortDescription: 'Salón elegante para 250 personas en Distrito 8',
      address: 'Av. 6 de Marzo #1234, entre calles A y B',
      district: 'Distrito 8',
      city: 'El Alto',
      latitude: -16.5042,
      longitude: -68.1633,
      capacityMin: 50,
      capacityMax: 250,
      squareMeters: 400,
      photos: JSON.stringify([
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/salon-imperial-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/salon-imperial-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/salon-imperial-3.jpg',
      ]),
      rules: 'No se permite pintura en paredes. Horario máximo hasta 4:00 AM. Seña del 30% para confirmar reserva.',
      cancellationPolicy: 'Seña no reembolsable si cancela con menos de 15 días de anticipación.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 156,
      bookingCount: 12,
    },
  });

  const venue2 = await prisma.venue.create({
    data: {
      ownerId: ownerRosa!.id,
      name: 'Espacio Fiesta El Alto',
      slug: 'espacio-fiesta-el-alto',
      description: 'Amplio espacio multifuncional con decoración moderna y versátil. Perfecto para cumpleaños, graduaciones y reuniones familiares. Ambiente acogedor con iluminación LED.',
      shortDescription: 'Espacio moderno para 150 personas en Distrito 3',
      address: 'Calle Juan Pablo II #567',
      district: 'Distrito 3',
      city: 'El Alto',
      latitude: -16.5225,
      longitude: -68.1567,
      capacityMin: 30,
      capacityMax: 150,
      squareMeters: 280,
      photos: JSON.stringify([
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/espacio-fiesta-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/espacio-fiesta-2.jpg',
      ]),
      rules: 'No mascotas. Prohibido el uso de confeti de papel. Limpieza incluida en el precio.',
      cancellationPolicy: 'Cancelación gratuita hasta 7 días antes. Después, se retiene el 50% de la seña.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 89,
      bookingCount: 5,
    },
  });

  const venue3 = await prisma.venue.create({
    data: {
      ownerId: ownerCarlos!.id,
      name: 'Centro de Eventos Los Pinos',
      slug: 'centro-eventos-los-pinos',
      description: 'Centro de eventos con jardín exterior y salón principal climatizado. Capacidad para grandes celebraciones con área de buffet y bar. Estacionamiento para 30 vehículos.',
      shortDescription: 'Centro de eventos con jardín para 300 personas',
      address: 'Av. Juan Carlos Barrientos #890',
      district: 'Distrito 5',
      city: 'El Alto',
      latitude: -16.5111,
      longitude: -68.1722,
      capacityMin: 100,
      capacityMax: 300,
      squareMeters: 600,
      photos: JSON.stringify([
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/los-pinos-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/los-pinos-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/los-pinos-3.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/los-pinos-4.jpg',
      ]),
      rules: 'Música hasta las 2:00 AM máximo. Responsabilidad compartida por daños.',
      cancellationPolicy: 'Seña reembolsable solo con 30 días de anticipación.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 234,
      bookingCount: 18,
    },
  });
  console.log('🏛️ Created 3 venues');

  // ============================================
  // SERVICIOS DE LOCALES
  // ============================================

  await prisma.venueService.createMany({
    data: [
      // Salón Imperial
      { venueId: venue1.id, name: 'Sillas', icon: 'Armchair', isIncluded: true, sortOrder: 1 },
      { venueId: venue1.id, name: 'Mesas redondas', icon: 'Table', isIncluded: true, sortOrder: 2 },
      { venueId: venue1.id, name: 'Cocina equipada', icon: 'ChefHat', isIncluded: true, sortOrder: 3 },
      { venueId: venue1.id, name: 'Baños (4)', icon: 'Bath', isIncluded: true, sortOrder: 4 },
      { venueId: venue1.id, name: 'Estacionamiento', icon: 'Car', isIncluded: true, sortOrder: 5 },
      { venueId: venue1.id, name: 'Sonido profesional', icon: 'Speaker', isIncluded: true, sortOrder: 6 },
      { venueId: venue1.id, name: 'Iluminación LED', icon: 'Lightbulb', isIncluded: true, sortOrder: 7 },
      { venueId: venue1.id, name: 'Pantalla proyector', icon: 'Monitor', isIncluded: false, extraCost: 200.00, sortOrder: 8 },
      { venueId: venue1.id, name: 'Decoración básica', icon: 'Palette', isIncluded: false, extraCost: 350.00, sortOrder: 9 },
      
      // Espacio Fiesta
      { venueId: venue2.id, name: 'Sillas', icon: 'Armchair', isIncluded: true, sortOrder: 1 },
      { venueId: venue2.id, name: 'Mesas', icon: 'Table', isIncluded: true, sortOrder: 2 },
      { venueId: venue2.id, name: 'Cocina', icon: 'ChefHat', isIncluded: true, sortOrder: 3 },
      { venueId: venue2.id, name: 'Baños (2)', icon: 'Bath', isIncluded: true, sortOrder: 4 },
      { venueId: venue2.id, name: 'Iluminación LED', icon: 'Lightbulb', isIncluded: true, sortOrder: 5 },
      { venueId: venue2.id, name: 'WiFi', icon: 'Wifi', isIncluded: true, sortOrder: 6 },
      
      // Los Pinos
      { venueId: venue3.id, name: 'Sillas', icon: 'Armchair', isIncluded: true, sortOrder: 1 },
      { venueId: venue3.id, name: 'Mesas redondas', icon: 'Table', isIncluded: true, sortOrder: 2 },
      { venueId: venue3.id, name: 'Cocina industrial', icon: 'ChefHat', isIncluded: true, sortOrder: 3 },
      { venueId: venue3.id, name: 'Baños (6)', icon: 'Bath', isIncluded: true, sortOrder: 4 },
      { venueId: venue3.id, name: 'Estacionamiento (30 autos)', icon: 'Car', isIncluded: true, sortOrder: 5 },
      { venueId: venue3.id, name: 'Jardín exterior', icon: 'TreePine', isIncluded: true, sortOrder: 6 },
      { venueId: venue3.id, name: 'Barra de bar', icon: 'Wine', isIncluded: true, sortOrder: 7 },
      { venueId: venue3.id, name: 'Sonido y DJ', icon: 'Music', isIncluded: false, extraCost: 500.00, sortOrder: 8 },
    ],
  });
  console.log('✅ Created venue services');

  // ============================================
  // PRECIOS DE LOCALES
  // ============================================

  await prisma.venuePrice.createMany({
    data: [
      // Salón Imperial - Precios
      { venueId: venue1.id, priceType: PriceType.BASE, price: 1200.00 },
      { venueId: venue1.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 1560.00 }, // Viernes +30%
      { venueId: venue1.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 1560.00 }, // Sábado +30%
      { venueId: venue1.id, priceType: PriceType.WEEKEND, dayOfWeek: 0, price: 1560.00 }, // Domingo +30%
      { venueId: venue1.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-09-01'), endDate: new Date('2026-10-15'), price: 1800.00 }, // Septiembre
      { venueId: venue1.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-12-15'), endDate: new Date('2027-01-05'), price: 1920.00 }, // Diciembre
      { venueId: venue1.id, priceType: PriceType.HOLIDAY, specificDate: new Date('2026-08-06'), price: 1800.00 }, // Día de la Patria
      { venueId: venue1.id, priceType: PriceType.EARLY_BIRD, discountPercent: 10.00, discountLabel: 'Reserva anticipada (+3 meses)' },
      
      // Espacio Fiesta - Precios
      { venueId: venue2.id, priceType: PriceType.BASE, price: 800.00 },
      { venueId: venue2.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 1000.00 },
      { venueId: venue2.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 1000.00 },
      { venueId: venue2.id, priceType: PriceType.WEEKEND, dayOfWeek: 0, price: 1000.00 },
      { venueId: venue2.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-09-01'), endDate: new Date('2026-10-15'), price: 1200.00 },
      { venueId: venue2.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-12-15'), endDate: new Date('2027-01-05'), price: 1280.00 },
      
      // Los Pinos - Precios
      { venueId: venue3.id, priceType: PriceType.BASE, price: 2000.00 },
      { venueId: venue3.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 2600.00 },
      { venueId: venue3.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 2600.00 },
      { venueId: venue3.id, priceType: PriceType.WEEKEND, dayOfWeek: 0, price: 2600.00 },
      { venueId: venue3.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-09-01'), endDate: new Date('2026-10-15'), price: 3000.00 },
      { venueId: venue3.id, priceType: PriceType.SEASON_HIGH, startDate: new Date('2026-12-15'), endDate: new Date('2027-01-05'), price: 3200.00 },
    ],
  });
  console.log('💰 Created venue prices');

  // ============================================
  // RESERVAS
  // ============================================

  const client1 = await prisma.user.findFirst({ where: { email: 'cliente1@email.com' } });
  const client2 = await prisma.user.findFirst({ where: { email: 'cliente2@email.com' } });

  const booking1 = await prisma.booking.create({
    data: {
      venueId: venue1.id,
      clientId: client1!.id,
      eventType: 'Quinceañera',
      eventDate: new Date('2026-09-15'),
      startTime: new Date('2026-09-15T18:00:00'),
      endTime: new Date('2026-09-16T02:00:00'),
      guestCount: 200,
      basePrice: 1800.00,
      appliedPrice: 1800.00,
      totalPrice: 1800.00,
      depositAmount: 540.00,
      depositPaid: true,
      status: BookingStatus.DEPOSIT_PAID,
      specialRequests: 'Necesitamos espacio para la ceremonia de coronación y mesa para los padrinos.',
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      venueId: venue2.id,
      clientId: client2!.id,
      eventType: 'Cumpleaños',
      eventDate: new Date('2026-08-20'),
      startTime: new Date('2026-08-20T19:00:00'),
      endTime: new Date('2026-08-21T01:00:00'),
      guestCount: 80,
      basePrice: 800.00,
      appliedPrice: 800.00,
      totalPrice: 800.00,
      depositAmount: 240.00,
      depositPaid: true,
      status: BookingStatus.COMPLETED,
      specialRequests: 'Decoración con temática de superhéroes para niño de 8 años.',
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      venueId: venue3.id,
      clientId: client1!.id,
      eventType: 'Boda',
      eventDate: new Date('2026-12-20'),
      startTime: new Date('2026-12-20T17:00:00'),
      endTime: new Date('2026-12-21T03:00:00'),
      guestCount: 250,
      basePrice: 3200.00,
      appliedPrice: 3200.00,
      totalPrice: 3200.00,
      depositAmount: 960.00,
      depositPaid: false,
      status: BookingStatus.PENDING,
      specialRequests: 'Ceremonia civil en el jardín, recepción en el salón principal. Necesitamos el servicio de DJ incluido.',
    },
  });
  console.log('📅 Created 3 bookings');

  // ============================================
  // PAGOS
  // ============================================

  await prisma.payment.createMany({
    data: [
      {
        bookingId: booking1.id,
        amount: 540.00,
        paymentType: PaymentType.DEPOSIT,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.COMPLETED,
        comprobanteUrl: 'https://res.cloudinary.com/demo/image/upload/v1/comprobantes/comp-001.jpg',
        comprobanteUploadedAt: new Date(),
        confirmedAt: new Date(),
        paidAt: new Date(),
      },
      {
        bookingId: booking2.id,
        amount: 240.00,
        paymentType: PaymentType.DEPOSIT,
        method: PaymentMethod.QR_BANK,
        status: PaymentStatus.COMPLETED,
        comprobanteUrl: 'https://res.cloudinary.com/demo/image/upload/v1/comprobantes/comp-002.jpg',
        comprobanteUploadedAt: new Date(),
        confirmedAt: new Date(),
        paidAt: new Date(),
      },
      {
        bookingId: booking2.id,
        amount: 560.00,
        paymentType: PaymentType.REMAINING,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    ],
  });
  console.log('💳 Created payments');

  // ============================================
  // REVIEWS
  // ============================================

  await prisma.review.create({
    data: {
      venueId: venue2.id,
      clientId: client2!.id,
      bookingId: booking2.id,
      rating: 5,
      comment: 'Excelente local, muy limpio y la dueña Rosa fue muy amable. Todo salió perfecto para el cumpleaños de mi hijo.',
      isVerified: true,
    },
  });
  console.log('⭐ Created review');

  // ============================================
  // BLOQUEOS DE CALENDARIO
  // ============================================

  await prisma.calendarBlock.createMany({
    data: [
      { venueId: venue1.id, date: new Date('2026-09-15'), reason: 'Reserva: Quinceañera Ana Laura' },
      { venueId: venue2.id, date: new Date('2026-08-20'), reason: 'Reserva: Cumpleaños Pedro' },
      { venueId: venue3.id, date: new Date('2026-12-20'), reason: 'Reserva: Boda (pendiente confirmación)' },
      { venueId: venue1.id, date: new Date('2026-10-01'), reason: 'Mantenimiento general' },
    ],
  });
  console.log('📆 Created calendar blocks');

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 6.2 Configurar Seed en package.json

```json
// backend/package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### 6.3 Ejecutar Seed

```bash
# Ejecutar seed
cd backend
npx prisma db seed

# O con Docker
docker-compose exec backend npx prisma db seed
```

---

## 7. Prisma Service (Singleton)

Ya creado en sección 3.2. Este servicio:
- Se conecta automáticamente al iniciar la app
- Se desconecta al cerrar
- Tiene método `cleanDatabase()` para tests
- Es `@Global()` así que cualquier módulo puede inyectarlo sin importar PrismaModule

---

## 8. Configuración de Base de Datos

### 8.1 Configuración para Local (Docker)

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // Opciones adicionales si se necesitan
}));
```

### 8.2 Configuración para Producción (Supabase)

```bash
# En producción, usar connection pooler de Supabase
# Esto evita agotar las 100 conexiones directas de PostgreSQL

# .env.production
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
```

### 8.3 Health Check con Base de Datos

```typescript
// src/app.service.ts (actualizar health check)
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async health() {
    let dbStatus = 'ok';
    let dbLatency = 0;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'salon-facil-api',
      version: '0.1.0',
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
    };
  }
}
```

---

## 9. Testing del Schema

### 9.1 Test de Conexión

```bash
# Verificar que Prisma puede conectar
npx prisma db pull

# Si funciona, muestra el schema actual de la base de datos
```

### 9.2 Test de Queries

```typescript
// tests/integration/prisma-connection.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Prisma Connection', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result).toEqual([{ connected: 1 }]);
  });

  it('should have seed data', async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThan(0);

    const venueCount = await prisma.venue.count();
    expect(venueCount).toBeGreaterThan(0);
  });

  it('should enforce unique constraints', async () => {
    await expect(
      prisma.user.create({
        data: {
          email: 'admin@salonfacil.bo', // Ya existe
          phone: '+59199999999',
          passwordHash: 'test',
          fullName: 'Test',
        },
      }),
    ).rejects.toThrow();
  });
});
```

---

## 10. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| CA1 | Schema Prisma tiene 8 entidades con relaciones correctas | `npx prisma validate` pasa sin errores |
| CA2 | Migración inicial genera todas las tablas | `\dt` en psql muestra 8 tablas + _prisma_migrations |
| CA3 | Índices críticos creados | `\di` en psql muestra índices definidos |
| CA4 | Seed data inserta 6+ usuarios, 3+ locales, 3+ reservas | `SELECT COUNT(*) FROM users;` → 6+ |
| CA5 | Health check incluye estado de base de datos | `curl /api/v1/health` muestra `database.status: ok` |
| CA6 | Prisma Service es inyectable globalmente | Cualquier módulo puede usar `constructor(private prisma: PrismaService)` |
| CA7 | Clean database funciona solo en desarrollo | `prisma.cleanDatabase()` lanza error en producción |
| CA8 | Relaciones funcionan (joins) | Query con `include` devuelve datos relacionados |

---

## 11. Precauciones y Mejores Prácticas

| # | Precaución | Por qué | Cómo mitigar |
|---|-----------|---------|--------------|
| P1 | **NUNCA usar `prisma migrate dev` en producción** | Puede causar data loss o conflictos. | En prod usar `prisma migrate deploy` (solo aplica migraciones, no genera). |
| P2 | **Backup antes de migraciones en producción** | Si algo falla, necesitas rollback. | Supabase tiene backups automáticos. Exportar manual antes de deploys grandes. |
| P3 | **No usar `db push` en equipos** | `db push` fuerza el schema sin migración versionada. | Usar `migrate dev` siempre. `db push` solo para prototipos rápidos. |
| P4 | **Decimal para moneda, NO Float** | Float causa errores de redondeo (0.1 + 0.2 != 0.3). | `Decimal @db.Decimal(12,2)` para todos los precios. |
| P5 | **Índices en campos de búsqueda frecuente** | Sin índices, búsquedas escanean toda la tabla. | `@@index()` en venueId, eventDate, slug, email, phone. |
| P6 | **onDelete: Cascade con cuidado** | Borrar un venue borra TODO lo relacionado. | Solo en entidades "hijas" (services, prices). Booking usa Restrict. |
| P7 | **Seed data no en producción** | Datos de prueba en producción = confusión y riesgo. | Seed solo en desarrollo. Validar `NODE_ENV !== 'production'`. |
| P8 | **Passwords hasheados, NUNCA en texto plano** | Obligatorio para seguridad. | bcrypt con cost 12. Seed usa el mismo hash para todos los users de prueba. |
| P9 | **UUIDs en lugar de IDs secuenciales** | IDs secuenciales revelan volumen de negocio. | `@id @default(uuid())` en todas las entidades. |
| P10 | **Campos de auditoría en todas las tablas** | Saber cuándo se creó/modificó un registro es crítico para debugging. | `createdAt`, `updatedAt` en todos los modelos. |

---

## 12. Checklist de Completitud

### Schema Prisma
- [ ] 8 entidades definidas (User, Venue, VenueService, VenuePrice, Booking, Payment, CalendarBlock, Review, Notification)
- [ ] Todos los enums definidos (UserRole, VenueStatus, BookingStatus, etc.)
- [ ] Relaciones correctas con `onDelete` apropiado
- [ ] Índices críticos definidos (`@@index`, `@@unique`)
- [ ] `@map()` para snake_case en PostgreSQL
- [ ] `Decimal(12,2)` para todos los campos de precio
- [ ] `Json` para fotos y recurringRule
- [ ] `npx prisma validate` pasa sin errores

### Migraciones
- [ ] Migración inicial generada con `prisma migrate dev --name init`
- [ ] SQL de migración revisado manualmente
- [ ] Migración aplicada a base de datos local
- [ ] Tablas creadas verificadas con psql

### Seed Data
- [ ] Script `prisma/seed.ts` creado
- [ ] 6+ usuarios (1 admin, 3 owners, 2 clients)
- [ ] 3+ locales con datos realistas
- [ ] Servicios incluidos para cada local
- [ ] Precios dinámicos configurados (base, weekend, season)
- [ ] 3+ reservas en diferentes estados
- [ ] Pagos asociados a reservas
- [ ] 1+ review verificada
- [ ] Bloqueos de calendario creados
- [ ] Seed ejecutado exitosamente
- [ ] `package.json` configurado con `"prisma": { "seed": "ts-node prisma/seed.ts" }`

### Prisma Service
- [ ] `PrismaModule` creado como `@Global()`
- [ ] `PrismaService` extiende `PrismaClient`
- [ ] `onModuleInit()` conecta a DB
- [ ] `onModuleDestroy()` desconecta de DB
- [ ] `cleanDatabase()` solo funciona en desarrollo
- [ ] Logging condicional (verbose en dev, error en prod)

### Health Check
- [ ] Health endpoint actualizado con estado de DB
- [ ] Latencia de query medida
- [ ] Respuesta JSON con `database.status` y `database.latency`

### Testing
- [ ] Test de conexión a DB pasa
- [ ] Test de seed data pasa
- [ ] Test de unique constraints pasa

---

> **"Tu schema de base de datos es el contrato más importante de tu aplicación. Si está mal diseñado, todo lo demás sufrirá. Invierte tiempo aquí."**

---

*Sprint 2 — Prisma Schema, Migraciones y Seed Data*  
*© 2026 — SalónFácil Development Team*
