import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { CloudinaryService } from '../../src/modules/upload/cloudinary.service';
import {
  createApprovedBooking,
  createVerifiedVenue,
  loginAdmin,
  registerFixtureUsers,
  BookingFixtureUsers,
} from './helpers/booking-fixtures';

// Cloudinary isn't configured in this environment (no CLOUDINARY_* env vars — see
// docs/app-flows/README.md §0.2), so a real multipart upload would throw. Faking the two
// upload methods is the one deliberate deviation from the auth/venue e2e convention of never
// overriding providers — everything else in this suite hits the real app end to end.
const fakeCloudinary = {
  uploadFile: jest
    .fn()
    .mockResolvedValue({ url: 'https://example.com/fake-proof.jpg', publicId: 'fake' }),
  uploadImage: jest
    .fn()
    .mockResolvedValue({ url: 'https://example.com/fake-image.jpg', publicId: 'fake' }),
  uploadMultiple: jest.fn().mockResolvedValue([]),
  deleteImage: jest.fn().mockResolvedValue(undefined),
};

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let users: BookingFixtureUsers;
  let venueId: string;
  let dayCounter = 100;

  const uniqueId = Date.now();

  const nextBooking = () =>
    createApprovedBooking(venueId, users.clientAgent, users.ownerAgent, dayCounter++);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudinaryService)
      .useValue(fakeCloudinary)
      .compile();

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

  describe('POST /api/v1/payments/bookings/:bookingId', () => {
    it('creates a DEPOSIT payment for the exact expected amount', async () => {
      const booking = await nextBooking();

      return users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'BANK_TRANSFER', amount: booking.depositAmount })
        .expect(201)
        .then((res) => {
          expect(res.body.status).toBe('PENDING');
          expect(res.body.amount).toBe(booking.depositAmount);
        });
    });

    it('rejects a DEPOSIT amount that does not match the booking', async () => {
      const booking = await nextBooking();

      return users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({
          paymentType: 'DEPOSIT',
          method: 'BANK_TRANSFER',
          amount: booking.depositAmount + 1,
        })
        .expect(400);
    });

    it('rejects a FULL payment for less than the booking total (security regression)', async () => {
      const booking = await nextBooking();

      return users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'FULL', method: 'QR_BANK', amount: 1 })
        .expect(400);
    });

    it("returns 403 when creating a payment for another client's booking", async () => {
      const booking = await nextBooking();

      return users.otherOwnerAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'BANK_TRANSFER', amount: booking.depositAmount })
        .expect(403);
    });
  });

  describe('Confirming a payment advances the booking status (regression coverage)', () => {
    it('advances an APPROVED booking to DEPOSIT_PAID once its deposit payment is confirmed', async () => {
      const booking = await nextBooking();

      const paymentRes = await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'BANK_TRANSFER', amount: booking.depositAmount })
        .expect(201);
      const paymentId = paymentRes.body.id;

      // Confirming before a proof is uploaded must be rejected.
      await users.ownerAgent.put(`/api/v1/payments/${paymentId}/confirm`).expect(400);

      await users.clientAgent
        .post(`/api/v1/payments/${paymentId}/proof`)
        .attach('file', Buffer.from('fake-image-bytes'), 'proof.jpg')
        .expect(201)
        .then((res) => {
          expect(res.body.comprobanteUrl).toBe('https://example.com/fake-proof.jpg');
        });

      await users.ownerAgent
        .put(`/api/v1/payments/${paymentId}/confirm`)
        .send({ notes: 'Comprobante verificado' })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('COMPLETED');
        });

      const bookingRes = await users.ownerAgent
        .get(`/api/v1/bookings/${booking.bookingId}`)
        .expect(200);
      expect(bookingRes.body.status).toBe('DEPOSIT_PAID');
      expect(bookingRes.body.depositPaid).toBe(true);
    });

    it('advances a booking straight to FULLY_PAID once a FULL payment is confirmed', async () => {
      const booking = await nextBooking();

      const paymentRes = await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'FULL', method: 'QR_BANK', amount: booking.totalPrice })
        .expect(201);
      const paymentId = paymentRes.body.id;

      await users.clientAgent
        .post(`/api/v1/payments/${paymentId}/proof`)
        .attach('file', Buffer.from('fake-image-bytes'), 'proof.jpg')
        .expect(201);

      await users.ownerAgent.put(`/api/v1/payments/${paymentId}/confirm`).expect(200);

      const bookingRes = await users.ownerAgent
        .get(`/api/v1/bookings/${booking.bookingId}`)
        .expect(200);
      expect(bookingRes.body.status).toBe('FULLY_PAID');
    });

    it('lets the owner reject a payment with a reason, leaving the booking untouched', async () => {
      const booking = await nextBooking();

      const paymentRes = await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'CASH', amount: booking.depositAmount })
        .expect(201);

      await users.ownerAgent
        .put(`/api/v1/payments/${paymentRes.body.id}/reject`)
        .send({ reason: 'Comprobante ilegible' })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('FAILED');
        });

      const bookingRes = await users.ownerAgent
        .get(`/api/v1/bookings/${booking.bookingId}`)
        .expect(200);
      expect(bookingRes.body.status).toBe('APPROVED');
    });

    it('returns 403 when a different owner tries to confirm a payment', async () => {
      const booking = await nextBooking();

      const paymentRes = await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'CASH', amount: booking.depositAmount })
        .expect(201);

      // Proof must exist first — otherwise canBeConfirmed() fails with 400 before the
      // ownership check ever runs, and this test wouldn't be isolating what it claims to.
      await users.clientAgent
        .post(`/api/v1/payments/${paymentRes.body.id}/proof`)
        .attach('file', Buffer.from('fake-image-bytes'), 'proof.jpg')
        .expect(201);

      return users.otherOwnerAgent
        .put(`/api/v1/payments/${paymentRes.body.id}/confirm`)
        .expect(403);
    });
  });

  describe('Full lifecycle: payment confirmation unblocks markAsCompleted', () => {
    it('lets the owner mark a DEPOSIT_PAID booking as completed once the deposit is confirmed', async () => {
      const booking = await nextBooking();

      const paymentRes = await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'BANK_TRANSFER', amount: booking.depositAmount })
        .expect(201);

      await users.clientAgent
        .post(`/api/v1/payments/${paymentRes.body.id}/proof`)
        .attach('file', Buffer.from('fake-image-bytes'), 'proof.jpg')
        .expect(201);

      await users.ownerAgent.put(`/api/v1/payments/${paymentRes.body.id}/confirm`).expect(200);

      await users.ownerAgent
        .put(`/api/v1/bookings/${booking.bookingId}/complete`)
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('COMPLETED');
        });
    });
  });

  describe('GET /api/v1/payments/owner/pending', () => {
    it('returns only pending payments for the venue owner', async () => {
      const booking = await nextBooking();

      await users.clientAgent
        .post(`/api/v1/payments/bookings/${booking.bookingId}`)
        .send({ paymentType: 'DEPOSIT', method: 'CASH', amount: booking.depositAmount })
        .expect(201);

      const res = await users.ownerAgent.get('/api/v1/payments/owner/pending').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((p: { status: string }) => p.status === 'PENDING')).toBe(true);
    });

    it('returns 403 for CLIENT role', () => {
      return users.clientAgent.get('/api/v1/payments/owner/pending').expect(403);
    });
  });

  describe('GET /api/v1/payments/owner/earnings', () => {
    it("reflects the owner's confirmed payments", async () => {
      const res = await users.ownerAgent.get('/api/v1/payments/owner/earnings').expect(200);

      expect(res.body.summary.totalEarned).toBeGreaterThan(0);
      expect(res.body.summary.paymentCount).toBeGreaterThan(0);
      expect(Array.isArray(res.body.breakdown)).toBe(true);
    });
  });
});
