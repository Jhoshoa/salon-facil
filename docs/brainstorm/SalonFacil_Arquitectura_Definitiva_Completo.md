# 🏛️ Arquitectura de Software Definitiva: SalónFácil
## Bolivia — Ciudad de El Alto (y expansión nacional)

**Documento de Arquitectura, Stack Técnico y Guía de Desarrollo**  
**Versión:** 2.0 — Stack Definitivo  
**Fecha:** Julio 2026  
**Autor:** Arquitectura de Software Senior

---

## 📋 Índice

1. [Stack Técnico Definitivo](#1-stack-técnico-definitivo)
2. [Arquitectura de Alto Nivel](#2-arquitectura-de-alto-nivel)
3. [Arquitectura del Backend (NestJS — Clean Architecture)](#3-arquitectura-del-backend-nestjs--clean-architecture)
4. [Arquitectura del Frontend (Next.js 14 — Mejores Prácticas)](#4-arquitectura-del-frontend-nextjs-14--mejores-prácticas)
5. [Modelo de Datos (Prisma Schema Completo)](#5-modelo-de-datos-prisma-schema-completo)
6. [Sistema de Autenticación y Autorización](#6-sistema-de-autenticación-y-autorización)
7. [Flujos de Negocio Principales](#7-flujos-de-negocio-principales)
8. [Configuración Local (Docker)](#8-configuración-local-docker)
9. [Configuración Producción (Supabase + Hostinger)](#9-configuración-producción-supabase--hostinger)
10. [Servicios Externos e Integraciones](#10-servicios-externos-e-integraciones)
11. [Patrones de Diseño y Mejores Prácticas](#11-patrones-de-diseño-y-mejores-prácticas)
12. [Seguridad](#12-seguridad)
13. [Testing Strategy](#13-testing-strategy)
14. [CI/CD y DevOps](#14-cicd-y-devops)
15. [Riesgos Técnicos y Mitigaciones](#15-riesgos-técnicos-y-mitigaciones)
16. [Roadmap de Desarrollo Detallado](#16-roadmap-de-desarrollo-detallado)
17. [Checklist de Lanzamiento](#17-checklist-de-lanzamiento)

---

## 1. Stack Técnico Definitivo

### 1.1 Tabla Resumen

| Capa | Tecnología | Versión | Rol | Justificación |
|------|-----------|---------|-----|---------------|
| **Frontend** | Next.js 14 (App Router) | 14.x | SSR/ISR, PWA | SEO crítico para búsqueda orgánica de locales. Streaming y Server Components. |
| | React | 18.x | UI Library | Ecosistema maduro, hooks, concurrent features. |
| | TypeScript | 5.x | Tipado estático | End-to-end type safety. Reduce bugs en producción. |
| | Tailwind CSS | 3.4.x | Estilos | Utility-first, iteración rápida, bundle size mínimo. |
| | React Query (TanStack) | 5.x | Estado servidor | Caché inteligente, revalidación, stale-while-revalidate. |
| | Zustand | 4.x | Estado cliente | Ligero, simple, sin boilerplate de Redux. |
| | React Hook Form | 7.x | Formularios | Performance, validación, menos re-renders. |
| | Zod | 3.x | Validación | Schema validation TypeScript-first. Comparte schemas entre front y back. |
| | shadcn/ui | latest | Componentes UI | Base de componentes accesibles, customizable, sin lock-in. |
| | Sonner | latest | Notificaciones toast | Moderno, animaciones suaves, mejor UX que react-hot-toast. |
| **Backend** | NestJS | 10.x | API REST | Clean Architecture nativa, DI container, decorators, modularidad. |
| | TypeScript | 5.x | Tipado estático | Consistencia con frontend. |
| | Prisma ORM | 5.x | ORM | Type-safe queries, migraciones, schema como fuente de verdad. |
| | PostgreSQL | 16.x | Base de datos | Relacional robusto, PostGIS para geolocalización, JSONB flexible. |
| | Redis | 7.x | Caché / Colas | Caché de búsquedas, rate limiting, sesiones, cola de jobs (BullMQ). |
| | BullMQ | 5.x | Job Queue | Background jobs: WhatsApp, emails, PDFs, recordatorios. |
| | Passport.js | 0.7.x | Auth strategies | JWT, local strategy, extensible a OAuth. |
| | class-validator | 0.14.x | Validación DTOs | Decorators para validación automática de requests. |
| | class-transformer | 0.5.x | Transformación DTOs | Serialización/deserialización automática. |
| | helmet | 7.x | Headers seguridad | Protección XSS, clickjacking, sniffing. |
| | compression | 1.7.x | Compresión HTTP | gzip/deflate para respuestas API. |
| **Auth** | Supabase Auth | 2.x | Autenticación | Auth serverless, JWT, roles, verificación SMS, OAuth social. |
| | bcrypt | 5.x | Hash passwords | Cost factor 12, salt automático. |
| **Storage** | Cloudinary | latest | Fotos/Videos | Optimización automática, CDN global, transforms on-the-fly. |
| **Comms** | Twilio WhatsApp API | latest | Notificaciones | Canal #1 en Bolivia. Sandbox rápido. |
| | Resend | latest | Email transaccional | Buena entregabilidad, templates React. |
| **Pagos** | QR bancario manual | — | MVP pagos | Flujo: comprobante upload → confirmación manual. |
| | Stripe | latest | Tarjetas internacionales | Opcional futuro, no MVP. |
| **PDF** | Puppeteer | 21.x | Generación contratos | HTML → PDF con estilos CSS. |
| **Maps** | Google Maps API | latest | Geocodificación | Dirección → lat/lng, mapa embed. |
| **Hosting Dev** | Docker + Docker Compose | latest | Local | PostgreSQL, Redis, backend, frontend en contenedores. |
| **Hosting Prod** | Hostinger VPS | — | Backend + Redis | Costo accesible, control total, escalable. |
| | Vercel | — | Frontend | Edge network, SSR/ISR óptimo, free tier generoso. |
| | Supabase | — | PostgreSQL + Auth | DB serverless, auth integrado, backups automáticos. |
| **Monitoreo** | Sentry | latest | Error tracking | Captura excepciones en front y back. |
| | LogRocket | latest | Session replay | Ver qué hizo el usuario antes del bug. |

### 1.2 Decisiones Arquitectónicas Clave

| Decisión | Opción A | Opción B | Elegida | Justificación |
|----------|----------|----------|---------|---------------|
| Backend framework | NestJS | Express puro | **NestJS** | Clean Architecture nativa, DI, modularidad, testing fácil. |
| Auth provider | Supabase Auth | Clerk / Auth0 | **Supabase Auth** | Ya usamos Supabase para DB. Auth integrado, JWT, roles, SMS. Costo cero inicial. |
| Password hashing | bcrypt | argon2 | **bcrypt** | Suficientemente seguro, más maduro en Node.js, cost factor 12. |
| Job queue | BullMQ | Bull / Agenda | **BullMQ** | Soporte nativo Redis Streams, mejor performance, TypeScript-first. |
| Cache | Redis | In-memory | **Redis** | Persistencia, compartido entre instancias, rate limiting, sesiones. |
| File upload | Cloudinary direct | Multer + S3 | **Cloudinary direct** | Optimización automática, CDN, transforms. Menos código. |
| PDF generation | Puppeteer | PDFKit | **Puppeteer** | HTML+CSS → PDF. Diseño profesional con templates. |
| Frontend state | Zustand | Redux Toolkit | **Zustand** | 1KB, sin boilerplate, hooks nativos. Suficiente para este producto. |
| Form handling | React Hook Form | Formik | **React Hook Form** | Performance, menos re-renders, validación con Zod. |
| Notifications toast | Sonner | react-hot-toast | **Sonner** | Moderno, animaciones suaves, mejor DX. |

---

## 2. Arquitectura de Alto Nivel

### 2.1 Principios Arquitectónicos

| # | Principio | Aplicación en SalónFácil |
|---|-----------|-------------------------|
| P1 | **Separación de concerns** | Frontend (UI/UX) ↔ Backend (lógica de negocio) ↔ Infraestructura (DB, servicios externos). |
| P2 | **Single Responsibility** | Cada módulo NestJS tiene una responsabilidad única (Auth, Venue, Booking, etc.). |
| P3 | **Dependency Inversion** | Las capas internas (domain) no dependen de las externas (infraestructura). Interfaces en el medio. |
| P4 | **Fail fast, fail safe** | Validación en el edge (DTOs), circuit breakers para servicios externos, retries con backoff. |
| P5 | **Observability** | Logs estructurados, métricas, tracing. Sentry para errores, LogRocket para sesiones. |
| P6 | **Security by design** | JWT con refresh tokens, rate limiting, CORS estricto, sanitización de inputs, headers de seguridad. |
| P7 | **Portability** | Docker para local. Mismas variables de entorno estructuradas para producción. Switch de PostgreSQL local → Supabase sin cambiar código. |
| P8 | **Performance** | Redis cache para búsquedas frecuentes, índices PostgreSQL optimizados, imágenes lazy-loaded. |

### 2.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENTES                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐        │
│  │   Navegador Web    │  │   PWA (Instalada)  │  │   WhatsApp (Twilio)│        │
│  │   Chrome/Safari    │  │   desde navegador  │  │   Notificaciones   │        │
│  └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘        │
└──────────┼─────────────────────┼─────────────────────┼──────────────────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vercel)                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         Next.js 14 (App Router)                             ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │  Server      │  │  Client      │  │  API Routes  │  │  Middleware  │   ││
│  │  │  Components  │  │  Components  │  │  (Server     │  │  (Auth,      │   ││
│  │  │  (RSC)       │  │  ('use       │  │   Actions)   │  │   i18n)      │   ││
│  │  │              │  │   client')   │  │              │  │              │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │  Tailwind    │  │  React Query │  │  Zustand     │  │  shadcn/ui   │   ││
│  │  │  CSS         │  │  (TanStack)  │  │  (State)     │  │  Components  │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ HTTPS / REST JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Hostinger VPS)                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           NestJS 10 (Clean Arch)                            ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │  Auth Module │  │  Venue       │  │  Booking     │  │  Payment     │   ││
│  │  │  (JWT/Roles) │  │  Module      │  │  Module      │  │  Module      │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │  Calendar    │  │  Search      │  │  Notification│  │  Admin       │   ││
│  │  │  Module      │  │  Module      │  │  Module      │  │  Module      │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       ││
│  │  │  Review      │  │  Report      │  │  Upload      │                       ││
│  │  │  Module      │  │  Module      │  │  Module      │                       ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Clean Architecture Layers:                                                  ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          ││
│  │  │Domain   │  │Application│ │Infrastructure│ │Interface │ │Shared   │          ││
│  │  │Entities │  │Use Cases  │ │(DB, Ext Svcs)│ │Adapters  │ │(Utils)  │          ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Background Workers (BullMQ + Redis):                                      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │  WhatsApp    │  │  Email       │  │  PDF         │  │  Reminder    │   ││
│  │  │  Sender      │  │  Sender      │  │  Generator   │  │  Scheduler   │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────┬─────────────────────┬─────────────────────┬───────────────────┘
                  │                     │                     │
                  ▼                     ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   PostgreSQL 16       │  │   Redis 7             │  │   Cloudinary        │
│   (Supabase Prod)     │  │   (Upstash / Docker) │  │   (Fotos/Videos)    │
│   ├─ Auth (users)     │  │   ├─ Cache           │  │                     │
│   ├─ Venues           │  │   ├─ Sessions        │  │                     │
│   ├─ Bookings         │  │   ├─ Rate Limiting   │  │                     │
│   ├─ Payments         │  │   └─ Job Queues      │  │                     │
│   └─ Reviews          │  │      (BullMQ)        │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## 3. Arquitectura del Backend (NestJS — Clean Architecture)

### 3.1 Estructura de Carpetas

```
salon-facil-backend/
├── src/
│   ├── main.ts                          # Entry point, bootstrap
│   ├── app.module.ts                    # Root module
│   │
│   ├── shared/                          # Código compartido
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts       # @Roles('owner', 'admin')
│   │   │   ├── current-user.decorator.ts # @CurrentUser() user: User
│   │   │   └── public.decorator.ts      # @Public() para rutas sin auth
│   │   ├── enums/
│   │   │   ├── user-role.enum.ts
│   │   │   ├── booking-status.enum.ts
│   │   │   └── payment-status.enum.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── ownership.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── logging.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   ├── utils/
│   │   │   ├── slugify.ts
│   │   │   ├── date-utils.ts
│   │   │   └── price-calculator.ts
│   │   └── types/
│   │       └── express.d.ts
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── cloudinary.config.ts
│   │   ├── twilio.config.ts
│   │   ├── resend.config.ts
│   │   ├── app.config.ts
│   │   └── validation.schema.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   ├── seed.ts
│   │   └── prisma.service.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/user.entity.ts
│   │   │   │   └── repositories/auth.repository.interface.ts
│   │   │   ├── application/
│   │   │   │   ├── dto/register.dto.ts, login.dto.ts, refresh-token.dto.ts
│   │   │   │   ├── services/auth.service.ts, token.service.ts
│   │   │   │   └── use-cases/register.use-case.ts, login.use-case.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/auth.repository.ts
│   │   │   │   └── strategies/jwt.strategy.ts, local.strategy.ts
│   │   │   └── interface/
│   │   │       ├── auth.controller.ts
│   │   │       └── auth.module.ts
│   │   │
│   │   ├── venue/
│   │   │   ├── domain/
│   │   │   │   ├── entities/venue.entity.ts, venue-service.entity.ts, venue-price.entity.ts
│   │   │   │   └── repositories/venue.repository.interface.ts
│   │   │   ├── application/
│   │   │   │   ├── dto/create-venue.dto.ts, update-venue.dto.ts, venue-filter.dto.ts
│   │   │   │   ├── services/venue.service.ts, venue-search.service.ts
│   │   │   │   └── use-cases/create-venue.use-case.ts, search-venues.use-case.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/venue.repository.ts
│   │   │   │   └── search/venue-search.builder.ts
│   │   │   └── interface/
│   │   │       ├── venue.controller.ts
│   │   │       └── venue.module.ts
│   │   │
│   │   ├── booking/
│   │   │   ├── domain/entities/booking.entity.ts
│   │   │   ├── application/dto/, services/, use-cases/
│   │   │   ├── infrastructure/repositories/
│   │   │   └── interface/
│   │   │
│   │   ├── payment/
│   │   │   ├── domain/entities/payment.entity.ts
│   │   │   ├── application/dto/, services/, use-cases/
│   │   │   ├── infrastructure/repositories/, processors/
│   │   │   └── interface/
│   │   │
│   │   ├── calendar/
│   │   ├── notification/
│   │   ├── review/
│   │   ├── report/
│   │   ├── upload/
│   │   └── admin/
│   │
│   └── jobs/
│       └── main.ts
│
├── test/
│   ├── unit/, integration/, e2e/
│
├── docker/
│   ├── Dockerfile, Dockerfile.dev, entrypoint.sh
│
├── .env.example, .env.local
├── docker-compose.yml, docker-compose.prod.yml
├── nest-cli.json, package.json, tsconfig.json, jest.config.ts, eslint.config.js
```

### 3.2 Clean Architecture — Reglas de Dependencia

```
┌─────────────────────────────────────────┐
│           Interface Layer               │  ← Controllers, DTOs, Guards, Pipes
│           (REST API / HTTP)             │     Depende de: Application
├─────────────────────────────────────────┤
│          Application Layer              │  ← Services, Use Cases, DTOs
│          (Lógica de Negocio)            │     Depende de: Domain
├─────────────────────────────────────────┤
│           Domain Layer                  │  ← Entities, Repositories (interfaces)
│           (Reglas de Negocio Puras)     │     NO depende de NINGUNA capa externa
├─────────────────────────────────────────┤
│        Infrastructure Layer           │  ← Prisma, Redis, Cloudinary, Twilio
│        (Implementaciones Técnicas)    │     Implementa interfaces del Domain
│                                         │     Depende de: Domain
└─────────────────────────────────────────┘
```

**Regla de oro:** Las flechas de dependencia SIEMPRE apuntan hacia el centro (Domain). Domain no sabe que existe Prisma, NestJS, ni HTTP.

### 3.3 Ejemplo: Módulo Venue con DI

```typescript
// VenueModule con inyección de dependencias
@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [VenueController],
  providers: [
    VenueService,
    VenueSearchService,
    CreateVenueUseCase,
    SearchVenuesUseCase,
    {
      provide: VENUE_REPOSITORY,
      useClass: VenueRepository,  // Cambiable a MockVenueRepository para tests
    },
  ],
  exports: [VenueService, VENUE_REPOSITORY],
})
export class VenueModule {}
```


---

## 4. Arquitectura del Frontend (Next.js 14 — Mejores Prácticas)

### 4.1 Estructura de Carpetas

```
salon-facil-frontend/
├── app/
│   ├── (public)/                        # Grupo: Rutas públicas
│   │   ├── layout.tsx                   # Layout público (Header, Footer)
│   │   ├── page.tsx                     # Home / Hero / Búsqueda principal
│   │   ├── loading.tsx                  # Skeleton para home
│   │   ├── error.tsx                    # Error boundary
│   │   ├── search/
│   │   │   ├── page.tsx                 # Resultados de búsqueda
│   │   │   ├── loading.tsx              # Skeleton de resultados
│   │   │   └── not-found.tsx            # Sin resultados
│   │   ├── venue/[slug]/
│   │   │   ├── page.tsx                 # Perfil del local (Server Component)
│   │   │   ├── loading.tsx              # Skeleton de perfil
│   │   │   └── opengraph-image.tsx      # OG image dinámico para SEO
│   │   └── book/[venueSlug]/
│   │       ├── page.tsx                 # Flujo de reserva
│   │       └── layout.tsx               # Layout específico de reserva
│   │
│   ├── (dashboard)/                     # Grupo: Panel del dueño
│   │   ├── layout.tsx                   # Layout con Sidebar + Header dashboard
│   │   ├── loading.tsx                  # Skeleton de dashboard
│   │   ├── venues/
│   │   │   ├── page.tsx                 # Lista de mis locales
│   │   │   ├── loading.tsx              # Skeleton
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Crear nuevo local
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Editar local
│   │   │       └── edit/
│   │   │           └── page.tsx         # Formulario de edición
│   │   ├── calendar/
│   │   │   └── page.tsx                 # Calendario de reservas
│   │   ├── bookings/
│   │   │   ├── page.tsx                 # Solicitudes entrantes
│   │   │   └── [id]/
│   │   │       └── page.tsx             # Detalle de reserva
│   │   ├── settings/
│   │   │   └── page.tsx                 # Configuración de cuenta
│   │   └── profile/
│   │       └── page.tsx                 # Perfil del dueño
│   │
│   ├── (admin)/                         # Grupo: Panel de super admin
│   │   ├── layout.tsx                   # Layout admin
│   │   ├── page.tsx                     # Dashboard admin
│   │   ├── venues/
│   │   │   └── page.tsx                 # Verificación de locales
│   │   ├── users/
│   │   │   └── page.tsx                 # Gestión de usuarios
│   │   └── reports/
│   │       └── page.tsx                 # Reportes financieros
│   │
│   ├── api/                             # API Routes (Server Actions preferido)
│   │   └── webhooks/
│   │       └── supabase/                # Webhooks de Supabase Auth
│   │
│   ├── layout.tsx                       # Root layout (providers globales)
│   ├── globals.css                      # Tailwind + variables CSS
│   └── not-found.tsx                    # 404 global
│
├── components/
│   ├── ui/                              # shadcn/ui base components
│   │   ├── button.tsx, input.tsx, dialog.tsx, sheet.tsx
│   │   ├── skeleton.tsx, toast.tsx, calendar.tsx
│   │   ├── select.tsx, textarea.tsx, badge.tsx
│   │   ├── card.tsx, avatar.tsx, dropdown-menu.tsx, tabs.tsx
│   │   └── ...
│   ├── layout/                          # Componentes de layout
│   │   ├── header.tsx, footer.tsx, sidebar.tsx
│   │   ├── dashboard-header.tsx, mobile-nav.tsx
│   ├── search/                          # Componentes de búsqueda
│   │   ├── search-bar.tsx, search-filters.tsx
│   │   ├── venue-card.tsx, venue-list.tsx
│   │   ├── venue-map.tsx, price-range-slider.tsx
│   ├── venue/                           # Componentes de perfil de local
│   │   ├── venue-gallery.tsx, venue-info.tsx
│   │   ├── venue-services.tsx, venue-pricing.tsx
│   │   ├── venue-calendar.tsx, venue-reviews.tsx
│   │   └── venue-booking-cta.tsx
│   ├── booking/                         # Componentes de reserva
│   │   ├── booking-form.tsx, booking-summary.tsx
│   │   ├── date-picker.tsx, guest-counter.tsx
│   │   └── payment-comprobante.tsx
│   ├── dashboard/                       # Componentes del panel
│   │   ├── venue-form.tsx, venue-list-table.tsx
│   │   ├── booking-requests-table.tsx
│   │   ├── calendar-view.tsx, stats-cards.tsx
│   │   └── side-modal.tsx               # Modal lateral
│   ├── auth/                            # Componentes de autenticación
│   │   ├── login-form.tsx, register-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   └── auth-guard.tsx
│   └── shared/                          # Componentes compartidos
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       ├── image-upload.tsx, image-gallery.tsx
│       ├── rating-stars.tsx, pagination.tsx
│       ├── empty-state.tsx, seo-head.tsx
│
├── hooks/
│   ├── use-auth.ts, use-venue.ts, use-booking.ts
│   ├── use-search.ts, use-calendar.ts, use-upload.ts
│   ├── use-toast.ts, use-debounce.ts
│   ├── use-media-query.ts, use-local-storage.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts, endpoints.ts, interceptors.ts
│   ├── supabase/
│   │   ├── client.ts, server.ts, admin.ts
│   ├── cloudinary.ts, utils.ts, constants.ts
│   └── validators/
│       ├── venue.schema.ts, booking.schema.ts
│       ├── auth.schema.ts, payment.schema.ts
│
├── stores/
│   ├── auth-store.ts, search-store.ts, ui-store.ts
│
├── types/
│   ├── index.ts, venue.types.ts
│   ├── booking.types.ts, user.types.ts, api.types.ts
│
├── public/
│   ├── images/logo.svg, hero-bg.jpg, empty-states/
│   ├── favicon.ico, manifest.json, robots.txt
│
├── styles/globals.css
├── .env.local, .env.example
├── next.config.js, tailwind.config.ts
├── tsconfig.json, package.json
└── middleware.ts                        # Auth middleware, i18n, redirects
```

### 4.2 Convenciones de Componentes

| Tipo | Convención | Ejemplo | Cuándo usar |
|------|-----------|---------|-------------|
| **Server Component** | Default en App Router | `page.tsx`, `layout.tsx` | Datos estáticos, SEO, fetch inicial. NO usa hooks ni eventos del browser. |
| **Client Component** | `'use client'` al inicio | `venue-gallery.tsx`, `booking-form.tsx` | Interactividad: hooks, eventos, estado local, browser APIs. |
| **Loading State** | `loading.tsx` paralelo | `app/search/loading.tsx` | Skeleton automático mientras carga el page. |
| **Error State** | `error.tsx` paralelo | `app/venue/[slug]/error.tsx` | Error boundary automático. |
| **Not Found** | `not-found.tsx` paralelo | `app/search/not-found.tsx` | 404 personalizado por ruta. |

### 4.3 Side Modal para Creación/Edición (Dueño)

```tsx
// components/dashboard/side-modal.tsx
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface SideModalProps {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SideModal({ title, children, open, onOpenChange }: SideModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

### 4.4 Skeleton Pattern

```tsx
// components/shared/loading-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function VenueCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
```

### 4.5 Toast Notifications (Sonner)

```tsx
// app/layout.tsx (root)
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

// Uso en cualquier client component
import { toast } from 'sonner';

toast.success('Reserva confirmada exitosamente');
toast.error('Error al procesar el pago');
toast.promise(submitBooking(), {
  loading: 'Procesando reserva...',
  success: '¡Reserva creada!',
  error: 'No se pudo crear la reserva',
});
```


---

## 5. Modelo de Datos (Prisma Schema Completo)

```prisma
// prisma/schema.prisma

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

  address          String
  district         String
  city             String      @default("El Alto")
  state            String      @default("La Paz")
  country          String      @default("Bolivia")
  latitude         Decimal?    @db.Decimal(10, 8)
  longitude        Decimal?    @db.Decimal(11, 8)

  capacityMin      Int         @default(0) @map("capacity_min")
  capacityMax      Int         @map("capacity_max")
  squareMeters     Int?        @map("square_meters")

  photos           Json        @default("[]")
  videoUrl         String?     @map("video_url")

  rules            String?     @db.Text
  cancellationPolicy String?   @map("cancellation_policy") @db.Text

  status           VenueStatus @default(DRAFT)
  isVerified       Boolean     @default(false) @map("is_verified")
  verifiedAt       DateTime?   @map("verified_at")
  verifiedById     String?     @map("verified_by_id")

  isFeatured       Boolean     @default(false) @map("is_featured")
  featuredUntil    DateTime?   @map("featured_until")

  viewCount        Int         @default(0) @map("view_count")
  bookingCount     Int         @default(0) @map("booking_count")

  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")

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
  paidAt                DateTime?       @map("paid_at")
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

### 5.1 Índices de Performance Críticos

| Índice | Tabla | Justificación |
|--------|-------|---------------|
| `(venueId, eventDate)` | `bookings` | Verificar disponibilidad: "¿Este local está libre el 15 de septiembre?" |
| `(venueId, date)` UNIQUE | `calendar_blocks` | Bloqueos de calendario sin duplicados |
| `(latitude, longitude)` | `venues` | Búsqueda por proximidad geográfica |
| `(status, city, district)` | `venues` | Filtrado de búsqueda pública |
| `(eventDate)` | `bookings` | Recordatorios automáticos: "¿Qué eventos hay en 7 dias?" |
| `(isFeatured, featuredUntil)` | `venues` | Locales destacados en homepage |
| `(ownerId)` | `venues` | Dashboard del dueño: "Mis locales" |
| `(slug)` | `venues` | Búsqueda por URL SEO-friendly |

---

## 6. Sistema de Autenticación y Autorización

### 6.1 Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `CLIENT` | Usuario que arrienda locales | Ver locales, crear reservas, dejar reviews, editar su perfil |
| `OWNER` | Dueño de uno o mas locales | CRUD de sus locales, gestionar reservas, confirmar pagos, ver estadisticas |
| `ADMIN` | Super administrador de la plataforma | Verificar locales, gestionar usuarios, ver reportes, resolver disputas |

### 6.2 Flujo de Autenticacion

```
Registro (email, telefono, password)
    -> Validacion Zod + class-validator
    -> Hash bcrypt (cost: 12)
    -> Guardar en PostgreSQL (Supabase)
    -> Generar JWT (access + refresh tokens)
    -> Enviar welcome por WhatsApp

Login (email, password)
    -> Buscar user por email
    -> bcrypt.compare()
    -> Generar JWT (access + refresh)
    -> Devolver tokens + user info

Request protegida
    -> JWT Guard valida token
    -> Roles Guard valida rol
    -> Ownership Guard valida que el recurso pertenece al usuario
    -> Access concedido
```

### 6.3 Implementacion de Guards

```typescript
// JWT Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// Roles Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Ownership Guard
@Injectable()
export class VenueOwnershipGuard implements CanActivate {
  constructor(private venueService: VenueService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const venueId = request.params.id;

    if (user.role === UserRole.ADMIN) return true;

    const venue = await this.venueService.findById(venueId);
    return venue.ownerId === user.id;
  }
}
```

### 6.4 Decoradores

```typescript
// @Public() - Ruta sin autenticacion
@Public()
@Get('venues/search')
async searchVenues() { ... }

// @Roles() - Ruta con restriccion de rol
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Post('venues')
async createVenue() { ... }

// @CurrentUser() - Obtener usuario autenticado
@Get('bookings/my')
async getMyBookings(@CurrentUser() user: UserEntity) { ... }
```


---

## 7. Flujos de Negocio Principales

### 7.1 Flujo: Búsqueda y Reserva (Cliente)

```
1. Cliente entra a la web/PWA
2. Busca por ubicación, fecha, tipo de evento, capacidad
3. Filtra por precio, servicios incluidos, distrito
4. Ve perfil del local (fotos, servicios, precios, calendario)
5. Selecciona fecha en calendario interactivo
6. Sistema calcula precio dinámico automáticamente
7. Cliente completa formulario de reserva (tipo evento, invitados, solicitudes especiales)
8. Sistema verifica disponibilidad (booking + calendar_blocks)
9. Cliente sube comprobante de pago de seña (foto)
10. Dueño recibe notificación WhatsApp + email
11. Dueño revisa comprobante y aprueba/rechaza
12. Si aprueba: sistema genera contrato PDF, envía por email/WhatsApp
13. Sistema programa recordatorios: 7 días, 3 días, 1 día antes
14. Post-evento: sistema solicita review al cliente
```

### 7.2 Flujo: Publicación de Local (Dueño)

```
1. Dueño se registra (email, telefono, password)
2. Completa perfil de su local (nombre, dirección, capacidad, descripción)
3. Sube fotos (mínimo 5, máximo 20) → Cloudinary
4. Configura servicios incluidos (checklist editable)
5. Configura precios:
   - Precio base (lunes-jueves)
   - Precio fin de semana (+30%)
   - Temporada alta: 15 Sep-15 Oct, 15 Dic-5 Ene (+50-60%)
   - Feriados específicos configurables
6. Sistema genera slug SEO-friendly
7. Local queda en estado DRAFT
8. Admin revisa y verifica (fotos reales, dirección válida)
9. Local pasa a ACTIVE y es visible públicamente
```

### 7.3 Flujo: Precios Dinámicos

```
Dueño configura:
├── Precio BASE: Bs. 1,000 (lunes-jueves)
├── Precio WEEKEND: +30% → Bs. 1,300 (viernes-domingo)
├── Temporada ALTA (15 Sep - 15 Oct): +50% → Bs. 1,500
├── Temporada ALTA (15 Dic - 5 Ene): +60% → Bs. 1,600
├── Feriado específico (ej: 6 de agosto): configurable individualmente
└── Descuento EARLY_BIRD (>3 meses anticipación): -10%

Cliente selecciona fecha:
    -> Sistema evalúa reglas en orden de especificidad:
        1. ¿Es fecha específica configurada? (CUSTOM_DATE)
        2. ¿Está en rango de temporada alta? (SEASON_HIGH)
        3. ¿Es feriado? (HOLIDAY)
        4. ¿Es fin de semana? (WEEKEND)
        5. Precio BASE
    -> Aplica descuento EARLY_BIRD si aplica
    -> Muestra precio final transparente con desglose
```

---

## 8. Configuración Local (Docker)

### 8.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL 16 para desarrollo local
  postgres:
    image: postgres:16-alpine
    container_name: salonfacil-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: salonfacil
      POSTGRES_PASSWORD: salonfacil_dev_password
      POSTGRES_DB: salonfacil_dev
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U salonfacil -d salonfacil_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis para caché y colas
  redis:
    image: redis:7-alpine
    container_name: salonfacil-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Backend NestJS
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: salonfacil-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://salonfacil:salonfacil_dev_password@postgres:5432/salonfacil_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production
      JWT_REFRESH_SECRET: dev_refresh_secret_change_in_production
      JWT_ACCESS_EXPIRATION: 15m
      JWT_REFRESH_EXPIRATION: 7d
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      TWILIO_WHATSAPP_NUMBER: ${TWILIO_WHATSAPP_NUMBER}
      RESEND_API_KEY: ${RESEND_API_KEY}
      FRONTEND_URL: http://localhost:3000
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:dev

  # Worker de BullMQ (procesa jobs en background)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: salonfacil-worker
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://salonfacil:salonfacil_dev_password@postgres:5432/salonfacil_dev
      REDIS_URL: redis://redis:6379
      # Mismas variables que backend
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:worker

  # Frontend Next.js (opcional en Docker, o correr localmente con npm run dev)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: salonfacil-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

### 8.2 .env.example (Backend)

```bash
# ============================================
# AMBIENTE
# ============================================
NODE_ENV=development
PORT=3001

# ============================================
# BASE DE DATOS
# ============================================
# Local (Docker)
DATABASE_URL=postgresql://salonfacil:salonfacil_dev_password@localhost:5434/salonfacil_dev

# Produccion (Supabase) - descomentar en produccion
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
# DATABASE_POOLER_URL=postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# ============================================
# REDIS
# ============================================
# Local (Docker)
REDIS_URL=redis://localhost:6379

# Produccion (Upstash)
# REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]

# ============================================
# AUTENTICACION (JWT)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12

# ============================================
# SUPABASE AUTH
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# CLOUDINARY
# ============================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=salonfacil

# ============================================
# TWILIO (WhatsApp)
# ============================================
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ============================================
# RESEND (Email)
# ============================================
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@salonfacil.bo

# ============================================
# GOOGLE MAPS
# ============================================
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://salonfacil.vercel.app

# ============================================
# MONITOREO
# ============================================
SENTRY_DSN=https://your-sentry-dsn
LOGROCKET_APP_ID=your-logrocket-app-id
```

### 8.3 Scripts de Inicio Local

```bash
# 1. Clonar repo
git clone https://github.com/tu-usuario/salon-facil.git
cd salon-facil

# 2. Copiar variables de entorno
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# 3. Editar .env.local con tus credenciales

# 4. Levantar infraestructura
docker-compose up -d postgres redis

# 5. Instalar dependencias backend
cd backend && npm install

# 6. Ejecutar migraciones Prisma
npx prisma migrate dev --name init

# 7. Seed de datos iniciales
npx prisma db seed

# 8. Iniciar backend
npm run start:dev

# 9. En otra terminal: iniciar worker
npm run start:worker

# 10. Instalar dependencias frontend
cd ../frontend && npm install

# 11. Iniciar frontend
npm run dev

# App disponible en:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# PostgreSQL: localhost:5434
# Redis: localhost:6379
```

---

## 9. Configuración Producción (Supabase + Hostinger)

### 9.1 Arquitectura de Producción

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USUARIOS (Bolivia)                              │
│                         Navegador Web / PWA / WhatsApp                        │
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL (Frontend)                               │
│  Next.js 14 App Router - Edge Network Global                                │
│  SSR/ISR, PWA, Image Optimization                                           │
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │ REST API / JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOSTINGER VPS (Backend)                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  NestJS API Server (PM2 Cluster Mode)                                   ││
│  │  Port: 3001 (Nginx reverse proxy)                                       ││
│  │  SSL: Let's Encrypt (Certbot)                                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  BullMQ Worker Process (PM2)                                            ││
│  │  Procesa: WhatsApp, Email, PDF, Recordatorios                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Redis (Docker en VPS o Upstash)                                        ││
│  │  Caché, Sessions, Job Queues                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (PostgreSQL)                           │
│  ├─ PostgreSQL 16 (Managed)                                                  │
│  ├─ Connection Pooler (PgBouncer)                                           │
│  ├─ Auth (JWT, OAuth, SMS)                                                    │
│  ├─ Realtime (opcional futuro)                                                │
│  ├─ Storage (backup de comprobantes)                                           │
│  └─ Backups automáticos diarios                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Variables de Entorno Producción

```bash
# backend/.env.production
NODE_ENV=production
PORT=3001

# Supabase PostgreSQL (usar connection pooler para evitar agotar conexiones)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Upstash Redis (serverless, replicación global)
REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]

# JWT (generar con: openssl rand -base64 32)
JWT_SECRET=[GENERAR]
JWT_REFRESH_SECRET=[GENERAR]
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12

# Supabase Auth
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Cloudinary
CLOUDINARY_CLOUD_NAME=[CLOUD_NAME]
CLOUDINARY_API_KEY=[API_KEY]
CLOUDINARY_API_SECRET=[API_SECRET]
CLOUDINARY_FOLDER=salonfacil/prod

# Twilio
TWILIO_ACCOUNT_SID=[SID]
TWILIO_AUTH_TOKEN=[TOKEN]
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Resend
RESEND_API_KEY=[API_KEY]
RESEND_FROM_EMAIL=noreply@salonfacil.bo

# Google Maps
GOOGLE_MAPS_API_KEY=[API_KEY]

# Frontend
FRONTEND_URL=https://salonfacil.vercel.app
CORS_ORIGINS=https://salonfacil.vercel.app

# Sentry
SENTRY_DSN=[DSN]
```

### 9.3 Deploy en Hostinger VPS

```bash
# 1. Conectar al VPS
ssh root@tu-ip-hostinger

# 2. Instalar dependencias
apt update && apt upgrade -y
apt install -y nodejs npm nginx certbot python3-certbot-nginx git

# 3. Instalar PM2 globalmente
npm install -g pm2

# 4. Clonar repo
git clone https://github.com/tu-usuario/salon-facil.git /var/www/salonfacil
cd /var/www/salonfacil/backend

# 5. Instalar dependencias
npm ci --production

# 6. Copiar .env.production
cp .env.example .env
# Editar con nano/vim

# 7. Ejecutar migraciones
npx prisma migrate deploy

# 8. Compilar TypeScript
npm run build

# 9. Iniciar con PM2
pm2 start dist/main.js --name "salonfacil-api"
pm2 start dist/jobs/main.js --name "salonfacil-worker"
pm2 startup
pm2 save

# 10. Configurar Nginx
cat > /etc/nginx/sites-available/salonfacil << 'EOF'
server {
    listen 80;
    server_name api.salonfacil.bo;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/salonfacil /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 11. SSL con Let's Encrypt
certbot --nginx -d api.salonfacil.bo

# 12. Verificar status
pm2 status
curl https://api.salonfacil.bo/health
```

---

## 10. Servicios Externos e Integraciones

### 10.1 Twilio WhatsApp API

```typescript
// modules/notification/infrastructure/whatsapp.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor(private config: ConfigService) {
    this.client = twilio(
      config.get('TWILIO_ACCOUNT_SID'),
      config.get('TWILIO_AUTH_TOKEN')
    );
    this.fromNumber = config.get('TWILIO_WHATSAPP_NUMBER');
  }

  async sendBookingConfirmation(to: string, venueName: string, date: string) {
    const message = `🎉 ¡Tu reserva ha sido confirmada!\n\n` +
      `📍 Local: ${venueName}\n` +
      `📅 Fecha: ${date}\n\n` +
      `Puedes ver los detalles en: https://salonfacil.bo/mis-reservas`;

    return this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: `whatsapp:${to}`,
    });
  }

  async sendReminder(to: string, venueName: string, date: string, daysLeft: number) {
    const message = `⏰ Recordatorio: Tu evento en *${venueName}* es en *${daysLeft} días* (${date}).\n\n` +
      `¿Necesitas algo? Contáctanos por aquí.`;

    return this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: `whatsapp:${to}`,
    });
  }
}
```

### 10.2 Cloudinary Upload

```typescript
// modules/upload/infrastructure/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `${this.config.get('CLOUDINARY_FOLDER')}/${folder}`,
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(file.buffer);
    });
  }
}
```

### 10.3 Generación de Contrato PDF (Puppeteer)

```typescript
// modules/notification/infrastructure/pdf-generator.service.ts
import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfGeneratorService {
  async generateContract(data: ContractData): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
          .signature { margin-top: 60px; border-top: 1px solid #333; width: 200px; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE ALQUILER DE LOCAL</h1>
          <h2>SalónFácil - Bolivia</h2>
        </div>

        <div class="section">
          <p><span class="label">Fecha de emisión:</span> ${data.issueDate}</p>
          <p><span class="label">Número de contrato:</span> ${data.contractNumber}</p>
        </div>

        <div class="section">
          <h3>DATOS DEL LOCAL</h3>
          <p><span class="label">Nombre:</span> ${data.venueName}</p>
          <p><span class="label">Dirección:</span> ${data.venueAddress}</p>
          <p><span class="label">Dueño:</span> ${data.ownerName}</p>
        </div>

        <div class="section">
          <h3>DATOS DEL EVENTO</h3>
          <p><span class="label">Tipo:</span> ${data.eventType}</p>
          <p><span class="label">Fecha:</span> ${data.eventDate}</p>
          <p><span class="label">Horario:</span> ${data.startTime} - ${data.endTime}</p>
          <p><span class="label">Número de invitados:</span> ${data.guestCount}</p>
        </div>

        <div class="section">
          <h3>DETALLE DE PAGOS</h3>
          <table>
            <tr><th>Concepto</th><th>Monto (Bs.)</th></tr>
            <tr><td>Alquiler del local</td><td>${data.totalPrice}</td></tr>
            <tr><td>Seña pagada</td><td>${data.depositAmount}</td></tr>
            <tr><td><strong>Saldo pendiente</strong></td><td><strong>${data.remainingAmount}</strong></td></tr>
          </table>
        </div>

        <div class="section">
          <h3>SERVICIOS INCLUIDOS</h3>
          <ul>
            ${data.services.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <h3>CONDICIONES Y REGLAS</h3>
          <p>${data.rules}</p>
        </div>

        <div style="margin-top: 80px;">
          <div style="float: left;" class="signature">
            <p>Firma del Arrendatario</p>
            <p>${data.clientName}</p>
          </div>
          <div style="float: right;" class="signature">
            <p>Firma del Propietario</p>
            <p>${data.ownerName}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return Buffer.from(pdf);
  }
}
```


---

## 11. Patrones de Diseño y Mejores Prácticas

### 11.1 Patrones Aplicados

| Patrón | Dónde | Por qué |
|--------|-------|---------|
| **Repository Pattern** | Cada módulo tiene `repository.interface.ts` + `repository.ts` | Desacopla lógica de negocio de Prisma. Permite cambiar a TypeORM/Mongoose sin tocar use cases. |
| **Dependency Injection** | NestJS DI Container | Inyección de repositorios, servicios, configuración. Testing fácil con mocks. |
| **Factory Pattern** | `PaymentProcessorFactory` | Según el método de pago (QR, transferencia, Stripe), crea el processor correcto. |
| **Strategy Pattern** | `PriceCalculationStrategy` | Diferentes estrategias de cálculo de precios (base, weekend, season, early bird). |
| **Observer Pattern** | BullMQ events | Cuando una reserva se confirma, se disparan jobs de WhatsApp, email, PDF. |
| **CQRS (light)** | Separar queries (búsqueda) de commands (reserva) | Búsquedas complejas no bloquean escrituras. |
| **DTO Pattern** | Cada endpoint tiene InputDTO y OutputDTO | Contrato claro de API, validación automática, documentación implícita. |
| **Singleton** | PrismaClient, Redis client | Una sola instancia compartida en toda la app. |

### 11.2 Mejores Prácticas NestJS

```typescript
// 1. SIEMPRE usar DTOs para entrada y salida
export class CreateVenueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsNumber()
  @Min(1)
  @Max(5000)
  capacityMax: number;

  @IsString()
  address: string;

  @IsString()
  district: string;
}

// 2. SIEMPRE usar interfaces para repositorios
export const VENUE_REPOSITORY = Symbol('VENUE_REPOSITORY');

export interface IVenueRepository {
  findById(id: string): Promise<Venue | null>;
  findBySlug(slug: string): Promise<Venue | null>;
  search(filters: VenueFilterDto): Promise<Venue[]>;
  create(data: CreateVenueDto, ownerId: string): Promise<Venue>;
  update(id: string, data: UpdateVenueDto): Promise<Venue>;
  delete(id: string): Promise<void>;
}

// 3. SIEMPRE manejar errores con excepciones custom
export class VenueNotFoundException extends NotFoundException {
  constructor(venueId: string) {
    super(`Local con ID ${venueId} no encontrado`);
  }
}

export class VenueAlreadyBookedException extends ConflictException {
  constructor(date: string) {
    super(`El local ya tiene una reserva para la fecha ${date}`);
  }
}

// 4. SIEMPRE usar transactions para operaciones atómicas
async createBookingWithPayment(data: CreateBookingDto): Promise<Booking> {
  return this.prisma.$transaction(async (tx) => {
    // 1. Verificar disponibilidad
    const isAvailable = await this.checkAvailability(tx, data.venueId, data.eventDate);
    if (!isAvailable) throw new VenueAlreadyBookedException(data.eventDate);

    // 2. Crear booking
    const booking = await tx.booking.create({ data: { ... } });

    // 3. Crear payment pending
    await tx.payment.create({ data: { bookingId: booking.id, ... } });

    // 4. Disparar evento (job en background)
    await this.notificationQueue.add('booking-request', { bookingId: booking.id });

    return booking;
  });
}

// 5. SIEMPRE usar pagination para listados
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

// Respuesta paginada estándar
export class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### 11.3 Mejores Prácticas Next.js Frontend

```typescript
// 1. Server Components por defecto (NO 'use client' innecesario)
// app/venue/[slug]/page.tsx
export default async function VenuePage({ params }: { params: { slug: string } }) {
  const venue = await getVenueBySlug(params.slug); // Fetch en servidor

  if (!venue) notFound();

  return (
    <main>
      <VenueGallery photos={venue.photos} />  {/* Client Component */}
      <VenueInfo venue={venue} />              {/* Server Component */}
      <VenuePricing prices={venue.prices} />   {/* Server Component */}
      <VenueBookingCta venueId={venue.id} />   {/* Client Component */}
    </main>
  );
}

// 2. React Query para estado del servidor
// hooks/use-venue.ts
export function useVenue(slug: string) {
  return useQuery({
    queryKey: ['venue', slug],
    queryFn: () => api.venues.getBySlug(slug),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// 3. Zustand para estado global ligero
// stores/auth-store.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false });
  },
}));

// 4. React Hook Form + Zod para formularios type-safe
// components/dashboard/venue-form.tsx
const venueSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  description: z.string().min(20, 'Mínimo 20 caracteres'),
  capacityMax: z.number().min(1).max(5000),
  address: z.string().min(5),
  district: z.string().min(1),
});

type VenueFormData = z.infer<typeof venueSchema>;

export function VenueForm({ venue }: { venue?: Venue }) {
  const { register, handleSubmit, formState: { errors } } = useForm<VenueFormData>({
    resolver: zodResolver(venueSchema),
    defaultValues: venue,
  });

  const onSubmit = async (data: VenueFormData) => {
    toast.promise(
      venue ? api.venues.update(venue.id, data) : api.venues.create(data),
      {
        loading: venue ? 'Actualizando local...' : 'Creando local...',
        success: venue ? 'Local actualizado' : 'Local creado exitosamente',
        error: 'Error al guardar el local',
      }
    );
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}

// 5. Error Boundary con react-error-boundary
// components/shared/error-boundary.tsx
'use client';

import { ErrorBoundary } from 'react-error-boundary';

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Algo salió mal</h2>
          <p className="text-gray-600 mt-2">
            Por favor recarga la página o contacta soporte.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar página
          </Button>
        </div>
      }
      onError={(error) => {
        Sentry.captureException(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## 12. Seguridad

### 12.1 Checklist de Seguridad

| # | Medida | Implementación |
|---|--------|----------------|
| 1 | **HTTPS obligatorio** | Certbot + Let's Encrypt en Hostinger. Vercel ya es HTTPS. |
| 2 | **JWT seguros** | Access token: 15 min. Refresh token: 7 días. Almacenados en httpOnly cookies. |
| 3 | **Rate limiting** | `nestjs-throttler`: 10 req/min para auth, 100 req/min para API general. Redis para distributed rate limiting. |
| 4 | **CORS estricto** | Solo orígenes permitidos: `https://salonfacil.vercel.app`, `https://salonfacil.bo` |
| 5 | **Headers de seguridad** | Helmet: HSTS, X-Frame-Options, X-Content-Type-Options, CSP. |
| 6 | **Sanitización de inputs** | class-validator en todos los DTOs. `express-mongo-sanitize` (aunque usemos PostgreSQL, por si acaso). |
| 7 | **Protección contra SQL Injection** | Prisma ORM (parameterized queries). NUNCA concatenar strings en queries. |
| 8 | **Protección XSS** | Sanitización de outputs en frontend. CSP headers. No renderizar HTML de usuarios. |
| 9 | **Upload seguro** | Validar tipo MIME, tamaño máximo 5MB, escanear con Cloudinary. No aceptar ejecutables. |
| 10 | **Secrets management** | NUNCA commitear .env. Usar Docker secrets o Hostinger env vars en producción. |
| 11 | **Audit logging** | Tabla `audit_logs`: quién hizo qué, cuándo, desde qué IP. |
| 12 | **Password policy** | Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número. bcrypt cost 12. |

### 12.2 Middleware de Seguridad (NestJS)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet: headers de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      },
    },
  }));

  // Compresión gzip
  app.use(compression());

  // CORS estricto
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipe(new ValidationPipe({
    whitelist: true,      // Elimina propiedades no definidas en DTO
    forbidNonWhitelisted: true, // Rechaza requests con propiedades extra
    transform: true,      // Transforma tipos automáticamente
  }));

  // Rate limiting global
  app.useGlobalGuards(app.get(ThrottlerGuard));

  await app.listen(process.env.PORT || 3001);
}
```

---

## 13. Testing Strategy

### 13.1 Pirámide de Testing

```
         /\
        /  \
       / E2E \      ~5%  (Cypress/Playwright) - Flujos críticos: registro, reserva, pago
      /--------\
     / Integration\  ~25% (Supertest + Test DB) - API endpoints, integraciones
    /--------------\
   /    Unit Tests   \ ~70% (Jest) - Services, use cases, utils, validators
  /--------------------\
```

### 13.2 Testing Backend (NestJS + Jest)

```typescript
// tests/unit/venue/venue.service.spec.ts
describe('VenueService', () => {
  let service: VenueService;
  let repository: MockProxy<IVenueRepository>;

  beforeEach(async () => {
    repository = mock<IVenueRepository>();

    const module = await Test.createTestingModule({
      providers: [
        VenueService,
        { provide: VENUE_REPOSITORY, useValue: repository },
      ],
    }).compile();

    service = module.get<VenueService>(VenueService);
  });

  describe('createVenue', () => {
    it('should create a venue with generated slug', async () => {
      const dto = { name: 'Salón Imperial', description: '...', capacityMax: 200, address: 'Calle 1', district: 'Distrito 3' };
      const ownerId = 'user-123';

      repository.create.mockResolvedValue({
        id: 'venue-123',
        slug: 'salon-imperial',
        ...dto,
        ownerId,
      });

      const result = await service.create(dto, ownerId);

      expect(result.slug).toBe('salon-imperial');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Salón Imperial' }),
        ownerId
      );
    });

    it('should throw if venue name already exists for same owner', async () => {
      repository.findByOwnerAndName.mockResolvedValue({ id: 'existing' } as Venue);

      await expect(service.create(dto, ownerId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('calculatePrice', () => {
    it('should apply weekend surcharge', () => {
      const saturday = new Date('2026-09-19'); // Sábado
      const price = service.calculatePrice('venue-123', saturday);

      expect(price).toBe(basePrice * 1.3); // +30% weekend
    });

    it('should apply season high price for September', () => {
      const sept15 = new Date('2026-09-15');
      const price = service.calculatePrice('venue-123', sept15);

      expect(price).toBe(basePrice * 1.5); // +50% season high
    });
  });
});
```

### 13.3 Testing Frontend (Jest + React Testing Library)

```typescript
// tests/components/venue-card.test.tsx
import { render, screen } from '@testing-library/react';
import { VenueCard } from '@/components/search/venue-card';

describe('VenueCard', () => {
  const mockVenue = {
    id: '1',
    name: 'Salón Imperial',
    slug: 'salon-imperial',
    capacityMax: 200,
    price: 1500,
    photos: ['https://res.cloudinary.com/...'],
    district: 'Distrito 3',
    rating: 4.5,
    reviewCount: 12,
  };

  it('renders venue information correctly', () => {
    render(<VenueCard venue={mockVenue} />);

    expect(screen.getByText('Salón Imperial')).toBeInTheDocument();
    expect(screen.getByText('200 personas')).toBeInTheDocument();
    expect(screen.getByText('Bs. 1,500')).toBeInTheDocument();
    expect(screen.getByText('Distrito 3')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('links to venue detail page', () => {
    render(<VenueCard venue={mockVenue} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/venue/salon-imperial');
  });
});
```

---

## 14. CI/CD y DevOps

### 14.1 GitHub Actions — CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: salonfacil_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5434:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run linter
        working-directory: backend
        run: npm run lint

      - name: Run tests
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5434/salonfacil_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
        run: npm run test:cov

      - name: Build
        working-directory: backend
        run: npm run build

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run linter
        working-directory: frontend
        run: npm run lint

      - name: Run tests
        working-directory: frontend
        run: npm run test

      - name: Build
        working-directory: frontend
        run: npm run build
```

### 14.2 GitHub Actions — Deploy Producción

```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Hostinger VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HOSTINGER_HOST }}
          username: ${{ secrets.HOSTINGER_USER }}
          key: ${{ secrets.HOSTINGER_SSH_KEY }}
          script: |
            cd /var/www/salonfacil
            git pull origin main
            cd backend
            npm ci --production
            npx prisma migrate deploy
            npm run build
            pm2 reload salonfacil-api
            pm2 reload salonfacil-worker

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 15. Riesgos Técnicos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R1 | **Agotamiento de conexiones PostgreSQL** en temporada alta | Media | Alto | Usar connection pooler de Supabase (PgBouncer). Límite de 100 conexiones, pooler maneja hasta 10,000. |
| R2 | **Redis caído** → jobs no se procesan | Baja | Alto | BullMQ con persistencia en disco. Monitoreo con alertas. Fallback a procesamiento síncrono para críticos. |
| R3 | **Twilio API caída** → notificaciones WhatsApp fallan | Media | Medio | Retry con backoff exponencial (BullMQ). Fallback a email. Cola de mensajes pendientes. |
| R4 | **Cloudinary lento/inaccesible** → fotos no cargan | Baja | Medio | Lazy loading de imágenes. Placeholder skeleton. CDN de respaldo (Vercel Image Optimization). |
| R5 | **Data loss** por error humano | Baja | Crítico | Backups diarios automáticos (Supabase). Point-in-time recovery. Pruebas de restore mensuales. |
| R6 | **VPS de Hostinger caído** | Baja | Alto | Monitoreo 24/7 (UptimeRobot). Plan de disaster recovery: levantar backend en Render/Railway en <30 min. |
| R7 | **JWT secret comprometido** | Baja | Crítico | Rotación de secrets. Refresh tokens en blacklist (Redis). Forzar logout de todos los usuarios si ocurre. |
| R8 | **Prisma migration falla en producción** | Baja | Alto | Pruebas de migración en staging. Backups antes de deploy. `prisma migrate deploy` en CI/CD. |
| R9 | **Carga masiva en septiembre/diciembre** | Alta | Medio | Load testing antes de temporada alta. Auto-scaling en Vercel. Cache agresivo de búsquedas. CDN para assets. |
| R10 | **Schema Prisma crece descontrolado** | Media | Medio | Revisiones de schema semanales. Índices auditados. Particionamiento de tablas grandes (bookings) a los 12 meses. |

---

## 16. Roadmap de Desarrollo Detallado

### Fase 0: Setup y Fundación (Semanas 1–2)

| Semana | Tarea | Entregable |
|--------|-------|------------|
| 1 | Setup repositorio, Docker, CI/CD básico | Repo con estructura, docker-compose funcional |
| 1 | Configurar NestJS con Clean Architecture | Backend corriendo con health check |
| 1 | Configurar Next.js 14 con App Router | Frontend corriendo con layout base |
| 2 | Prisma schema completo + migraciones iniciales | DB funcional con tablas base |
| 2 | Configurar Supabase Auth (local) | Registro/login funcional |
| 2 | Configurar Tailwind + shadcn/ui | Sistema de diseño base |

### Fase 1: MVP Core (Semanas 3–8)

| Semana | Módulo | Features | Entregable |
|--------|--------|----------|------------|
| 3 | Auth | Registro, login, JWT, roles, guards | Auth completo con tests |
| 3 | Venue (Backend) | CRUD venue, slug, fotos Cloudinary | API de venues funcional |
| 4 | Venue (Frontend) | Perfil público, galería, info | Página de venue funcional |
| 4 | Search | Búsqueda por filtros, paginación | Página de búsqueda funcional |
| 5 | Calendar | Disponibilidad, bloqueos, precios dinámicos | Calendario interactivo |
| 5 | Booking (Backend) | Solicitud, aprobación, verificación | API de reservas funcional |
| 6 | Booking (Frontend) | Formulario de reserva, flujo completo | Reserva end-to-end |
| 6 | Payment (MVP) | Comprobante upload, confirmación manual | Flujo de pago funcional |
| 7 | Notification | WhatsApp (Twilio), email (Resend) | Notificaciones funcionando |
| 7 | Dashboard (Owner) | Mis locales, calendario, reservas | Panel del dueño funcional |
| 8 | Admin | Verificación de locales, gestión de usuarios | Panel admin funcional |
| 8 | Polish | Skeletons, error boundaries, toast, SEO | UX pulida |

### Fase 2: Validación y Crecimiento (Semanas 9–12)

| Semana | Tarea | Métrica de Éxito |
|--------|-------|------------------|
| 9 | Onboarding presencial en El Alto | 20 locales registrados |
| 9 | Landing page + Facebook Ads | 500 visitas |
| 10 | Reviews y ratings | Sistema de opiniones funcional |
| 10 | Contratos PDF automáticos | 100% de reservas con contrato |
| 11 | Recordatorios automáticos | 0 olvidos de eventos |
| 11 | SEO y contenido (blog) | 1000 visitas orgánicas/mes |
| 12 | Analytics dashboard | Métricas de negocio visibles |

### Fase 3: Monetización (Meses 4–6)

| Módulo | Features | Métrica |
|--------|----------|---------|
| Suscripciones Pro | Plan pago para dueños | 20% en plan pago |
| Publicidad destacada | Locales que pagan por posicionamiento | 10 locales destacados |
| Marketplace servicios | Catering, DJ, decoración | 10 proveedores aliados |
| App móvil nativa | Flutter (solo si métricas lo justifican) | 5000 descargas |

---

## 17. Checklist de Lanzamiento

### Pre-launch (1 semana antes)

- [ ] Todos los tests pasan (coverage >70%)
- [ ] Security audit: OWASP Top 10 revisado
- [ ] Performance: Lighthouse score >80 en móvil
- [ ] Load testing: 100 concurrent users sin degradación
- [ ] Backup strategy probado (restore en <30 min)
- [ ] SSL configurado y renovación automática
- [ ] Monitoreo: Sentry, LogRocket, UptimeRobot activos
- [ ] Política de privacidad y términos de uso publicados
- [ ] Contacto de soporte configurado (WhatsApp business)
- [ ] 10 locales de prueba registrados y verificados

### Launch Day

- [ ] Deploy backend a Hostinger
- [ ] Deploy frontend a Vercel
- [ ] Verificar DNS y SSL
- [ ] Probar flujo completo: registro → búsqueda → reserva → pago
- [ ] Enviar invitaciones a 20 dueños beta
- [ ] Publicar en redes sociales (Facebook, Instagram)
- [ ] Activar Google Analytics + Search Console

### Post-launch (Semana 1)

- [ ] Monitorear errores en Sentry (meta: 0 críticos)
- [ ] Revisar métricas de conversión
- [ ] Entrevistar 5 usuarios (dueños + clientes)
- [ ] Priorizar fixes basado en feedback

---

## Apéndice A: Comandos Útiles

```bash
# ===== BACKEND =====
# Crear módulo NestJS
npx nest g module modules/nombre
npx nest g controller modules/nombre/interface/nombre
npx nest g service modules/nombre/application/services/nombre

# Prisma
npx prisma migrate dev --name descripcion
npx prisma migrate deploy
npx prisma db seed
npx prisma studio
npx prisma generate

# Tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# ===== FRONTEND =====
# shadcn/ui
npx shadcn add button input dialog sheet skeleton toast

# Build y deploy
npm run build
npm run start

# ===== DOCKER =====
docker-compose up -d
docker-compose logs -f backend
docker-compose exec postgres psql -U salonfacil -d salonfacil_dev
docker-compose down -v  # Eliminar volúmenes
```

## Apéndice B: Recursos y Referencias

| Recurso | URL |
|---------|-----|
| NestJS Docs | https://docs.nestjs.com |
| Next.js 14 Docs | https://nextjs.org/docs |
| Prisma Docs | https://www.prisma.io/docs |
| shadcn/ui | https://ui.shadcn.com |
| Tailwind CSS | https://tailwindcss.com |
| React Query | https://tanstack.com/query/latest |
| BullMQ | https://docs.bullmq.io |
| Supabase Auth | https://supabase.com/docs/guides/auth |
| Twilio WhatsApp | https://www.twilio.com/docs/whatsapp |
| Cloudinary Node SDK | https://cloudinary.com/documentation/node_integration |

---

> **"La arquitectura no es sobre elegir tecnologías cool. Es sobre tomar decisiones que permitan que tu equipo construya rápido hoy, y no se arrepienta en 12 meses."**

---

*Documento elaborado con enfoque en arquitectura de software enterprise, clean architecture, y mejores prácticas de desarrollo para el mercado boliviano de alquiler de locales para eventos.*

*Stack definitivo: NestJS + Next.js 14 + PostgreSQL + Redis + Prisma + TypeScript + Tailwind CSS*

*© 2026 — Documento interno de planificación y desarrollo.*
