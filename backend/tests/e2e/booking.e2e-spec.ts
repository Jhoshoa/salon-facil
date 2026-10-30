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

  describe('Catalog items in the quote', () => {
    let itemsVenueId: string;
    let chargedItemId: string;
    let includedItemId: string;
    let otherVenueItemId: string;

    const createItem = async (
      targetVenueId: string,
      fields: Record<string, string>,
    ): Promise<string> => {
      const categoryRes = await users.ownerAgent
        .post(`/api/v1/venues/${targetVenueId}/rental-item-categories`)
        .send({ name: `Categoria ${Math.random().toString(36).slice(2, 8)}` })
        .expect(201);
      let req = users.ownerAgent
        .post(`/api/v1/venues/${targetVenueId}/rental-items`)
        .field('categoryId', categoryRes.body.id);
      const withStock = fields.isIncluded ? fields : { stockQty: '1000', ...fields };
      for (const [key, value] of Object.entries(withStock)) req = req.field(key, value);
      const res = await req.expect(201);
      return res.body.id;
    };

    const previewWith = (selection: unknown) =>
      request(app.getHttpServer())
        .get(`/api/v1/venues/${itemsVenueId}/bookings/preview-price`)
        .query({
          eventDate: futureDate(70),
          startTime: '14:00',
          endTime: '20:00',
          selectedRentalItems: JSON.stringify(selection),
        });

    beforeAll(async () => {
      const adminAgent = await loginAdmin(app);
      itemsVenueId = await createVerifiedVenue(users.ownerAgent, adminAgent, uniqueId, {
        capacityMax: 100,
        basePrice: 1000,
      });
      const otherVenueId = await createVerifiedVenue(users.ownerAgent, adminAgent, uniqueId, {
        capacityMax: 100,
        basePrice: 1000,
      });
      chargedItemId = await createItem(itemsVenueId, {
        name: 'Silla',
        pricePerUnit: '12.5',
        stockQty: '80',
      });
      includedItemId = await createItem(itemsVenueId, { name: 'Mesa', isIncluded: 'true' });
      otherVenueItemId = await createItem(otherVenueId, { name: 'Ajeno', pricePerUnit: '10' });
    }, 30000);

    it('previews the total and the deposit with the items added', () => {
      return previewWith([{ rentalItemId: chargedItemId, quantity: 4 }])
        .expect(200)
        .then((res) => {
          expect(res.body.rentalItemsTotal).toBe(50);
          expect(res.body.totalPrice).toBe(1050);
          expect(res.body.depositAmount).toBe(315);
          expect(res.body.rentalItems[0]).toMatchObject({ name: 'Silla', unitPrice: 12.5 });
        });
    });

    it('saves a snapshot that survives a later price change', async () => {
      const created = await users.clientAgent
        .post(`/api/v1/venues/${itemsVenueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(71),
          startTime: '14:00',
          endTime: '20:00',
          guestCount: 50,
          selectedRentalItems: [{ rentalItemId: chargedItemId, quantity: 2 }],
        })
        .expect(201);

      expect(created.body.booking.totalPrice).toBe(1025);
      await users.ownerAgent
        .put(`/api/v1/venues/${itemsVenueId}/rental-items/${chargedItemId}`)
        .field('pricePerUnit', '99')
        .expect(200);

      const stored = await users.clientAgent
        .get(`/api/v1/bookings/${created.body.booking.id}`)
        .expect(200);
      expect(stored.body.totalPrice).toBe(1025);
      expect(stored.body.selectedRentalItems).toEqual([
        {
          rentalItemId: chargedItemId,
          name: 'Silla',
          unitLabel: 'unidad',
          unitPrice: 12.5,
          quantity: 2,
          chargeBasis: 'PER_DAY',
          billedDays: 1,
          subtotal: 25,
        },
      ]);

      await users.ownerAgent
        .put(`/api/v1/venues/${itemsVenueId}/rental-items/${chargedItemId}`)
        .field('pricePerUnit', '12.5')
        .expect(200);
    });

    it('charges per day or per event according to the item, on a booking of several days', async () => {
      const adminAgent = await loginAdmin(app);
      const multiDayVenue = await createVerifiedVenue(users.ownerAgent, adminAgent, uniqueId, {
        allowsMultipleDays: true,
        basePrice: 1000,
      });
      const perDay = await createItem(multiDayVenue, { name: 'Vajilla', pricePerUnit: '10' });
      const perEvent = await createItem(multiDayVenue, {
        name: 'Toldo',
        pricePerUnit: '300',
        chargeBasis: 'PER_EVENT',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/venues/${multiDayVenue}/bookings/preview-price`)
        .query({
          eventDate: futureDate(80),
          endDate: futureDate(82),
          startTime: '14:00',
          endTime: '20:00',
          selectedRentalItems: JSON.stringify([
            { rentalItemId: perDay, quantity: 2 },
            { rentalItemId: perEvent, quantity: 1 },
          ]),
        })
        .expect(200);

      expect(res.body.rentalItems).toEqual([
        expect.objectContaining({ name: 'Vajilla', billedDays: 3, subtotal: 60 }),
        expect.objectContaining({ name: 'Toldo', billedDays: 1, subtotal: 300 }),
      ]);
      expect(res.body.totalPrice).toBe(res.body.appliedPrice + 360);
    });

    it('rejects an unknown charge basis', async () => {
      const category = await users.ownerAgent
        .post(`/api/v1/venues/${itemsVenueId}/rental-item-categories`)
        .send({ name: 'Con cobro invalido' })
        .expect(201);
      await users.ownerAgent
        .post(`/api/v1/venues/${itemsVenueId}/rental-items`)
        .field('name', 'Invalido')
        .field('categoryId', category.body.id)
        .field('pricePerUnit', '1')
        .field('chargeBasis', 'POR_HORA')
        .expect(400);
    });

    it('rejects a quantity above the stock', () => {
      return previewWith([{ rentalItemId: chargedItemId, quantity: 81 }]).expect(400);
    });

    it('rejects an included item and an item from another venue', async () => {
      await previewWith([{ rentalItemId: includedItemId, quantity: 1 }]).expect(400);
      await previewWith([{ rentalItemId: otherVenueItemId, quantity: 1 }]).expect(400);
    });

    it('answers 400, not 500, when the total would not fit in the booking', async () => {
      const expensive = await createItem(itemsVenueId, {
        name: 'Carisimo',
        pricePerUnit: '999999.99',
        stockQty: '100000',
      });

      await users.clientAgent
        .post(`/api/v1/venues/${itemsVenueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(72),
          startTime: '14:00',
          endTime: '20:00',
          guestCount: 50,
          selectedRentalItems: [{ rentalItemId: expensive, quantity: 100000 }],
        })
        .expect(400);
    });

    it('rejects malformed selections without a server error', async () => {
      const preview = (selectedRentalItems: string) =>
        request(app.getHttpServer())
          .get(`/api/v1/venues/${itemsVenueId}/bookings/preview-price`)
          .query({
            eventDate: futureDate(70),
            startTime: '14:00',
            endTime: '20:00',
            selectedRentalItems,
          });

      await preview('not json').expect(400);
      await preview('{"rentalItemId":"x"}').expect(400);
      await preview('[1]').expect(400);
      await preview('[null]').expect(400);
      await preview(`[{"__proto__":{"quantity":1},"rentalItemId":"${chargedItemId}"}]`).expect(400);
      await preview(
        JSON.stringify(
          Array.from({ length: 51 }, () => ({ rentalItemId: chargedItemId, quantity: 1 })),
        ),
      ).expect(400);
    });

    it('shows a booking and its items only to its client, the venue owner and admins', async () => {
      const created = await users.clientAgent
        .post(`/api/v1/venues/${itemsVenueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(73),
          startTime: '14:00',
          endTime: '20:00',
          guestCount: 50,
          selectedRentalItems: [{ rentalItemId: chargedItemId, quantity: 1 }],
        })
        .expect(201);
      const url = `/api/v1/bookings/${created.body.booking.id}`;

      const otherClient = request.agent(app.getHttpServer());
      await otherClient.post('/api/v1/auth/register').send({
        email: `items-other-client-${uniqueId}@email.com`,
        password: 'TestPass123!',
        fullName: 'Otro Cliente',
        phone: `+5916${String(uniqueId).slice(-7)}`,
        role: 'CLIENT',
      });

      await request(app.getHttpServer()).get(url).expect(401);
      await otherClient.get(url).expect(403);
      await users.otherOwnerAgent.get(url).expect(403);
      await users.clientAgent.get(url).expect(200);
      await users.ownerAgent.get(url).expect(200);
      await users.otherOwnerAgent.get(`/api/v1/venues/${itemsVenueId}/bookings`).expect(403);
    });

    it('gives another owner a 403 whatever state the booking is in', async () => {
      const created = await users.clientAgent
        .post(`/api/v1/venues/${itemsVenueId}/bookings`)
        .send({
          eventType: 'Boda',
          eventDate: futureDate(74),
          startTime: '14:00',
          endTime: '20:00',
          guestCount: 50,
        })
        .expect(201);
      const url = `/api/v1/bookings/${created.body.booking.id}`;
      await users.ownerAgent.put(`${url}/approve`).expect(200);

      // Answering 400 here would reveal the booking's current state to someone with no access.
      await users.otherOwnerAgent.put(`${url}/approve`).expect(403);
      await users.otherOwnerAgent.put(`${url}/reject`).send({}).expect(403);
      await users.otherOwnerAgent.put(`${url}/complete`).expect(403);
    });

    it('rejects a client-sent price and an invalid quantity', async () => {
      await previewWith([{ rentalItemId: chargedItemId, quantity: 1, unitPrice: 1 }]).expect(400);
      await previewWith([{ rentalItemId: chargedItemId, quantity: 0 }]).expect(400);
      await previewWith([{ rentalItemId: chargedItemId, quantity: 1.5 }]).expect(400);
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

  describe('GET /api/v1/bookings/owner/pending-count', () => {
    it('increases by 1 when a new PENDING booking is requested on the owner venue', async () => {
      const before = await users.ownerAgent.get('/api/v1/bookings/owner/pending-count').expect(200);

      await users.clientAgent
        .post(`/api/v1/venues/${venueId}/bookings`)
        .send({
          eventType: 'Test',
          eventDate: futureDate(210),
          startTime: '14:00',
          endTime: '18:00',
          guestCount: 10,
        })
        .expect(201);

      const after = await users.ownerAgent.get('/api/v1/bookings/owner/pending-count').expect(200);

      expect(after.body.count).toBe(before.body.count + 1);
    });

    it("does not leak another owner's pending bookings", () => {
      return users.otherOwnerAgent
        .get('/api/v1/bookings/owner/pending-count')
        .expect(200)
        .then((res) => {
          expect(res.body.count).toBe(0);
        });
    });

    it('returns 403 for CLIENT role', () => {
      return users.clientAgent.get('/api/v1/bookings/owner/pending-count').expect(403);
    });

    it('returns 401 when not authenticated', () => {
      return request(app.getHttpServer()).get('/api/v1/bookings/owner/pending-count').expect(401);
    });
  });
});
