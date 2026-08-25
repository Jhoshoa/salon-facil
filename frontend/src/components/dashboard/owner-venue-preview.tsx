'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getMyVenues } from '@/lib/api/venues.api';
import { VenueDetail } from '@/components/venues/venue-detail';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface OwnerVenuePreviewProps {
  venueId: string;
}

export const OwnerVenuePreview = ({ venueId }: OwnerVenuePreviewProps) => {
  const query = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError) {
    return <ErrorState title="No se pudo cargar el local" onRetry={() => query.refetch()} />;
  }

  const venue = query.data?.find((item) => item.id === venueId);

  if (!venue) {
    return (
      <ErrorState
        title="Local no encontrado"
        description="Puede que no exista o que no seas su propietario."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        className="mb-0"
        items={[
          { label: 'Mis locales', href: '/dashboard/venues' },
          { label: venue.name, href: `/dashboard/venues/${venue.id}/edit` },
          { label: 'Vista previa' },
        ]}
      />
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <span className="font-medium text-primary">
          Vista previa — asi se vera tu local para los clientes cuando este publicado.
        </span>
        <Link
          href={`/dashboard/venues/${venueId}/edit`}
          className="flex shrink-0 items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a editar
        </Link>
      </div>
      <VenueDetail slug={venue.slug} />
    </div>
  );
};
