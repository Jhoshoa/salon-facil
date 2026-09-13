import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';

type TestAgent = ReturnType<typeof request.agent>;

describe('Venues (e2e)', () => {
  let app: INestApplication;
  let ownerAgent: TestAgent;
  let owner2Agent: TestAgent;
  let clientAgent: TestAgent;
  let adminAgent: TestAgent;
  let ownerUserId: string;

  const uniqueId = Date.now();

  const ownerEmail = `owner-venue-${uniqueId}@email.com`;
  const ownerPhone = `+5917${String(uniqueId).slice(-7)}`;
  const owner2Email = `owner2-venue-${uniqueId}@email.com`;
  const owner2Phone = `+5917${String(uniqueId + 1).slice(-7)}`;
  const clientEmail = `client-venue-${uniqueId}@email.com`;
  const clientPhone = `+5917${String(uniqueId + 2).slice(-7)}`;

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

    // Register users — each agent keeps its own cookie jar (httpOnly auth cookies), like a
    // separate logged-in browser tab per user.
    ownerAgent = request.agent(app.getHttpServer());
    const ownerRes = await ownerAgent.post('/api/v1/auth/register').send({
      email: ownerEmail,
      password: 'Password123!',
      phone: ownerPhone,
      fullName: 'Owner Venue Test',
      role: 'OWNER',
    });
    ownerUserId = ownerRes.body.user.id;

    owner2Agent = request.agent(app.getHttpServer());
    await owner2Agent.post('/api/v1/auth/register').send({
      email: owner2Email,
      password: 'Password123!',
      phone: owner2Phone,
      fullName: 'Owner 2 Venue Test',
      role: 'OWNER',
    });

    clientAgent = request.agent(app.getHttpServer());
    await clientAgent.post('/api/v1/auth/register').send({
      email: clientEmail,
      password: 'Password123!',
      phone: clientPhone,
      fullName: 'Client Venue Test',
      role: 'CLIENT',
    });

    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/v1/auth/login').send({
      email: 'admin@mievento.com.bo',
      password: 'Password123!',
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ===== CA3: Public search without auth =====
  describe('GET /api/v1/venues (public)', () => {
    it('should search venues without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/venues?startDate=2026-09-20&guestCount=50')
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('venues');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.venues)).toBe(true);
        });
    });

    it('should reject public search without required availability params', () => {
      return request(app.getHttpServer()).get('/api/v1/venues').expect(400);
    });

    it('should support pagination params', () => {
      return request(app.getHttpServer())
        .get('/api/v1/venues?page=1&limit=5&startDate=2026-09-20&guestCount=50')
        .expect(200)
        .then((res) => {
          expect(res.body.venues.length).toBeLessThanOrEqual(5);
        });
    });
  });

  // ===== CA1 & CA8: Create venue as OWNER =====
  describe('POST /api/v1/venues', () => {
    const venueName = `Salon Test ${uniqueId}`;
    let createdVenueId: string;
    let createdVenueSlug: string;

    it('should create a venue as OWNER (CA1)', () => {
      return ownerAgent
        .post('/api/v1/venues')
        .field('name', venueName)
        .field('description', 'Un salon de fiestas ideal para eventos especiales en El Alto.')
        .field('address', 'Av. 6 de Octubre #1234')
        .field('district', 'Distrito 3')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '200')
        .field('services', JSON.stringify([{ name: 'Sonido', isIncluded: true }]))
        .field('prices', JSON.stringify([{ priceType: 'BASE', price: 3000 }]))
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('slug');
          expect(res.body.name).toBe(venueName);
          expect(res.body.status).toBe('DRAFT');
          expect(res.body.ownerId).toBe(ownerUserId);
          createdVenueId = res.body.id;
          createdVenueSlug = res.body.slug;
        });
    });

    // ===== CA2: Slug uniqueness =====
    it('should generate unique slugs (CA2)', async () => {
      const res2 = await ownerAgent
        .post('/api/v1/venues')
        .field('name', venueName)
        .field('description', 'Otro salon con el mismo nombre para probar slugs unicos.')
        .field('address', 'Av. 6 de Octubre #5678')
        .field('district', 'Distrito 1')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '100')
        .expect(201);

      expect(res2.body.slug).not.toBe(createdVenueSlug);
      expect(res2.body.slug).toContain(venueName.toLowerCase().replace(/\s+/g, '-'));
    });

    // ===== CA11: Services and prices persisted =====
    it('should persist services and prices (CA11 & CA10)', async () => {
      // The public slug lookup only returns ACTIVE + verified venues — this one is still DRAFT
      // right after creation, so verify it first (same as CA5 below).
      await adminAgent
        .put(`/api/v1/venues/${createdVenueId}/verify`)
        .send({ approve: true })
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/v1/venues/${createdVenueSlug}`)
        .expect(200)
        .then((res) => {
          expect(res.body.services).toBeDefined();
          expect(Array.isArray(res.body.services)).toBe(true);
          expect(res.body.services.length).toBeGreaterThanOrEqual(1);
          expect(res.body.services[0].name).toBe('Sonido');

          expect(res.body.prices).toBeDefined();
          expect(Array.isArray(res.body.prices)).toBe(true);
        });
    });

    it('should return 401 without a session', () => {
      return request(app.getHttpServer())
        .post('/api/v1/venues')
        .field('name', 'No Auth Salon')
        .field('description', 'Este salon no deberia crearse sin autenticacion.')
        .field('address', 'Test Address 12345')
        .field('district', 'Test')
        .field('capacityMax', '50')
        .expect(401);
    });

    it('should return 403 for CLIENT role', () => {
      return clientAgent
        .post('/api/v1/venues')
        .field('name', 'Client Salon')
        .field('description', 'Este salon no deberia crearse con rol de cliente.')
        .field('address', 'Client Address 12345')
        .field('district', 'Test')
        .field('capacityMax', '50')
        .expect(403);
    });

    it('should return 400 for invalid data', () => {
      return ownerAgent
        .post('/api/v1/venues')
        .field('name', 'AB')
        .field('description', 'Short')
        .field('address', '')
        .field('district', '')
        .expect(400);
    });
  });

  // ===== CA5: Get venue by slug =====
  describe('GET /api/v1/venues/:slug', () => {
    let testSlug: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Slug Test Venue ${uniqueId}`)
        .field('description', 'Venue para probar obtencion por slug correctamente.')
        .field('address', 'Slug Test Address 12345')
        .field('district', 'Slug District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '150')
        .expect(201);
      testSlug = res.body.slug;

      // Only ACTIVE + verified venues are visible via the public slug lookup.
      await adminAgent
        .put(`/api/v1/venues/${res.body.id}/verify`)
        .send({ approve: true })
        .expect(200);
    });

    it('should 404 a venue that is not ACTIVE/verified yet (draft, pending, rejected, deactivated)', async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Draft Slug Test ${uniqueId}`)
        .field('description', 'Venue en borrador, no deberia ser visible publicamente.')
        .field('address', 'Draft Slug Address')
        .field('district', 'Test')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);

      await request(app.getHttpServer()).get(`/api/v1/venues/${res.body.slug}`).expect(404);
    });

    it('should get venue by slug publicly (CA5)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/venues/${testSlug}`)
        .expect(200)
        .then((res) => {
          expect(res.body.slug).toBe(testSlug);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('capacityMax');
        });
    });

    it('should return 404 for non-existent slug', () => {
      return request(app.getHttpServer()).get('/api/v1/venues/slug-que-no-existe-xyz').expect(404);
    });
  });

  // ===== CA6: Ownership protection =====
  describe('PUT /api/v1/venues/:id (ownership)', () => {
    let owner1VenueId: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Ownership Test Venue ${uniqueId}`)
        .field('description', 'Venue para probar la proteccion de ownership entre propietarios.')
        .field('address', 'Ownership Address 12345')
        .field('district', 'Ownership District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '100')
        .expect(201);
      owner1VenueId = res.body.id;
    });

    it('should allow owner to update their venue', () => {
      return ownerAgent
        .put(`/api/v1/venues/${owner1VenueId}`)
        .field('name', 'Ownership Test Venue Updated')
        .expect(200)
        .then((res) => {
          expect(res.body.name).toBe('Ownership Test Venue Updated');
        });
    });

    it('should return 403 when different owner tries to update (CA6)', () => {
      return owner2Agent
        .put(`/api/v1/venues/${owner1VenueId}`)
        .field('name', 'Hacked Venue Name')
        .expect(403);
    });

    it('should return 403 when CLIENT tries to update', () => {
      return clientAgent
        .put(`/api/v1/venues/${owner1VenueId}`)
        .field('name', 'Client Hacked Venue')
        .expect(403);
    });
  });

  // ===== CA9: Soft delete =====
  describe('DELETE /api/v1/venues/:id', () => {
    let deleteVenueId: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Delete Test Venue ${uniqueId}`)
        .field('description', 'Venue que sera eliminada para probar el soft delete.')
        .field('address', 'Delete Address 12345')
        .field('district', 'Delete District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);
      deleteVenueId = res.body.id;
    });

    it('should soft delete venue (CA9)', async () => {
      await ownerAgent.delete(`/api/v1/venues/${deleteVenueId}`).expect(204);

      // A real soft delete: the venue disappears from the owner's own list entirely (not just
      // flipped to INACTIVE, which is the reversible deactivate/reactivate toggle instead).
      const getRes = await ownerAgent.get(`/api/v1/venues/my/venues`).expect(200);
      const deletedVenue = getRes.body.find((v: { id: string }) => v.id === deleteVenueId);
      expect(deletedVenue).toBeUndefined();
    });

    it('should return 403 when different owner tries to delete', async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Delete 403 Test ${uniqueId}`)
        .field('description', 'Venue para verificar que otro propietario no puede eliminar.')
        .field('address', 'Delete 403 Address')
        .field('district', 'Test')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);

      return owner2Agent.delete(`/api/v1/venues/${res.body.id}`).expect(403);
    });
  });

  // ===== CA7: Admin verify =====
  describe('PUT /api/v1/venues/:id/verify', () => {
    let pendingVenueId: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Verify Test Venue ${uniqueId}`)
        .field('description', 'Venue pendiente de verificacion por administrador.')
        .field('address', 'Verify Address 12345')
        .field('district', 'Verify District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '100')
        .expect(201);
      pendingVenueId = res.body.id;
    });

    it('should verify venue as ADMIN (CA7)', async () => {
      const res = await adminAgent
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .send({ approve: true })
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.isVerified).toBe(true);
    });

    it('should return 403 when OWNER tries to verify', () => {
      return ownerAgent
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .send({ approve: true })
        .expect(403);
    });

    it('should return 403 when CLIENT tries to verify', () => {
      return clientAgent
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .send({ approve: true })
        .expect(403);
    });
  });

  // ===== Deactivate / reactivate (reversible pause, distinct from DELETE's soft delete) =====
  describe('PUT /api/v1/venues/:id/deactivate and /reactivate', () => {
    let activeVenueId: string;
    let activeVenueSlug: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Deactivate Test Venue ${uniqueId}`)
        .field('description', 'Venue activa para probar pausar/reactivar.')
        .field('address', 'Deactivate Address 12345')
        .field('district', 'Deactivate District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);
      activeVenueId = res.body.id;
      activeVenueSlug = res.body.slug;

      await adminAgent
        .put(`/api/v1/venues/${activeVenueId}/verify`)
        .send({ approve: true })
        .expect(200);
    });

    it('should reject deactivating a venue that is not ACTIVE', async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Draft Deactivate Test ${uniqueId}`)
        .field('description', 'Venue en borrador, nunca deberia poder desactivarse.')
        .field('address', 'Draft Address')
        .field('district', 'Test')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);

      await ownerAgent.put(`/api/v1/venues/${res.body.id}/deactivate`).expect(400);
    });

    it('should return 403 when a different owner tries to deactivate', () => {
      return owner2Agent.put(`/api/v1/venues/${activeVenueId}/deactivate`).expect(403);
    });

    it('deactivates the venue, hiding it from public search/direct link but not from the owner', async () => {
      const res = await ownerAgent.put(`/api/v1/venues/${activeVenueId}/deactivate`).expect(200);
      expect(res.body.status).toBe('INACTIVE');

      // Gone from the public direct-link lookup.
      await request(app.getHttpServer())
        .get(`/api/v1/venues/${activeVenueSlug}`)
        .expect(404);

      // Still visible to its owner, still marked INACTIVE (not deleted).
      const myVenues = await ownerAgent.get('/api/v1/venues/my/venues').expect(200);
      const found = myVenues.body.find((v: { id: string }) => v.id === activeVenueId);
      expect(found).toBeDefined();
      expect(found.status).toBe('INACTIVE');
    });

    it('should reject reactivating a venue that is not INACTIVE', async () => {
      // activeVenueId is already INACTIVE from the previous test in this block — reactivate it
      // first so this check runs against a venue that's back to ACTIVE.
      await ownerAgent.put(`/api/v1/venues/${activeVenueId}/reactivate`).expect(200);
      await ownerAgent.put(`/api/v1/venues/${activeVenueId}/reactivate`).expect(400);
    });

    it('should return 403 when a different owner tries to reactivate', async () => {
      await ownerAgent.put(`/api/v1/venues/${activeVenueId}/deactivate`).expect(200);
      await owner2Agent.put(`/api/v1/venues/${activeVenueId}/reactivate`).expect(403);
    });

    it('reactivates the venue without requiring a new admin verification', async () => {
      const res = await ownerAgent.put(`/api/v1/venues/${activeVenueId}/reactivate`).expect(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.isVerified).toBe(true);

      await request(app.getHttpServer()).get(`/api/v1/venues/${activeVenueSlug}`).expect(200);
    });
  });

  // ===== Authenticated by-id lookup (preview) and admin "all venues" listing =====
  describe('GET /api/v1/venues/by-id/:id and /api/v1/venues/admin/all', () => {
    let draftVenueId: string;

    beforeAll(async () => {
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `By-id Draft Test ${uniqueId}`)
        .field('description', 'Venue en borrador, solo visible por id para su dueno o un admin.')
        .field('address', 'By-id Address 12345')
        .field('district', 'By-id District')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '50')
        .expect(201);
      draftVenueId = res.body.id;
    });

    it('lets the owner preview their own draft venue by id', async () => {
      const res = await ownerAgent.get(`/api/v1/venues/by-id/${draftVenueId}`).expect(200);
      expect(res.body.id).toBe(draftVenueId);
      expect(res.body.status).toBe('DRAFT');
    });

    it('lets an admin preview any venue by id, regardless of status', async () => {
      const res = await adminAgent.get(`/api/v1/venues/by-id/${draftVenueId}`).expect(200);
      expect(res.body.id).toBe(draftVenueId);
    });

    it('returns 403 for a different owner', () => {
      return owner2Agent.get(`/api/v1/venues/by-id/${draftVenueId}`).expect(403);
    });

    it('returns 403 for a CLIENT', () => {
      return clientAgent.get(`/api/v1/venues/by-id/${draftVenueId}`).expect(403);
    });

    it('returns 401 without a session', () => {
      return request(app.getHttpServer()).get(`/api/v1/venues/by-id/${draftVenueId}`).expect(401);
    });

    it('lists every status for ADMIN via search, excluding nothing by status', async () => {
      const res = await adminAgent
        .get(`/api/v1/venues/admin/all?query=${encodeURIComponent(`By-id Draft Test ${uniqueId}`)}`)
        .expect(200);
      expect(res.body).toHaveProperty('venues');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
      const ids = res.body.venues.map((v: { id: string }) => v.id);
      expect(ids).toContain(draftVenueId);
    });

    it('filters the admin listing by departamento', async () => {
      const nameQuery = encodeURIComponent(`By-id Draft Test ${uniqueId}`);
      const matching = await adminAgent
        .get(`/api/v1/venues/admin/all?query=${nameQuery}&departamento=LA_PAZ`)
        .expect(200);
      expect(matching.body.venues.map((v: { id: string }) => v.id)).toContain(draftVenueId);

      const nonMatching = await adminAgent
        .get(`/api/v1/venues/admin/all?query=${nameQuery}&departamento=SANTA_CRUZ`)
        .expect(200);
      expect(nonMatching.body.venues.map((v: { id: string }) => v.id)).not.toContain(draftVenueId);
    });

    it('filters the admin listing by status', async () => {
      const nameQuery = encodeURIComponent(`By-id Draft Test ${uniqueId}`);
      const matching = await adminAgent
        .get(`/api/v1/venues/admin/all?query=${nameQuery}&status=DRAFT`)
        .expect(200);
      expect(matching.body.venues.map((v: { id: string }) => v.id)).toContain(draftVenueId);

      const nonMatching = await adminAgent
        .get(`/api/v1/venues/admin/all?query=${nameQuery}&status=ACTIVE`)
        .expect(200);
      expect(nonMatching.body.venues.map((v: { id: string }) => v.id)).not.toContain(draftVenueId);
    });

    it('paginates the admin listing', async () => {
      const res = await adminAgent.get('/api/v1/venues/admin/all?page=1&limit=2').expect(200);
      expect(res.body.venues.length).toBeLessThanOrEqual(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    it('returns 403 for OWNER and CLIENT on the admin listing', async () => {
      await ownerAgent.get('/api/v1/venues/admin/all').expect(403);
      await clientAgent.get('/api/v1/venues/admin/all').expect(403);
    });
  });

  // ===== My venues =====
  describe('GET /api/v1/venues/my/venues', () => {
    it('should return venues owned by the authenticated user', () => {
      return ownerAgent
        .get('/api/v1/venues/my/venues')
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 without a session', () => {
      return request(app.getHttpServer()).get('/api/v1/venues/my/venues').expect(401);
    });
  });

  // ===== Search filters =====
  describe('GET /api/v1/venues (filters)', () => {
    beforeAll(async () => {
      // Create a verified venue for search
      const res = await ownerAgent
        .post('/api/v1/venues')
        .field('name', `Search Filter Venue ${uniqueId}`)
        .field('description', 'Venue con capacidad alta para busqueda con filtros.')
        .field('address', 'Search Address 12345')
        .field('district', 'Distrito Filter')
        .field('departamento', 'LA_PAZ')
        .field('capacityMax', '500')
        .expect(201);

      // Verify it
      await adminAgent
        .put(`/api/v1/venues/${res.body.id}/verify`)
        .send({ approve: true })
        .expect(200);
    });

    it('should filter by district', () => {
      return request(app.getHttpServer())
        .get('/api/v1/venues?district=Distrito+Filter&startDate=2026-09-20&guestCount=50')
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.venues)).toBe(true);
        });
    });

    it('should filter by minCapacity', () => {
      return request(app.getHttpServer())
        .get('/api/v1/venues?minCapacity=400&startDate=2026-09-20&guestCount=400')
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.venues)).toBe(true);
        });
    });
  });

  // ===== Admin pending queue =====
  describe('GET /api/v1/venues/admin/pending', () => {
    it('should return only PENDING venues and be reachable by ADMIN', async () => {
      const res = await adminAgent.get('/api/v1/venues/admin/pending').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const venue of res.body) {
        expect(venue.status).toBe('PENDING');
      }
    });

    it('should return 403 when OWNER requests the pending queue', () => {
      return ownerAgent.get('/api/v1/venues/admin/pending').expect(403);
    });

    it('should return 403 when CLIENT requests the pending queue', () => {
      return clientAgent.get('/api/v1/venues/admin/pending').expect(403);
    });
  });

  // ===== Admin catalog CRUD =====
  describe('Admin catalog endpoints', () => {
    const resources = ['space-types', 'use-types', 'amenities'] as const;

    for (const resource of resources) {
      describe(`/api/v1/venues/admin/catalog/${resource}`, () => {
        const basePayload =
          resource === 'amenities'
            ? {
                key: `test_${resource}_${uniqueId}`,
                name: `Test ${resource} ${uniqueId}`,
                category: 'FACILITY',
              }
            : { key: `TEST_${resource}_${uniqueId}`, name: `Test ${resource} ${uniqueId}` };

        it('should return 403 for OWNER on GET', () => {
          return ownerAgent.get(`/api/v1/venues/admin/catalog/${resource}`).expect(403);
        });

        it('should return 403 for CLIENT on POST', () => {
          return clientAgent
            .post(`/api/v1/venues/admin/catalog/${resource}`)
            .send(basePayload)
            .expect(403);
        });

        it('should return 401 without a session', () => {
          return request(app.getHttpServer())
            .get(`/api/v1/venues/admin/catalog/${resource}`)
            .expect(401);
        });

        it('should allow ADMIN to create and update a catalog item', async () => {
          const createRes = await adminAgent
            .post(`/api/v1/venues/admin/catalog/${resource}`)
            .send(basePayload)
            .expect(201);

          expect(createRes.body).toHaveProperty('id');
          expect(createRes.body.isActive).toBe(true);

          const updateRes = await adminAgent
            .put(`/api/v1/venues/admin/catalog/${resource}/${createRes.body.id}`)
            .send({ isActive: false })
            .expect(200);

          expect(updateRes.body.isActive).toBe(false);
        });
      });
    }
  });
});
