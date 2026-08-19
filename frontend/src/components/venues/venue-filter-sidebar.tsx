'use client';

import { Map, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface VenueFilterValues {
  district: string;
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
  services: string[];
}

interface VenueFilterSidebarProps {
  values: VenueFilterValues;
  onChange: (values: VenueFilterValues) => void;
}

const popularFilters = ['Cocina incluida', 'Parqueo', 'Jardin', 'Escenario', 'Decoracion'];
type ScalarFilterKey = Exclude<keyof VenueFilterValues, 'services'>;

export const VenueFilterSidebar = ({ values, onChange }: VenueFilterSidebarProps) => {
  const updateValue = (key: ScalarFilterKey, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const toggleService = (service: string) => {
    const services = values.services.includes(service)
      ? values.services.filter((item) => item !== service)
      : [...values.services, service];
    onChange({ ...values, services });
  };

  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="flex h-36 items-center justify-center bg-emerald-50 text-emerald-900">
          <div className="text-center">
            <Map className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm font-medium">Ver en mapa</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-4">
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
            <p className="text-sm font-medium">Filtros populares</p>
            <div className="space-y-2">
              {popularFilters.map((filter) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
