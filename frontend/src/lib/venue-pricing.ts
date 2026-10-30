import { formatCurrency } from '@/lib/formatters';
import type { PriceUnit, Venue } from '@/types/api';

export type PricingMode = 'single' | 'weekday' | 'weekday_season';

export interface WeekdayRuleState {
  dayOfWeek: number;
  enabled: boolean;
  unit: PriceUnit | '';
  price: string;
}

export interface SeasonRuleState {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
  price: string;
  unit: PriceUnit | '';
}

export type SpecificDateType = 'HOLIDAY' | 'CUSTOM_DATE';

export const specificDateTypeLabels: Record<SpecificDateType, string> = {
  HOLIDAY: 'Feriado',
  CUSTOM_DATE: 'Fecha puntual',
};

export interface SpecificDateRuleState {
  key: string;
  priceType: SpecificDateType;
  name: string;
  date: string;
  price: string;
  unit: PriceUnit | '';
}

/** Monday first, how an owner thinks of their week. `dayOfWeek` itself keeps 0 as Sunday. */
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const EXAMPLE_EVENT_HOURS = 6;

export const buildInitialWeekdayRules = (venue?: Venue): WeekdayRuleState[] => {
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

export const buildInitialSeasonRules = (venue?: Venue): SeasonRuleState[] =>
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

export const buildInitialSpecificDateRules = (venue?: Venue): SpecificDateRuleState[] =>
  (venue?.prices ?? [])
    .filter((p) => (p.priceType === 'HOLIDAY' || p.priceType === 'CUSTOM_DATE') && p.specificDate)
    .map((p) => ({
      key: p.id,
      priceType: p.priceType as SpecificDateType,
      name: p.discountLabel ?? '',
      date: p.specificDate!.slice(0, 10),
      price: String(p.price),
      unit: p.unit ?? '',
    }));

export const buildInitialPricingMode = (venue?: Venue): PricingMode => {
  if (buildInitialSeasonRules(venue).length > 0) return 'weekday_season';
  if (buildInitialWeekdayRules(venue).some((r) => r.enabled)) return 'weekday';
  return 'single';
};

/** A day has its own rule as soon as the owner sets anything on it, and goes back to the normal
 * price when both fields are empty again. */
export const applyWeekdayEdit = (
  rule: WeekdayRuleState,
  patch: Partial<Pick<WeekdayRuleState, 'price' | 'unit'>>,
): WeekdayRuleState => {
  const next = { ...rule, ...patch };
  return { ...next, enabled: next.price.trim() !== '' || next.unit !== '' };
};

export const describeRate = (price: number, unit: PriceUnit): string =>
  `${formatCurrency(price)} / ${unit === 'HOUR' ? 'hora' : 'dia completo'}`;

/** What saving in this mode would stop using. Nothing is lost until then: going back to the
 * previous mode keeps the rules as they were. */
export const describeRulesDroppedByMode = (
  mode: PricingMode,
  weekdayRules: WeekdayRuleState[],
  seasonRules: SeasonRuleState[],
): string | null => {
  const weekdays = mode === 'single' ? weekdayRules.filter((rule) => rule.enabled).length : 0;
  const seasons = mode === 'weekday_season' ? 0 : seasonRules.length;
  const parts = [
    seasons ? `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}` : '',
    weekdays ? `${weekdays} ${weekdays === 1 ? 'precio por dia' : 'precios por dia'}` : '',
  ].filter(Boolean);
  return parts.length ? `Al guardar se quitaran ${parts.join(' y ')}.` : null;
};

/** The rules charged by the hour even though the venue's normal unit isn't, which are the only
 * reason a minimum of hours still matters on a venue that charges by the day. Only explicit units
 * count: a rule without one follows the normal unit. */
export const listHourlyRules = (params: {
  mode: PricingMode;
  weekdayRules: WeekdayRuleState[];
  seasonRules: SeasonRuleState[];
  specificDateRules: SpecificDateRuleState[];
  dayLabels: string[];
}): string[] => {
  const { mode, weekdayRules, seasonRules, specificDateRules, dayLabels } = params;
  return [
    ...(mode === 'single'
      ? []
      : WEEK_DISPLAY_ORDER.map((day) => weekdayRules[day])
          .filter((rule) => rule.enabled && rule.unit === 'HOUR')
          .map((rule) => dayLabels[rule.dayOfWeek])),
    ...(mode === 'weekday_season'
      ? seasonRules.filter((rule) => rule.unit === 'HOUR').map((rule) => rule.name || 'Temporada')
      : []),
    ...specificDateRules
      .filter((rule) => rule.unit === 'HOUR')
      .map((rule) => rule.name || specificDateTypeLabels[rule.priceType]),
  ];
};

const describeExampleCost = (price: number, unit: PriceUnit, hours: number): string =>
  unit === 'HOUR'
    ? `${hours} horas cuestan ${formatCurrency(Math.round(price * hours * 100) / 100)}`
    : `el dia completo cuesta ${formatCurrency(price)}`;

/** A real amount, so a wrong price or unit is noticed before publishing rather than by a client. */
export const buildPricingExample = (params: {
  mode: PricingMode;
  basePrice: number;
  unit: PriceUnit;
  minimumHours: number;
  weekdayRules: WeekdayRuleState[];
  dayLabels: string[];
}): string | null => {
  const { mode, basePrice, unit, minimumHours, weekdayRules, dayLabels } = params;
  if (!basePrice) return null;

  const hours = Math.max(EXAMPLE_EVENT_HOURS, minimumHours || 0);
  const normal = describeExampleCost(basePrice, unit, hours);

  const specialDay =
    mode === 'single'
      ? undefined
      : WEEK_DISPLAY_ORDER.map((day) => weekdayRules[day])
          .filter((rule) => rule.enabled && Number(rule.price) > 0)
          .at(-1);
  if (!specialDay) return `Ejemplo: ${normal}.`;

  const dayCost = describeExampleCost(Number(specialDay.price), specialDay.unit || unit, hours);
  return `Ejemplo: el ${dayLabels[specialDay.dayOfWeek].toLowerCase()}, ${dayCost}. Otros dias, ${normal}.`;
};

const timeToMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

// "00:00" as a closing time means "open until midnight" (end of day), not "closes at the start of
// the day" — matches the same convention used by the booking form and backend.
const endTimeToMinutes = (time: string) => (time === '00:00' ? 24 * 60 : timeToMinutes(time));

/** Hours the venue is open that weekday — null if closed or not configured. */
export const hoursForWeekday = (
  openingHours: { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean }[],
  dayOfWeek: number,
): number | null => {
  const entry = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!entry || entry.isClosed) return null;
  const hours = (endTimeToMinutes(entry.closesAt) - timeToMinutes(entry.opensAt)) / 60;
  return hours > 0 ? Math.round(hours * 10) / 10 : null;
};

/** Live "por hora <-> por dia" equivalence under a day's price, so the owner can catch a mismatched
 * price before saving (the bug this was built to prevent: an hourly rate that implies Bs 3.920 for
 * a full day, next to an unrelated Bs 350 day rate). */
export const weekdayPricingHint = (
  rule: WeekdayRuleState,
  defaults: { unit: PriceUnit; price: number },
  hours: number | null,
): string | null => {
  if (hours == null) return 'Local cerrado este dia segun la pestaña Horarios.';

  const effectiveUnit = rule.unit || defaults.unit;
  const price = rule.price !== '' ? Number(rule.price) : defaults.price || 0;
  if (!price) return null;

  if (effectiveUnit === 'HOUR') {
    const fullDay = Math.round(price * hours * 100) / 100;
    return `${formatCurrency(price)}/hora × ${hours}h de atencion = ${formatCurrency(fullDay)} si reservan el dia completo`;
  }
  const impliedHourly = Math.round((price / hours) * 100) / 100;
  return `${formatCurrency(price)} por el dia completo ≈ ${formatCurrency(impliedHourly)}/hora (local abierto ${hours}h)`;
};
