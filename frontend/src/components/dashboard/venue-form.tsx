'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createVenue,
  getAmenitiesCatalog,
  getSeasonalEventsCatalog,
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
import { departamentoLabels, priceUnitLabels } from '@/components/venues/venue-filter-labels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/shared/submit-button';
import { PhoneInput } from '@/components/shared/phone-input';
import { Button } from '@/components/ui/button';
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

type PricingMode = 'single' | 'weekday' | 'weekday_season';

interface WeekdayRuleState {
  dayOfWeek: number;
  enabled: boolean;
  unit: PriceUnit | '';
  price: string;
}

interface SeasonRuleState {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
  price: string;
  unit: PriceUnit | '';
}

const buildInitialWeekdayRules = (venue?: Venue): WeekdayRuleState[] => {
  const byDay = new Map(
    (venue?.prices ?? [])
      .filter((p) => p.priceType === 'WEEKEND' && p.dayOfWeek != null)
      .map((p) => [p.dayOfWeek as number, p]),
  );
  return Array.from({ length: 7 }).map((_, dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      enabled: Boolean(existing),
      unit: existing?.unit ?? '',
      price: existing ? String(existing.price) : '',
    };
  });
};

const buildInitialSeasonRules = (venue?: Venue): SeasonRuleState[] =>
  (venue?.prices ?? [])
    .filter((p) => p.priceType === 'SEASON_HIGH' && p.startDate && p.endDate)
    .map((p) => ({
      key: p.id,
      name: p.discountLabel ?? '',
      startDate: p.startDate!.slice(0, 10),
      endDate: p.endDate!.slice(0, 10),
      price: String(p.price),
      unit: p.unit ?? '',
    }));

const buildInitialPricingMode = (venue?: Venue): PricingMode => {
  if (buildInitialSeasonRules(venue).length > 0) return 'weekday_season';
  if (buildInitialWeekdayRules(venue).some((r) => r.enabled)) return 'weekday';
  return 'single';
};

export type TabKey = 'general' | 'location' | 'pricing' | 'amenities' | 'hours' | 'rules';

