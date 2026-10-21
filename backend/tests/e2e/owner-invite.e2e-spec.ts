import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

type TestAgent = ReturnType<typeof request.agent>;

// Mirrors TokenService.hashToken exactly — nothing exposes the real token hashing outside the
// auth module, so e2e tests for this flow hash their own raw tokens the same way to insert
// fixtures directly, since there's no admin-triggered endpoint yet (that's a later PR) to issue
// one through the real flow.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

describe('Owner invite — claim + preview (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniqueId = Date.now();
  const phoneFor = (offset: number) =>
    `+5917${String(uniqueId + offset)
      .padStart(7, '0')
      .slice(-7)}`;

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

    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  /** Simulates what an admin phone-onboarding endpoint (a later PR) will do: a placeholder
   * owner account with no password, blocked from logging in, plus a DRAFT venue pointed at it,
   * plus an invite token. Created directly via Prisma since no HTTP endpoint for this exists
   * yet in this PR. */
  async function createPlaceholderOwnerWithVenue(offset: number) {
    const owner = await prisma.user.create({
      data: {
        email: `placeholder-owner-${uniqueId}-${offset}@email.com`,
        phone: phoneFor(offset),
        passwordHash: null,
        fullName: 'Dueno Placeholder E2E',
        role: 'OWNER',
        status: 'PENDING_VERIFICATION',
      },
    });

    const venue = await prisma.venue.create({
      data: {
        ownerId: owner.id,
        name: `Local Placeholder ${uniqueId}-${offset}`,
        slug: `local-placeholder-${uniqueId}-${offset}`,
        address: 'Av. de Prueba #456',
        district: 'Distrito Fixture',
        departamento: 'LA_PAZ',
        capacityMax: 150,
        status: 'DRAFT',
      },
    });

    return { owner, venue };
  }

  async function issueToken(userId: string, overrides: { expiresAt?: Date; usedAt?: Date } = {}) {
    const rawToken = randomBytes(32).toString('hex');
    await prisma.ownerInviteToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        usedAt: overrides.usedAt,
      },
    });
    return rawToken;
  }

  describe('GET /api/v1/venues/preview/:token', () => {
    it('returns the draft venue(s) for a valid token, with no authentication', async () => {
      const { owner, venue } = await createPlaceholderOwnerWithVenue(0);
      const token = await issueToken(owner.id);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/venues/preview/${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(venue.id);
      expect(res.body[0].status).toBe('DRAFT');
    });

    it('returns 404 for an unknown token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/venues/preview/${randomBytes(32).toString('hex')}`)
        .expect(404);
    });

    it('returns 404 for an expired token', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(1);
      const token = await issueToken(owner.id, { expiresAt: new Date(Date.now() - 1000) });

      await request(app.getHttpServer()).get(`/api/v1/venues/preview/${token}`).expect(404);
    });

    it('still works after the token was already used to claim the account (viewing never consumes it)', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(2);
      const token = await issueToken(owner.id, { usedAt: new Date() });

      await request(app.getHttpServer()).get(`/api/v1/venues/preview/${token}`).expect(200);
    });
  });

  describe('POST /api/v1/auth/claim-invite', () => {
    it('activates the account, sets the password, verifies the email, logs in, and consumes the token', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(3);
      const token = await issueToken(owner.id);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'ClaimedPass123!' })
        .expect(200);

      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.body.user.id).toBe(owner.id);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(
        cookies.some((c) => c.startsWith('access_token=') && c.toLowerCase().includes('httponly')),
      ).toBe(true);

      const updated = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      expect(updated.status).toBe('ACTIVE');
      expect(updated.passwordHash).not.toBeNull();
      expect(updated.emailVerifiedAt).not.toBeNull();

      const storedToken = await prisma.ownerInviteToken.findFirst({ where: { userId: owner.id } });
      expect(storedToken?.usedAt).not.toBeNull();

      // The account is now a real, normal login — not just a claim-time session.
      const loginAgent: TestAgent = request.agent(app.getHttpServer());
      await loginAgent
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: 'ClaimedPass123!' })
        .expect(200);
    });

    it('rejects reusing an already-claimed token', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(4);
      const token = await issueToken(owner.id);

      await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'FirstClaim123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'SecondClaim123!' })
        .expect(400);
    });

    it('rejects an expired token', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(5);
      const token = await issueToken(owner.id, { expiresAt: new Date(Date.now() - 1000) });

      await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'ExpiredClaim123!' })
        .expect(400);
    });

    it('rejects an unknown token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token: randomBytes(32).toString('hex'), password: 'UnknownClaim123!' })
        .expect(400);
    });

    it('rejects a weak password, same rules as registration', async () => {
      const { owner } = await createPlaceholderOwnerWithVenue(6);
      const token = await issueToken(owner.id);

      await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'weak' })
        .expect(400);
    });
  });
});
