'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { priceUnitLabels } from '@/components/venues/venue-filter-labels';
import { getSeasonalEventsCatalog } from '@/lib/api/venues.api';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { dayLabels, type VenueFormValues } from '@/lib/validators/venue.schema';
import {
  WEEK_DISPLAY_ORDER,
  applyWeekdayEdit,
  buildPricingExample,
  describeRate,
  describeRulesDroppedByMode,
  hoursForWeekday,
  listHourlyRules,
  specificDateTypeLabels,
  weekdayPricingHint,
  type PricingMode,
  type SeasonRuleState,
  type SpecificDateRuleState,
  type SpecificDateType,
  type WeekdayRuleState,
} from '@/lib/venue-pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PriceUnit } from '@/types/api';

const SAME_AS_NORMAL = 'Como el precio normal';

const modeOptions: { value: PricingMode; label: string; description: string }[] = [
  { value: 'single', label: 'Precio unico', description: 'Igual todos los dias' },
  { value: 'weekday', label: 'Por dia de la semana', description: 'Ej.: sabado mas caro' },
  { value: 'weekday_season', label: 'Dias y temporadas', description: 'Ej.: fin de año' },
];

const UnitOptions = () => (
  <>
    {Object.entries(priceUnitLabels).map(([value, label]) => (
      <option key={value} value={value}>
        Por {label.toLowerCase()}
      </option>
    ))}
  </>
);

const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
    {action ? (
      <Button type="button" size="sm" variant="outline" onClick={action.onClick}>
        <Plus className="h-4 w-4" />
        {action.label}
      </Button>
    ) : null}
  </div>
);

const RuleRow = ({
  title,
  detail,
  onEdit,
  onDelete,
}: {
  title: string;
  detail: string;
  onEdit: () => void;
  onDelete?: () => void;
}) => (
  <div className="flex items-center justify-between gap-2 p-3">
    <div className="min-w-0">
      <p className="break-words text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="px-2.5"
        onClick={onEdit}
        aria-label={`Editar ${title}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {onDelete ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          aria-label={`Eliminar ${title}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : null}
    </div>
  </div>
);

interface WeekdayTableProps {
  rules: WeekdayRuleState[];
  defaults: { unit: PriceUnit; price: number };
  openingHours: VenueFormValues['openingHours'];
  onChange: (dayOfWeek: number, patch: Partial<Pick<WeekdayRuleState, 'price' | 'unit'>>) => void;
}

