'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Pencil, Star, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cancelBooking, getBooking } from '@/lib/api/bookings.api';
import { getBookingPayments } from '@/lib/api/payments.api';
import { deleteReview, getBookingReview } from '@/lib/api/reviews.api';
import { formatCurrency, formatDate, formatTime12h } from '@/lib/formatters';
import { PaymentProofDrawer } from '@/components/payments/payment-proof-drawer';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ReviewFormDialog } from '@/components/reviews/review-form-dialog';
import { StarRating } from '@/components/reviews/star-rating';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingDetailClientProps {
  bookingId: string;
}

const canUploadDeposit = (status: string, depositPaid: boolean) => {
  return status === 'APPROVED' && !depositPaid;
};

export const BookingDetailClient = ({ bookingId }: BookingDetailClientProps) => {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId),
  });

  const reviewQuery = useQuery({
    queryKey: ['booking', bookingId, 'review'],
    queryFn: () => getBookingReview(bookingId),
    enabled: bookingQuery.data?.status === 'COMPLETED',
  });

  const paymentsQuery = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: () => getBookingPayments(bookingId),
    enabled: Boolean(bookingQuery.data),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: () => deleteReview(reviewQuery.data!.id),
    onSuccess: async () => {
      toast.success('Resena borrada');
      setDeleteReviewOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['booking', bookingId, 'review'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo borrar la resena', { description: error.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId),
    onSuccess: async () => {
      toast.success('Reserva cancelada');
      setCancelOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo cancelar la reserva', { description: error.message });
    },
  });

  if (bookingQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <ErrorState
        title="No se pudo cargar la reserva"
        description="La reserva no existe o tu sesion no tiene acceso."
        onRetry={() => bookingQuery.refetch()}
      />
    );
  }

  const booking = bookingQuery.data;
  const showPaymentAction = canUploadDeposit(booking.status, booking.depositPaid);
  const showCancelAction = ['PENDING', 'APPROVED'].includes(booking.status);
  const showReviewAction = booking.status === 'COMPLETED' && !reviewQuery.isLoading && !reviewQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{booking.venue?.name ?? 'Reserva'}</h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.eventType} ·{' '}
              {booking.eventDate === booking.endDate
                ? formatDate(booking.eventDate)
                : `${formatDate(booking.eventDate)} - ${formatDate(booking.endDate)}`}{' '}
              · {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showPaymentAction ? (
              <Button onClick={() => setPaymentOpen(true)}>
                <CreditCard className="h-4 w-4" />
                Pagar sena
              </Button>
            ) : null}
            {showCancelAction ? (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {showReviewAction ? (
              <Button variant="outline" onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4" />
                Calificar
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatCurrency(booking.totalPrice)}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Sena</p>
            <p className="font-semibold">{formatCurrency(booking.depositAmount)}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Invitados</p>
            <p className="font-semibold">{booking.guestCount}</p>
          </div>
        </div>
        {booking.selectedExtras?.length ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Extras seleccionados</p>
            <ul className="mt-1 space-y-1 text-sm">
              {booking.selectedExtras.map((extra) => (
                <li key={extra.amenityId} className="flex items-center justify-between gap-3">
                  <span>{extra.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(extra.extraCost)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Pagos</h2>
        {paymentsQuery.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {paymentsQuery.isError ? (
          <ErrorState
            title="No se pudieron cargar los pagos"
            onRetry={() => paymentsQuery.refetch()}
          />
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.data?.length ? (
          <EmptyState icon={CreditCard} title="Sin pagos registrados" />
        ) : null}
        <div className="space-y-2">
          {paymentsQuery.data?.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{formatCurrency(payment.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.method} · {payment.status}
                </p>
              </div>
              {payment.comprobanteUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={payment.comprobanteUrl} target="_blank" rel="noreferrer">
                    Ver comprobante
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {reviewQuery.data ? (
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h2 className="mb-3 text-base font-semibold">Tu resena</h2>
            <div className="flex gap-2">
              <Button size="icon-sm" variant="ghost" onClick={() => setReviewOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar resena</span>
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setDeleteReviewOpen(true)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Borrar resena</span>
              </Button>
            </div>
          </div>
          <StarRating value={reviewQuery.data.rating} size="sm" />
          {reviewQuery.data.comment ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {reviewQuery.data.comment}
            </p>
          ) : null}
          {reviewQuery.data.ownerResponse ? (
            <div className="mt-3 rounded-md bg-muted p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Respuesta de {booking.venue?.name ?? 'el local'}
              </p>
              <p className="mt-1 text-sm leading-6">{reviewQuery.data.ownerResponse}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <PaymentProofDrawer booking={booking} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <ReviewFormDialog
        bookingId={bookingId}
        venueName={booking.venue?.name}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        existingReview={reviewQuery.data}
      />
      <ConfirmDialog
        open={deleteReviewOpen}
        title="Borrar resena"
        description="Esta accion no se puede deshacer."
        confirmLabel="Borrar"
        isLoading={deleteReviewMutation.isPending}
        onOpenChange={setDeleteReviewOpen}
        onConfirm={() => deleteReviewMutation.mutate()}
      />
      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar reserva"
        description="Esta accion notificara al salon y no se podra revertir desde esta vista."
        confirmLabel="Cancelar reserva"
        isLoading={cancelMutation.isPending}
        onOpenChange={setCancelOpen}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
};
