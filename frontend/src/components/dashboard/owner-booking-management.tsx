'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Mail,
  Phone,
  PartyPopper,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  approveBooking,
  getVenueBookings,
  markBookingCompleted,
  rejectBooking,
} from '@/lib/api/bookings.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { getPendingOwnerPayments, confirmPayment, rejectPayment } from '@/lib/api/payments.api';
import { formatCurrency, formatDate, formatTime12h } from '@/lib/formatters';
import type { Booking, BookingStatus, Payment, PaymentType } from '@/types/api';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { paymentTypeLabels } from '@/components/payments/payment-labels';
import { AppDrawer } from '@/components/shared/app-drawer';
import { WhatsAppIcon } from '@/components/shared/brand-icons';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const BOOKINGS_PER_PAGE = 5;

// Grouped, not the raw 8 enum values -- an owner thinks in terms of "needs a decision or is
// coming up" vs "already happened", not in terms of individual backend statuses. PENDING stays
// bundled with the already-confirmed ones (not split into its own tab) because each card already
// makes the distinction obvious on its own: only a PENDING booking shows Aprobar/Rechazar, so a
// separate tab would just be re-solving something the card already shows at a glance.
type StatusFilter = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL';

const STATUS_FILTER_GROUPS: Record<Exclude<StatusFilter, 'ALL'>, BookingStatus[]> = {
  ACTIVE: ['PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED_BY_CLIENT', 'CANCELLED_BY_OWNER', 'NO_SHOW'],
};

const STATUS_FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'ALL', label: 'Todas' },
];

const matchesStatusFilter = (booking: Booking, filter: StatusFilter) =>
  filter === 'ALL' || STATUS_FILTER_GROUPS[filter].includes(booking.status);

interface RejectState {
  id: string;
  type: 'booking' | 'payment';
}

const extrasTotalOf = (booking: Booking) =>
  booking.selectedExtras?.reduce((sum, extra) => sum + extra.extraCost, 0) ?? 0;

const round2 = (value: number) => Math.round(value * 100) / 100;

type PaymentLegStatus = 'pagado' | 'revisando' | 'pendiente';

/** Looks at every payment of a given type ever created for this booking (there can be more than
 * one if the owner rejected an earlier comprobante) and reduces it to one status: a confirmed
 * one always wins, otherwise a pending one means "check the queue below", otherwise nothing has
 * been submitted yet. */
const paymentLegStatus = (payments: Payment[] | undefined, type: PaymentType): PaymentLegStatus => {
  const relevant = (payments ?? []).filter((payment) => payment.paymentType === type);
  if (relevant.some((payment) => payment.status === 'COMPLETED')) return 'pagado';
  if (relevant.some((payment) => payment.status === 'PENDING')) return 'revisando';
  return 'pendiente';
};

const paymentLegStatusLabel: Record<PaymentLegStatus, string> = {
  pagado: 'Pagado',
  revisando: 'Revisando comprobante',
  pendiente: 'Pendiente',
};

const paymentLegStatusVariant: Record<PaymentLegStatus, 'default' | 'secondary' | 'outline'> = {
  pagado: 'default',
  revisando: 'secondary',
  pendiente: 'outline',
};

const PaymentLegBadge = ({ status }: { status: PaymentLegStatus }) => (
  <Badge variant={paymentLegStatusVariant[status]}>{paymentLegStatusLabel[status]}</Badge>
);

