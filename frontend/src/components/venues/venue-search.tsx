'use client';

import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Map as MapIcon, Search, SlidersHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import { buildQueryString } from '@/lib/api/client';
import {
  getAmenitiesCatalog,
  getSpaceTypesCatalog,
  getUseTypesCatalog,
  searchVenues,
} from '@/lib/api/venues.api';
import type { Departamento, PriceUnit, VenueSearchParams } from '@/types/api';
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
  initialDistrict?: string;
  initialDepartamento?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialMinCapacity?: string;
  initialServices?: string;
  initialAmenities?: string;
  initialSpaceTypes?: string;
  initialUseTypes?: string;
  initialPriceUnit?: string;
  initialInstantBooking?: string;
}

const splitCsv = (value?: string) => (value ? value.split(',').filter(Boolean) : []);

// Shared by the URL sync (browser Back button support) and the "Ver en mapa" handoff: the
// API's `guestCount`/`limit` fields don't belong in a shareable URL — `capacity` matches the
// key name the home page's search form and the map page both read back.
const toUrlParams = (params: VenueSearchParams) => {
  const { guestCount, limit: _limit, ...urlParams } = params;
  return { ...urlParams, capacity: guestCount };
};

export const VenueSearch = ({
  initialQuery = '',
  initialStartDate = '',
  initialEndDate = '',
  initialCapacity = '',
  initialDistrict = '',
  initialDepartamento = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialMinCapacity = '',
  initialServices = '',
  initialAmenities = '',
  initialSpaceTypes = '',
  initialUseTypes = '',
  initialPriceUnit = '',
  initialInstantBooking = '',
}: VenueSearchProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [queryText, setQueryText] = useState(initialQuery);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [capacity, setCapacity] = useState(initialCapacity);
  const [filters, setFilters] = useState<VenueFilterValues>({
    district: initialDistrict,
    departamento: (initialDepartamento as Departamento | '') || '',
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    minCapacity: initialMinCapacity || initialCapacity,
    services: splitCsv(initialServices),
    amenities: splitCsv(initialAmenities),
    spaceTypes: splitCsv(initialSpaceTypes),
    useTypes: splitCsv(initialUseTypes),
    priceUnit: (initialPriceUnit as PriceUnit | '') || '',
    instantBooking: initialInstantBooking === 'true',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string; capacity?: string }>(
    {},
  );
  const [submittedParams, setSubmittedParams] = useState<VenueSearchParams | null>(() => {
    if (!initialStartDate || !initialCapacity) return null;
    return {
      query: initialQuery,
      district: initialDistrict || undefined,
      departamento: (initialDepartamento as Departamento | '') || undefined,
      startDate: initialStartDate,
      endDate: initialEndDate,
      guestCount: Number(initialCapacity),
      minCapacity: initialMinCapacity ? Number(initialMinCapacity) : undefined,
      minPrice: initialMinPrice ? Number(initialMinPrice) : undefined,
      maxPrice: initialMaxPrice ? Number(initialMaxPrice) : undefined,
      services: initialServices || undefined,
      amenities: splitCsv(initialAmenities).length ? splitCsv(initialAmenities) : undefined,
      spaceTypes: splitCsv(initialSpaceTypes).length ? splitCsv(initialSpaceTypes) : undefined,
      useTypes: splitCsv(initialUseTypes).length ? splitCsv(initialUseTypes) : undefined,
      priceUnit: (initialPriceUnit as PriceUnit | '') || undefined,
      instantBooking: initialInstantBooking === 'true' || undefined,
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

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setErrors((prev) => {
      if (!prev.startDate && !prev.endDate) return prev;
      const next = { ...prev };
      if (value) delete next.startDate;
      if (!(value && endDate && endDate < value)) delete next.endDate;
      return next;
    });
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setErrors((prev) => {
      if (!prev.endDate) return prev;
      if (!(startDate && value && value < startDate)) {
        const next = { ...prev };
        delete next.endDate;
        return next;
      }
      return prev;
    });
  };

  const handleCapacityChange = (value: string) => {
    setCapacity(value);
    setFilters((current) => ({ ...current, minCapacity: value }));
    setErrors((prev) => {
      if (!prev.capacity) return prev;
      const parsed = Number(value);
      if (value && !Number.isNaN(parsed) && parsed >= 1) {
        const next = { ...prev };
        delete next.capacity;
        return next;
      }
      return prev;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  // Search state lives in the URL, not just in memory: this is what lets the browser's Back
  // button (after opening a venue's detail page) land the user on the exact same results
  // instead of a blank search form. `page.tsx` reads the query string back with `capacity`
  // as the key name (matching the home page's search form), not `guestCount`.
  const syncUrl = (params: VenueSearchParams) => {
    router.replace(`${pathname}${buildQueryString(toUrlParams(params))}`, { scroll: false });
  };

  const submitSearch = () => {
    if (!validate()) return false;
    const params = buildSearchParams();
    setSubmittedParams(params);
    syncUrl(params);
    return true;
  };

  // Sidebar filters (amenities, price range, space types, etc.) have no separate "apply"
  // step on desktop — unlike the main search bar, which needs eventDate/capacity validated
  // before it can run. So once a base search is already active, apply and URL-sync every
  // filter change immediately; otherwise a filter tweak that's never explicitly (re)submitted
  // just vanishes (not reflected in results, not in the URL) the moment the user navigates
  // away to a venue and back. Takes `next` directly rather than reading `filters` state,
  // since setFilters(next) hasn't landed yet when this runs.
  const handleFiltersChange = (next: VenueFilterValues) => {
    setFilters(next);
    if (!submittedParams) return;
    const params = buildSearchParams(next);
    setSubmittedParams(params);
    syncUrl(params);
  };

  const buildSearchParams = (filterOverride: VenueFilterValues = filters): VenueSearchParams => ({
    query: queryText,
    district: filterOverride.district || undefined,
    departamento: filterOverride.departamento || undefined,
    startDate,
    endDate,
    guestCount: Number(capacity),
    minCapacity: filterOverride.minCapacity ? Number(filterOverride.minCapacity) : undefined,
    minPrice: filterOverride.minPrice ? Number(filterOverride.minPrice) : undefined,
    maxPrice: filterOverride.maxPrice ? Number(filterOverride.maxPrice) : undefined,
    services: filterOverride.services.length ? filterOverride.services.join(',') : undefined,
    amenities: filterOverride.amenities.length ? filterOverride.amenities : undefined,
    spaceTypes: filterOverride.spaceTypes.length ? filterOverride.spaceTypes : undefined,
    useTypes: filterOverride.useTypes.length ? filterOverride.useTypes : undefined,
    priceUnit: filterOverride.priceUnit || undefined,
    instantBooking: filterOverride.instantBooking || undefined,
    limit: 12,
  });

  // The full-page map view is a separate route (not an inline panel) — it needs its own
  // screen real estate to show price pins clearly, so it takes over the whole viewport
  // instead of splitting space with a results list and filter sidebar.
  const goToMapView = () => {
    if (!submittedParams) return;
    router.push(`/venues/map${buildQueryString(toUrlParams(submittedParams))}`);
  };

  // Carried onto each venue's detail link so "Ver en el mapa" from there can reopen the map
  // with the exact same search criteria instead of losing them.
  const resultsQueryString = submittedParams
    ? buildQueryString(toUrlParams(submittedParams)).replace(/^\?/, '')
    : '';

  return (
    <div className="space-y-6">
      <form
        className="sf-search-bar sf-search-bar-catalog sticky top-[calc(var(--header-height)+0.5rem)] z-30"
        onSubmit={handleSubmit}
      >
        <div className="sf-search-grid">
          <div className="sf-search-field">
            <Label htmlFor="query" className="sf-field-label">
              Indica destino o salon
            </Label>
            <Input
              id="query"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Salon, zona o servicio"
              className="sf-field-input"
            />
          </div>

          <div className="sf-search-field" data-error={Boolean(errors.startDate)}>
            <Label htmlFor="startDate" className="sf-field-label">
              <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
              Fecha inicio
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
              className="sf-field-input"
            />
            {errors.startDate ? <p className="sf-field-popover">{errors.startDate}</p> : null}
          </div>

          <div className="sf-search-field" data-error={Boolean(errors.endDate)}>
            <Label htmlFor="endDate" className="sf-field-label">
              Fecha fin (opcional)
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              aria-invalid={Boolean(errors.endDate)}
              className="sf-field-input"
            />
            {errors.endDate ? <p className="sf-field-popover">{errors.endDate}</p> : null}
          </div>

          <div className="sf-search-field" data-error={Boolean(errors.capacity)}>
            <Label htmlFor="capacity" className="sf-field-label">
              <Users className="mr-1.5 inline h-3.5 w-3.5" />
              Ocupacion
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => handleCapacityChange(event.target.value)}
              placeholder="Personas"
              aria-invalid={Boolean(errors.capacity)}
              className="sf-field-input"
            />
            {errors.capacity ? <p className="sf-field-popover">{errors.capacity}</p> : null}
          </div>

          <div className="sf-search-submit">
            <div className="flex w-full gap-2 md:h-full">
              <Button
                type="submit"
                size="xl"
                className="h-full flex-1 md:w-auto"
                disabled={query.isFetching}
              >
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="h-full lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:sticky lg:top-44 lg:block lg:self-start">
          <VenueFilterSidebar
            values={filters}
            onChange={handleFiltersChange}
            amenityCatalog={amenitiesQuery.data}
            spaceTypes={spaceTypesQuery.data}
            useTypes={useTypesQuery.data}
            isCatalogLoading={isCatalogLoading}
          />
        </div>

        <section className="space-y-5">
          {submittedParams ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {venues.length
                    ? `${query.data?.total ?? venues.length} locales encontrados`
                    : 'Locales disponibles'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resultados para {capacity} personas desde {startDate}
                  {endDate ? ` hasta ${endDate}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToMapView}>
                  <MapIcon className="h-4 w-4" />
                  Ver en mapa
                </Button>
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
                <VenueResultCard
                  key={venue.id}
                  venue={venue}
                  startDate={submittedParams?.startDate}
                  endDate={submittedParams?.endDate}
                  searchQueryString={resultsQueryString}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <AppDrawer open={filtersOpen} title="Filtros" onOpenChange={setFiltersOpen}>
        <div className="space-y-5 pb-5">
          <VenueFilterSidebar
            values={filters}
            onChange={handleFiltersChange}
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
