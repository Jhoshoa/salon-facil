'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { getMyBookings } from '@/lib/api/bookings.api';
import { BookingCard } from '@/components/bookings/booking-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

const BookingListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="rounded-md border p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <Skeleton className="mt-4 h-9 w-full sm:w-32" />
      </div>
    ))}
  </div>
);

export const ClientBookings = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
  });

  if (isLoading) return <BookingListSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="No se pudieron cargar tus reservas"
        description="Revisa tu sesion o intenta nuevamente."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Todavia no tienes reservas"
        description="Explora salones y envia tu primera solicitud."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
};
