import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Venues (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let owner2Token: string;
  let clientToken: string;
  let adminToken: string;
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    // Register users
    const ownerRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: ownerEmail,
      password: 'Password123!',
      phone: ownerPhone,
      fullName: 'Owner Venue Test',
      role: 'OWNER',
    });
    ownerToken = ownerRes.body.accessToken;
    ownerUserId = ownerRes.body.user.id;

    const owner2Res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: owner2Email,
      password: 'Password123!',
      phone: owner2Phone,
      fullName: 'Owner 2 Venue Test',
      role: 'OWNER',
    });
    owner2Token = owner2Res.body.accessToken;

    const clientRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: clientEmail,
      password: 'Password123!',
      phone: clientPhone,
      fullName: 'Client Venue Test',
      role: 'CLIENT',
    });
    clientToken = clientRes.body.accessToken;

    const adminRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin@salonfacil.bo',
      password: 'Password123!',
    });
    adminToken = adminRes.body.accessToken;
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
    let createdVenueSlug: string;

    it('should create a venue as OWNER (CA1)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', venueName)
        .field('description', 'Un salon de fiestas ideal para eventos especiales en El Alto.')
        .field('address', 'Av. 6 de Octubre #1234')
        .field('district', 'Distrito 3')
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
          createdVenueSlug = res.body.slug;
        });
    });

    // ===== CA2: Slug uniqueness =====
    it('should generate unique slugs (CA2)', async () => {
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', venueName)
        .field('description', 'Otro salon con el mismo nombre para probar slugs unicos.')
        .field('address', 'Av. 6 de Octubre #5678')
        .field('district', 'Distrito 1')
        .field('capacityMax', '100')
        .expect(201);

      expect(res2.body.slug).not.toBe(createdVenueSlug);
      expect(res2.body.slug).toContain(venueName.toLowerCase().replace(/\s+/g, '-'));
    });

    // ===== CA11: Services and prices persisted =====
    it('should persist services and prices (CA11 & CA10)', () => {
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

    it('should return 401 without token', () => {
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
      return request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${clientToken}`)
        .field('name', 'Client Salon')
        .field('description', 'Este salon no deberia crearse con rol de cliente.')
        .field('address', 'Client Address 12345')
        .field('district', 'Test')
        .field('capacityMax', '50')
        .expect(403);
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
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
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Slug Test Venue ${uniqueId}`)
        .field('description', 'Venue para probar obtencion por slug correctamente.')
        .field('address', 'Slug Test Address 12345')
        .field('district', 'Slug District')
        .field('capacityMax', '150')
        .expect(201);
      testSlug = res.body.slug;
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
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Ownership Test Venue ${uniqueId}`)
        .field('description', 'Venue para probar la proteccion de ownership entre propietarios.')
        .field('address', 'Ownership Address 12345')
        .field('district', 'Ownership District')
        .field('capacityMax', '100')
        .expect(201);
      owner1VenueId = res.body.id;
    });

    it('should allow owner to update their venue', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/venues/${owner1VenueId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Ownership Test Venue Updated')
        .expect(200)
        .then((res) => {
          expect(res.body.name).toBe('Ownership Test Venue Updated');
        });
    });

    it('should return 403 when different owner tries to update (CA6)', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/venues/${owner1VenueId}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .field('name', 'Hacked Venue Name')
        .expect(403);
    });

    it('should return 403 when CLIENT tries to update', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/venues/${owner1VenueId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .field('name', 'Client Hacked Venue')
        .expect(403);
    });
  });

  // ===== CA9: Soft delete =====
  describe('DELETE /api/v1/venues/:id', () => {
    let deleteVenueId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Delete Test Venue ${uniqueId}`)
        .field('description', 'Venue que sera eliminada para probar el soft delete.')
        .field('address', 'Delete Address 12345')
        .field('district', 'Delete District')
        .field('capacityMax', '50')
        .expect(201);
      deleteVenueId = res.body.id;
    });

    it('should soft delete venue (CA9)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/venues/${deleteVenueId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // Venue should now be INACTIVE
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/venues/my/venues`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const deletedVenue = getRes.body.find((v: { id: string }) => v.id === deleteVenueId);
      expect(deletedVenue.status).toBe('INACTIVE');
    });

    it('should return 403 when different owner tries to delete', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Delete 403 Test ${uniqueId}`)
        .field('description', 'Venue para verificar que otro propietario no puede eliminar.')
        .field('address', 'Delete 403 Address')
        .field('district', 'Test')
        .field('capacityMax', '50')
        .expect(201);

      return request(app.getHttpServer())
        .delete(`/api/v1/venues/${res.body.id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .expect(403);
    });
  });

  // ===== CA7: Admin verify =====
  describe('PUT /api/v1/venues/:id/verify', () => {
    let pendingVenueId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Verify Test Venue ${uniqueId}`)
        .field('description', 'Venue pendiente de verificacion por administrador.')
        .field('address', 'Verify Address 12345')
        .field('district', 'Verify District')
        .field('capacityMax', '100')
        .expect(201);
      pendingVenueId = res.body.id;
    });

    it('should verify venue as ADMIN (CA7)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: true })
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.isVerified).toBe(true);
    });

    it('should return 403 when OWNER tries to verify', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ approve: true })
        .expect(403);
    });

    it('should return 403 when CLIENT tries to verify', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/venues/${pendingVenueId}/verify`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ approve: true })
        .expect(403);
    });
  });

  // ===== My venues =====
  describe('GET /api/v1/venues/my/venues', () => {
    it('should return venues owned by the authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/venues/my/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/venues/my/venues').expect(401);
    });
  });

  // ===== Search filters =====
  describe('GET /api/v1/venues (filters)', () => {
    beforeAll(async () => {
      // Create a verified venue for search
      const res = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', `Search Filter Venue ${uniqueId}`)
        .field('description', 'Venue con capacidad alta para busqueda con filtros.')
        .field('address', 'Search Address 12345')
        .field('district', 'Distrito Filter')
        .field('capacityMax', '500')
        .expect(201);

      // Verify it
      await request(app.getHttpServer())
        .put(`/api/v1/venues/${res.body.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
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
});
