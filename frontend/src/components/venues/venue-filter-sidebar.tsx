'use client';

import { Clock, Map, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCatalog, PriceUnit, VenueSpaceType, VenueUseType } from '@/types/api';
import { priceUnitLabels, spaceTypeLabels, useTypeLabels } from './venue-filter-labels';

export interface VenueFilterValues {
  district: string;
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
  services: string[];
  amenities: string[];
  spaceTypes: VenueSpaceType[];
  useTypes: VenueUseType[];
  priceUnit: PriceUnit | '';
  instantBooking: boolean;
}

interface VenueFilterSidebarProps {
  values: VenueFilterValues;
  onChange: (values: VenueFilterValues) => void;
  amenityCatalog?: AmenityCatalog;
  spaceTypes?: VenueSpaceType[];
  useTypes?: VenueUseType[];
  isCatalogLoading?: boolean;
}

const popularFilters = ['Cocina incluida', 'Parqueo', 'Jardin', 'Escenario', 'Decoracion'];
type ScalarFilterKey = 'district' | 'minPrice' | 'maxPrice' | 'minCapacity';

export const VenueFilterSidebar = ({
  values,
  onChange,
  amenityCatalog = {},
  spaceTypes = [],
  useTypes = [],
  isCatalogLoading = false,
}: VenueFilterSidebarProps) => {
  const updateValue = (key: ScalarFilterKey, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const toggleService = (service: string) => {
    const services = values.services.includes(service)
      ? values.services.filter((item) => item !== service)
      : [...values.services, service];
    onChange({ ...values, services });
  };

  const toggleAmenity = (key: string) => {
    const amenities = values.amenities.includes(key)
      ? values.amenities.filter((item) => item !== key)
      : [...values.amenities, key];
    onChange({ ...values, amenities });
  };

  const toggleSpaceType = (spaceType: VenueSpaceType) => {
    const spaceTypes = values.spaceTypes.includes(spaceType)
      ? values.spaceTypes.filter((item) => item !== spaceType)
      : [...values.spaceTypes, spaceType];
    onChange({ ...values, spaceTypes });
  };

  const toggleUseType = (useType: VenueUseType) => {
    const useTypes = values.useTypes.includes(useType)
      ? values.useTypes.filter((item) => item !== useType)
      : [...values.useTypes, useType];
    onChange({ ...values, useTypes });
  };

  const amenityGroups = Object.entries(amenityCatalog).filter(([, amenities]) => amenities?.length);

  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="sf-soft-gradient flex h-40 items-center justify-center">
          <div className="text-center">
            <Map className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm font-semibold">Mapa de zonas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vista interactiva en siguiente paso
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="sf-surface flex items-center gap-2 border-b p-4">
          <SlidersHorizontal className="h-4 w-4" />
          <h2 className="font-semibold">Filtrar por</h2>
        </div>

        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <Label htmlFor="districtFilter">Zona o distrito</Label>
            <Input
              id="districtFilter"
              value={values.district}
              onChange={(event) => updateValue('district', event.target.value)}
              placeholder="Sopocachi, Calacoto"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Presupuesto</p>
            <div className="grid grid-cols-3 gap-2">
              {(['EVENT', 'HOUR', 'DAY'] as PriceUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`rounded-md border px-2 py-2 text-sm ${
                    values.priceUnit === unit
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground'
                  }`}
                  onClick={() =>
                    onChange({ ...values, priceUnit: values.priceUnit === unit ? '' : unit })
                  }
                >
                  {priceUnitLabels[unit]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="minPrice">Min.</Label>
                <Input
                  id="minPrice"
                  type="number"
                  min="0"
                  value={values.minPrice}
                  onChange={(event) => updateValue('minPrice', event.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Max.</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  min="0"
                  value={values.maxPrice}
                  onChange={(event) => updateValue('maxPrice', event.target.value)}
                  placeholder="8000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minCapacityFilter">Capacidad minima</Label>
            <Input
              id="minCapacityFilter"
              type="number"
              min="1"
              value={values.minCapacity}
              onChange={(event) => updateValue('minCapacity', event.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Tipo de espacio</p>
            <div className="space-y-2">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                spaceTypes.map((spaceType) => (
                  <label
                    key={spaceType}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={values.spaceTypes.includes(spaceType)}
                      onChange={() => toggleSpaceType(spaceType)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {spaceTypeLabels[spaceType]}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Ideal para</p>
            <div className="space-y-2">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                useTypes.slice(0, 8).map((useType) => (
                  <label
                    key={useType}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={values.useTypes.includes(useType)}
                      onChange={() => toggleUseType(useType)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {useTypeLabels[useType]}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Comodidades</p>
            <div className="space-y-2">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : amenityGroups.length ? (
                amenityGroups.map(([category, amenities]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {category.replace('_', ' ')}
                    </p>
                    {amenities?.slice(0, 5).map((amenity) => (
                      <label
                        key={amenity.key}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={values.amenities.includes(amenity.key)}
                          onChange={() => toggleAmenity(amenity.key)}
                          className="h-4 w-4 rounded border-input"
                        />
                        {amenity.name}
                      </label>
                    ))}
                  </div>
                ))
              ) : (
                popularFilters.map((filter) => (
                  <label
                    key={filter}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={values.services.includes(filter)}
                      onChange={() => toggleService(filter)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {filter}
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reserva inmediata
            </span>
            <input
              type="checkbox"
              checked={values.instantBooking}
              onChange={(event) => onChange({ ...values, instantBooking: event.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
