'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { MapPin, Trash2 } from 'lucide-react';
import {
  createVenue,
  getSpaceTypesCatalog,
  getUseTypesCatalog,
  updateVenue,
} from '@/lib/api/venues.api';
import {
  dayLabels,
  venueFormDefaults,
  venueFormSchema,
  type VenueFormValues,
} from '@/lib/validators/venue.schema';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import {
  buildInitialPricingMode,
  buildInitialSeasonRules,
  buildInitialSpecificDateRules,
  buildInitialWeekdayRules,
  type PricingMode,
  type SeasonRuleState,
  type SpecificDateRuleState,
  type WeekdayRuleState,
} from '@/lib/venue-pricing';
import { VenueCharacteristicsSection } from './venue-characteristics-section';
import { VenuePricingSection } from './venue-pricing-section';
import { VenueRentalItemsTab } from './venue-rental-items-tab';
import { formatDate, formatTime12h } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/shared/submit-button';
import { PhoneInput } from '@/components/shared/phone-input';
import { Button } from '@/components/ui/button';
import { VenueLocationPickerDialog } from '@/components/venues/venue-location-picker-dialog';
import type { PriceUnit, Venue, VenueFormPayload, VenuePriceInput } from '@/types/api';

interface VenueFormProps {
  venue?: Venue;
  /** When provided (along with onTabChange), the parent controls which tab is active and
   * VenueForm skips rendering its own horizontal tab bar — used by the owner edit page, which
   * renders the tab nav itself in its sidebar. Standalone callers (e.g. the "new venue" page)
   * omit both and VenueForm manages its own tab state with its usual horizontal bar. */
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export type TabKey = 'general' | 'location' | 'pricing' | 'offerings' | 'hours' | 'rules';

export const tabs: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'location', label: 'Ubicacion' },
  { key: 'offerings', label: 'Lo que ofreces' },
  { key: 'pricing', label: 'Precios y capacidad' },
  { key: 'hours', label: 'Horarios' },
  { key: 'rules', label: 'Reglas' },
];

// Maps each schema field to the tab it's rendered on, so a failed submit can jump the user
// to the first tab containing an error instead of silently doing nothing (errors on a hidden
// tab are otherwise invisible since only the active tab's fields are rendered).
const fieldTab: Record<keyof VenueFormValues, TabKey> = {
  name: 'general',
  description: 'general',
  shortDescription: 'general',
  spaceType: 'general',
  address: 'location',
  district: 'location',
  departamento: 'location',
  contactPhone: 'location',
  facebookUrl: 'location',
  instagramUrl: 'location',
  tiktokUrl: 'location',
  latitude: 'location',
  longitude: 'location',
  capacityMin: 'pricing',
  capacityMax: 'pricing',
  squareMeters: 'pricing',
  priceUnit: 'pricing',
  minimumHours: 'pricing',
  instantBooking: 'pricing',
  allowsMultipleDays: 'pricing',
  paymentPolicy: 'pricing',
  depositPercentage: 'pricing',
  basePrice: 'pricing',
  useTypes: 'general',
  openingHours: 'hours',
  rules: 'rules',
  cancellationPolicy: 'rules',
};

const venueToFormValues = (venue: Venue): VenueFormValues => {
  const basePrice = venue.prices?.find((p) => p.priceType === 'BASE')?.price ?? 0;
  const hoursByDay = new Map((venue.openingHours ?? []).map((h) => [h.dayOfWeek, h]));

  return {
    name: venue.name,
    description: venue.description ?? '',
    shortDescription: venue.shortDescription ?? '',
    address: venue.address,
    district: venue.district,
    departamento: venue.departamento,
    contactPhone: venue.contactPhone ?? '',
    facebookUrl: venue.facebookUrl ?? '',
    instagramUrl: venue.instagramUrl ?? '',
    tiktokUrl: venue.tiktokUrl ?? '',
    latitude: venue.latitude != null ? String(venue.latitude) : '',
    longitude: venue.longitude != null ? String(venue.longitude) : '',
    capacityMin: venue.capacityMin,
    capacityMax: venue.capacityMax,
    squareMeters: venue.squareMeters ?? '',
    spaceType: venue.spaceTypeId ?? '',
    priceUnit: venue.priceUnit,
    minimumHours: venue.minimumHours,
    instantBooking: venue.instantBooking,
    allowsMultipleDays: venue.allowsMultipleDays,
    paymentPolicy: venue.paymentPolicy,
    depositPercentage: venue.depositPercentage,
    rules: venue.rules ?? '',
    cancellationPolicy: venue.cancellationPolicy ?? '',
    basePrice,
    useTypes: (venue.uses ?? []).map((u) => u.useTypeId),
    openingHours: Array.from({ length: 7 }).map((_, dayOfWeek) => {
      const existing = hoursByDay.get(dayOfWeek);
      return {
        dayOfWeek,
        opensAt: existing?.opensAt ?? '09:00',
        closesAt: existing?.closesAt ?? '23:59',
        isClosed: existing?.isClosed ?? false,
      };
    }),
  };
};

