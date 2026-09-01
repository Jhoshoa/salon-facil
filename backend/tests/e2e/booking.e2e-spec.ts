import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import {
  createVerifiedVenue,
  loginAdmin,
  registerFixtureUsers,
  BookingFixtureUsers,
} from './helpers/booking-fixtures';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let users: BookingFixtureUsers;
  let venueId: string;

  const uniqueId = Date.now();

  const futureDate = (daysFromNow: number) =>
    new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    users = await registerFixtureUsers(app, uniqueId);
    const adminAgent = await loginAdmin(app);
    venueId = await createVerifiedVenue(users.ownerAgent, adminAgent, uniqueId, {
      capacityMax: 100,
      basePrice: 1000,
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/venues/:venueId/bookings', () => {
    it('creates a booking as CLIENT and calculates its price', () => {
      return users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(30),
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 50,
        })
        .expect(201)
        .then((res) => {
          expect(res.body.booking.status).toBe('PENDING');
          expect(res.body.booking.clientId).toBe(users.clientId);
          expect(res.body.priceCalculation.totalPrice).toBe(1000);
          expect(res.body.priceCalculation.depositAmount).toBe(300);
        });
    });

    it('rejects a guest count above the venue capacity', () => {
      return users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(31),
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 500,
        })
        .expect(400);
    });

    it('rejects a booking in the past', () => {
      return users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: '2020-01-01',
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 10,
        })
        .expect(400);
    });

    it('returns 409 when the date is already booked', async () => {
      const eventDate = futureDate(40);
      await users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate,
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 10,
        })
        .expect(201);

      return users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Otro',
          eventDate,
          startTime: '10:00',
          endTime: '12:00',
          guestCount: 10,
        })
        .expect(409);
    });

    it('returns 401 without a session', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(32),
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 10,
        })
        .expect(401);
    });

    it('returns 403 for OWNER role', () => {
      return users.ownerAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(33),
          startTime: '14:00',
          endTime: '22:00',
          guestCount: 10,
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/venues/:venueId/bookings/preview-price (public)', () => {
    it('previews the price without creating a booking', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/bookings/preview-price`)
        .query({ eventDate: futureDate(50), startTime: '14:00', endTime: '20:00' })
        .expect(200)
        .then((res) => {
          expect(res.body.totalPrice).toBe(1000);
        });
    });
  });

  describe('Approve / reject lifecycle', () => {
    let bookingId: string;
    let lifecycleDayOffset = 60;

    beforeEach(async () => {
      const res = await users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Cumpleanos',
          eventDate: futureDate(lifecycleDayOffset++),
          startTime: '14:00',
          endTime: '20:00',
          guestCount: 20,
        })
        .expect(201);
      bookingId = res.body.booking.id;
    });

    it('lets the venue owner approve a PENDING booking', () => {
      return users.ownerAgent
        .put(`/api/v1/bookings/${bookingId}/approve`)
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('APPROVED');
        });
    });

    it('returns 403 when a different owner tries to approve', () => {
      return users.otherOwnerAgent.put(`/api/v1/bookings/${bookingId}/approve`).expect(403);
    });

    it('returns 403 when the CLIENT tries to approve their own booking', () => {
      return users.clientAgent.put(`/api/v1/bookings/${bookingId}/approve`).expect(403);
    });

    it('lets the owner reject a booking with a reason', () => {
      return users.ownerAgent
        .put(`/api/v1/bookings/${bookingId}/reject`)
        .send({ reason: 'Fecha no disponible internamente' })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('CANCELLED_BY_OWNER');
        });
    });

    it('lets the client cancel their own PENDING booking', () => {
      return users.clientAgent
        .put(`/api/v1/bookings/${bookingId}/cancel`)
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('CANCELLED_BY_CLIENT');
        });
    });

    it('returns 403 when a different client cancels', async () => {
      const otherClientAgent = request.agent(app.getHttpServer());
      await otherClientAgent.post('/api/v1/auth/register').send({
        email: `other-client-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: `+5917${String(uniqueId).slice(-6)}9`,
        fullName: 'Other Client E2E',
        role: 'CLIENT',
      });

      return otherClientAgent.put(`/api/v1/bookings/${bookingId}/cancel`).expect(403);
    });
  });

  describe('GET /api/v1/bookings/my', () => {
    it("returns the client's own bookings", () => {
      return users.clientAgent
        .get('/api/v1/bookings/my')
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body.every((b: { clientId: string }) => b.clientId === users.clientId)).toBe(
            true,
          );
        });
    });

    it('returns 403 for OWNER role', () => {
      return users.ownerAgent.get('/api/v1/bookings/my').expect(403);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('returns 404 for a non-existent booking', () => {
      return users.clientAgent
        .get('/api/v1/bookings/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('markAsCompleted / markAsNoShow (OWNER/ADMIN, added this session)', () => {
    it('rejects completing a booking that is still PENDING', async () => {
      const res = await users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Test',
          eventDate: futureDate(200),
          startTime: '14:00',
          endTime: '18:00',
          guestCount: 10,
        })
        .expect(201);

      return users.ownerAgent.put(`/api/v1/bookings/${res.body.booking.id}/complete`).expect(400);
    });

    it('returns 403 when a different owner tries to mark a booking as no-show', async () => {
      const res = await users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Test',
          eventDate: futureDate(201),
          startTime: '14:00',
          endTime: '18:00',
          guestCount: 10,
        })
        .expect(201);
      const bookingId = res.body.booking.id;

      await users.ownerAgent.put(`/api/v1/bookings/${bookingId}/approve`).expect(200);

      return users.otherOwnerAgent.put(`/api/v1/bookings/${bookingId}/no-show`).expect(403);
    });
  });
});
