'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { searchVenues } from '@/lib/api/venues.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppDrawer } from '@/components/shared/app-drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { VenueCard } from './venue-card';
import { VenueCardSkeleton } from './venue-card-skeleton';

interface VenueSearchProps {
  initialQuery?: string;
  initialDate?: string;
  initialCapacity?: string;
}

export const VenueSearch = ({
  initialQuery = '',
  initialDate = '',
  initialCapacity = '',
}: VenueSearchProps) => {
  const [queryText, setQueryText] = useState(initialQuery);
  const [date, setDate] = useState(initialDate);
  const [capacity, setCapacity] = useState(initialCapacity);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = useMemo(
    () => ({
      query: queryText,
      date,
      minCapacity: capacity ? Number(capacity) : undefined,
      limit: 12,
    }),
    [capacity, date, queryText],
  );

  const query = useQuery({
    queryKey: ['venues', params],
    queryFn: () => searchVenues(params),
  });

  const venues = query.data?.venues ?? query.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
          <div className="space-y-2">
            <Label htmlFor="query">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="query"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="Salon, zona o servicio"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Invitados</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="100"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full md:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <VenueCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}

      {!query.isLoading && !query.isError && venues.length === 0 ? (
        <EmptyState
          title="No encontramos locales"
          description="Ajusta los filtros o prueba otra fecha."
        />
      ) : null}

      {venues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : null}

      <AppDrawer open={filtersOpen} title="Filtros" onOpenChange={setFiltersOpen}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Los filtros principales ya estan disponibles arriba. En mobile este drawer queda como
            punto de extension.
          </p>
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Aplicar filtros
          </Button>
        </div>
      </AppDrawer>
    </div>
  );
};
