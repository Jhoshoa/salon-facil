'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { getMyVenues } from '@/lib/api/venues.api';
import { VenueForm, tabs, type TabKey } from './venue-form';
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
  const [activeTab, setActiveTab] = useState<TabKey>('general');
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
        {/* Mobile/tablet only: below `lg` the sidebar column stacks to the bottom of the
         * page (after the whole form and the photo manager), which would bury both the tab
         * nav and the completion status somewhere a user has to scroll past everything to
         * reach. Show compact equivalents right here instead; the lg+ sidebar versions below
         * take over once there's room for a persistent side column. */}
        <div className="space-y-4 lg:hidden">
          <VenueCompletionCard venue={venue} />
          <nav className="flex flex-wrap gap-2 rounded-[var(--radius)] border bg-card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[var(--radius)] px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <VenueForm venue={venue} activeTab={activeTab} onTabChange={setActiveTab} />
        <VenueMediaManager venue={venue} />
      </div>
      <div className="hidden space-y-6 lg:block lg:sticky lg:top-24 lg:self-start">
        <nav className="flex flex-col gap-1 rounded-[var(--radius)] border bg-card p-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[var(--radius)] px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <VenueCompletionCard venue={venue} />
      </div>
    </div>
  );
};
