'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CalendarCheck, CreditCard, Store } from 'lucide-react';
import { getMyVenues } from '@/lib/api/venues.api';
import { getPendingOwnerPayments } from '@/lib/api/payments.api';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const OwnerDashboard = () => {
  const venuesQuery = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const paymentsQuery = useQuery({
    queryKey: ['owner-pending-payments'],
    queryFn: getPendingOwnerPayments,
  });

  if (venuesQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (venuesQuery.isError) {
    return (
      <ErrorState title="No se pudo cargar tu dashboard" onRetry={() => venuesQuery.refetch()} />
    );
  }

  if (!venuesQuery.data?.length) {
    return (
      <EmptyState
        icon={Store}
        title="No tienes salones registrados"
        description="Crea o activa un salon para empezar a recibir reservas."
      />
    );
  }

  const activeVenues = venuesQuery.data.filter((venue) => venue.status === 'ACTIVE').length;
  const pendingPayments = paymentsQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <Store className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 text-2xl font-semibold">{venuesQuery.data.length}</p>
          <p className="text-sm text-muted-foreground">Salones registrados</p>
        </section>
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <CalendarCheck className="h-5 w-5 text-sky-600" />
          <p className="mt-3 text-2xl font-semibold">{activeVenues}</p>
          <p className="text-sm text-muted-foreground">Salones activos</p>
        </section>
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <CreditCard className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-2xl font-semibold">{pendingPayments}</p>
          <p className="text-sm text-muted-foreground">Pagos por revisar</p>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/bookings">Gestionar reservas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/calendar">Calendario</Link>
        </Button>
      </div>
    </div>
  );
};
