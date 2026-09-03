import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';

type TestAgent = ReturnType<typeof request.agent>;

// Parses supertest's raw `Set-Cookie` header into { name: attributesLowercased }, e.g.
// `access_token=...; Path=/; HttpOnly; SameSite=Lax` -> attributes `httponly; samesite=lax; path=/`.
// The header can come back as a single string or an array depending on the HTTP client, so this
// normalizes both.
const parseSetCookies = (rawCookies: string | string[] | undefined): Record<string, string> => {
  const list =
    rawCookies === undefined ? [] : Array.isArray(rawCookies) ? rawCookies : [rawCookies];
  const result: Record<string, string> = {};
  for (const raw of list) {
    const [nameValue, ...attrs] = raw.split(';').map((part) => part.trim());
    const name = nameValue.split('=')[0];
    result[name] = attrs.join('; ').toLowerCase();
  }
  return result;
};

const findSetCookie = (rawCookies: string | string[] | undefined, prefix: string): string => {
  const list =
    rawCookies === undefined ? [] : Array.isArray(rawCookies) ? rawCookies : [rawCookies];
  const found = list.find((c) => c.startsWith(prefix));
  if (!found) throw new Error(`No Set-Cookie header starting with "${prefix}" was found`);
  return found;
};

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
    // Without this, req.cookies is never populated — the app built here bypasses main.ts's
    // real bootstrap() entirely, so nothing wires this up automatically like it does in prod.
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const uniqueEmail = `test-${uniqueId}@email.com`;
    const uniquePhone = phoneFor(0);

    it('should register a new user and set httpOnly auth cookies, never tokens in the body', () => {
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
          // The whole point of this migration: a script that can only read the JSON response
          // (e.g. injected via XSS) gets nothing usable — no accessToken, no refreshToken.
          expect(res.body).not.toHaveProperty('accessToken');
          expect(res.body).not.toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body.user.email).toBe(uniqueEmail);
          expect(res.body.user.role).toBe('CLIENT');
          expect(res.body.user).not.toHaveProperty('passwordHash');

          const cookies = parseSetCookies(res.headers['set-cookie']);
          expect(cookies.access_token).toContain('httponly');
          expect(cookies.access_token).toContain('samesite=lax');
          expect(cookies.refresh_token).toContain('httponly');
          expect(cookies.refresh_token).toContain('samesite=lax');
          // Scoped so it's only ever sent to auth endpoints, not attached to every API call.
          expect(cookies.refresh_token).toContain('path=/api/v1/auth');
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

    it.each([
      ['password without uppercase', 'password1!'],
      ['password without lowercase', 'PASSWORD1!'],
      ['password without a digit', 'Password!!'],
      ['password without a special character', 'Password12'],
    ])('should return 400 for %s', (_label, password) => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `weak-${Date.now()}-${Math.random()}@email.com`,
          password,
          phone: '+59171234567',
          fullName: 'Test',
          role: 'CLIENT',
        })
        .expect(400);
    });

    it.each([
      ['missing country code', '71234567'],
      ['too few digits after +591', '+5917123456'],
      ['too many digits after +591', '+591712345678'],
      ['wrong country code', '+59571234567'],
    ])('should return 400 for phone with %s', (_label, phone) => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `phone-${Date.now()}-${Math.random()}@email.com`,
          password: 'Password123!',
          phone,
          fullName: 'Test',
          role: 'CLIENT',
        })
        .expect(400);
    });

    it('should accept a well-formed password and phone', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `valid-${uniqueId}@email.com`,
          password: 'Str0ng!Pass',
          phone: phoneFor(10),
          fullName: 'Valid Format User',
          role: 'CLIENT',
        })
        .expect(201);
    });

    it('should accept "=" as a valid special character in the password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `valid-equals-${uniqueId}@email.com`,
          password: 'Str0ng=Pass',
          phone: phoneFor(11),
          fullName: 'Equals Sign User',
          role: 'CLIENT',
        })
        .expect(201);
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

    it('should login with valid credentials and set auth cookies', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: 'Password123!' })
        .expect(200)
        .then((res) => {
          expect(res.body).not.toHaveProperty('accessToken');
          expect(res.body).not.toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(loginEmail);
          const cookies = parseSetCookies(res.headers['set-cookie']);
          expect(cookies.access_token).toContain('httponly');
          expect(cookies.refresh_token).toContain('httponly');
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
    let agent: TestAgent;

    beforeAll(async () => {
      agent = request.agent(app.getHttpServer());
      const meEmail = `me-test-${uniqueId}@email.com`;
      const mePhone = phoneFor(2);
      await agent.post('/api/v1/auth/register').send({
        email: meEmail,
        password: 'Password123!',
        phone: mePhone,
        fullName: 'Me Test User',
        role: 'CLIENT',
      });
    });

    it("should return the user's data using the session cookie", () => {
      return agent
        .get('/api/v1/auth/me')
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should return 401 without a session cookie', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with a bogus access_token cookie', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', ['access_token=not-a-real-jwt'])
        .expect(401);
    });

    it('should ignore an Authorization header — cookies are the only auth transport now', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer whatever-this-is-not-read-anymore')
        .expect(401);
    });
  });

  describe('PUT /api/v1/auth/me', () => {
    let agentA: TestAgent;
    let agentB: TestAgent;
    let userAId: string;

    beforeAll(async () => {
      agentA = request.agent(app.getHttpServer());
      const resA = await agentA.post('/api/v1/auth/register').send({
        email: `update-me-a-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: phoneFor(20),
        fullName: 'Update Me User A',
        role: 'OWNER',
      });
      userAId = resA.body.user.id;

      agentB = request.agent(app.getHttpServer());
      await agentB.post('/api/v1/auth/register').send({
        email: `update-me-b-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: phoneFor(21),
        fullName: 'Update Me User B',
        role: 'OWNER',
      });
    });

    it('should update the authenticated user profile', async () => {
      const res = await agentA
        .put('/api/v1/auth/me')
        .send({
          fullName: 'Updated Name A',
          city: 'El Alto',
          whatsappPhone: '+59171112222',
        })
        .expect(200);

      expect(res.body.id).toBe(userAId);
      expect(res.body.fullName).toBe('Updated Name A');
      expect(res.body.city).toBe('El Alto');
      expect(res.body.whatsappPhone).toBe('+59171112222');
    });

    it('should not let a different user be affected by another user update', async () => {
      const before = await agentB.get('/api/v1/auth/me').expect(200);

      expect(before.body.fullName).toBe('Update Me User B');
      expect(before.body.id).not.toBe(userAId);
    });

    it('should return 401 without a session', () => {
      return request(app.getHttpServer())
        .put('/api/v1/auth/me')
        .send({ fullName: 'No Auth Update' })
        .expect(401);
    });

    it('should return 400 for an invalid avatar URL', () => {
      return agentA.put('/api/v1/auth/me').send({ avatarUrl: 'not-a-valid-url' }).expect(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let agent: TestAgent;

    beforeAll(async () => {
      agent = request.agent(app.getHttpServer());
      const refreshEmail = `refresh-test-${uniqueId}@email.com`;
      const refreshPhone = phoneFor(3);
      await agent.post('/api/v1/auth/register').send({
        email: refreshEmail,
        password: 'Password123!',
        phone: refreshPhone,
        fullName: 'Refresh Test User',
        role: 'OWNER',
      });
    });

    it('should refresh tokens using the refresh_token cookie and issue new ones', async () => {
      const res = await agent.post('/api/v1/auth/refresh').expect(200);
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.body).not.toHaveProperty('refreshToken');
      const cookies = parseSetCookies(res.headers['set-cookie']);
      expect(cookies.access_token).toContain('httponly');
      expect(cookies.refresh_token).toContain('httponly');

      // The rotated cookie must actually work for a follow-up authenticated call.
      return agent.get('/api/v1/auth/me').expect(200);
    });

    it('should return 401 with no refresh_token cookie at all', () => {
      return request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });

    it('should return 401 with an invalid refresh_token cookie', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=not-a-real-jwt'])
        .expect(401);
    });

    it('should reject the old refresh token after rotation (single use)', async () => {
      // agent's cookie jar was already rotated by the first test in this block — capture that
      // now-superseded cookie value before rotating again, then prove it can't be reused.
      const staleAgent = request.agent(app.getHttpServer());
      const registerRes = await staleAgent.post('/api/v1/auth/register').send({
        email: `refresh-rotation-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: phoneFor(4),
        fullName: 'Refresh Rotation User',
        role: 'CLIENT',
      });
      const originalRefreshCookie = findSetCookie(
        registerRes.headers['set-cookie'],
        'refresh_token=',
      );

      // Rotate once (via the agent's jar, which now holds the new refresh token).
      await staleAgent.post('/api/v1/auth/refresh').expect(200);

      // Replay the pre-rotation cookie value directly — must be rejected.
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [originalRefreshCookie])
        .expect(401);
    });

    it('should clear cookies and reject a refresh token after logout', async () => {
      const logoutAgent = request.agent(app.getHttpServer());
      await logoutAgent.post('/api/v1/auth/register').send({
        email: `logout-test-${uniqueId}@email.com`,
        password: 'Password123!',
        phone: phoneFor(5),
        fullName: 'Logout Test User',
        role: 'CLIENT',
      });

      const logoutRes = await logoutAgent.post('/api/v1/auth/logout').send({}).expect(200);
      const cookies = parseSetCookies(logoutRes.headers['set-cookie']);
      // clearCookie() re-sets with an immediately-expired date — Expires in the past confirms
      // the browser will drop it, rather than just trusting our code did the right thing.
      expect(cookies.access_token).toMatch(/expires=/);
      expect(cookies.refresh_token).toMatch(/expires=/);

      // The agent's jar now holds the (cleared) cookies from the logout response, so this
      // exercises the real browser behavior: no valid session left to refresh with.
      return logoutAgent.post('/api/v1/auth/refresh').expect(401);
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
