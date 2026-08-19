'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { approveBooking, getVenueBookings, rejectBooking } from '@/lib/api/bookings.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { getPendingOwnerPayments, confirmPayment, rejectPayment } from '@/lib/api/payments.api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Booking, Payment } from '@/types/api';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { AppDrawer } from '@/components/shared/app-drawer';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface RejectState {
  id: string;
  type: 'booking' | 'payment';
}

const OwnerBookingRow = ({
  booking,
  onApprove,
  onReject,
  approving,
}: {
  booking: Booking;
  onApprove: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
  approving: boolean;
}) => (
  <div className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_auto] lg:items-center">
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{booking.eventType}</p>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDate(booking.eventDate)} · {booking.startTime} - {booking.endTime} ·{' '}
        {booking.guestCount} invitados
      </p>
      <p className="text-sm text-muted-foreground">
        {booking.client?.fullName ?? 'Cliente'} · {formatCurrency(booking.totalPrice)}
      </p>
    </div>
    {booking.status === 'PENDING' ? (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onApprove(booking)} disabled={approving}>
          <Check className="h-4 w-4" />
          Aprobar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onReject(booking)}>
          <X className="h-4 w-4" />
          Rechazar
        </Button>
      </div>
    ) : null}
  </div>
);

const OwnerPaymentRow = ({
  payment,
  onConfirm,
  onReject,
}: {
  payment: Payment;
  onConfirm: (payment: Payment) => void;
  onReject: (payment: Payment) => void;
}) => (
  <div className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_auto] lg:items-center">
    <div>
      <p className="font-medium">{formatCurrency(payment.amount)}</p>
      <p className="text-sm text-muted-foreground">
        {payment.booking?.venue?.name ?? 'Salon'} · {payment.booking?.eventType ?? 'Reserva'} ·{' '}
        {payment.method}
      </p>
      {payment.transactionReference ? (
        <p className="text-sm text-muted-foreground">Referencia: {payment.transactionReference}</p>
      ) : null}
    </div>
    <div className="flex flex-wrap gap-2">
      {payment.comprobanteUrl ? (
        <Button asChild size="sm" variant="outline">
          <a href={payment.comprobanteUrl} target="_blank" rel="noreferrer">
            Ver comprobante
          </a>
        </Button>
      ) : null}
      <Button size="sm" onClick={() => onConfirm(payment)}>
        <Check className="h-4 w-4" />
        Confirmar
      </Button>
      <Button size="sm" variant="outline" onClick={() => onReject(payment)}>
        <X className="h-4 w-4" />
        Rechazar
      </Button>
    </div>
  </div>
);

export const OwnerBookingManagement = () => {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState('');
  const [rejectState, setRejectState] = useState<RejectState | null>(null);
  const [reason, setReason] = useState('');
  const [paymentToConfirm, setPaymentToConfirm] = useState<Payment | null>(null);

  const venuesQuery = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const bookingsQuery = useQuery({
    queryKey: ['owner-bookings', venueId],
    queryFn: () => getVenueBookings(venueId),
    enabled: Boolean(venueId),
  });
  const paymentsQuery = useQuery({
    queryKey: ['owner-pending-payments'],
    queryFn: getPendingOwnerPayments,
  });

  useEffect(() => {
    if (!venueId && venuesQuery.data?.[0]) setVenueId(venuesQuery.data[0].id);
  }, [venueId, venuesQuery.data]);

  const approveMutation = useMutation({
    mutationFn: approveBooking,
    onSuccess: async () => {
      toast.success('Reserva aprobada');
      await queryClient.invalidateQueries({ queryKey: ['owner-bookings', venueId] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo aprobar', { description: error.message }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => rejectBooking(id, value),
    onSuccess: async () => {
      toast.success('Reserva rechazada');
      setRejectState(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['owner-bookings', venueId] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo rechazar', { description: error.message }),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => confirmPayment(paymentId),
    onSuccess: async () => {
      toast.success('Pago confirmado');
      setPaymentToConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['owner-pending-payments'] });
      await queryClient.invalidateQueries({ queryKey: ['owner-bookings', venueId] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo confirmar', { description: error.message }),
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => rejectPayment(id, value),
    onSuccess: async () => {
      toast.success('Pago rechazado');
      setRejectState(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['owner-pending-payments'] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo rechazar', { description: error.message }),
  });

  const submitReject = () => {
    if (!rejectState || reason.trim().length < 3) return;
    if (rejectState.type === 'booking') {
      rejectMutation.mutate({ id: rejectState.id, value: reason.trim() });
      return;
    }
    rejectPaymentMutation.mutate({ id: rejectState.id, value: reason.trim() });
  };

  if (venuesQuery.isLoading) return <Skeleton className="h-40 w-full" />;
  if (venuesQuery.isError)
    return (
      <ErrorState title="No se pudieron cargar tus salones" onRetry={() => venuesQuery.refetch()} />
    );
  if (!venuesQuery.data?.length)
    return <EmptyState icon={CreditCard} title="No tienes salones para gestionar" />;

  return (
    <div className="space-y-6">
      <OwnerVenueSelect venues={venuesQuery.data} value={venueId} onChange={setVenueId} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Solicitudes de reserva</h2>
        {bookingsQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
        {bookingsQuery.isError ? (
          <ErrorState
            title="No se pudieron cargar reservas"
            onRetry={() => bookingsQuery.refetch()}
          />
        ) : null}
        {!bookingsQuery.isLoading && !bookingsQuery.data?.length ? (
          <EmptyState icon={CreditCard} title="Sin reservas para este salon" />
        ) : null}
        {bookingsQuery.data?.map((booking) => (
          <OwnerBookingRow
            key={booking.id}
            booking={booking}
            approving={approveMutation.isPending}
            onApprove={(item) => approveMutation.mutate(item.id)}
            onReject={(item) => setRejectState({ id: item.id, type: 'booking' })}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pagos pendientes</h2>
        {paymentsQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}
        {paymentsQuery.isError ? (
          <ErrorState title="No se pudieron cargar pagos" onRetry={() => paymentsQuery.refetch()} />
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.data?.length ? (
          <EmptyState icon={CreditCard} title="Sin pagos pendientes" />
        ) : null}
        {paymentsQuery.data?.map((payment) => (
          <OwnerPaymentRow
            key={payment.id}
            payment={payment}
            onConfirm={setPaymentToConfirm}
            onReject={(item) => setRejectState({ id: item.id, type: 'payment' })}
          />
        ))}
      </section>

      <AppDrawer
        open={Boolean(rejectState)}
        onOpenChange={(open) => {
          if (!open) setRejectState(null);
        }}
        title="Motivo de rechazo"
        description="Este texto queda registrado para auditoria y comunicacion con el cliente."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            {reason && reason.trim().length < 3 ? (
              <p className="text-sm text-destructive">Minimo 3 caracteres.</p>
            ) : null}
          </div>
          <SubmitButton
            className="w-full"
            disabled={reason.trim().length < 3}
            isLoading={rejectMutation.isPending || rejectPaymentMutation.isPending}
            onClick={submitReject}
          >
            Rechazar
          </SubmitButton>
        </div>
      </AppDrawer>

      <ConfirmDialog
        open={Boolean(paymentToConfirm)}
        title="Confirmar pago"
        description="La reserva pasara a sena pagada cuando el pago sea de tipo sena."
        confirmLabel="Confirmar pago"
        isLoading={confirmPaymentMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setPaymentToConfirm(null);
        }}
        onConfirm={() => {
          if (paymentToConfirm) confirmPaymentMutation.mutate(paymentToConfirm.id);
        }}
      />
    </div>
  );
};
