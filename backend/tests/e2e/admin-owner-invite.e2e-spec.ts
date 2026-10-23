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

    // A Google-only account also has passwordHash: null forever -- a real, active owner who
    // never needed a password, not an unclaimed admin placeholder. Only a linked identity (what
    // loginOrRegisterWithGoogle creates on signup) reliably tells the two apart.
    it('does not list an owner who registered themselves with Google', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(22))
        .expect(201);

      await prisma.userIdentity.create({
        data: {
          userId: created.body.owner.id,
          provider: 'google',
          providerId: `google-${created.body.owner.id}`,
          email: created.body.owner.email,
        },
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

  // Covers the "manage it ourselves first, invite the owner later" scenario: the admin never
  // has to send the invite while the venue is still DRAFT. sendInvite() doesn't look at venue
  // status at all, so approving (and letting it collect real inquiries) before ever inviting
  // the owner has to keep working exactly the same as inviting right away.
  describe('approve-then-invite (venue goes public before the owner is ever invited)', () => {
    /** The real raw token is never returned by any API response (only its hash is persisted) --
     * the only place it legitimately appears is in the body of the notification we already
     * enqueued, same as a real email/WhatsApp message would contain it. */
    async function extractRawTokenFromLatestInvite(ownerId: string): Promise<string> {
      const notification = await prisma.notification.findFirst({
        where: { userId: ownerId, type: 'VENUE_OWNER_INVITE', channel: 'EMAIL' },
        orderBy: { createdAt: 'desc' },
      });
      const match = notification?.content.match(/\/preview\/([a-f0-9]+)/);
      if (!match) throw new Error('No invite token found in the notification content');
      return match[1];
    }

    it('lets the admin approve/publish the venue first and invite the owner long after', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(30))
        .expect(201);
      const { owner, venue } = created.body;

      // Admin manages it fully and publishes it -- the owner hasn't been invited at all yet.
      const verifyRes = await adminAgent
        .put(`/api/v1/venues/${venue.id}/verify`)
        .send({ approve: true })
        .expect(200);
      expect(verifyRes.body.status).toBe('ACTIVE');
      expect(verifyRes.body.isVerified).toBe(true);

      // Now it's genuinely public -- anyone can find it, no auth, same as any other listed venue.
      await request(app.getHttpServer()).get(`/api/v1/venues/${verifyRes.body.slug}`).expect(200);

      // The owner still has no password and isn't in any "claimed" state.
      const beforeInvite = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      expect(beforeInvite.passwordHash).toBeNull();

      // Days/weeks later, the admin finally sends the invite -- after the venue is already live.
      const sendRes = await adminAgent
        .post(`/api/v1/admin/owner-invites/${venue.id}/send`)
        .expect(200);
      expect(sendRes.body.resent).toBe(false);

      const token = await extractRawTokenFromLatestInvite(owner.id);

      // The preview endpoint works the same for an ACTIVE/public venue as for a DRAFT one.
      const previewRes = await request(app.getHttpServer())
        .get(`/api/v1/venues/preview/${token}`)
        .expect(200);
      expect(previewRes.body).toHaveLength(1);
      expect(previewRes.body[0].id).toBe(venue.id);
      expect(previewRes.body[0].status).toBe('ACTIVE');

      // Claiming still activates the account and logs the owner in, exactly as if the venue
      // had still been a DRAFT -- the venue's own lifecycle never blocks or alters this.
      const claimRes = await request(app.getHttpServer())
        .post('/api/v1/auth/claim-invite')
        .send({ token, password: 'ApprovedFirst123!' })
        .expect(200);
      expect(claimRes.body.user.id).toBe(owner.id);

      const afterClaim = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      expect(afterClaim.status).toBe('ACTIVE');
      expect(afterClaim.passwordHash).not.toBeNull();

      // The venue itself is untouched by the claim -- still ACTIVE, still owned by the same id.
      const venueAfterClaim = await prisma.venue.findUniqueOrThrow({ where: { id: venue.id } });
      expect(venueAfterClaim.status).toBe('ACTIVE');
      expect(venueAfterClaim.ownerId).toBe(owner.id);
    });
  });

  // Covers attaching a real owner to a venue that was created some other way (e.g. an admin
  // testing something directly, so the venue's owner is the admin's own account) instead of
  // through the phone-onboarding form above.
  describe('POST /api/v1/admin/owner-invites/:venueId/assign-owner', () => {
    async function createAdminOwnedVenue(offset: number) {
      const res = await adminAgent
        .post('/api/v1/venues')
        .field('name', `Salon De Prueba Admin ${uniqueId}-${offset}`)
        .field('address', 'Av. del Admin #1')
        .field('district', 'Distrito Fixture')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '100')
        .expect(201);
      return res.body.id as string;
    }

    it('attaches a new owner and sends the invite when the venue still belongs to the admin', async () => {
      const venueId = await createAdminOwnedVenue(40);

      const res = await adminAgent
        .post(`/api/v1/admin/owner-invites/${venueId}/assign-owner`)
        .send({
          fullName: 'Dueno Asignado E2E',
          email: `dueno-asignado-${uniqueId}@email.com`,
          phone: phoneFor(uniqueId, 41),
        })
        .expect(200);
      expect(res.body.resent).toBe(false);

      const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
      const newOwner = await prisma.user.findUniqueOrThrow({
        where: { email: `dueno-asignado-${uniqueId}@email.com` },
      });
      expect(venue.ownerId).toBe(newOwner.id);
      expect(newOwner.role).toBe('OWNER');
      expect(newOwner.passwordHash).toBeNull();
    });

    it('rejects reassigning a venue that already belongs to a real (non-ADMIN) owner', async () => {
      const created = await adminAgent
        .post('/api/v1/admin/owner-invites')
        .send(ownerInviteBody(42))
        .expect(201);

      await adminAgent
        .post(`/api/v1/admin/owner-invites/${created.body.venue.id}/assign-owner`)
        .send({
          fullName: 'Otro Dueno',
          email: `otro-dueno-${uniqueId}@email.com`,
          phone: phoneFor(uniqueId, 43),
        })
        .expect(400);
    });
  });
});
