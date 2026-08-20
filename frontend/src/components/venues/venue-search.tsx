'use client';

import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { CalendarDays, Search, SlidersHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAmenitiesCatalog,
  getSpaceTypesCatalog,
  getUseTypesCatalog,
  searchVenues,
} from '@/lib/api/venues.api';
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
  const [capacity, setCapacity] = useState(initialCapacity);
  const [filters, setFilters] = useState<VenueFilterValues>({
    district: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: initialCapacity,
    services: [],
    amenities: [],
    spaceTypes: [],
    useTypes: [],
    priceUnit: '',
    instantBooking: false,
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
      guestCount: Number(initialCapacity),
      limit: 12,
    };
  });

  const query = useQuery({
    queryKey: ['venues', submittedParams],
    queryFn: () => searchVenues(submittedParams!),
    enabled: Boolean(submittedParams),
  });
  const amenitiesQuery = useQuery({
    queryKey: ['venue-catalog', 'amenities'],
    queryFn: getAmenitiesCatalog,
  });
  const spaceTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'space-types'],
    queryFn: getSpaceTypesCatalog,
  });
  const useTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'use-types'],
    queryFn: getUseTypesCatalog,
  });

  const venues = query.data?.venues ?? query.data?.data ?? [];
  const isCatalogLoading =
    amenitiesQuery.isLoading || spaceTypesQuery.isLoading || useTypesQuery.isLoading;

  const validate = () => {
    const nextErrors: { startDate?: string; endDate?: string; capacity?: string } = {};
    const parsedCapacity = Number(capacity);

    if (!startDate) nextErrors.startDate = 'La fecha de inicio es obligatoria.';
    if (!capacity || Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      nextErrors.capacity = 'La cantidad de personas es obligatoria.';
    }
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = 'La fecha final no puede ser anterior a la inicial.';
    }

    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;

    if (!isValid) {
      toast.warning('Completa los datos requeridos', {
        description: 'Necesitamos fecha de inicio y cantidad de invitados para buscar.',
      });
    }

    return isValid;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const submitSearch = () => {
    if (!validate()) return false;
    setSubmittedParams(buildSearchParams());
    return true;
  };

  const buildSearchParams = (): VenueSearchParams => ({
    query: queryText,
    district: filters.district || undefined,
    startDate,
    endDate,
    guestCount: Number(capacity),
    minCapacity: filters.minCapacity ? Number(filters.minCapacity) : undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    services: filters.services.length ? filters.services.join(',') : undefined,
    amenities: filters.amenities.length ? filters.amenities : undefined,
    spaceTypes: filters.spaceTypes.length ? filters.spaceTypes : undefined,
    useTypes: filters.useTypes.length ? filters.useTypes : undefined,
    priceUnit: filters.priceUnit || undefined,
    instantBooking: filters.instantBooking || undefined,
    limit: 12,
  });

  return (
    <div className="space-y-6">
      <form className="sf-card-strong sticky top-20 z-30 p-3" onSubmit={handleSubmit}>
        <div className="grid gap-2 lg:grid-cols-[1fr_190px_190px_170px_150px]">
          <div className="space-y-2">
            <div className="sf-surface rounded-md border px-3 py-2 transition-colors focus-within:border-primary">
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
            <div className="sf-surface rounded-md border px-3 py-2 transition-colors focus-within:border-primary">
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
                aria-invalid={Boolean(errors.startDate)}
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.startDate ? (
              <p className="text-sm text-destructive">{errors.startDate}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="sf-surface rounded-md border px-3 py-2 transition-colors focus-within:border-primary">
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                Fecha fin opcional
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.endDate ? <p className="text-sm text-destructive">{errors.endDate}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="sf-surface rounded-md border px-3 py-2 transition-colors focus-within:border-primary">
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
                aria-invalid={Boolean(errors.capacity)}
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.capacity ? <p className="text-sm text-destructive">{errors.capacity}</p> : null}
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="sf-action h-[58px] w-full" disabled={query.isFetching}>
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
        <div className="hidden lg:sticky lg:top-44 lg:block lg:self-start">
          <VenueFilterSidebar
            values={filters}
            onChange={setFilters}
            amenityCatalog={amenitiesQuery.data}
            spaceTypes={spaceTypesQuery.data}
            useTypes={useTypesQuery.data}
            isCatalogLoading={isCatalogLoading}
          />
        </div>

        <section className="space-y-4">
          {submittedParams ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  {venues.length
                    ? `${query.data?.total ?? venues.length} locales encontrados`
                    : 'Locales disponibles'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resultados para {capacity} personas desde {startDate}
                  {endDate ? ` hasta ${endDate}` : ''}
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
          <VenueFilterSidebar
            values={filters}
            onChange={setFilters}
            amenityCatalog={amenitiesQuery.data}
            spaceTypes={spaceTypesQuery.data}
            useTypes={useTypesQuery.data}
            isCatalogLoading={isCatalogLoading}
          />
          <Button
            className="w-full"
            onClick={() => {
              if (submitSearch()) {
                setFiltersOpen(false);
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
