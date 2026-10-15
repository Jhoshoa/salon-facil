'use client';

import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { getMyFavorites } from '@/lib/api/venues.api';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { VenueResultCard } from './venue-result-card';

const FavoritesListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex gap-4 rounded-md border p-4">
        <Skeleton className="h-32 w-44 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    ))}
  </div>
);

export const ClientFavorites = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['venue-favorites'],
    queryFn: getMyFavorites,
  });

  if (isLoading) return <FavoritesListSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="No se pudieron cargar tus favoritos"
        description="Revisa tu sesion o intenta nuevamente."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={Heart}
        title="Todavia no guardaste ningun local"
        description="Toca el corazon en cualquier local para guardarlo aca y compararlos despues."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.map((venue) => (
        <VenueResultCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
};
