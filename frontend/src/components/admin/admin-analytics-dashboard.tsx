'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, DollarSign, Store, UserPlus } from 'lucide-react';
import { getAdminAnalyticsDashboard } from '@/lib/api/admin.api';
import { formatCurrency } from '@/lib/formatters';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { RevenueOverTimeChart } from './charts/revenue-over-time-chart';
import { BookingsByStatusChart } from './charts/bookings-by-status-chart';
import { NewUsersChart } from './charts/new-users-chart';
import { TopVenuesChart } from './charts/top-venues-chart';

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) => (
  <div className="sf-card flex items-center gap-4 p-5">
    <span className="sf-logo">
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="sf-card p-5">
    <h3 className="mb-3 font-semibold">{title}</h3>
    {children}
  </div>
);

export const AdminAnalyticsDashboard = () => {
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'dashboard'],
    queryFn: getAdminAnalyticsDashboard,
  });

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const { summary, revenueOverTime, bookingsByStatus, newUsersOverTime, topVenues } = query.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Ingresos del mes"
          value={formatCurrency(summary.revenueThisMonth)}
        />
        <StatCard
          icon={CalendarCheck}
          label="Reservas del mes"
          value={String(summary.bookingsThisMonth)}
        />
        <StatCard
          icon={UserPlus}
          label="Usuarios nuevos del mes"
          value={String(summary.newUsersThisMonth)}
        />
        <StatCard icon={Store} label="Locales activos" value={String(summary.activeVenues)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ingresos en el tiempo">
          <RevenueOverTimeChart data={revenueOverTime} />
        </ChartCard>
        <ChartCard title="Reservas por estado">
          <BookingsByStatusChart data={bookingsByStatus} />
        </ChartCard>
        <ChartCard title="Usuarios nuevos en el tiempo">
          <NewUsersChart data={newUsersOverTime} />
        </ChartCard>
        <ChartCard title="Top 5 locales por ingresos">
          <TopVenuesChart data={topVenues} />
        </ChartCard>
      </div>
    </div>
  );
};
