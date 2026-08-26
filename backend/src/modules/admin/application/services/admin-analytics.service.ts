import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

interface MonthlyPoint {
  month: string;
  total: number;
}

interface RevenueRow {
  month: Date;
  total: Prisma.Decimal;
}

interface NewUsersRow {
  month: Date;
  count: bigint;
}

interface TopVenueRow {
  id: string;
  name: string;
  total: Prisma.Decimal;
}

export interface AdminDashboard {
  summary: {
    revenueThisMonth: number;
    bookingsThisMonth: number;
    newUsersThisMonth: number;
    activeVenues: number;
  };
  revenueOverTime: MonthlyPoint[];
  bookingsByStatus: { status: string; count: number }[];
  newUsersOverTime: { month: string; count: number }[];
  topVenues: { id: string; name: string; total: number }[];
}

const MONTHS_OF_HISTORY = 6;

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboard> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const since = new Date(startOfMonth);
    since.setMonth(since.getMonth() - (MONTHS_OF_HISTORY - 1));

    const [
      revenueThisMonth,
      bookingsThisMonth,
      newUsersThisMonth,
      activeVenues,
      revenueOverTime,
      bookingsByStatus,
      newUsersOverTime,
      topVenues,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.venue.count({ where: { status: 'ACTIVE' } }),
      this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
        SELECT date_trunc('month', paid_at) as month, SUM(amount) as total
        FROM payments
        WHERE status = 'COMPLETED' AND paid_at >= ${since}
        GROUP BY month
        ORDER BY month ASC
      `),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.$queryRaw<NewUsersRow[]>(Prisma.sql`
        SELECT date_trunc('month', created_at) as month, COUNT(*) as count
        FROM users
        WHERE created_at >= ${since}
        GROUP BY month
        ORDER BY month ASC
      `),
      this.prisma.$queryRaw<TopVenueRow[]>(Prisma.sql`
        SELECT v.id as id, v.name as name, SUM(p.amount) as total
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        JOIN venues v ON v.id = b.venue_id
        WHERE p.status = 'COMPLETED'
        GROUP BY v.id, v.name
        ORDER BY total DESC
        LIMIT 5
      `),
    ]);

    return {
      summary: {
        revenueThisMonth: Number(revenueThisMonth._sum.amount ?? 0),
        bookingsThisMonth,
        newUsersThisMonth,
        activeVenues,
      },
      revenueOverTime: revenueOverTime.map((row) => ({
        month: row.month.toISOString(),
        total: Number(row.total),
      })),
      bookingsByStatus: bookingsByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      newUsersOverTime: newUsersOverTime.map((row) => ({
        month: row.month.toISOString(),
        count: Number(row.count),
      })),
      topVenues: topVenues.map((row) => ({
        id: row.id,
        name: row.name,
        total: Number(row.total),
      })),
    };
  }
}