export const tabs: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'location', label: 'Ubicacion' },
  { key: 'amenities', label: 'Comodidades' },
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
  basePrice: 'pricing',
  amenities: 'amenities',
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
    rules: venue.rules ?? '',
    cancellationPolicy: venue.cancellationPolicy ?? '',
    basePrice,
    amenities: (venue.amenities ?? []).map((a) => ({
      amenityId: a.amenity.id,
      isIncluded: a.isIncluded,
      extraCost: a.extraCost ?? undefined,
    })),
    useTypes: (venue.uses ?? []).map((u) => u.useTypeId),
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
  rules: values.rules || undefined,
  cancellationPolicy: values.cancellationPolicy || undefined,
  // BASE + the weekday/season rules edited on this tab (priceRules), plus any rule type not
  // manageable from this UI yet (HOLIDAY, CUSTOM_DATE, EARLY_BIRD) preserved as-is so saving
  // this form doesn't wipe them out.
  prices: [
    { priceType: 'BASE', price: values.basePrice },
    ...priceRules,
    ...(existingVenue?.prices ?? [])
      .filter((price) => !['BASE', 'WEEKEND', 'SEASON_HIGH'].includes(price.priceType))
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
  amenities: values.amenities,
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

  const amenitiesQuery = useQuery({ queryKey: ['venue-catalog', 'amenities'], queryFn: getAmenitiesCatalog });
  const spaceTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'space-types'],
    queryFn: getSpaceTypesCatalog,
  });
  const useTypesQuery = useQuery({
    queryKey: ['venue-catalog', 'use-types'],
    queryFn: getUseTypesCatalog,
  });
  const seasonalEventsQuery = useQuery({
    queryKey: ['venue-catalog', 'seasonal-events'],
    queryFn: getSeasonalEventsCatalog,
    enabled: pricingMode === 'weekday_season',
  });

  const updateWeekdayRule = (dayOfWeek: number, patch: Partial<WeekdayRuleState>) => {
    setWeekdayRules((prev) =>
      prev.map((rule) => (rule.dayOfWeek === dayOfWeek ? { ...rule, ...patch } : rule)),
    );
  };

  const addSeasonRule = () => {
    setSeasonRules((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        name: '',
        startDate: '',
        endDate: '',
        price: '',
        unit: '',
      },
    ]);
  };

  const applySeasonSuggestion = (key: string, eventId: string) => {
    const event = seasonalEventsQuery.data?.find((e) => e.id === eventId);
    if (!event) return;
    setSeasonRules((prev) =>
      prev.map((rule) =>
        rule.key === key
          ? {
              ...rule,
              name: event.name,
              startDate: event.startDate.slice(0, 10),
              endDate: event.endDate.slice(0, 10),
            }
          : rule,
      ),
    );
  };

  const updateSeasonRule = (key: string, patch: Partial<SeasonRuleState>) => {
    setSeasonRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)));
  };

  const removeSeasonRule = (key: string) => {
    setSeasonRules((prev) => prev.filter((rule) => rule.key !== key));
  };

  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  // "00:00" as a closing time means "open until midnight" (end of day), not "closes at the
  // start of the day" — matches the same convention used by the booking form and backend.
  const endTimeToMinutes = (time: string) => (time === '00:00' ? 24 * 60 : timeToMinutes(time));

  /** Hours the local is open that weekday, from the Horarios tab's live values — null if
   * closed or not configured. Used to show a hora↔dia equivalence while pricing a day. */
  const hoursForWeekday = (dayOfWeek: number): number | null => {
    const entry = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!entry || entry.isClosed) return null;
    const hours = (endTimeToMinutes(entry.closesAt) - timeToMinutes(entry.opensAt)) / 60;
    return hours > 0 ? Math.round(hours * 10) / 10 : null;
  };

  /** Live "por hora <-> por dia" equivalence shown under a weekday rule's price, so the owner
   * can catch a mismatched day price before saving (the bug this was built to prevent: an
   * hourly rate that implies Bs 3.920 for a full day, next to an unrelated Bs 350 day rate). */
  const weekdayPricingHint = (rule: WeekdayRuleState): string | null => {
    const hours = hoursForWeekday(rule.dayOfWeek);
    if (hours == null) return 'Local cerrado este dia segun la pestaña Horarios.';

    const effectiveUnit = rule.unit || defaultPriceUnit;
    const price = rule.price !== '' ? Number(rule.price) : Number(defaultBasePrice) || 0;
    if (!price) return null;

    if (effectiveUnit === 'HOUR') {
      const fullDay = Math.round(price * hours * 100) / 100;
      return `Bs ${price}/hora × ${hours}h de atencion = Bs ${fullDay} si reservan el dia completo`;
    }
    if (effectiveUnit === 'DAY') {
      const impliedHourly = Math.round((price / hours) * 100) / 100;
      return `Bs ${price} por el dia completo ≈ Bs ${impliedHourly}/hora (local abierto ${hours}h)`;
    }
    return null;
  };

  const seasonPricingHint = (rule: SeasonRuleState): string | null => {
    const effectiveUnit = rule.unit || defaultPriceUnit;
    const price = rule.price !== '' ? Number(rule.price) : Number(defaultBasePrice) || 0;
    if (!price) return null;
    if (effectiveUnit === 'HOUR') return `Se cobrara Bs ${price} por cada hora dentro de esta temporada.`;
    if (effectiveUnit === 'DAY') return `Se cobrara Bs ${price} por dia completo, sin importar las horas.`;
    return `Se cobrara Bs ${price} una sola vez por todo el evento.`;
  };

  /** Returns an error message if invalid, or null. Runs before submit since these rules
   * live outside react-hook-form (they're a variable-length, mode-dependent structure). */
  const validatePriceRules = (): string | null => {
    if (pricingMode === 'single') return null;

    const enabledWeekdays = weekdayRules.filter((r) => r.enabled);
    for (const rule of enabledWeekdays) {
      if (!rule.price || Number(rule.price) < 0) {
        return `Falta el precio para ${dayLabels[rule.dayOfWeek]}`;
      }
    }

    if (pricingMode === 'weekday_season') {
      for (const rule of seasonRules) {
        if (!rule.name.trim()) return 'Cada temporada necesita un nombre';
        if (!rule.startDate || !rule.endDate) return `Faltan fechas para "${rule.name || 'temporada'}"`;
        if (rule.endDate < rule.startDate) {
          return `"${rule.name}": la fecha de fin debe ser igual o posterior a la de inicio`;
        }
        if (!rule.price || Number(rule.price) < 0) return `Falta el precio para "${rule.name}"`;
      }
    }

    return null;
  };

  const buildPriceRulesPayload = (): VenuePriceInput[] => {
    if (pricingMode === 'single') return [];

    const rules: VenuePriceInput[] = weekdayRules
      .filter((r) => r.enabled)
      .map((r) => ({
        priceType: 'WEEKEND',
        dayOfWeek: r.dayOfWeek,
        price: Number(r.price),
        unit: r.unit || undefined,
      }));

    if (pricingMode === 'weekday_season') {
      rules.push(
        ...seasonRules.map((r) => ({
          priceType: 'SEASON_HIGH' as const,
          startDate: r.startDate,
          endDate: r.endDate,
          price: Number(r.price),
          unit: r.unit || undefined,
          discountLabel: r.name,
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

  const amenities = form.watch('amenities');
  const useTypes = form.watch('useTypes');
  const openingHours = form.watch('openingHours');
  const spaceType = form.watch('spaceType');
  const departamento = form.watch('departamento');
  const defaultPriceUnit = form.watch('priceUnit');
  const defaultBasePrice = form.watch('basePrice');

  // "Horas minimas de alquiler" only means something for hourly bookings — show it only when
  // an HOUR unit is actually in play somewhere (the default, a weekday rule, or a season rule).
  const anyHourPricing =
    defaultPriceUnit === 'HOUR' ||
    (pricingMode !== 'single' &&
      weekdayRules.some((rule) => rule.enabled && (rule.unit || defaultPriceUnit) === 'HOUR')) ||
    (pricingMode === 'weekday_season' &&
      seasonRules.some((rule) => (rule.unit || defaultPriceUnit) === 'HOUR'));

  const toggleAmenity = (id: string) => {
    const exists = amenities.some((item) => item.amenityId === id);
    const next = exists
      ? amenities.filter((item) => item.amenityId !== id)
      : [...amenities, { amenityId: id, isIncluded: true, extraCost: undefined }];
    form.setValue('amenities', next, { shouldDirty: true });
  };

  const setAmenityIncluded = (id: string, isIncluded: boolean) => {
    form.setValue(
      'amenities',
      amenities.map((item) =>
        item.amenityId === id
          ? { ...item, isIncluded, extraCost: isIncluded ? undefined : item.extraCost }
          : item,
      ),
      { shouldDirty: true },
    );
  };

  const setAmenityExtraCost = (id: string, extraCost: number | undefined) => {
    form.setValue(
      'amenities',
      amenities.map((item) => (item.amenityId === id ? { ...item, extraCost } : item)),
      { shouldDirty: true },
    );
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

  return (
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
                  onChange={(event) => form.setValue('spaceType', event.target.value, { shouldDirty: true })}
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
                <Input id="address" placeholder="Av. Bolivia 1234" {...form.register('address')} />
                {errors.address ? <p className="sf-form-error">{errors.address.message}</p> : null}
              </div>

              <div className="sf-form-group">
                <Label htmlFor="district">Distrito o zona</Label>
                <Input id="district" placeholder="Villa Adela" {...form.register('district')} />
                {errors.district ? <p className="sf-form-error">{errors.district.message}</p> : null}
              </div>

              <div className="sf-form-group">
                <Label htmlFor="departamento">Departamento</Label>
                <Select
                  id="departamento"
                  value={departamento}
                  onChange={(event) =>
                    form.setValue('departamento', event.target.value as VenueFormValues['departamento'], {
                      shouldDirty: true,
                    })
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
                <Label htmlFor="contactPhone">Telefono de contacto de este local (opcional)</Label>
                <PhoneInput
                  id="contactPhone"
                  value={form.watch('contactPhone') ?? ''}
                  onChange={(value) =>
                    form.setValue('contactPhone', value, { shouldValidate: true, shouldDirty: true })
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

              <div className="space-y-4 border-t pt-5">
                <div>
                  <Label>Modo de precio</Label>
                  <p className="text-sm text-muted-foreground">
                    Elegi como se calculan los precios de este local antes de configurar el
                    monto — las opciones de abajo cambian segun lo que elijas aca.
                  </p>
                </div>
                <div className="space-y-3">
                  {(
                    [
                      {
                        value: 'single',
                        label: 'Un solo precio y unidad para todo el local',
                        description: 'Todos los dias se cobran igual, con el precio y la unidad de abajo.',
                      },
                      {
                        value: 'weekday',
                        label: 'Reglas por dia de la semana',
                        description:
                          'Elegi que dias se cobran por hora y cuales por dia completo (ej. entre semana por hora, fin de semana solo dia completo). Los dias sin regla propia usan el precio por defecto.',
                      },
                      {
                        value: 'weekday_season',
                        label: 'Reglas por dia de la semana + temporadas',
                        description:
                          'Ademas de lo anterior, defini precios especiales para fechas puntuales (fin de año, feriados) que reemplazan el precio normal solo en esas fechas.',
                      },
                    ] as { value: PricingMode; label: string; description: string }[]
                  ).map((option) => (
                    <label key={option.value} className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="pricingMode"
                        className="mt-0.5 h-4 w-4"
                        checked={pricingMode === option.value}
                        onChange={() => setPricingMode(option.value)}
                      />
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        <span className="block text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sf-form-group">
                    <Label htmlFor="basePrice">
                      {pricingMode === 'single' ? 'Precio base (Bs)' : 'Precio por defecto (Bs)'}
                    </Label>
                    <Input id="basePrice" type="number" min={1} {...form.register('basePrice')} />
                    {errors.basePrice ? <p className="sf-form-error">{errors.basePrice.message}</p> : null}
                  </div>
                  <div className="sf-form-group">
                    <Label htmlFor="priceUnit">
                      {pricingMode === 'single' ? 'Unidad de precio' : 'Unidad por defecto'}
                    </Label>
                    <Select id="priceUnit" {...form.register('priceUnit')}>
                      {Object.entries(priceUnitLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {pricingMode !== 'single' ? (
                  <p className="text-xs text-muted-foreground">
                    Se usa en los dias de la semana{pricingMode === 'weekday_season' ? ' y fechas de temporada' : ''} que
                    no tengan su propia regla mas abajo.
                  </p>
                ) : null}
              </div>

              {pricingMode !== 'single' ? (
                <div className="space-y-2 border-t pt-5">
                  <Label>Reglas por dia de la semana</Label>
                  <div className="space-y-2">
                    {weekdayRules.map((rule) => {
                      const hint = rule.enabled ? weekdayPricingHint(rule) : null;
                      return (
                        <div
                          key={rule.dayOfWeek}
                          className="rounded-[var(--radius)] border p-3"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex w-36 items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={rule.enabled}
                                onChange={(e) =>
                                  updateWeekdayRule(rule.dayOfWeek, { enabled: e.target.checked })
                                }
                              />
                              {dayLabels[rule.dayOfWeek]}
                            </label>
                            {rule.enabled ? (
                              <>
                                <Select
                                  className="w-40"
                                  value={rule.unit}
                                  onChange={(e) =>
                                    updateWeekdayRule(rule.dayOfWeek, {
                                      unit: e.target.value as PriceUnit | '',
                                    })
                                  }
                                >
                                  <option value="">Hereda unidad del local</option>
                                  {Object.entries(priceUnitLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </Select>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="Precio (Bs)"
                                  className="w-32"
                                  value={rule.price}
                                  onChange={(e) =>
                                    updateWeekdayRule(rule.dayOfWeek, { price: e.target.value })
                                  }
                                />
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Usa el precio por defecto
                              </span>
                            )}
                          </div>
                          {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {pricingMode === 'weekday_season' ? (
                <div className="space-y-3 border-t pt-5">
                  <div className="flex items-center justify-between">
                    <Label>Precios por temporada</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSeasonRule}>
                      Agregar temporada
                    </Button>
                  </div>

                  {seasonRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin temporadas configuradas todavia.
                    </p>
                  ) : null}

                  {seasonRules.map((rule) => (
                      <div key={rule.key} className="space-y-3 rounded-[var(--radius)] border p-3">
                        {seasonalEventsQuery.data && seasonalEventsQuery.data.length > 0 ? (
                          <Select
                            value=""
                            onChange={(e) =>
                              e.target.value && applySeasonSuggestion(rule.key, e.target.value)
                            }
                          >
                            <option value="">Usar una sugerencia...</option>
                            {seasonalEventsQuery.data.map((event) => (
                              <option key={event.id} value={event.id}>
                                {event.name}
                              </option>
                            ))}
                          </Select>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Nombre (ej. Fin de año)"
                            value={rule.name}
                            onChange={(e) => updateSeasonRule(rule.key, { name: e.target.value })}
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Precio (Bs)"
                            value={rule.price}
                            onChange={(e) => updateSeasonRule(rule.key, { price: e.target.value })}
                          />
                          <Input
                            type="date"
                            value={rule.startDate}
                            onChange={(e) =>
                              updateSeasonRule(rule.key, { startDate: e.target.value })
                            }
                          />
                          <Input
                            type="date"
                            value={rule.endDate}
                            onChange={(e) => updateSeasonRule(rule.key, { endDate: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Select
                            className="w-48"
                            value={rule.unit}
                            onChange={(e) =>
                              updateSeasonRule(rule.key, { unit: e.target.value as PriceUnit | '' })
                            }
                          >
                            <option value="">Hereda unidad del local</option>
                            {Object.entries(priceUnitLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeSeasonRule(rule.key)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      {seasonPricingHint(rule) ? (
                        <p className="text-xs text-muted-foreground">{seasonPricingHint(rule)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                className={
                  anyHourPricing ? 'grid gap-5 border-t pt-5 sm:grid-cols-2' : 'grid gap-5 border-t pt-5'
                }
              >
                {anyHourPricing ? (
                  <div className="sf-form-group">
                    <Label htmlFor="minimumHours">Horas minimas de alquiler</Label>
                    <Input
                      id="minimumHours"
                      type="number"
                      min={1}
                      max={24}
                      {...form.register('minimumHours')}
                    />
                  </div>
                ) : null}
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
                      {items?.map((amenity) => {
                        const entry = amenities.find((item) => item.amenityId === amenity.id);
                        return (
                          <div key={amenity.id} className="sf-surface space-y-2 rounded-[var(--radius)] p-2.5">
                            <label className="sf-filter-option cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(entry)}
                                onChange={() => toggleAmenity(amenity.id)}
                                className="h-4 w-4 rounded border-input accent-primary"
                              />
                              {amenity.name}
                            </label>
                            {entry ? (
                              <div className="flex flex-wrap items-center gap-2 pl-6">
                                <span className="w-12 text-xs text-muted-foreground">
                                  {entry.isIncluded ? 'Incluido' : 'Extra'}
                                </span>
                                <Switch
                                  checked={!entry.isIncluded}
                                  onCheckedChange={(checked) => setAmenityIncluded(amenity.id, !checked)}
                                  aria-label={`${amenity.name} con costo extra`}
                                />
                                {!entry.isIncluded ? (
                                  <div className="sf-surface flex h-8 items-center gap-1 rounded-[var(--radius)] pl-2 pr-1">
                                    <span className="text-xs text-muted-foreground">Bs</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-7 w-16 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                                      value={entry.extraCost ?? ''}
                                      onChange={(e) =>
                                        setAmenityExtraCost(
                                          amenity.id,
                                          e.target.value ? Number(e.target.value) : undefined,
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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

      <div className="flex justify-end">
        <SubmitButton isLoading={mutation.isPending}>
          {isEdit ? 'Guardar cambios' : 'Crear local'}
        </SubmitButton>
      </div>
    </form>
  );
};
