import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from '../../../src/modules/admin/application/services/admin-analytics.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let prisma: {
    payment: { aggregate: jest.Mock };
    booking: { count: jest.Mock; groupBy: jest.Mock };
    user: { count: jest.Mock };
    venue: { count: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      payment: { aggregate: jest.fn() },
      booking: { count: jest.fn(), groupBy: jest.fn() },
      user: { count: jest.fn() },
      venue: { count: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  it('builds the dashboard payload from all the aggregate queries', async () => {
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1200 } });
    prisma.booking.count.mockResolvedValue(5);
    prisma.user.count.mockResolvedValue(3);
    prisma.venue.count.mockResolvedValue(10);
    prisma.booking.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'APPROVED', _count: { _all: 3 } },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ month: new Date('2026-08-01'), total: 1200 }])
      .mockResolvedValueOnce([{ month: new Date('2026-08-01'), count: BigInt(3) }])
      .mockResolvedValueOnce([{ id: 'venue-1', name: 'Salon Test', total: 1200 }]);

    const result = await service.getDashboard();

    expect(result.summary).toEqual({
      revenueThisMonth: 1200,
      bookingsThisMonth: 5,
      newUsersThisMonth: 3,
      activeVenues: 10,
    });
    expect(result.bookingsByStatus).toEqual([
      { status: 'PENDING', count: 2 },
      { status: 'APPROVED', count: 3 },
    ]);
    expect(result.revenueOverTime).toEqual([
      { month: new Date('2026-08-01').toISOString(), total: 1200 },
    ]);
    expect(result.newUsersOverTime).toEqual([
      { month: new Date('2026-08-01').toISOString(), count: 3 },
    ]);
    expect(result.topVenues).toEqual([{ id: 'venue-1', name: 'Salon Test', total: 1200 }]);
  });

  it('defaults revenue to 0 when there are no completed payments this month', async () => {
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.booking.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(0);
    prisma.venue.count.mockResolvedValue(0);
    prisma.booking.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.getDashboard();

    expect(result.summary.revenueThisMonth).toBe(0);
  });
});