const WeekdayTable = ({ rules, defaults, openingHours, onChange }: WeekdayTableProps) => (
  <div className="divide-y rounded-[var(--radius)] border">
    {WEEK_DISPLAY_ORDER.map((day) => {
      const rule = rules[day];
      const hint = rule.enabled
        ? weekdayPricingHint(rule, defaults, hoursForWeekday(openingHours, day))
        : null;
      return (
        <div key={day} className="p-2.5">
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="text-sm font-medium">{dayLabels[day]}</span>
            <Input
              type="number"
              min={0}
              aria-label={`Precio del ${dayLabels[day]}`}
              placeholder={defaults.price ? String(defaults.price) : 'Precio'}
              value={rule.price}
              onChange={(event) => onChange(day, { price: event.target.value })}
            />
            <Select
              aria-label={`Como se cobra el ${dayLabels[day]}`}
              value={rule.unit}
              onChange={(event) => onChange(day, { unit: event.target.value as PriceUnit | '' })}
            >
              <option value="">Normal</option>
              <UnitOptions />
            </Select>
          </div>
          {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      );
    })}
  </div>
);

interface SeasonDraft extends Omit<SeasonRuleState, 'key'> {
  key: string | null;
}

const emptySeasonDraft: SeasonDraft = {
  key: null,
  name: '',
  startDate: '',
  endDate: '',
  price: '',
  unit: '',
};

interface DateDraft extends Omit<SpecificDateRuleState, 'key'> {
  key: string | null;
}

const emptyDateDraft: DateDraft = {
  key: null,
  priceType: 'HOLIDAY',
  name: '',
  date: '',
  price: '',
  unit: '',
};

interface VenuePricingSectionProps {
  form: UseFormReturn<VenueFormValues>;
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;
  weekdayRules: WeekdayRuleState[];
  setWeekdayRules: Dispatch<SetStateAction<WeekdayRuleState[]>>;
  seasonRules: SeasonRuleState[];
  setSeasonRules: Dispatch<SetStateAction<SeasonRuleState[]>>;
  specificDateRules: SpecificDateRuleState[];
  setSpecificDateRules: Dispatch<SetStateAction<SpecificDateRuleState[]>>;
}

export const VenuePricingSection = ({
  form,
  pricingMode,
  onPricingModeChange,
  weekdayRules,
  setWeekdayRules,
  seasonRules,
  setSeasonRules,
  specificDateRules,
  setSpecificDateRules,
}: VenuePricingSectionProps) => {
  const [weekdayDialogOpen, setWeekdayDialogOpen] = useState(false);
  const [seasonDraft, setSeasonDraft] = useState<SeasonDraft | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState<DateDraft | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const errors = form.formState.errors;
  const basePrice = Number(form.watch('basePrice')) || 0;
  const priceUnit = form.watch('priceUnit') as PriceUnit;
  const minimumHours = Number(form.watch('minimumHours')) || 0;
  const paymentPolicy = form.watch('paymentPolicy');
  const openingHours = form.watch('openingHours');
  const defaults = { unit: priceUnit, price: basePrice };

  const seasonalEventsQuery = useQuery({
    queryKey: ['venue-catalog', 'seasonal-events'],
    queryFn: getSeasonalEventsCatalog,
    enabled: seasonDraft !== null,
  });

  const updateWeekday = (
    dayOfWeek: number,
    patch: Partial<Pick<WeekdayRuleState, 'price' | 'unit'>>,
  ) => {
    setWeekdayRules((prev) =>
      prev.map((rule) => (rule.dayOfWeek === dayOfWeek ? applyWeekdayEdit(rule, patch) : rule)),
    );
  };

  const saveSeason = () => {
    if (!seasonDraft) return;
    if (!seasonDraft.startDate || !seasonDraft.endDate) {
      setSeasonError('Elige las fechas de inicio y fin.');
      return;
    }
    if (seasonDraft.endDate < seasonDraft.startDate) {
      setSeasonError('La fecha de fin debe ser igual o posterior a la de inicio.');
      return;
    }
    if (!seasonDraft.price || Number(seasonDraft.price) < 0) {
      setSeasonError('Ingresa un precio.');
      return;
    }
    const { key, ...values } = seasonDraft;
    setSeasonRules((prev) =>
      key
        ? prev.map((rule) => (rule.key === key ? { key, ...values } : rule))
        : [...prev, { key: `new-${Date.now()}`, ...values }],
    );
    setSeasonDraft(null);
  };

  const saveDate = () => {
    if (!dateDraft) return;
    if (!dateDraft.date) {
      setDateError('Elige una fecha.');
      return;
    }
    if (!dateDraft.price || Number(dateDraft.price) < 0) {
      setDateError('Ingresa un precio.');
      return;
    }
    const { key, ...values } = dateDraft;
    setSpecificDateRules((prev) =>
      key
        ? prev.map((rule) => (rule.key === key ? { key, ...values } : rule))
        : [...prev, { key: `new-${Date.now()}`, ...values }],
    );
    setDateDraft(null);
  };

  const openSeason = (draft: SeasonDraft) => {
    setSeasonError(null);
    setSeasonDraft(draft);
  };

  const openDate = (draft: DateDraft) => {
    setDateError(null);
    setDateDraft(draft);
  };

  const rateOf = (price: string, unit: PriceUnit | '') =>
    describeRate(Number(price), unit || priceUnit);

  const weekdaySummary = [
    basePrice ? `Normal ${describeRate(basePrice, priceUnit)}` : '',
    ...WEEK_DISPLAY_ORDER.map((day) => weekdayRules[day])
      .filter((rule) => rule.enabled && rule.price)
      .map((rule) => `${dayLabels[rule.dayOfWeek]} ${rateOf(rule.price, rule.unit)}`),
  ]
    .filter(Boolean)
    .join(' · ');

  const hourlyRules = listHourlyRules({
    mode: pricingMode,
    weekdayRules,
    seasonRules,
    specificDateRules,
    dayLabels,
  });
  const showMinimumHours = priceUnit === 'HOUR' || hourlyRules.length > 0;

  const droppedRules = describeRulesDroppedByMode(pricingMode, weekdayRules, seasonRules);
  const example = buildPricingExample({
    mode: pricingMode,
    basePrice,
    unit: priceUnit,
    minimumHours,
    weekdayRules,
    dayLabels,
  });

  return (
    <>
      <Card>
        <CardContent className="space-y-5 p-3 sm:p-5">
          <SectionHeader
            title="Como cobras el local"
            description="Empieza simple. Puedes cambiarlo cuando quieras."
          />

          <div role="radiogroup" aria-label="Modo de precio" className="grid gap-2 sm:grid-cols-3">
            {modeOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'cursor-pointer rounded-[var(--radius)] border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
                  pricingMode === option.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="pricingMode"
                  className="sr-only"
                  checked={pricingMode === option.value}
                  onChange={() => onPricingModeChange(option.value)}
                />
                <span className="block font-medium">{option.label}</span>
                <span
                  className={cn(
                    'block text-xs',
                    pricingMode === option.value
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  {option.description}
                </span>
              </label>
            ))}
          </div>

          {droppedRules ? (
            <p className="border-warning bg-warning/10 border-l-2 p-3 text-sm">
              {droppedRules} Si vuelves al modo anterior antes de guardar, se conservan.
            </p>
          ) : null}

          <div className={cn('grid gap-4', showMinimumHours ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <div className="sf-form-group">
              <Label htmlFor="basePrice">
                {pricingMode === 'single' ? 'Precio (Bs)' : 'Precio normal (Bs)'}
              </Label>
              <Input id="basePrice" type="number" min={1} {...form.register('basePrice')} />
              {errors.basePrice ? (
                <p className="sf-form-error">{errors.basePrice.message}</p>
              ) : null}
            </div>
            <div className="sf-form-group">
              <Label htmlFor="priceUnit">Se cobra</Label>
              <Select id="priceUnit" {...form.register('priceUnit')}>
                <UnitOptions />
              </Select>
            </div>
            {showMinimumHours ? (
              <div className="sf-form-group">
                <Label htmlFor="minimumHours">Minimo de horas</Label>
                <Input
                  id="minimumHours"
                  type="number"
                  min={1}
                  max={24}
                  {...form.register('minimumHours')}
                />
                {priceUnit !== 'HOUR' ? (
                  <p className="text-xs text-muted-foreground">
                    Solo para lo que se cobra por hora: {hourlyRules.join(', ')}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {pricingMode === 'weekday' ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Cambia solo los dias que cuestan distinto. Los demas usan el precio normal.
              </p>
              <WeekdayTable
                rules={weekdayRules}
                defaults={defaults}
                openingHours={openingHours}
                onChange={updateWeekday}
              />
            </div>
          ) : null}

          {pricingMode === 'weekday_season' ? (
            <div className="rounded-[var(--radius)] border">
              <RuleRow
                title="Precio por dia"
                detail={weekdaySummary || 'Todos los dias usan el precio normal'}
                onEdit={() => setWeekdayDialogOpen(true)}
              />
            </div>
          ) : null}

          {example ? (
            <p className="rounded-[var(--radius)] bg-muted p-3 text-xs text-muted-foreground">
              {example}
            </p>
          ) : null}

          {pricingMode === 'weekday_season' ? (
            <div className="space-y-3 border-t pt-5">
              <SectionHeader
                title="Temporadas"
                description="Reemplazan el precio por dia dentro de esas fechas."
                action={{
                  label: 'Agregar temporada',
                  onClick: () => openSeason(emptySeasonDraft),
                }}
              />
              {seasonRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin temporadas todavia.</p>
              ) : (
                <div className="divide-y rounded-[var(--radius)] border">
                  {seasonRules.map((rule) => (
                    <RuleRow
                      key={rule.key}
                      title={rule.name || 'Temporada'}
                      detail={`${formatDate(rule.startDate)} – ${formatDate(rule.endDate)} · ${rateOf(rule.price, rule.unit)}`}
                      onEdit={() => openSeason(rule)}
                      onDelete={() =>
                        setSeasonRules((prev) => prev.filter((item) => item.key !== rule.key))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-5">
            <SectionHeader
              title="Fechas especiales (opcional)"
              description="Un solo dia con otro precio, como un feriado. Tienen prioridad sobre cualquier otro precio."
              action={{ label: 'Agregar fecha', onClick: () => openDate(emptyDateDraft) }}
            />
            {specificDateRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin fechas especiales todavia.</p>
            ) : (
              <div className="divide-y rounded-[var(--radius)] border">
                {specificDateRules.map((rule) => (
                  <RuleRow
                    key={rule.key}
                    title={rule.name || specificDateTypeLabels[rule.priceType]}
                    detail={`${specificDateTypeLabels[rule.priceType]} · ${formatDate(rule.date)} · ${rateOf(rule.price, rule.unit)}`}
                    onEdit={() => openDate(rule)}
                    onDelete={() =>
                      setSpecificDateRules((prev) => prev.filter((item) => item.key !== rule.key))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {pricingMode === 'weekday_season' ? (
            <p className="text-xs text-muted-foreground">
              Se aplica primero la fecha especial, despues la temporada, luego el dia y al final el
              precio normal.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-3 sm:p-5">
          <h3 className="text-base font-semibold">Capacidad</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sf-form-group">
              <Label htmlFor="capacityMin">Minimo de invitados</Label>
              <Input id="capacityMin" type="number" min={0} {...form.register('capacityMin')} />
            </div>
            <div className="sf-form-group">
              <Label htmlFor="capacityMax">Maximo de invitados</Label>
              <Input id="capacityMax" type="number" min={1} {...form.register('capacityMax')} />
              {errors.capacityMax ? (
                <p className="sf-form-error">{errors.capacityMax.message}</p>
              ) : null}
            </div>
            <div className="sf-form-group">
              <Label htmlFor="squareMeters">Metros cuadrados (opcional)</Label>
              <Input id="squareMeters" type="number" min={1} {...form.register('squareMeters')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-3 sm:p-5">
          <h3 className="text-base font-semibold">Reservas y pago</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register('allowsMultipleDays')} />
              Permitir reservas de varios dias
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                {...form.register('instantBooking')}
              />
              <span>
                <span className="block">Confirmar reservas al instante</span>
                <span className="block text-xs text-muted-foreground">
                  Sin esto, cada solicitud te llega para aprobarla antes de que el cliente pague.
                  Las que incluyen items del catalogo siempre pasan por tu aprobacion.
                </span>
              </span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sf-form-group">
              <Label htmlFor="paymentPolicy">Como te pagan</Label>
              <Select id="paymentPolicy" {...form.register('paymentPolicy')}>
                <option value="DEPOSIT_THEN_REMAINING">Anticipo y saldo antes del evento</option>
                <option value="FULL_UPFRONT">Pago completo al reservar</option>
              </Select>
            </div>
            {paymentPolicy === 'DEPOSIT_THEN_REMAINING' ? (
              <div className="sf-form-group">
                <Label htmlFor="depositPercentage">Porcentaje de anticipo</Label>
                <Input
                  id="depositPercentage"
                  type="number"
                  min={10}
                  max={90}
                  {...form.register('depositPercentage')}
                />
                {errors.depositPercentage ? (
                  <p className="sf-form-error">{errors.depositPercentage.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={weekdayDialogOpen} onOpenChange={setWeekdayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Precio por dia</DialogTitle>
            <DialogDescription>
              Cambia solo los dias que cuestan distinto. Los demas usan el precio normal.
            </DialogDescription>
          </DialogHeader>
          <WeekdayTable
            rules={weekdayRules}
            defaults={defaults}
            openingHours={openingHours}
            onChange={updateWeekday}
          />
          <DialogFooter>
            <Button type="button" onClick={() => setWeekdayDialogOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={seasonDraft !== null}
        onOpenChange={(open) => {
          if (!open) setSeasonDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{seasonDraft?.key ? 'Editar temporada' : 'Agregar temporada'}</DialogTitle>
            <DialogDescription>
              Dentro de estas fechas, este precio reemplaza al precio por dia.
            </DialogDescription>
          </DialogHeader>
          {seasonDraft ? (
            <div className="space-y-4">
              {seasonalEventsQuery.data?.length ? (
                <div className="sf-form-group">
                  <Label htmlFor="seasonSuggestion">Usar una sugerencia (opcional)</Label>
                  <Select
                    id="seasonSuggestion"
                    value=""
                    onChange={(event) => {
                      const suggestion = seasonalEventsQuery.data?.find(
                        (item) => item.id === event.target.value,
                      );
                      if (!suggestion) return;
                      setSeasonDraft({
                        ...seasonDraft,
                        name: suggestion.name,
                        startDate: suggestion.startDate.slice(0, 10),
                        endDate: suggestion.endDate.slice(0, 10),
                      });
                    }}
                  >
                    <option value="">Elegir...</option>
                    {seasonalEventsQuery.data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="sf-form-group">
                <Label htmlFor="seasonName">Nombre (opcional)</Label>
                <Input
                  id="seasonName"
                  placeholder="Fin de año"
                  value={seasonDraft.name}
                  onChange={(event) => setSeasonDraft({ ...seasonDraft, name: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sf-form-group">
                  <Label htmlFor="seasonStart">Inicio</Label>
                  <Input
                    id="seasonStart"
                    type="date"
                    value={seasonDraft.startDate}
                    onChange={(event) =>
                      setSeasonDraft({ ...seasonDraft, startDate: event.target.value })
                    }
                  />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="seasonEnd">Fin</Label>
                  <Input
                    id="seasonEnd"
                    type="date"
                    value={seasonDraft.endDate}
                    onChange={(event) =>
                      setSeasonDraft({ ...seasonDraft, endDate: event.target.value })
                    }
                  />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="seasonPrice">Precio (Bs)</Label>
                  <Input
                    id="seasonPrice"
                    type="number"
                    min={0}
                    value={seasonDraft.price}
                    onChange={(event) =>
                      setSeasonDraft({ ...seasonDraft, price: event.target.value })
                    }
                  />
                </div>
                <div className="sf-form-group">
                  <Label htmlFor="seasonUnit">Se cobra</Label>
                  <Select
                    id="seasonUnit"
                    value={seasonDraft.unit}
                    onChange={(event) =>
                      setSeasonDraft({
                        ...seasonDraft,
                        unit: event.target.value as PriceUnit | '',
                      })
                    }
                  >
                    <option value="">{SAME_AS_NORMAL}</option>
                    <UnitOptions />
                  </Select>
                </div>
              </div>
              {seasonError ? <p className="sf-form-error">{seasonError}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSeasonDraft(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveSeason}>
              {seasonDraft?.key ? 'Guardar temporada' : 'Agregar temporada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dateDraft !== null}
        onOpenChange={(open) => {
          if (!open) setDateDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dateDraft?.key ? 'Editar fecha especial' : 'Agregar fecha especial'}
            </DialogTitle>
            <DialogDescription>
              Esta fecha tiene prioridad sobre cualquier otro precio.
            </DialogDescription>
          </DialogHeader>
          {dateDraft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sf-form-group">
                <Label htmlFor="specificDateType">Tipo</Label>
                <Select
                  id="specificDateType"
                  value={dateDraft.priceType}
                  onChange={(event) =>
                    setDateDraft({
                      ...dateDraft,
                      priceType: event.target.value as SpecificDateType,
                    })
                  }
                >
                  <option value="HOLIDAY">Feriado</option>
                  <option value="CUSTOM_DATE">Fecha puntual</option>
                </Select>
              </div>
              <div className="sf-form-group">
                <Label htmlFor="specificDateDate">Fecha</Label>
                <Input
                  id="specificDateDate"
                  type="date"
                  value={dateDraft.date}
                  onChange={(event) => setDateDraft({ ...dateDraft, date: event.target.value })}
                />
              </div>
              <div className="sf-form-group sm:col-span-2">
                <Label htmlFor="specificDateName">Nombre (opcional)</Label>
                <Input
                  id="specificDateName"
                  placeholder="Año Nuevo"
                  value={dateDraft.name}
                  onChange={(event) => setDateDraft({ ...dateDraft, name: event.target.value })}
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="specificDatePrice">Precio (Bs)</Label>
                <Input
                  id="specificDatePrice"
                  type="number"
                  min={0}
                  value={dateDraft.price}
                  onChange={(event) => setDateDraft({ ...dateDraft, price: event.target.value })}
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="specificDateUnit">Se cobra</Label>
                <Select
                  id="specificDateUnit"
                  value={dateDraft.unit}
                  onChange={(event) =>
                    setDateDraft({ ...dateDraft, unit: event.target.value as PriceUnit | '' })
                  }
                >
                  <option value="">{SAME_AS_NORMAL}</option>
                  <UnitOptions />
                </Select>
              </div>
              {dateError ? <p className="sf-form-error sm:col-span-2">{dateError}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDateDraft(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveDate}>
              {dateDraft?.key ? 'Guardar fecha' : 'Agregar fecha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
