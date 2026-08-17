import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Prisma Connection', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://salonfacil:salonfacil_dev_password@localhost:5432/salonfacil_dev';

    moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
  }, 30000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  it('connects to the database', async () => {
    const result = await prisma.$queryRaw<Array<{ connected: number }>>`SELECT 1 as connected`;

    expect(result).toEqual([{ connected: 1 }]);
  });

  it('has seed data', async () => {
    await expect(prisma.user.count()).resolves.toBeGreaterThanOrEqual(6);
    await expect(prisma.venue.count()).resolves.toBeGreaterThanOrEqual(3);
    await expect(prisma.booking.count()).resolves.toBeGreaterThanOrEqual(3);
  });

  it('enforces unique user email constraints', async () => {
    const uniqueSuffix = Date.now();
    const email = `unique-${uniqueSuffix}@email.com`;

    await prisma.user.create({
      data: {
        email,
        phone: `+5916${String(uniqueSuffix).slice(-7)}`,
        passwordHash: 'test-hash',
        fullName: 'Unique Constraint Test',
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email,
          phone: `+5917${String(uniqueSuffix).slice(-7)}`,
          passwordHash: 'test-hash',
          fullName: 'Duplicate Constraint Test',
        },
      }),
    ).rejects.toBeInstanceOf(PrismaClientKnownRequestError);
  });

  it('returns related data through joins', async () => {
    const booking = await prisma.booking.findFirst({
      include: {
        client: true,
        payments: true,
        venue: {
          include: {
            owner: true,
            prices: true,
            services: true,
          },
        },
      },
    });

    expect(booking).not.toBeNull();
    expect(booking?.client.email).toEqual(expect.any(String));
    expect(booking?.venue.owner.role).toBe('OWNER');
    expect(booking?.venue.prices.length).toBeGreaterThan(0);
    expect(booking?.venue.services.length).toBeGreaterThan(0);
  });

  it('does not clean the database in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await expect(prisma.cleanDatabase()).rejects.toThrow('Cannot clean database in production');

    process.env.NODE_ENV = previousNodeEnv;
  });
});
