'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createBooking, previewBookingPrice } from '@/lib/api/bookings.api';
import { formatCurrency, formatDateInput } from '@/lib/formatters';
import { bookingSchema, type BookingFormValues } from '@/lib/validators/booking.schema';
import { useAuthStore } from '@/stores/auth.store';
import type { Venue } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SubmitButton } from '@/components/shared/submit-button';

interface BookingFormProps {
  venue: Venue;
  selectedRange?: { start: string; end: string };
  onDatesChange?: (start: string, end: string) => void;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const BookingForm = ({ venue, selectedRange, onDatesChange }: BookingFormProps) => {
  const { isAuthenticated } = useAuthStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const defaultDate = formatDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      eventType: '',
      eventDate: defaultDate,
      endDate: defaultDate,
      startTime: '18:00',
      endTime: '23:00',
      guestCount: Math.min(venue.capacityMax, 100),
      specialRequests: '',
    },
  });

  useEffect(() => {
    if (!selectedRange) return;
    form.setValue('eventDate', selectedRange.start, { shouldValidate: true, shouldDirty: true });
    form.setValue('endDate', selectedRange.end, { shouldValidate: true, shouldDirty: true });
  }, [selectedRange, form]);

  const mutation = useMutation({
    mutationFn: (values: BookingFormValues) => createBooking(venue.id, values),
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
  const canSubmit = form.formState.isValid && !mutation.isPending;
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

  const canPreview =
    Boolean(values.eventDate) &&
    Boolean(values.endDate) &&
    values.endDate >= values.eventDate &&
    TIME_PATTERN.test(values.startTime ?? '') &&
    TIME_PATTERN.test(values.endTime ?? '') &&
    values.startTime < values.endTime;

  const previewQuery = useQuery({
    queryKey: [
      'booking-price-preview',
      venue.id,
      values.eventDate,
      values.endDate,
      values.startTime,
      values.endTime,
    ],
    queryFn: () =>
      previewBookingPrice(venue.id, {
        eventDate: values.eventDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
      }),
    enabled: canPreview,
  });

  const isMultiDay = values.eventDate && values.endDate && values.eventDate !== values.endDate;

  const handleConfirm = () => {
    mutation.mutate(form.getValues());
  };

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
          {previewQuery.data && isMultiDay ? (
            <ul className="sf-glass-muted mt-2 space-y-0.5 text-xs">
              {previewQuery.data.days.map((day) => (
                <li key={day.date} className="flex items-center justify-between gap-3">
                  <span>{day.date}</span>
                  <span>{formatCurrency(day.appliedPrice)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="sf-warning m-4 rounded-md border p-3 text-sm">
          Inicia sesion como cliente para solicitar una reserva.
        </div>
      ) : null}

      <form className="space-y-4 p-4" onSubmit={form.handleSubmit(() => setConfirmOpen(true))}>
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
        {venue.allowsMultipleDays && isMultiDay ? (
          <p className="text-xs text-muted-foreground">
            Este horario se aplica a todos los dias del rango seleccionado.
          </p>
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
          disabled={!canSubmit || !isAuthenticated}
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
    </div>
  );
};
