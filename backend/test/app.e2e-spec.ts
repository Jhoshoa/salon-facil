import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://salonfacil:salonfacil_dev_password@localhost:5432/salonfacil_dev';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_SECRET ??= 'test_jwt_secret_change_in_production_min_32_chars';
    process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_change_in_production_min_32_chars';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'salon-facil-api',
      version: '0.1.0',
    });
  });
});
