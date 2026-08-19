'use client';

import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { CalendarDays, Search, SlidersHorizontal, Users } from 'lucide-react';
import { searchVenues } from '@/lib/api/venues.api';
import type { VenueSearchParams } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppDrawer } from '@/components/shared/app-drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { VenueFilterSidebar, type VenueFilterValues } from './venue-filter-sidebar';
import { VenueCardSkeleton } from './venue-card-skeleton';
import { VenueResultCard } from './venue-result-card';

interface VenueSearchProps {
  initialQuery?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialCapacity?: string;
}

export const VenueSearch = ({
  initialQuery = '',
  initialStartDate = '',
  initialEndDate = '',
  initialCapacity = '',
}: VenueSearchProps) => {
  const [queryText, setQueryText] = useState(initialQuery);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [rangeEnabled, setRangeEnabled] = useState(Boolean(initialEndDate));
  const [capacity, setCapacity] = useState(initialCapacity);
  const [filters, setFilters] = useState<VenueFilterValues>({
    district: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: initialCapacity,
    services: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string; capacity?: string }>(
    {},
  );
  const [submittedParams, setSubmittedParams] = useState<VenueSearchParams | null>(() => {
    if (!initialStartDate || !initialCapacity) return null;
    return {
      query: initialQuery,
      startDate: initialStartDate,
      endDate: initialEndDate,
      minCapacity: Number(initialCapacity),
      limit: 12,
    };
  });

  const query = useQuery({
    queryKey: ['venues', submittedParams],
    queryFn: () => searchVenues(submittedParams!),
    enabled: Boolean(submittedParams),
  });

  const venues = query.data?.venues ?? query.data?.data ?? [];

  const validate = () => {
    const nextErrors: { startDate?: string; endDate?: string; capacity?: string } = {};
    const parsedCapacity = Number(capacity);

    if (!startDate) nextErrors.startDate = 'La fecha de inicio es obligatoria.';
    if (!capacity || Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      nextErrors.capacity = 'La cantidad de personas es obligatoria.';
    }
    if (rangeEnabled && !endDate) nextErrors.endDate = 'La fecha final es obligatoria.';
    if (rangeEnabled && startDate && endDate && endDate < startDate) {
      nextErrors.endDate = 'La fecha final no puede ser anterior a la inicial.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmittedParams({
      query: queryText,
      district: filters.district || undefined,
      startDate,
      endDate: rangeEnabled ? endDate : '',
      minCapacity: Number(filters.minCapacity || capacity),
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      services: filters.services.length ? filters.services.join(',') : undefined,
      limit: 12,
    });
  };

  const handleRangeChange = (checked: boolean) => {
    setRangeEnabled(checked);
    if (!checked) setEndDate('');
  };

  const canSearch =
    Boolean(startDate) &&
    Boolean(capacity) &&
    Number(capacity) > 0 &&
    (!rangeEnabled || (Boolean(endDate) && endDate >= startDate));

  return (
    <div className="space-y-6">
      <form
        className="rounded-md border bg-card p-2 shadow-sm ring-1 ring-emerald-500/10"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2 lg:grid-cols-[1fr_190px_190px_170px_150px]">
          <div className="space-y-2">
            <div className="rounded-md border bg-background px-3 py-2">
              <Label htmlFor="query" className="text-xs text-muted-foreground">
                Indica destino o salon
              </Label>
              <Input
                id="query"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="Salon, zona o servicio"
                className="h-8 border-0 px-0 text-base shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-md border bg-background px-3 py-2">
              <Label
                htmlFor="startDate"
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                Fecha inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.startDate ? (
              <p className="text-sm text-destructive">{errors.startDate}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="rounded-md border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                  Fecha fin
                </Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rangeEnabled}
                    onChange={(event) => handleRangeChange(event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Rango
                </label>
              </div>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                disabled={!rangeEnabled}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.endDate ? <p className="text-sm text-destructive">{errors.endDate}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="rounded-md border bg-background px-3 py-2">
              <Label
                htmlFor="capacity"
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Users className="h-4 w-4" />
                Ocupacion
              </Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => {
                  setCapacity(event.target.value);
                  setFilters((current) => ({ ...current, minCapacity: event.target.value }));
                }}
                placeholder="Personas"
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.capacity ? <p className="text-sm text-destructive">{errors.capacity}</p> : null}
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              className="h-[58px] w-full"
              disabled={!canSearch || query.isFetching}
            >
              <Search className="h-4 w-4" />
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[58px] w-full lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <VenueFilterSidebar values={filters} onChange={setFilters} />
        </div>

        <section className="space-y-4">
          {submittedParams ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {venues.length
                    ? `${query.data?.total ?? venues.length} locales encontrados`
                    : 'Locales disponibles'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Resultados para {capacity} personas desde {startDate}
                  {rangeEnabled && endDate ? ` hasta ${endDate}` : ''}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          ) : null}

          {!submittedParams ? (
            <EmptyState
              title="Define fecha y personas"
              description="Usa el boton Buscar para consultar locales disponibles."
            />
          ) : null}

          {query.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <VenueCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}

          {submittedParams && !query.isLoading && !query.isError && venues.length === 0 ? (
            <EmptyState
              title="No encontramos locales"
              description="Ajusta los filtros o prueba otra fecha."
            />
          ) : null}

          {venues.length > 0 ? (
            <div className="space-y-4">
              {venues.map((venue) => (
                <VenueResultCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <AppDrawer open={filtersOpen} title="Filtros" onOpenChange={setFiltersOpen}>
        <div className="space-y-4 pb-4">
          <VenueFilterSidebar values={filters} onChange={setFilters} />
          <Button
            className="w-full"
            onClick={() => {
              setFiltersOpen(false);
              if (canSearch) {
                setSubmittedParams({
                  query: queryText,
                  district: filters.district || undefined,
                  startDate,
                  endDate: rangeEnabled ? endDate : '',
                  minCapacity: Number(filters.minCapacity || capacity),
                  minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
                  maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
                  services: filters.services.length ? filters.services.join(',') : undefined,
                  limit: 12,
                });
              }
            }}
          >
            Aplicar filtros
          </Button>
        </div>
      </AppDrawer>
    </div>
  );
};