const toPayload = (
  values: VenueFormValues,
  priceRules: VenuePriceInput[],
  existingVenue?: Venue,
): VenueFormPayload => ({
  name: values.name,
  description: values.description || undefined,
  shortDescription: values.shortDescription || undefined,
  address: values.address,
  district: values.district,
  departamento: values.departamento,
  contactPhone: values.contactPhone || undefined,
  facebookUrl: values.facebookUrl || undefined,
  instagramUrl: values.instagramUrl || undefined,
  tiktokUrl: values.tiktokUrl || undefined,
  latitude: values.latitude ? Number(values.latitude) : undefined,
  longitude: values.longitude ? Number(values.longitude) : undefined,
  capacityMax: values.capacityMax,
  capacityMin: values.capacityMin,
  squareMeters: values.squareMeters === '' ? undefined : Number(values.squareMeters),
  spaceTypeId: values.spaceType || undefined,
  priceUnit: values.priceUnit,
  minimumHours: values.minimumHours,
  instantBooking: values.instantBooking,
  allowsMultipleDays: values.allowsMultipleDays,
  paymentPolicy: values.paymentPolicy,
  depositPercentage: values.depositPercentage,
  rules: values.rules || undefined,
  cancellationPolicy: values.cancellationPolicy || undefined,
  // BASE + the weekday/season/specific-date rules edited on this tab (priceRules), plus
  // EARLY_BIRD -- the one rule type still not manageable from this UI (and not yet applied by
  // the price calculator at all, see price-calculator.service.ts) -- preserved as-is so saving
  // this form doesn't wipe it out.
  prices: [
    { priceType: 'BASE', price: values.basePrice },
    ...priceRules,
    ...(existingVenue?.prices ?? [])
      .filter(
        (price) =>
          !['BASE', 'WEEKEND', 'SEASON_HIGH', 'HOLIDAY', 'CUSTOM_DATE'].includes(price.priceType),
      )
      .map((price) => ({
        priceType: price.priceType,
        dayOfWeek: price.dayOfWeek ?? undefined,
        specificDate: price.specificDate ?? undefined,
        startDate: price.startDate ?? undefined,
        endDate: price.endDate ?? undefined,
        price: Number(price.price),
        unit: price.unit ?? undefined,
        discountPercent: price.discountPercent != null ? Number(price.discountPercent) : undefined,
        discountLabel: price.discountLabel ?? undefined,
      })),
  ],
  useTypes: values.useTypes.map((useTypeId, index) => ({
    useTypeId,
    isPrimary: index === 0,
  })),
  openingHours: values.openingHours,
});

