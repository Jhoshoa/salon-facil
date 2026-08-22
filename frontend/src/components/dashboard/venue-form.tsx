'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createVenue, getAmenitiesCatalog, updateVenue } from '@/lib/api/venues.api';
import {
  dayLabels,
  venueFormDefaults,
  venueFormSchema,
  type VenueFormValues,
} from '@/lib/validators/venue.schema';
import { priceUnitLabels, spaceTypeLabels, useTypeLabels } from '@/components/venues/venue-filter-labels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/shared/submit-button';
import type { Venue, VenueFormPayload, VenueSpaceType, VenueUseType } from '@/types/api';

const spaceTypeOptions = Object.keys(spaceTypeLabels) as VenueSpaceType[];
const useTypeOptions = Object.keys(useTypeLabels) as VenueUseType[];

interface VenueFormProps {
  venue?: Venue;
}

type TabKey = 'general' | 'location' | 'pricing' | 'amenities' | 'hours' | 'rules';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'location', label: 'Ubicacion' },
  { key: 'pricing', label: 'Precios y capacidad' },
  { key: 'amenities', label: 'Comodidades' },
  { key: 'hours', label: 'Horarios' },
  { key: 'rules', label: 'Reglas' },
];

const venueToFormValues = (venue: Venue): VenueFormValues => {
  const basePrice = venue.prices?.find((p) => p.priceType === 'BASE')?.price ?? 0;
  const hoursByDay = new Map((venue.openingHours ?? []).map((h) => [h.dayOfWeek, h]));

  return {
    name: venue.name,
    description: venue.description,
    shortDescription: venue.shortDescription ?? '',
    address: venue.address,
    district: venue.district,
    city: venue.city,
    latitude: venue.latitude != null ? String(venue.latitude) : '',
    longitude: venue.longitude != null ? String(venue.longitude) : '',
    capacityMin: venue.capacityMin,
    capacityMax: venue.capacityMax,
    squareMeters: venue.squareMeters ?? '',
    spaceType: venue.spaceType ?? '',
    priceUnit: venue.priceUnit,
    minimumHours: venue.minimumHours,
    instantBooking: venue.instantBooking,
    allowsMultipleDays: venue.allowsMultipleDays,
    rules: venue.rules ?? '',
    cancellationPolicy: venue.cancellationPolicy ?? '',
    basePrice,
    amenityIds: (venue.amenities ?? []).map((a) => a.amenity.id),
    useTypes: (venue.uses ?? []).map((u) => u.useType),
    openingHours: Array.from({ length: 7 }).map((_, dayOfWeek) => {
      const existing = hoursByDay.get(dayOfWeek);
      return {
        dayOfWeek,
        opensAt: existing?.opensAt ?? '09:00',
        closesAt: existing?.closesAt ?? '18:00',
        isClosed: existing?.isClosed ?? dayOfWeek === 0,
      };
    }),
  };
};

const toPayload = (values: VenueFormValues, existingVenue?: Venue): VenueFormPayload => ({
  name: values.name,
  description: values.description,
  shortDescription: values.shortDescription || undefined,
  address: values.address,
  district: values.district,
  city: values.city,
  latitude: values.latitude ? Number(values.latitude) : undefined,
  longitude: values.longitude ? Number(values.longitude) : undefined,
  capacityMax: values.capacityMax,
  capacityMin: values.capacityMin,
  squareMeters: values.squareMeters === '' ? undefined : Number(values.squareMeters),
  spaceType: values.spaceType ? (values.spaceType as VenueFormPayload['spaceType']) : undefined,
  priceUnit: values.priceUnit,
  minimumHours: values.minimumHours,
  instantBooking: values.instantBooking,
  allowsMultipleDays: values.allowsMultipleDays,
  rules: values.rules || undefined,
  cancellationPolicy: values.cancellationPolicy || undefined,
  // The pricing tab only edits the BASE price; preserve any other pricing rules
  // (weekend, season, early-bird, etc.) that already exist on the venue so saving
  // this form doesn't wipe them out.
  prices: [
    { priceType: 'BASE', price: values.basePrice },
    ...(existingVenue?.prices ?? [])
      .filter((price) => price.priceType !== 'BASE')
      .map((price) => ({
        priceType: price.priceType,
        dayOfWeek: price.dayOfWeek ?? undefined,
        specificDate: price.specificDate ?? undefined,
        startDate: price.startDate ?? undefined,
        endDate: price.endDate ?? undefined,
        price: Number(price.price),
        discountPercent: price.discountPercent != null ? Number(price.discountPercent) : undefined,
        discountLabel: price.discountLabel ?? undefined,
      })),
  ],
  amenities: values.amenityIds.map((amenityId) => ({ amenityId, isIncluded: true })),
  useTypes: values.useTypes.map((useType, index) => ({
    useType: useType as VenueUseType,
    isPrimary: index === 0,
  })),
  openingHours: values.openingHours,
});

