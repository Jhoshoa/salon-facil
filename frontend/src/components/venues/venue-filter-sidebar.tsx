'use client';

import { Clock, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCatalog, CatalogItem, Departamento, PriceUnit } from '@/types/api';
import { departamentoLabels, priceUnitLabels } from './venue-filter-labels';

export interface VenueFilterValues {
  district: string;
  departamento: Departamento | '';
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
  services: string[];
  amenities: string[];
  spaceTypes: string[];
  useTypes: string[];
  priceUnit: PriceUnit | '';
  instantBooking: boolean;
}

interface VenueFilterSidebarProps {
  values: VenueFilterValues;
  onChange: (values: VenueFilterValues) => void;
  amenityCatalog?: AmenityCatalog;
  spaceTypes?: CatalogItem[];
  useTypes?: CatalogItem[];
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

  const toggleSpaceType = (spaceTypeId: string) => {
    const nextSpaceTypes = values.spaceTypes.includes(spaceTypeId)
      ? values.spaceTypes.filter((item) => item !== spaceTypeId)
      : [...values.spaceTypes, spaceTypeId];
    onChange({ ...values, spaceTypes: nextSpaceTypes });
  };

  const toggleUseType = (useTypeId: string) => {
    const nextUseTypes = values.useTypes.includes(useTypeId)
      ? values.useTypes.filter((item) => item !== useTypeId)
      : [...values.useTypes, useTypeId];
    onChange({ ...values, useTypes: nextUseTypes });
  };

  const amenityGroups = Object.entries(amenityCatalog).filter(([, amenities]) => amenities?.length);

  return (
    <aside className="space-y-4">
      <div className="sf-card overflow-hidden">
        <div className="sf-surface-accent flex items-center gap-2 border-b p-4">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Filtrar por</h2>
        </div>

        <div className="space-y-6 p-4">
          <div className="sf-filter-section">
            <Label htmlFor="districtFilter">Zona o distrito</Label>
            <Input
              id="districtFilter"
              value={values.district}
              onChange={(event) => updateValue('district', event.target.value)}
              placeholder="Sopocachi, Calacoto"
            />
          </div>

          <div className="sf-filter-section">
            <Label htmlFor="departamentoFilter">Departamento</Label>
            <Select
              id="departamentoFilter"
              value={values.departamento}
              onChange={(event) =>
                onChange({ ...values, departamento: event.target.value as Departamento | '' })
              }
            >
              <option value="">Todos los departamentos</option>
              {Object.entries(departamentoLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="sf-filter-section">
            <p className="sf-filter-title">Presupuesto</p>
            <div className="flex flex-wrap gap-2">
              {(['EVENT', 'HOUR', 'DAY'] as PriceUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className="sf-filter-chip"
                  data-active={values.priceUnit === unit}
                  onClick={() =>
                    onChange({ ...values, priceUnit: values.priceUnit === unit ? '' : unit })
                  }
                >
                  {priceUnitLabels[unit]}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="sf-form-group">
                <Label htmlFor="minPrice" className="text-xs">
                  Min.
                </Label>
                <Input
                  id="minPrice"
                  type="number"
                  min="0"
                  value={values.minPrice}
                  onChange={(event) => updateValue('minPrice', event.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="maxPrice" className="text-xs">
                  Max.
                </Label>
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

          <div className="sf-filter-section">
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

          <div className="sf-filter-section">
            <p className="sf-filter-title">Tipo de espacio</p>
            <div className="space-y-2.5">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                spaceTypes.map((spaceType) => (
                  <label key={spaceType.id} className="sf-filter-option cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values.spaceTypes.includes(spaceType.id)}
                      onChange={() => toggleSpaceType(spaceType.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {spaceType.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="sf-filter-section">
            <p className="sf-filter-title">Ideal para</p>
            <div className="space-y-2.5">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                useTypes.slice(0, 8).map((useType) => (
                  <label key={useType.id} className="sf-filter-option cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values.useTypes.includes(useType.id)}
                      onChange={() => toggleUseType(useType.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {useType.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="sf-filter-section">
            <p className="sf-filter-title">Comodidades</p>
            <div className="space-y-3">
              {isCatalogLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : amenityGroups.length ? (
                amenityGroups.map(([category, amenities]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {category.replace('_', ' ')}
                    </p>
                    {amenities?.slice(0, 5).map((amenity) => (
                      <label key={amenity.key} className="sf-filter-option cursor-pointer">
                        <input
                          type="checkbox"
                          checked={values.amenities.includes(amenity.key)}
                          onChange={() => toggleAmenity(amenity.key)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        {amenity.name}
                      </label>
                    ))}
                  </div>
                ))
              ) : (
                popularFilters.map((filter) => (
                  <label key={filter} className="sf-filter-option cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values.services.includes(filter)}
                      onChange={() => toggleService(filter)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {filter}
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="sf-card flex cursor-pointer items-center justify-between gap-3 p-3 text-sm transition-colors hover:bg-muted/50">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Reserva inmediata
            </span>
            <input
              type="checkbox"
              checked={values.instantBooking}
              onChange={(event) => onChange({ ...values, instantBooking: event.target.checked })}
              className="h-4 w-4 rounded border-input accent-primary"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
