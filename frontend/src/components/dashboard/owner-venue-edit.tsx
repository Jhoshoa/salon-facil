'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { getMyVenues } from '@/lib/api/venues.api';
import { VenueForm } from './venue-form';
import { VenueMediaManager } from './venue-media-manager';
import { VenueCompletionCard } from './venue-completion-card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface OwnerVenueEditProps {
  venueId: string;
}

export const OwnerVenueEdit = ({ venueId }: OwnerVenueEditProps) => {
  const query = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });

  if (query.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumbs
              items={[{ label: 'Mis locales', href: '/dashboard/venues' }, { label: venue.name }]}
            />
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <p className="text-sm text-muted-foreground">Edita la informacion de tu local.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/venues/${venue.id}/preview`}>
              <Eye className="h-4 w-4" />
              Vista previa
            </Link>
          </Button>
        </div>
        <VenueForm venue={venue} />
        <VenueMediaManager venue={venue} />
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <VenueCompletionCard venue={venue} />
      </div>
    </div>
  );
};