export const VenueForm = ({ venue }: VenueFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const isEdit = Boolean(venue);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    mode: 'onBlur',
    defaultValues: venue ? venueToFormValues(venue) : venueFormDefaults,
  });

  const amenitiesQuery = useQuery({ queryKey: ['venue-catalog', 'amenities'], queryFn: getAmenitiesCatalog });

  const mutation = useMutation({
    mutationFn: (values: VenueFormValues) => {
      const payload = toPayload(values, venue);
      return isEdit ? updateVenue(venue!.id, payload) : createVenue(payload);
    },
    onSuccess: (savedVenue) => {
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['owner-venue', venue!.id] });
        toast.success('Local actualizado');
      } else {
        toast.success('Local creado como borrador', {
          description: 'Ahora agrega fotos y completa la informacion para publicarlo.',
        });
        router.push(`/dashboard/venues/${savedVenue.id}/edit`);
      }
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo guardar el local', { description: error.message });
    },
  });

  const amenityIds = form.watch('amenityIds');
  const useTypes = form.watch('useTypes');
  const openingHours = form.watch('openingHours');

  const toggleAmenity = (id: string) => {
    const next = amenityIds.includes(id)
      ? amenityIds.filter((item) => item !== id)
      : [...amenityIds, id];
    form.setValue('amenityIds', next, { shouldDirty: true });
  };

  const toggleUseType = (value: string) => {
    const next = useTypes.includes(value)
      ? useTypes.filter((item) => item !== value)
      : [...useTypes, value];
    form.setValue('useTypes', next, { shouldDirty: true });
  };

  const updateOpeningHour = (dayOfWeek: number, patch: Partial<VenueFormValues['openingHours'][number]>) => {
    const next = openingHours.map((item) => (item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item));
    form.setValue('openingHours', next, { shouldDirty: true });
  };

  const errors = form.formState.errors;

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          {activeTab === 'general' ? (
            <div className="space-y-5">
              <div className="sf-form-group">
                <Label htmlFor="name">Nombre del local</Label>
                <Input id="name" placeholder="Salon Imperial" {...form.register('name')} />
                {errors.name ? <p className="sf-form-error">{errors.name.message}</p> : null}
              </div>

              <div className="sf-form-group">
                <Label htmlFor="shortDescription">Descripcion corta</Label>
                <Input
                  id="shortDescription"
                  placeholder="Salon elegante con escenario y parqueo"
                  {...form.register('shortDescription')}
                />
                {errors.shortDescription ? (
                  <p className="sf-form-error">{errors.shortDescription.message}</p>
                ) : null}
              </div>

              <div className="sf-form-group">
                <Label htmlFor="description">Descripcion completa</Label>
                <textarea
                  id="description"
                  rows={5}
                  className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Describe el espacio, ambientes, capacidad y lo que lo hace especial..."
                  {...form.register('description')}
                />
                {errors.description ? (
                  <p className="sf-form-error">{errors.description.message}</p>
                ) : null}
              </div>

              <div className="sf-form-group">
                <Label htmlFor="spaceType">Tipo de espacio</Label>
                <Select id="spaceType" {...form.register('spaceType')}>
                  <option value="">Selecciona un tipo</option>
                  {spaceTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {spaceTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="sf-form-group">
                <p className="sf-filter-title">Ideal para</p>
                <div className="flex flex-wrap gap-2">
                  {useTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleUseType(type)}
                      className="sf-filter-chip"
                      data-active={useTypes.includes(type)}
                    >
                      {useTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'location' ? (
            <div className="space-y-5">
              <div className="sf-form-group">
                <Label htmlFor="address">Direccion</Label>
                <Input id="address" placeholder="Av. Bolivia 1234" {...form.register('address')} />
                {errors.address ? <p className="sf-form-error">{errors.address.message}</p> : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="district">Distrito o zona</Label>
                  <Input id="district" placeholder="Villa Adela" {...form.register('district')} />
                  {errors.district ? <p className="sf-form-error">{errors.district.message}</p> : null}
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" placeholder="El Alto" {...form.register('city')} />
                  {errors.city ? <p className="sf-form-error">{errors.city.message}</p> : null}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="latitude">Latitud (opcional)</Label>
                  <Input id="latitude" placeholder="-16.518391" {...form.register('latitude')} />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="longitude">Longitud (opcional)</Label>
                  <Input id="longitude" placeholder="-68.167649" {...form.register('longitude')} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes obtener la latitud y longitud buscando tu direccion en Google Maps y copiando
                las coordenadas.
              </p>
            </div>
          ) : null}

          {activeTab === 'pricing' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="capacityMin">Capacidad minima</Label>
                  <Input id="capacityMin" type="number" min={0} {...form.register('capacityMin')} />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="capacityMax">Capacidad maxima</Label>
                  <Input id="capacityMax" type="number" min={1} {...form.register('capacityMax')} />
                  {errors.capacityMax ? (
                    <p className="sf-form-error">{errors.capacityMax.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="basePrice">Precio base (Bs)</Label>
                  <Input id="basePrice" type="number" min={1} {...form.register('basePrice')} />
                  {errors.basePrice ? <p className="sf-form-error">{errors.basePrice.message}</p> : null}
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="priceUnit">Unidad de precio</Label>
                  <Select id="priceUnit" {...form.register('priceUnit')}>
                    {Object.entries(priceUnitLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="minimumHours">Horas minimas de alquiler</Label>
                  <Input id="minimumHours" type="number" min={1} max={24} {...form.register('minimumHours')} />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="squareMeters">Metros cuadrados (opcional)</Label>
                  <Input id="squareMeters" type="number" min={1} {...form.register('squareMeters')} />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" {...form.register('instantBooking')} />
                  Reserva inmediata
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" {...form.register('allowsMultipleDays')} />
                  Permite eventos de varios dias
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'amenities' ? (
            <div className="space-y-5">
              {amenitiesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando comodidades...</p>
              ) : (
                Object.entries(amenitiesQuery.data ?? {}).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {category.replace('_', ' ')}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items?.map((amenity) => (
                        <label key={amenity.id} className="sf-filter-option cursor-pointer">
                          <input
                            type="checkbox"
                            checked={amenityIds.includes(amenity.id)}
                            onChange={() => toggleAmenity(amenity.id)}
                            className="h-4 w-4 rounded border-input accent-primary"
                          />
                          {amenity.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === 'hours' ? (
            <div className="space-y-3">
              {openingHours.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border p-3"
                >
                  <span className="w-24 text-sm font-medium">{dayLabels[day.dayOfWeek]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={day.isClosed}
                      onChange={(e) => updateOpeningHour(day.dayOfWeek, { isClosed: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Cerrado
                  </label>
                  {!day.isClosed ? (
                    <>
                      <Input
                        type="time"
                        value={day.opensAt}
                        onChange={(e) => updateOpeningHour(day.dayOfWeek, { opensAt: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={day.closesAt}
                        onChange={(e) => updateOpeningHour(day.dayOfWeek, { closesAt: e.target.value })}
                        className="w-32"
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'rules' ? (
            <div className="space-y-5">
              <div className="sf-form-group">
                <Label htmlFor="rules">Reglas del espacio</Label>
                <textarea
                  id="rules"
                  rows={4}
                  className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Musica hasta las 2:00 AM. No se permite pirotecnia..."
                  {...form.register('rules')}
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="cancellationPolicy">Politica de cancelacion</Label>
                <textarea
                  id="cancellationPolicy"
                  rows={4}
                  className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Reserva reembolsable hasta 30 dias antes del evento..."
                  {...form.register('cancellationPolicy')}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isLoading={mutation.isPending}>
          {isEdit ? 'Guardar cambios' : 'Crear local'}
        </SubmitButton>
      </div>
    </form>
  );
};
