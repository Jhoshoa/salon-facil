'use client';

import { useQuery } from '@tanstack/react-query';
import { getVenueById } from '@/lib/api/venues.api';
import { VenueDetail } from '@/components/venues/venue-detail';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminVenuePreviewProps {
  venueId: string;
}

export const AdminVenuePreview = ({ venueId }: AdminVenuePreviewProps) => {
  const query = useQuery({
    queryKey: ['admin-venue-preview', venueId],
    queryFn: () => getVenueById(venueId),
  });

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState title="No se pudo cargar el local" onRetry={() => query.refetch()} />
    );
  }

  const venue = query.data;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        className="mb-0"
        items={[
          { label: 'Todos los locales', href: '/admin/venues/all' },
          { label: venue.name },
        ]}
      />
      <div className="rounded-[var(--radius)] border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
        Vista de administrador — asi se ve este local por dentro, sin importar su estado.
      </div>
      <VenueDetail venueId={venue.id} />
    </div>
  );
};
