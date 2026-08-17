import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const uniqueEmail = `test-${uniqueId}@email.com`;
    const uniquePhone = phoneFor(0);

    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          phone: uniquePhone,
          fullName: 'Test User E2E',
          role: 'CLIENT',
        })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body.user.email).toBe(uniqueEmail);
          expect(res.body.user.role).toBe('CLIENT');
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should return 409 for duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          phone: '+59179999999',
          fullName: 'Duplicate User',
          role: 'CLIENT',
        })
        .expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          phone: '+59171234567',
          fullName: 'Test',
          role: 'CLIENT',
        })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@email.com',
          password: '123',
          phone: '+59171234567',
          fullName: 'Test',
          role: 'CLIENT',
        })
        .expect(400);
    });

    it('should return 400 for invalid phone format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'phone@email.com',
          password: 'Password123!',
          phone: '123456',
          fullName: 'Test',
          role: 'CLIENT',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginEmail = `login-test-${uniqueId}@email.com`;
    const loginPhone = phoneFor(1);

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: loginEmail,
        password: 'Password123!',
        phone: loginPhone,
        fullName: 'Login Test User',
        role: 'CLIENT',
      });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: 'Password123!' })
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(loginEmail);
        });
    });

    it('should return 401 for wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: 'WrongPassword' })
        .expect(401);
    });

    it('should return 401 for non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@email.com', password: 'Password123!' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const meEmail = `me-test-${uniqueId}@email.com`;
      const mePhone = phoneFor(2);
      const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: meEmail,
        password: 'Password123!',
        phone: mePhone,
        fullName: 'Me Test User',
        role: 'CLIENT',
      });
      accessToken = res.body.accessToken;
    });

    it('should return user data with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const refreshEmail = `refresh-test-${uniqueId}@email.com`;
      const refreshPhone = phoneFor(3);
      const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: refreshEmail,
        password: 'Password123!',
        phone: refreshPhone,
        fullName: 'Refresh Test User',
        role: 'OWNER',
      });
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'fake-token' })
        .expect(401);
    });

    it('should reject a refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Health endpoint (public)', () => {
    it('should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body).toHaveProperty('database');
        });
    });
  });
});
