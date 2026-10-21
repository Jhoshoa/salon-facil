import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { loginAdmin, phoneFor, type TestAgent } from './helpers/booking-fixtures';

describe('Admin owner invites (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAgent: TestAgent;
  const uniqueId = Date.now();

  const ownerInviteBody = (offset: number) => ({
    owner: {
      fullName: 'Dueno Telefono E2E',
      email: `dueno-telefono-${uniqueId}-${offset}@email.com`,
      phone: phoneFor(uniqueId, offset),
    },
    venue: {
      name: `Salon Telefono E2E ${uniqueId}-${offset}`,
      address: 'Av. del Admin #789',
      district: 'Distrito Fixture',
      departamento: 'LA_PAZ',
      capacityMax: 180,
    },
  });

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
    adminAgent = await loginAdmin(app);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/admin/owner-invites', () => {
    it('creates a placeholder owner (no password, PENDING_VERIFICATION) and a DRAFT venue', async () => {
      const res = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(0))
        .expect(201);

      expect(res.body.owner.email).toBe(`dueno-telefono-${uniqueId}-0@email.com`);
      expect(res.body.owner.role).toBe('OWNER');
      expect(res.body.venue.status).toBe('DRAFT');
      expect(res.body.venue.ownerId).toBe(res.body.owner.id);

      const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: res.body.owner.id } });
      expect(dbUser.passwordHash).toBeNull();
      expect(dbUser.status).toBe('PENDING_VERIFICATION');
    });

    it('upgrades an existing CLIENT account to OWNER instead of creating a duplicate', async () => {
      const clientEmail = `client-becomes-owner-${uniqueId}@email.com`;
      const clientRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: clientEmail,
          password: 'Password123!',
          phone: phoneFor(uniqueId, 50),
          fullName: 'Cliente Que Sera Dueno',
          role: 'CLIENT',
        });

      const body = ownerInviteBody(1);
      body.owner.email = clientEmail;

      const res = await adminAgent.post('/api/v1/admin/owner-invites').send(body).expect(201);

      expect(res.body.owner.id).toBe(clientRes.body.user.id);
      expect(res.body.owner.role).toBe('OWNER');

      const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: clientRes.body.user.id } });
      // Already had a password from registering as a client -- upgrading the role never touches it.
      expect(dbUser.passwordHash).not.toBeNull();
    });

    it('reuses an existing OWNER for a second venue instead of erroring on the duplicate email', async () => {
      const first = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(2))
        .expect(201);

      const secondBody = ownerInviteBody(3);
      secondBody.owner.email = first.body.owner.email;
      const second = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(secondBody)
        .expect(201);

      expect(second.body.owner.id).toBe(first.body.owner.id);
      expect(second.body.venue.id).not.toBe(first.body.venue.id);
    });

    it('rejects an email that belongs to an admin account', async () => {
      const body = ownerInviteBody(4);
      body.owner.email = 'admin@mievento.com.bo';

      await adminAgent.post('/api/v1/admin/owner-invites').send(body).expect(400);
    });

    it('returns 403 for a non-admin caller', async () => {
      const ownerAgent = request.agent(app.getHttpServer());
      await ownerAgent.post('/api/v1/auth/register').send({
        email: `not-admin-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: phoneFor(uniqueId, 60),
        fullName: 'No Admin',
        role: 'OWNER',
      });

      await ownerAgent.post('/api/v1/admin/owner-invites').send(ownerInviteBody(5)).expect(403);
    });
  });

  describe('POST /api/v1/admin/owner-invites/:venueId/send', () => {
    it('issues an invite token and marks it sent (not resent) the first time', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(10))
        .expect(201);

      const res = await adminAgent
        .post(`/api/v1/admin/owner-invites/${created.body.venue.id}/send`)
        .expect(200);

      expect(res.body.resent).toBe(false);

      const tokens = await prisma.ownerInviteToken.findMany({
        where: { userId: created.body.owner.id },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].usedAt).toBeNull();
    });

    it('marks a second send as resent and invalidates the earlier token', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(11))
        .expect(201);

      await adminAgent
        .post(`/api/v1/admin/owner-invites/${created.body.venue.id}/send`)
        .expect(200);
      const res = await adminAgent
        .post(`/api/v1/admin/owner-invites/${created.body.venue.id}/send`)
        .expect(200);

      expect(res.body.resent).toBe(true);

      const tokens = await prisma.ownerInviteToken.findMany({
        where: { userId: created.body.owner.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens[0].usedAt).not.toBeNull();
      expect(tokens[1].usedAt).toBeNull();
    });

    it('returns 404 for an unknown venue', async () => {
      await adminAgent
        .post('/api/v1/admin/owner-invites/00000000-0000-0000-0000-000000000000/send')
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/owner-invites', () => {
    it('lists pending (unclaimed) owner invites with their venues', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(20))
        .expect(201);

      const res = await adminAgent
        .get('/api/v1/admin/owner-invites')
        .query({ search: created.body.owner.email })
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      const match = res.body.data.find((item: { id: string }) => item.id === created.body.owner.id);
      expect(match).toBeDefined();
      expect(match.venues.some((v: { id: string }) => v.id === created.body.venue.id)).toBe(true);
    });

    it('does not list an owner who already claimed their account', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(21))
        .expect(201);

      await prisma.user.update({
        where: { id: created.body.owner.id },
        data: { passwordHash: 'already-claimed-hash' },
      });

      const res = await adminAgent
        .get('/api/v1/admin/owner-invites')
        .query({ search: created.body.owner.email })
        .expect(200);

      expect(
        res.body.data.find((item: { id: string }) => item.id === created.body.owner.id),
      ).toBeUndefined();
    });
  });
});
