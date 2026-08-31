# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SalonFacil is a venue rental platform for events in Bolivia (primarily El Alto). Users can browse and book event venues (salones) for weddings, birthdays, corporate events, etc.

## Commands

### Docker (preferred for local development)
```bash
make up              # Start all services
make down            # Stop services
make logs            # View all logs
make db-shell        # PostgreSQL shell
make redis-cli       # Redis CLI
make migrate         # Run Prisma migrations
make studio          # Open Prisma Studio
make seed            # Seed database
```

### Backend (cd backend)
```bash
npm run start:dev    # Development server with watch
npm run build        # Build for production
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Jest unit tests
npm run test:watch   # Jest watch mode
npm run test:e2e     # E2E tests (auto-provisions an isolated salonfacil_test DB — see below)
npm run prisma:generate  # Generate Prisma client after schema changes
npm run migrate:dev      # Create and apply migrations
```

### Frontend (cd frontend)
```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # Next.js lint
npm run format       # Prettier
npm run test         # Jest tests
npm run test:watch   # Jest watch mode
```

## Architecture

### Backend (NestJS + Prisma + PostgreSQL)

Uses **Clean Architecture** with four layers per module:
- `domain/` - Entities, value objects, repository interfaces
- `application/` - Use cases, DTOs, application services
- `infrastructure/` - Repository implementations, external services
- `interface/` - Controllers, guards, decorators

Modules: `auth`, `venue`, `booking`, `payment`, `upload`

Global guards applied in order: JwtAuthGuard → RolesGuard → OwnershipGuard.
`OwnershipGuard` only activates on routes tagged with `@Ownership()` (none currently exist —
it's a no-op today). Ownership for venues/bookings/payments is instead enforced manually in
each service via `entity.canBeEditedBy(userId, userRole)`, since resolving the owner requires
a DB lookup the generic param-based `OwnershipGuard` doesn't do. `@Ownership()` is reserved for
future routes where the owner id is directly the request param/body (e.g. a user editing their
own `/users/:userId`).

Use `@Public()` decorator to bypass JWT authentication on specific endpoints.

### Frontend (Next.js 14 App Router)

- `src/app/` - App Router pages with route groups: `(public)`, `(dashboard)`, `(admin)`
- `src/components/` - Feature components organized by domain + `ui/` for shadcn/ui primitives
- `src/lib/api/` - API client using native fetch with `apiRequest<T>()` helper
- `src/stores/` - Zustand stores (auth state)
- `src/types/` - TypeScript type definitions

State management: TanStack Query for server state, Zustand for client state (auth)

UI: Tailwind CSS with shadcn/ui components (Radix primitives), using CSS variables for theming.

### Database

PostgreSQL with Prisma ORM. Schema at `backend/prisma/schema.prisma`.

Key entities: User, Venue, Booking, Payment, Review, Notification

User roles: CLIENT, OWNER, ADMIN

### E2E tests use an isolated database

`backend/tests/e2e/*.e2e-spec.ts` run against `salonfacil_test` (same Postgres instance as dev,
different database name), never `salonfacil_dev`. `backend/test/setup-env.ts` forces this via
`jest-e2e.json`'s `setupFiles` before `AppModule` loads; `backend/scripts/setup-e2e-db.js` runs
automatically before `npm run test:e2e` (via the `pretest:e2e` npm hook) to create the database
if missing, apply migrations, and reseed it fresh every run. This means `npm run test:e2e` is
always safe to run — it never touches the DB used for manual browser testing.

`test/prisma-connection.spec.ts` is a deliberate exception: it's a sanity check for the *dev*
DB connection itself and runs under plain `npm test`, not `test:e2e`.

### Services

| Service    | Local Port | Purpose          |
|------------|------------|------------------|
| Frontend   | 3000       | Next.js          |
| Backend    | 3001       | NestJS API       |
| PostgreSQL | 5434       | Database         |
| Redis      | 6379       | Cache/BullMQ     |

API base path: `/api/v1`

### External Integrations (optional)
- Cloudinary: Image uploads
- Supabase: Additional auth/storage
- Twilio: WhatsApp notifications
- Resend: Email notifications