export const VenueForm = ({ venue, activeTab: controlledTab, onTabChange }: VenueFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalTab, setInternalTab] = useState<TabKey>('general');
  const isTabControlled = controlledTab !== undefined && onTabChange !== undefined;
  const activeTab = isTabControlled ? controlledTab : internalTab;
  const setActiveTab = isTabControlled ? onTabChange : setInternalTab;
  const isEdit = Boolean(venue);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    mode: 'onBlur',
    defaultValues: venue ? venueToFormValues(venue) : venueFormDefaults,
  });

  const [pricingMode, setPricingMode] = useState<PricingMode>(() => buildInitialPricingMode(venue));
  const [weekdayRules, setWeekdayRules] = useState<WeekdayRuleState[]>(() =>
    buildInitialWeekdayRules(venue),
  );
  const [seasonRules, setSeasonRules] = useState<SeasonRuleState[]>(() =>
    buildInitialSeasonRules(venue),
  );
  const [specificDateRules, setSpecificDateRules] = useState<SpecificDateRuleState[]>(() =>
    buildInitialSpecificDateRules(venue),
  );
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const spaceTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'space-types'],
    queryFn: getSpaceTypesCatalog,
  });
  const useTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'use-types'],
    queryFn: getUseTypesCatalog,
  });
  /** Returns an error message if invalid, or null. Runs before submit since these rules
   * live outside react-hook-form (they're a variable-length, mode-dependent structure). */
  const validatePriceRules = (): string | null => {
    for (const rule of specificDateRules) {
      const label = rule.name || (rule.priceType === 'HOLIDAY' ? 'feriado' : 'fecha puntual');
      if (!rule.date) return `Falta la fecha para "${label}"`;
      if (!rule.price || Number(rule.price) < 0) return `Falta el precio para "${label}"`;
    }

    if (pricingMode === 'single') return null;

    const enabledWeekdays = weekdayRules.filter((r) => r.enabled);
    for (const rule of enabledWeekdays) {
      if (!rule.price || Number(rule.price) < 0) {
        return `Falta el precio para ${dayLabels[rule.dayOfWeek]}`;
      }
    }

    if (pricingMode === 'weekday_season') {
      for (const rule of seasonRules) {
        const label = rule.name || 'temporada';
        if (!rule.startDate || !rule.endDate) return `Faltan fechas para "${label}"`;
        if (rule.endDate < rule.startDate) {
          return `"${label}": la fecha de fin debe ser igual o posterior a la de inicio`;
        }
        if (!rule.price || Number(rule.price) < 0) return `Falta el precio para "${label}"`;
      }
    }

    return null;
  };

  const buildPriceRulesPayload = (): VenuePriceInput[] => {
    // Specific-date rules (feriados / fechas puntuales) take priority over everything else in
    // the price calculator regardless of pricing mode, so they're collected unconditionally.
    const rules: VenuePriceInput[] = specificDateRules.map((r) => ({
      priceType: r.priceType,
      specificDate: r.date,
      price: Number(r.price),
      unit: r.unit || undefined,
      discountLabel: r.name.trim() || undefined,
    }));

    if (pricingMode === 'single') return rules;

    rules.push(
      ...weekdayRules
        .filter((r) => r.enabled)
        .map((r) => ({
          priceType: 'WEEKEND' as const,
          dayOfWeek: r.dayOfWeek,
          price: Number(r.price),
          unit: r.unit || undefined,
        })),
    );

    if (pricingMode === 'weekday_season') {
      rules.push(
        ...seasonRules.map((r) => ({
          priceType: 'SEASON_HIGH' as const,
          startDate: r.startDate,
          endDate: r.endDate,
          price: Number(r.price),
          unit: r.unit || undefined,
          discountLabel: r.name.trim() || undefined,
        })),
      );
    }

    return rules;
  };

  const mutation = useMutation({
    mutationFn: (values: VenueFormValues) => {
      const payload = toPayload(values, buildPriceRulesPayload(), venue);
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

  const useTypes = form.watch('useTypes');
  const openingHours = form.watch('openingHours');
  const spaceType = form.watch('spaceType');
  const departamento = form.watch('departamento');

  const handleLocationConfirm = (latitude: number, longitude: number) => {
    form.setValue('latitude', latitude.toFixed(6), { shouldValidate: true, shouldDirty: true });
    form.setValue('longitude', longitude.toFixed(6), { shouldValidate: true, shouldDirty: true });
  };

  const toggleUseType = (value: string) => {
    const next = useTypes.includes(value)
      ? useTypes.filter((item) => item !== value)
      : [...useTypes, value];
    form.setValue('useTypes', next, { shouldDirty: true });
  };

  const updateOpeningHour = (
    dayOfWeek: number,
    patch: Partial<VenueFormValues['openingHours'][number]>,
  ) => {
    const next = openingHours.map((item) =>
      item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item,
    );
    form.setValue('openingHours', next, { shouldDirty: true });
  };

  const errors = form.formState.errors;
  const tabsWithErrors = new Set(
    Object.keys(errors).map((field) => fieldTab[field as keyof VenueFormValues]),
  );

  const onInvalid = (formErrors: typeof errors) => {
    const firstErrorField = Object.keys(formErrors)[0] as keyof VenueFormValues | undefined;
    const firstErrorTab = firstErrorField ? fieldTab[firstErrorField] : undefined;
    if (firstErrorTab) setActiveTab(firstErrorTab);
    toast.error('Revisa los campos marcados', {
      description: 'Falta completar informacion en una o mas pestanas.',
    });
  };

  const onValid = (values: VenueFormValues) => {
    const priceRuleError = validatePriceRules();
    if (priceRuleError) {
      setActiveTab('pricing');
      toast.error('Revisa los precios configurados', { description: priceRuleError });
      return;
    }
    mutation.mutate(values);
  };

  const formElement = (
    <form className="space-y-5" onSubmit={form.handleSubmit(onValid, onInvalid)}>
      {!isTabControlled ? (
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              {tabsWithErrors.has(tab.key) ? (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === 'pricing' ? (
        <VenuePricingSection
          form={form}
          pricingMode={pricingMode}
          onPricingModeChange={setPricingMode}
          weekdayRules={weekdayRules}
          setWeekdayRules={setWeekdayRules}
          seasonRules={seasonRules}
          setSeasonRules={setSeasonRules}
          specificDateRules={specificDateRules}
          setSpecificDateRules={setSpecificDateRules}
        />
      ) : (
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
                  <Label htmlFor="shortDescription">Descripcion corta (opcional)</Label>
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
                  <Label htmlFor="description">Descripcion completa (opcional)</Label>
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
                  <Select
                    id="spaceType"
                    value={spaceType}
                    onChange={(event) =>
                      form.setValue('spaceType', event.target.value, { shouldDirty: true })
                    }
                    disabled={spaceTypesQuery.isLoading}
                  >
                    <option value="">Selecciona un tipo</option>
                    {(spaceTypesQuery.data ?? []).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sf-form-group">
                  <p className="sf-filter-title">Ideal para</p>
                  <div className="flex flex-wrap gap-2">
                    {useTypesQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando tipos de evento...</p>
                    ) : (
                      (useTypesQuery.data ?? []).map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleUseType(type.id)}
                          className="sf-filter-chip"
                          data-active={useTypes.includes(type.id)}
                        >
                          {type.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'location' ? (
              <div className="space-y-5">
                <div className="sf-form-group">
                  <Label htmlFor="address">Direccion</Label>
                  <Input
                    id="address"
                    placeholder="Av. Bolivia 1234"
                    {...form.register('address')}
                  />
                  {errors.address ? (
                    <p className="sf-form-error">{errors.address.message}</p>
                  ) : null}
                </div>

                <div className="sf-form-group">
                  <Label htmlFor="district">Distrito o zona</Label>
                  <Input id="district" placeholder="Villa Adela" {...form.register('district')} />
                  {errors.district ? (
                    <p className="sf-form-error">{errors.district.message}</p>
                  ) : null}
                </div>

                <div className="sf-form-group">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Select
                    id="departamento"
                    value={departamento}
                    onChange={(event) =>
                      form.setValue(
                        'departamento',
                        event.target.value as VenueFormValues['departamento'],
                        {
                          shouldDirty: true,
                        },
                      )
                    }
                  >
                    {Object.entries(departamentoLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  {errors.departamento ? (
                    <p className="sf-form-error">{errors.departamento.message}</p>
                  ) : null}
                </div>

                <div className="sf-form-group">
                  <Label htmlFor="contactPhone">
                    Telefono de contacto de este local (opcional)
                  </Label>
                  <PhoneInput
                    id="contactPhone"
                    value={form.watch('contactPhone') ?? ''}
                    onChange={(value) =>
                      form.setValue('contactPhone', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Independiente del WhatsApp de tu perfil — util si este local lo maneja otra
                    persona.
                  </p>
                  {errors.contactPhone ? (
                    <p className="sf-form-error">{errors.contactPhone.message}</p>
                  ) : null}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sf-form-group">
                    <Label htmlFor="facebookUrl">Facebook (opcional)</Label>
                    <Input
                      id="facebookUrl"
                      placeholder="https://facebook.com/tu-local"
                      {...form.register('facebookUrl')}
                    />
                    {errors.facebookUrl ? (
                      <p className="sf-form-error">{errors.facebookUrl.message}</p>
                    ) : null}
                  </div>
                  <div className="sf-form-group">
                    <Label htmlFor="instagramUrl">Instagram (opcional)</Label>
                    <Input
                      id="instagramUrl"
                      placeholder="https://instagram.com/tu-local"
                      {...form.register('instagramUrl')}
                    />
                    {errors.instagramUrl ? (
                      <p className="sf-form-error">{errors.instagramUrl.message}</p>
                    ) : null}
                  </div>
                </div>

                <div className="sf-form-group">
                  <Label htmlFor="tiktokUrl">TikTok (opcional)</Label>
                  <Input
                    id="tiktokUrl"
                    placeholder="https://tiktok.com/@tu-local"
                    {...form.register('tiktokUrl')}
                  />
                  {errors.tiktokUrl ? (
                    <p className="sf-form-error">{errors.tiktokUrl.message}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label>Ubicacion en el mapa (opcional)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLocationPickerOpen(true)}
                  >
                    <MapPin className="h-4 w-4" />
                    Seleccionar en el mapa
                  </Button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sf-form-group">
                    <Label htmlFor="latitude">Latitud (opcional)</Label>
                    <Input id="latitude" placeholder="-16.518391" {...form.register('latitude')} />
                    {errors.latitude ? (
                      <p className="sf-form-error">{errors.latitude.message}</p>
                    ) : null}
                  </div>
                  <div className="sf-form-group">
                    <Label htmlFor="longitude">Longitud (opcional)</Label>
                    <Input
                      id="longitude"
                      placeholder="-68.167649"
                      {...form.register('longitude')}
                    />
                    {errors.longitude ? (
                      <p className="sf-form-error">{errors.longitude.message}</p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Usa el boton de arriba para marcarla en el mapa (o tu ubicacion actual), o pegala
                  a mano si ya la tenes copiada de Google Maps.
                </p>

                <VenueLocationPickerDialog
                  open={locationPickerOpen}
                  onOpenChange={setLocationPickerOpen}
                  initialLatitude={form.watch('latitude')}
                  initialLongitude={form.watch('longitude')}
                  onConfirm={handleLocationConfirm}
                />
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
                        onChange={(e) =>
                          updateOpeningHour(day.dayOfWeek, { isClosed: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      Cerrado
                    </label>
                    {!day.isClosed ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={day.opensAt}
                            onChange={(e) =>
                              updateOpeningHour(day.dayOfWeek, { opensAt: e.target.value })
                            }
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            ({formatTime12h(day.opensAt)})
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">a</span>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={day.closesAt}
                            onChange={(e) =>
                              updateOpeningHour(day.dayOfWeek, { closesAt: e.target.value })
                            }
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            ({formatTime12h(day.closesAt)})
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'rules' ? (
              <div className="space-y-5">
                <div className="sf-form-group">
                  <Label htmlFor="rules">Reglas del espacio (opcional)</Label>
                  <textarea
                    id="rules"
                    rows={4}
                    className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    placeholder="Musica hasta las 2:00 AM. No se permite pirotecnia..."
                    {...form.register('rules')}
                  />
                  {errors.rules ? <p className="sf-form-error">{errors.rules.message}</p> : null}
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="cancellationPolicy">Politica de cancelacion (opcional)</Label>
                  <textarea
                    id="cancellationPolicy"
                    rows={4}
                    className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    placeholder="Reserva reembolsable hasta 30 dias antes del evento..."
                    {...form.register('cancellationPolicy')}
                  />
                  {errors.cancellationPolicy ? (
                    <p className="sf-form-error">{errors.cancellationPolicy.message}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <SubmitButton isLoading={mutation.isPending}>
          {isEdit ? 'Guardar cambios' : 'Crear local'}
        </SubmitButton>
      </div>
    </form>
  );

  if (activeTab !== 'offerings') return formElement;

  // No form on this tab: features and items each save on their own, so a save here can't be held
  // back by an unrelated error on another tab.
  if (!venue) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Guarda el local primero para poder indicar lo que ofreces.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-5">
          <VenueCharacteristicsSection venue={venue} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 sm:p-5">
          <VenueRentalItemsTab venue={venue} />
        </CardContent>
      </Card>
    </div>
  );
};
