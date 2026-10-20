import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { CloudinaryService } from '../../src/modules/upload/cloudinary.service';
import {
  type BookingFixtureUsers,
  type TestAgent,
  createApprovedBooking,
  createVerifiedVenue,
  loginAdmin,
  registerFixtureUsers,
} from './helpers/booking-fixtures';

// Cloudinary isn't configured in this environment -- a real multipart upload would throw. Same
// deliberate deviation payment.e2e-spec.ts makes (everything else here hits the real app).
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

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let adminAgent: TestAgent;
  let fixtureUsers: BookingFixtureUsers;

  const uniqueId = Date.now();

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

    adminAgent = await loginAdmin(app);
    fixtureUsers = await registerFixtureUsers(app, uniqueId);

    const venueId = await createVerifiedVenue(fixtureUsers.ownerAgent, adminAgent, uniqueId);

    const { bookingId, totalPrice } = await createApprovedBooking(
      venueId,
      fixtureUsers.clientAgent,
      fixtureUsers.ownerAgent,
      5,
    );

    // A booking can only be marked COMPLETED once it's DEPOSIT_PAID/FULLY_PAID (see
    // BookingEntity.canBeCompleted) -- pay it off in full first, same flow as
    // payment.e2e-spec.ts's "advances a booking straight to FULLY_PAID" case.
    const paymentRes = await fixtureUsers.clientAgent
      .post(`/api/v1/payments/bookings/${bookingId}`)
      .send({ paymentType: 'FULL', method: 'QR_BANK', amount: totalPrice })
      .expect(201);
    await fixtureUsers.clientAgent
      .post(`/api/v1/payments/${paymentRes.body.id}/proof`)
      .attach('file', Buffer.from('fake-image-bytes'), 'proof.jpg')
      .expect(201);
    await fixtureUsers.ownerAgent.put(`/api/v1/payments/${paymentRes.body.id}/confirm`).expect(200);

    await fixtureUsers.ownerAgent.put(`/api/v1/bookings/${bookingId}/complete`).expect(200);

    await fixtureUsers.clientAgent
      .post(`/api/v1/bookings/${bookingId}/review`)
      .send({ rating: 5, comment: `Review without a response ${uniqueId}` })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  // Regression test: NestJS's global ValidationPipe runs with `enableImplicitConversion: true`
  // (see main.ts), which coerces a boolean-typed query param via generic `Boolean(value)` BEFORE
  // a @Transform callback sees it -- the string "false" is non-empty, so it was silently coerced
  // to `true`, defeating the filter entirely (both hasResponse=true and hasResponse=false matched
  // every review). AdminReviewQueryDto's fix reads the untouched raw value via `obj[key]` instead
  // of the pre-converted `value`.
  describe('GET /admin/reviews', () => {
    it('hasResponse=false excludes a review that already has an owner response', async () => {
      const allRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId) })
        .expect(200);
      expect(allRes.body.total).toBe(1);

      const noResponseRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), hasResponse: 'false' })
        .expect(200);
      expect(noResponseRes.body.total).toBe(1);

      const hasResponseRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), hasResponse: 'true' })
        .expect(200);
      expect(hasResponseRes.body.total).toBe(0);
    });

    it('hasResponse=true excludes it once an owner response is added, and vice versa', async () => {
      const reviewId = (
        await adminAgent.get('/api/v1/admin/reviews').query({ search: String(uniqueId) })
      ).body.data[0].id;

      await adminAgent
        .post(`/api/v1/reviews/${reviewId}/response`)
        .send({ response: 'Gracias por tu reseña' })
        .expect(201);

      const hasResponseRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), hasResponse: 'true' })
        .expect(200);
      expect(hasResponseRes.body.total).toBe(1);

      const noResponseRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), hasResponse: 'false' })
        .expect(200);
      expect(noResponseRes.body.total).toBe(0);
    });

    it('filters by rating', async () => {
      const res = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), rating: 5 })
        .expect(200);
      expect(res.body.total).toBe(1);

      const noneRes = await adminAgent
        .get('/api/v1/admin/reviews')
        .query({ search: String(uniqueId), rating: 1 })
        .expect(200);
      expect(noneRes.body.total).toBe(0);
    });

    it('returns 403 for a non-admin', () => {
      return fixtureUsers.ownerAgent.get('/api/v1/admin/reviews').expect(403);
    });
  });
});
