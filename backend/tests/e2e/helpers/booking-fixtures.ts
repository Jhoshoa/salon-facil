import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

// supertest's own `SuperAgentTest` type doesn't structurally match what `request.agent()`
// actually returns in this version — this is the type that does.
export type TestAgent = ReturnType<typeof request.agent>;

// Shared by booking.e2e-spec.ts and payment.e2e-spec.ts — both need the same "client + owner
// + verified venue + approved booking" chain before they can exercise their own endpoints, and
// duplicating that ~40-line setup per file (the way auth/venue.e2e-spec.ts duplicate their own
// much shorter setup) would make the two new specs harder to keep in sync as the booking
// lifecycle evolves.
//
// Auth is httpOnly-cookie-based (see the cookie migration) — a supertest.agent() keeps its own
// cookie jar across requests, exactly like a browser tab logged in as one user. Each fixture
// "user" below is really one of these agents, already logged in; callers make requests through
// it instead of manually attaching an Authorization header.

export interface BookingFixtureUsers {
  clientAgent: TestAgent;
  clientId: string;
  ownerAgent: TestAgent;
  ownerId: string;
  otherOwnerAgent: TestAgent;
}

export const phoneFor = (uniqueId: number, offset: number) =>
  `+5917${String(uniqueId + offset)
    .padStart(7, '0')
    .slice(-7)}`;

export async function registerFixtureUsers(
  app: INestApplication,
  uniqueId: number,
): Promise<BookingFixtureUsers> {
  const clientAgent = request.agent(app.getHttpServer());
  const ownerAgent = request.agent(app.getHttpServer());
  const otherOwnerAgent = request.agent(app.getHttpServer());

  const clientRes = await clientAgent.post('/api/v1/auth/register').send({
    email: `client-fix-${uniqueId}@email.com`,
    password: 'Password123!',
    phone: phoneFor(uniqueId, 0),
    fullName: 'Client Fixture E2E',
    role: 'CLIENT',
  });

  const ownerRes = await ownerAgent.post('/api/v1/auth/register').send({
    email: `owner-fix-${uniqueId}@email.com`,
    password: 'Password123!',
    phone: phoneFor(uniqueId, 1),
    fullName: 'Owner Fixture E2E',
    role: 'OWNER',
  });

  await otherOwnerAgent.post('/api/v1/auth/register').send({
    email: `owner2-fix-${uniqueId}@email.com`,
    password: 'Password123!',
    phone: phoneFor(uniqueId, 2),
    fullName: 'Other Owner Fixture E2E',
    role: 'OWNER',
  });

  return {
    clientAgent,
    clientId: clientRes.body.user.id,
    ownerAgent,
    ownerId: ownerRes.body.user.id,
    otherOwnerAgent,
  };
}

/** Creates a venue with a BASE (EVENT-unit) price and verifies it as ADMIN, so it's
 * immediately usable for bookings/price calculations without a separate publish step
 * (matches how venue.e2e-spec.ts's CA7 test verifies straight from DRAFT). */
export async function createVerifiedVenue(
  ownerAgent: TestAgent,
  adminAgent: TestAgent,
  uniqueId: number,
  overrides: { capacityMax?: number; allowsMultipleDays?: boolean; basePrice?: number } = {},
): Promise<string> {
  const createRes = await ownerAgent
    .post('/api/v1/venues')
    .field('name', `Venue Fixture ${uniqueId}-${Math.random().toString(36).slice(2, 8)}`)
    .field('description', 'Local de prueba generado por los tests e2e de reservas y pagos.')
    .field('address', 'Av. de Prueba #123')
    .field('district', 'Distrito Fixture')
    .field('departamento', 'LA_PAZ')
    .field('capacityMax', String(overrides.capacityMax ?? 200))
    .field('allowsMultipleDays', String(overrides.allowsMultipleDays ?? false))
    .field('prices', JSON.stringify([{ priceType: 'BASE', price: overrides.basePrice ?? 1000 }]))
    .expect(201);

  await adminAgent
    .put(`/api/v1/venues/${createRes.body.id}/verify`)
    .send({ approve: true })
    .expect(200);

  return createRes.body.id;
}

export async function loginAdmin(app: INestApplication): Promise<TestAgent> {
  const adminAgent = request.agent(app.getHttpServer());
  await adminAgent.post('/api/v1/auth/login').send({
    email: 'admin@salonfacil.bo',
    password: 'Password123!',
  });
  return adminAgent;
}

export interface ApprovedBooking {
  bookingId: string;
  depositAmount: number;
  totalPrice: number;
}

/** Requests a booking as the client and approves it as the owner, landing it in APPROVED —
 * the entry point every payment-flow test starts from. `daysFromNow` lets callers spread
 * bookings across different dates so they don't collide on the same venue/day. */
export async function createApprovedBooking(
  venueId: string,
  clientAgent: TestAgent,
  ownerAgent: TestAgent,
  daysFromNow: number,
): Promise<ApprovedBooking> {
  const eventDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const createRes = await clientAgent
    .post(`/api/v1/venues/${venueId}/bookings`)
    .send({
      eventType: 'Cumpleanos',
      eventDate,
      startTime: '14:00',
      endTime: '20:00',
      guestCount: 50,
    })
    .expect(201);

  const bookingId = createRes.body.booking.id;

  const approveRes = await ownerAgent.put(`/api/v1/bookings/${bookingId}/approve`).expect(200);

  return {
    bookingId,
    depositAmount: approveRes.body.depositAmount,
    totalPrice: approveRes.body.totalPrice,
  };
}
