'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createBooking, previewBookingPrice } from '@/lib/api/bookings.api';
import { formatCurrency, formatDate, formatDateInput, formatTime12h } from '@/lib/formatters';
import {
  bookingSchema,
  endTimeToMinutes,
  timeToMinutes,
  type BookingFormValues,
} from '@/lib/validators/booking.schema';
import { useAuthStore } from '@/stores/auth.store';
import type { DailyScheduleEntry, Venue } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { LoginToBookModal } from './login-to-book-modal';

interface BookingFormProps {
  venue: Venue;
  selectedRange?: { start: string; end: string };
  onDatesChange?: (start: string, end: string) => void;
  /** Reports the live total (once a price preview resolves) up to the parent — null while
   * no preview exists yet, so the caller knows to fall back to its own static base price. */
  onPriceChange?: (total: number | null) => void;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const FALLBACK_SCHEDULE = { startTime: '18:00', endTime: '23:00' };

const unitLabels: Record<'EVENT' | 'HOUR' | 'DAY', string> = {
  EVENT: 'por evento',
  HOUR: 'por hora',
  DAY: 'por dia',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** A sensible startTime/endTime to preload the form with — the venue's own opening hours for
 * that weekday, rather than an arbitrary fixed range that may fall outside them (a HOUR-unit
 * venue would otherwise show a "horario invalido" error before the client has touched anything).
 * "00:00" as a closing time means "open until midnight" (see booking.service.ts); a real time
 * input can't represent 24:00, so it's mapped to 23:59 for the default. */
const computeDefaultSchedule = (venue: Venue, dateStr: string): { startTime: string; endTime: string } => {
  const hours = venue.openingHours;
  if (!hours?.length) return FALLBACK_SCHEDULE;

  const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const entry = hours.find((h) => h.dayOfWeek === dayOfWeek && !h.isClosed) ?? hours.find((h) => !h.isClosed);
  if (!entry) return FALLBACK_SCHEDULE;

  const startTime = entry.opensAt;
  const endTime = entry.closesAt === '00:00' ? '23:59' : entry.closesAt;
  return timeToMinutes(startTime) < endTimeToMinutes(endTime) ? { startTime, endTime } : FALLBACK_SCHEDULE;
};

export const BookingForm = ({ venue, selectedRange, onDatesChange, onPriceChange }: BookingFormProps) => {
  const { isAuthenticated, role } = useAuthStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const defaultDate = formatDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const defaultSchedule = computeDefaultSchedule(venue, defaultDate);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      eventType: '',
      eventDate: defaultDate,
      endDate: defaultDate,
      startTime: defaultSchedule.startTime,
      endTime: defaultSchedule.endTime,
      guestCount: Math.min(venue.capacityMax, 100),
      specialRequests: '',
      selectedAmenityIds: [],
    },
  });

  useEffect(() => {
    if (!selectedRange) return;
    form.setValue('eventDate', selectedRange.start, { shouldValidate: true, shouldDirty: true });
    form.setValue('endDate', selectedRange.end, { shouldValidate: true, shouldDirty: true });
  }, [selectedRange, form]);

  const mutation = useMutation({
    mutationFn: (values: BookingFormValues & { dailySchedule?: DailyScheduleEntry[] }) =>
      createBooking(venue.id, values),
    onSuccess: (response) => {
      toast.success('Reserva solicitada', {
        description: `Sena requerida: ${formatCurrency(response.booking.depositAmount)}`,
      });
      form.reset();
      setConfirmOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo solicitar la reserva', {
        description: error.message ?? 'Intenta nuevamente.',
      });
    },
  });

  const values = form.watch();
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

  const canPreview =
    Boolean(values.eventDate) &&
    Boolean(values.endDate) &&
    values.endDate >= values.eventDate &&
    TIME_PATTERN.test(values.startTime ?? '') &&
    TIME_PATTERN.test(values.endTime ?? '') &&
    timeToMinutes(values.startTime) < endTimeToMinutes(values.endTime);

  const isMultiDay = values.eventDate && values.endDate && values.eventDate !== values.endDate;

  // Per-day time overrides, only used for days whose effective unit resolves to HOUR in a
  // mixed range (some days billed per-hour, others per-day) — see docs/fase-1 §6.2. Keyed by
  // date; seeded (and re-seeded) from the preview's resolved HOUR days once known below.
  const [dailySchedule, setDailySchedule] = useState<Record<string, { startTime: string; endTime: string }>>(
    {},
  );

  const dailyScheduleEntries = useMemo<DailyScheduleEntry[] | undefined>(() => {
    const entries = Object.entries(dailySchedule).map(([date, t]) => ({ date, ...t }));
    return entries.length > 0 ? entries : undefined;
  }, [dailySchedule]);

  const previewQuery = useQuery({
    queryKey: [
      'booking-price-preview',
      venue.id,
      values.eventDate,
      values.endDate,
      values.startTime,
      values.endTime,
      dailyScheduleEntries,
      values.selectedAmenityIds,
    ],
    queryFn: () =>
      previewBookingPrice(venue.id, {
        eventDate: values.eventDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        dailySchedule: dailyScheduleEntries,
        selectedAmenityIds: values.selectedAmenityIds,
      }),
    enabled: canPreview,
    // Ticking an extra or nudging a date changes the query key, which would otherwise blank
    // the price card back to its "no preview yet" state for a beat while the new total loads —
    // keep showing the last result in the meantime so the number updates smoothly in place.
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    onPriceChange?.(previewQuery.data?.totalPrice ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewQuery.data]);

  const extraAmenities = useMemo(
    () => (venue.amenities ?? []).filter((item) => !item.isIncluded && item.extraCost),
    [venue.amenities],
  );

  const selectedAmenityIds = form.watch('selectedAmenityIds');

  const toggleAmenity = (id: string) => {
    const next = selectedAmenityIds.includes(id)
      ? selectedAmenityIds.filter((item) => item !== id)
      : [...selectedAmenityIds, id];
    form.setValue('selectedAmenityIds', next, { shouldDirty: true, shouldValidate: true });
  };

  const openingHourByWeekday = useMemo(
    () => new Map((venue.openingHours ?? []).map((h) => [h.dayOfWeek, h])),
    [venue.openingHours],
  );

  const previewDays = previewQuery.data?.days ?? [];
  const previewUnits = new Set(previewDays.map((d) => d.unit));
  const isMixedUnits = Boolean(isMultiDay) && previewUnits.size > 1;

  // How the total was actually charged — a single unit ("Por hora"), or a mix across days
  // ("Combinado: por hora y por dia") when the venue configures different units per weekday.
  const pricingModeLabel =
    previewUnits.size === 1
      ? capitalize(unitLabels[[...previewUnits][0]])
      : previewUnits.size > 1
        ? `Combinado: ${[...previewUnits].map((u) => unitLabels[u]).join(' y ')}`
        : null;

  /** Hours actually billed for a given day in the range — from its per-day override if the
   * client customized it, otherwise the global startTime/endTime used for every HOUR day. */
  const hoursForDate = (date: string): number => {
    const schedule = dailySchedule[date] ?? { startTime: values.startTime, endTime: values.endTime };
    return Math.round(((endTimeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) / 60) * 10) / 10;
  };

  const singleDayHours = !isMultiDay && previewDays[0]?.unit === 'HOUR' ? hoursForDate(previewDays[0].date) : null;

  // Once we know which days resolved to HOUR in a mixed range, seed a per-day override for
  // each (defaulting to the global start/end time) so the user can adjust them individually.
  // Re-syncs whenever the resolved HOUR-day set actually changes; a no-op JSON compare avoids
  // refetch loops (this effect's own state feeds back into the query key above).
  useEffect(() => {
    if (!isMixedUnits) {
      if (Object.keys(dailySchedule).length > 0) setDailySchedule({});
      return;
    }
    const hourDates = previewDays.filter((d) => d.unit === 'HOUR').map((d) => d.date);
    const next: Record<string, { startTime: string; endTime: string }> = {};
    for (const date of hourDates) {
      next[date] = dailySchedule[date] ?? { startTime: values.startTime, endTime: values.endTime };
    }
    if (JSON.stringify(next) !== JSON.stringify(dailySchedule)) {
      setDailySchedule(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMixedUnits, previewQuery.data]);

  const updateDailySchedule = (date: string, patch: Partial<{ startTime: string; endTime: string }>) => {
    setDailySchedule((prev) => ({ ...prev, [date]: { ...prev[date], ...patch } }));
  };

  const handleConfirm = () => {
    mutation.mutate({ ...form.getValues(), dailySchedule: dailyScheduleEntries });
  };

  const previewError = previewQuery.isError
    ? ((previewQuery.error as { message?: string })?.message ?? 'Revisa las fechas y horarios elegidos.')
    : null;

  const canSubmit = form.formState.isValid && !mutation.isPending && !previewError;

  return (
    <div className="sf-card-strong overflow-hidden">
      <div className="sf-booking-header p-5">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Solicitar reserva</h2>
        </div>
        <div className="sf-glass mt-4 rounded-md border p-3">
          <p className="sf-glass-muted text-xs">
            {previewQuery.data ? 'Total estimado' : 'Precio base'}
          </p>
          <p className="text-2xl font-bold tracking-normal">
            {previewQuery.data
              ? formatCurrency(previewQuery.data.totalPrice)
              : basePrice > 0
                ? formatCurrency(basePrice)
                : 'Consultar'}
          </p>
          {previewQuery.data && pricingModeLabel ? (
            <p className="sf-glass-muted mt-0.5 text-xs">
              {pricingModeLabel}
              {singleDayHours != null
                ? ` · ${singleDayHours} ${singleDayHours === 1 ? 'hora' : 'horas'} · ${formatCurrency(
                    Math.round((previewQuery.data.totalPrice / singleDayHours) * 100) / 100,
                  )}/hora`
                : ''}
            </p>
          ) : !previewQuery.data && basePrice > 0 ? (
            <p className="sf-glass-muted mt-0.5 text-xs">{capitalize(unitLabels[venue.priceUnit])}</p>
          ) : null}
          {previewQuery.data?.extrasTotal ? (
            <p className="sf-glass-muted mt-0.5 text-xs">
              Incluye {formatCurrency(previewQuery.data.extrasTotal)} en extras
            </p>
          ) : null}
          {previewQuery.data && isMultiDay ? (
            <ul className="sf-glass-muted mt-2 space-y-1 text-xs">
              {previewQuery.data.days.map((day) => {
                const hours = day.unit === 'HOUR' ? hoursForDate(day.date) : null;
                const rate = hours && hours > 0 ? Math.round((day.appliedPrice / hours) * 100) / 100 : null;
                return (
                  <li key={day.date} className="flex items-center justify-between gap-3">
                    <span>
                      {day.date}{' '}
                      <span className="opacity-70">
                        ({unitLabels[day.unit]}
                        {rate != null ? ` · ${formatCurrency(rate)}/hora` : ''})
                      </span>
                    </span>
                    <span>{formatCurrency(day.appliedPrice)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        {previewError ? (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {previewError}
          </p>
        ) : null}
      </div>

      <form
        className="space-y-4 p-4"
        onSubmit={form.handleSubmit(() => {
          if (!isAuthenticated || role !== 'CLIENT') {
            setLoginModalOpen(true);
            return;
          }
          setConfirmOpen(true);
        })}
      >
        <div className="space-y-2">
          <Label htmlFor="eventType">Tipo de evento</Label>
          <Input
            id="eventType"
            placeholder="Boda, cumpleanos, graduacion"
            className="sf-surface"
            {...form.register('eventType')}
          />
          {form.formState.errors.eventType ? (
            <p className="text-sm text-destructive">{form.formState.errors.eventType.message}</p>
          ) : null}
        </div>

        <div className={venue.allowsMultipleDays ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          <div className="space-y-2">
            <Label htmlFor="eventDate">{venue.allowsMultipleDays ? 'Fecha inicio' : 'Fecha'}</Label>
            <Input
              id="eventDate"
              type="date"
              min={formatDateInput()}
              className="sf-surface"
              {...form.register('eventDate', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  const end = form.getValues('endDate');
                  if (!venue.allowsMultipleDays || !end || end < event.target.value) {
                    form.setValue('endDate', event.target.value, { shouldValidate: true });
                    onDatesChange?.(event.target.value, event.target.value);
                    return;
                  }
                  onDatesChange?.(event.target.value, end);
                },
              })}
            />
            {form.formState.errors.eventDate ? (
              <p className="text-sm text-destructive">{form.formState.errors.eventDate.message}</p>
            ) : null}
          </div>
          {venue.allowsMultipleDays ? (
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha fin</Label>
              <Input
                id="endDate"
                type="date"
                min={values.eventDate || formatDateInput()}
                className="sf-surface"
                {...form.register('endDate', {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    onDatesChange?.(form.getValues('eventDate'), event.target.value);
                  },
                })}
              />
              {form.formState.errors.endDate ? (
                <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guestCount">Invitados</Label>
          <Input
            id="guestCount"
            type="number"
            min={1}
            max={venue.capacityMax}
            className="sf-surface"
            {...form.register('guestCount')}
          />
          {form.formState.errors.guestCount ? (
            <p className="text-sm text-destructive">{form.formState.errors.guestCount.message}</p>
          ) : null}
        </div>

        {isMixedUnits ? (
          <div className="space-y-2">
            <Label htmlFor="startTime">Horario para los dias por hora</Label>
            <p className="text-xs text-muted-foreground">
              Este local cobra por hora algunos dias del rango elegido y por dia completo
              otros. Se usa por defecto en los dias por hora; podes ajustarlo
              individualmente mas abajo.
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="startTime"
                type="time"
                className="sf-surface w-full"
                {...form.register('startTime')}
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                id="endTime"
                type="time"
                className="sf-surface w-full"
                {...form.register('endTime')}
              />
            </div>
            {form.formState.errors.startTime ? (
              <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
            ) : null}
            {form.formState.errors.endTime ? (
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Inicio</Label>
              <Input
                id="startTime"
                type="time"
                className="sf-surface"
                {...form.register('startTime')}
              />
              {form.formState.errors.startTime ? (
                <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Fin</Label>
              <Input id="endTime" type="time" className="sf-surface" {...form.register('endTime')} />
              {form.formState.errors.endTime ? (
                <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
              ) : null}
            </div>
          </div>
        )}

        {isMixedUnits ? (
          <div className="space-y-2 rounded-[var(--radius)] border p-3">
            <p className="text-xs font-medium text-muted-foreground">Horario por dia</p>
            {previewDays.map((day) => {
              const dayOfWeek = new Date(`${day.date}T00:00:00Z`).getUTCDay();
              const opening = openingHourByWeekday.get(dayOfWeek);
              const schedule = dailySchedule[day.date];

              return (
                <div key={day.date} className="sf-surface rounded-[var(--radius)] border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{formatDate(day.date)}</span>
                    {day.unit !== 'HOUR' ? (
                      <span className="sf-badge-outline">Dia completo</span>
                    ) : null}
                  </div>
                  {day.unit === 'HOUR' && schedule ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="time"
                        className="sf-surface w-full"
                        value={schedule.startTime}
                        onChange={(e) => updateDailySchedule(day.date, { startTime: e.target.value })}
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        className="sf-surface w-full"
                        value={schedule.endTime}
                        onChange={(e) => updateDailySchedule(day.date, { endTime: e.target.value })}
                      />
                    </div>
                  ) : null}
                  {opening && !opening.isClosed ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Horario del local: {formatTime12h(opening.opensAt)} -{' '}
                      {formatTime12h(opening.closesAt)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : venue.allowsMultipleDays && isMultiDay ? (
          <p className="text-xs text-muted-foreground">
            Este horario se aplica a todos los dias del rango seleccionado.
          </p>
        ) : null}

        {extraAmenities.length > 0 ? (
          <div className="space-y-2">
            <Label>Extras opcionales</Label>
            <div className="space-y-2">
              {extraAmenities.map((item) => (
                <label
                  key={item.id}
                  className="sf-surface flex items-center justify-between gap-2 rounded-[var(--radius)] border p-3 text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedAmenityIds.includes(item.amenity.id)}
                      onChange={() => toggleAmenity(item.amenity.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {item.amenity.name}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(item.extraCost ?? 0)}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="specialRequests">Solicitudes especiales</Label>
          <Input
            id="specialRequests"
            placeholder="Opcional"
            className="sf-surface"
            {...form.register('specialRequests')}
          />
          {form.formState.errors.specialRequests ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.specialRequests.message}
            </p>
          ) : null}
        </div>

        <SubmitButton
          className="sf-action h-11 w-full"
          type="submit"
          disabled={!canSubmit}
          isLoading={mutation.isPending}
        >
          Enviar solicitud
        </SubmitButton>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar solicitud"
        description={
          isMultiDay
            ? `Solicitaras ${venue.name} del ${values.eventDate} al ${values.endDate}. El owner debe aprobar antes del pago de sena.`
            : `Solicitaras ${venue.name} para ${values.eventDate || 'la fecha seleccionada'}. El owner debe aprobar antes del pago de sena.`
        }
        confirmLabel="Solicitar"
        isLoading={mutation.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
      />

      <LoginToBookModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
};
