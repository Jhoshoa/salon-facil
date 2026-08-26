'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Users, X } from 'lucide-react';
import { buildQueryString } from '@/lib/api/client';
import { searchVenues } from '@/lib/api/venues.api';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { Venue, VenueSearchParams } from '@/types/api';
import type { LocatedVenue } from './venue-price-map';

const VenuePriceMap = dynamic(
  () => import('./venue-price-map').then((mod) => mod.VenuePriceMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-none" />,
  },
);

const getBasePrice = (venue: Venue) =>
  venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

const priceUnitLabel: Record<NonNullable<Venue['priceUnit']>, string> = {
  EVENT: 'evento',
  HOUR: 'hora',
  DAY: 'dia',
};

const toBackToListParams = (params: VenueSearchParams) => {
  const { guestCount, limit: _limit, ...rest } = params;
  return { ...rest, capacity: guestCount };
};

interface VenueMapDetailCardProps {
  venue: Venue;
  detailHref: string;
  onClose: () => void;
}

const VenueMapDetailCard = ({ venue, detailHref, onClose }: VenueMapDetailCardProps) => {
  const photo =
    venue.media?.find((item) => item.isCover)?.url ?? venue.media?.[0]?.url ?? venue.photos?.[0];
  const price = getBasePrice(venue);

  return (
    <div className="sf-card-elevated w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden bg-background">
      <div className="flex gap-3 p-3">
        <Link href={detailHref} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {photo ? (
            <Image src={photo} alt={venue.name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="sf-gradient-subtle flex h-full items-center justify-center text-[10px] text-muted-foreground">
              Sin foto
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={detailHref} className="line-clamp-1 font-semibold hover:text-primary">
              {venue.name}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>
          {venue.averageRating ? (
            <p className="flex items-center gap-1 text-xs font-medium">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {venue.averageRating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({venue.reviewCount ?? 0})</span>
            </p>
          ) : null}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              {venue.district}, {venue.city}
            </span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {venue.capacityMin}-{venue.capacityMax} personas
          </p>
          <p className="mt-1 text-sm font-semibold">
            {price > 0 ? formatCurrency(price) : 'Consultar'}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              por {priceUnitLabel[venue.priceUnit] ?? 'evento'}
            </span>
          </p>
        </div>
      </div>
      <Link
        href={detailHref}
        className="block border-t px-3 py-2 text-center text-sm font-medium text-primary hover:bg-muted"
      >
        Ver detalles
      </Link>
    </div>
  );
};

interface VenueMapExplorerProps {
  searchParams: VenueSearchParams;
  highlightSlug?: string;
}

export const VenueMapExplorer = ({ searchParams, highlightSlug }: VenueMapExplorerProps) => {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['venues-map', searchParams],
    queryFn: () => searchVenues({ ...searchParams, limit: 50 }),
  });

  const venues = query.data?.venues ?? query.data?.data ?? [];
  const located = venues.filter(
    (venue): venue is LocatedVenue => venue.latitude != null && venue.longitude != null,
  );

  // Arriving from a venue's detail page ("Ver en el mapa") pins that specific venue right
  // away, instead of landing on an empty map with no context.
  useEffect(() => {
    if (!highlightSlug || pinnedId) return;
    const match = located.find((venue) => venue.slug === highlightSlug);
    if (match) setPinnedId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightSlug, located.length]);

  const activeId = hoveredId ?? pinnedId;
  const activeVenue = located.find((venue) => venue.id === activeId) ?? null;

  const backToListHref = `/venues${buildQueryString(toBackToListParams(searchParams))}`;

  return (
    <div className="relative h-[calc(100vh-var(--header-height))] w-full overflow-hidden">
      {query.isLoading ? <Skeleton className="h-full w-full rounded-none" /> : null}

      {query.isError ? (
        <div className="flex h-full items-center justify-center p-6">
          <ErrorState onRetry={() => query.refetch()} />
        </div>
      ) : null}

      {!query.isLoading && !query.isError && located.length === 0 ? (
        <div className="flex h-full items-center justify-center p-6">
          <EmptyState
            title="No hay locales con ubicacion para mostrar"
            description="Los locales de esta busqueda no tienen coordenadas cargadas todavia."
          />
        </div>
      ) : null}

      {!query.isLoading && !query.isError && located.length > 0 ? (
        <VenuePriceMap
          venues={located}
          activeId={activeId}
          onHover={setHoveredId}
          onSelect={(id) => setPinnedId((current) => (current === id ? null : id))}
        />
      ) : null}

      <div className="absolute right-4 top-4 z-[1000]">
        <Button variant="secondary" className="shadow-lg" onClick={() => router.push(backToListHref)}>
          <X className="h-4 w-4" />
          Cerrar el mapa
        </Button>
      </div>

      {activeVenue ? (
        <div className="absolute left-4 top-4 z-[1000]">
          <VenueMapDetailCard
            venue={activeVenue}
            detailHref={`/venues/${activeVenue.slug}${
              buildQueryString(toBackToListParams(searchParams))
            }`}
            onClose={() => setPinnedId(null)}
          />
        </div>
      ) : null}
    </div>
  );
};