const OwnerBookingRow = ({
  booking,
  onApprove,
  onReject,
  onComplete,
  onViewDetails,
  approving,
  completing,
}: {
  booking: Booking;
  onApprove: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onViewDetails: (booking: Booking) => void;
  approving: boolean;
  completing: boolean;
}) => {
  const hasActions =
    booking.status === 'PENDING' ||
    booking.status === 'DEPOSIT_PAID' ||
    booking.status === 'FULLY_PAID';

  return (
    <div className="sf-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.eventType}</p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.eventDate === booking.endDate
              ? formatDate(booking.eventDate)
              : `${formatDate(booking.eventDate)} - ${formatDate(booking.endDate)}`}{' '}
            · {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)} ·{' '}
            {booking.guestCount} invitados
          </p>
          <p className="text-sm text-muted-foreground">
            {booking.client?.fullName ?? 'Cliente'} · {formatCurrency(booking.totalPrice)}
            {booking.selectedExtras?.length ? (
              <>
                {' '}
                · {booking.selectedExtras.length} extra
                {booking.selectedExtras.length === 1 ? '' : 's'} (
                {formatCurrency(extrasTotalOf(booking))})
              </>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => onViewDetails(booking)}
        >
          <Eye className="h-4 w-4" />
          Ver detalles
        </Button>
      </div>
      {hasActions ? (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {booking.status === 'PENDING' ? (
            <>
              <Button size="sm" onClick={() => onApprove(booking)} disabled={approving}>
                <Check className="h-4 w-4" />
                Aprobar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(booking)}>
                <X className="h-4 w-4" />
                Rechazar
              </Button>
            </>
          ) : null}
          {booking.status === 'DEPOSIT_PAID' || booking.status === 'FULLY_PAID' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(booking)}
              disabled={completing}
            >
              <PartyPopper className="h-4 w-4" />
              Marcar como completada
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const BookingDetailModal = ({
  booking,
  isFullUpfront,
  onOpenChange,
  onApprove,
  onReject,
  onComplete,
  approving,
  completing,
}: {
  booking: Booking | null;
  isFullUpfront: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  approving: boolean;
  completing: boolean;
}) => (
  <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
      {booking ? (
        <>
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{booking.eventType}</DialogTitle>
              <BookingStatusBadge status={booking.status} />
            </div>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fecha y hora
              </p>
              <p className="mt-1">
                {booking.eventDate === booking.endDate
                  ? formatDate(booking.eventDate)
                  : `${formatDate(booking.eventDate)} - ${formatDate(booking.endDate)}`}{' '}
                · {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)} ·{' '}
                {booking.guestCount} invitados
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cliente
              </p>
              <p className="mt-1">{booking.client?.fullName ?? 'Cliente'}</p>
              <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
                {booking.client?.phone ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={`tel:${booking.client.phone}`}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {booking.client.phone}
                    </a>
                    <a
                      href={`https://wa.me/${booking.client.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Coordinar por WhatsApp"
                      title="Coordinar por WhatsApp"
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{ color: '#25D366' }}
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                ) : null}
                {booking.client?.email ? (
                  <a
                    href={`mailto:${booking.client.email}`}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {booking.client.email}
                  </a>
                ) : null}
              </div>
            </div>

            {booking.specialRequests ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pedidos especiales
                </p>
                <p className="mt-1">{booking.specialRequests}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Precio
              </p>
              <ul className="mt-1 space-y-1">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Precio base</span>
                  <span>{formatCurrency(booking.basePrice)}</span>
                </li>
                {booking.selectedExtras?.map((extra) => (
                  <li key={extra.amenityId} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{extra.name}</span>
                    <span>{formatCurrency(extra.extraCost)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t pt-1 font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(booking.totalPrice)}</span>
                </li>
                {isFullUpfront ? null : (
                  <>
                    <li className="flex items-center justify-between gap-3 text-muted-foreground">
                      <span>Anticipo</span>
                      <span>{formatCurrency(booking.depositAmount)}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 text-muted-foreground">
                      <span>Saldo restante</span>
                      <span>
                        {formatCurrency(round2(booking.totalPrice - booking.depositAmount))}
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estado de pago
              </p>
              <ul className="mt-1 space-y-1.5">
                {isFullUpfront ? (
                  <li className="flex items-center justify-between gap-3">
                    <span>Pago completo</span>
                    <PaymentLegBadge status={paymentLegStatus(booking.payments, 'FULL')} />
                  </li>
                ) : (
                  <>
                    <li className="flex items-center justify-between gap-3">
                      <span>Anticipo</span>
                      <PaymentLegBadge status={paymentLegStatus(booking.payments, 'DEPOSIT')} />
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span>Saldo restante</span>
                      {booking.status === 'PENDING' || booking.status === 'APPROVED' ? (
                        <Badge variant="outline">No aplica todavia</Badge>
                      ) : (
                        <PaymentLegBadge status={paymentLegStatus(booking.payments, 'REMAINING')} />
                      )}
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {booking.status === 'PENDING' ||
          booking.status === 'DEPOSIT_PAID' ||
          booking.status === 'FULLY_PAID' ? (
            <DialogFooter>
              {booking.status === 'PENDING' ? (
                <>
                  <Button variant="outline" onClick={() => onReject(booking)} disabled={approving}>
                    <X className="h-4 w-4" />
                    Rechazar
                  </Button>
                  <Button onClick={() => onApprove(booking)} disabled={approving}>
                    <Check className="h-4 w-4" />
                    Aprobar
                  </Button>
                </>
              ) : null}
              {booking.status === 'DEPOSIT_PAID' || booking.status === 'FULLY_PAID' ? (
                <Button onClick={() => onComplete(booking)} disabled={completing}>
                  <PartyPopper className="h-4 w-4" />
                  Marcar como completada
                </Button>
              ) : null}
            </DialogFooter>
          ) : null}
        </>
      ) : null}
    </DialogContent>
  </Dialog>
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
  <div className="sf-card grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
    <div>
      <p className="font-medium">
        {paymentTypeLabels[payment.paymentType]} · {formatCurrency(payment.amount)}
      </p>
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
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [bookingToApprove, setBookingToApprove] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [venueId, statusFilter]);

  const approveMutation = useMutation({
    mutationFn: approveBooking,
    onSuccess: async () => {
      toast.success('Reserva aprobada');
      setBookingDetail(null);
      setBookingToApprove(null);
      await queryClient.invalidateQueries({ queryKey: ['owner-bookings', venueId] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo aprobar', { description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: markBookingCompleted,
    onSuccess: async () => {
      toast.success('Reserva marcada como completada');
      setBookingDetail(null);
      await queryClient.invalidateQueries({ queryKey: ['owner-bookings', venueId] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo completar', { description: error.message }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => rejectBooking(id, value),
    onSuccess: async () => {
      toast.success('Reserva rechazada');
      setRejectState(null);
      setReason('');
      setBookingDetail(null);
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

  const selectedVenue = venuesQuery.data.find((venue) => venue.id === venueId);
  const isFullUpfront = selectedVenue?.paymentPolicy === 'FULL_UPFRONT';

  const allBookings = bookingsQuery.data ?? [];
  const filteredBookings = allBookings.filter((booking) =>
    matchesStatusFilter(booking, statusFilter),
  );
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageBookings = filteredBookings.slice(
    (currentPage - 1) * BOOKINGS_PER_PAGE,
    currentPage * BOOKINGS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <OwnerVenueSelect venues={venuesQuery.data} value={venueId} onChange={setVenueId} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Solicitudes de reserva</h2>
          {filteredBookings.length ? (
            <p className="text-sm text-muted-foreground">
              {filteredBookings.length} reserva{filteredBookings.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_TABS.map((tab) => {
            const count =
              tab.value === 'ALL'
                ? allBookings.length
                : allBookings.filter((booking) => matchesStatusFilter(booking, tab.value)).length;
            return (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={statusFilter === tab.value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label} ({count})
              </Button>
            );
          })}
        </div>

        {bookingsQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
        {bookingsQuery.isError ? (
          <ErrorState
            title="No se pudieron cargar reservas"
            onRetry={() => bookingsQuery.refetch()}
          />
        ) : null}
        {!bookingsQuery.isLoading && !filteredBookings.length ? (
          <EmptyState
            icon={CreditCard}
            title={
              allBookings.length ? 'Sin reservas en esta categoria' : 'Sin reservas para este salon'
            }
          />
        ) : null}
        {pageBookings.map((booking) => (
          <OwnerBookingRow
            key={booking.id}
            booking={booking}
            approving={approveMutation.isPending}
            completing={completeMutation.isPending}
            onApprove={setBookingToApprove}
            onReject={(item) => setRejectState({ id: item.id, type: 'booking' })}
            onComplete={(item) => completeMutation.mutate(item.id)}
            onViewDetails={setBookingDetail}
          />
        ))}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <p className="text-sm text-muted-foreground">
              Pagina {currentPage} de {totalPages}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
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

      <BookingDetailModal
        booking={bookingDetail}
        isFullUpfront={Boolean(isFullUpfront)}
        onOpenChange={(open) => {
          if (!open) setBookingDetail(null);
        }}
        onApprove={(item) => {
          setBookingDetail(null);
          setBookingToApprove(item);
        }}
        onReject={(item) => {
          setBookingDetail(null);
          setRejectState({ id: item.id, type: 'booking' });
        }}
        onComplete={(item) => completeMutation.mutate(item.id)}
        approving={approveMutation.isPending}
        completing={completeMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(bookingToApprove)}
        title="Aprobar reserva"
        description={
          bookingToApprove
            ? `Vas a aprobar la solicitud de "${bookingToApprove.eventType}" de ${bookingToApprove.client?.fullName ?? 'este cliente'}. El cliente podra continuar con el pago ${isFullUpfront ? 'completo' : 'del anticipo'}.`
            : ''
        }
        confirmLabel="Aprobar"
        isLoading={approveMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setBookingToApprove(null);
        }}
        onConfirm={() => {
          if (bookingToApprove) approveMutation.mutate(bookingToApprove.id);
        }}
      />

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
        description={
          paymentToConfirm
            ? paymentToConfirm.paymentType === 'DEPOSIT'
              ? 'La reserva pasara a "Anticipo pagado". El cliente va a poder pagar el saldo restante despues.'
              : 'La reserva quedara completamente pagada.'
            : ''
        }
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
