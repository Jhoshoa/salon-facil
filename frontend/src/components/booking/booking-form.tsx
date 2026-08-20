'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createBooking } from '@/lib/api/bookings.api';
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
}

export const BookingForm = ({ venue }: BookingFormProps) => {
  const { isAuthenticated } = useAuthStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      eventType: '',
      eventDate: formatDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      startTime: '18:00',
      endTime: '23:00',
      guestCount: Math.min(venue.capacityMax, 100),
      specialRequests: '',
    },
  });

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
          <p className="sf-glass-muted text-xs">Precio base</p>
          <p className="text-2xl font-bold tracking-normal">
            {basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}
          </p>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Fecha</Label>
            <Input
              id="eventDate"
              type="date"
              className="sf-surface"
              {...form.register('eventDate')}
            />
            {form.formState.errors.eventDate ? (
              <p className="text-sm text-destructive">{form.formState.errors.eventDate.message}</p>
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
        description={`Solicitaras ${venue.name} para ${values.eventDate || 'la fecha seleccionada'}. El owner debe aprobar antes del pago de sena.`}
        confirmLabel="Solicitar"
        isLoading={mutation.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
