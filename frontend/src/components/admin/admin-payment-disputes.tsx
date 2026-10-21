'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CreditCard, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminPayments, refundPayment } from '@/lib/api/payments.api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { paymentTypeLabels } from '@/components/payments/payment-labels';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { AppDrawer } from '@/components/shared/app-drawer';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { Payment, PaymentStatus } from '@/types/api';

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Confirmado',
  FAILED: 'Rechazado',
  REFUNDED: 'Reembolsado',
  PARTIAL: 'Parcial',
};

const MIN_SEARCH_LENGTH = 3;
const LIMIT = 20;

export const AdminPaymentDisputes = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'payments', activeQuery, status, page],
    queryFn: () =>
      getAdminPayments({
        search: activeQuery || undefined,
        status: status || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => refundPayment(id, value),
    onSuccess: () => {
      toast.success('Pago reembolsado');
      setPaymentToRefund(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo reembolsar el pago', { description: error.message });
    },
  });

  const submitRefund = () => {
    if (!paymentToRefund || reason.trim().length < 3) return;
    refundMutation.mutate({ id: paymentToRefund.id, value: reason.trim() });
  };

  const payments = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(activeQuery || status);

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="Buscar por local o cliente..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PaymentStatus | '');
            resetToFirstPage();
          }}
          className="sm:w-56"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(statusLabels) as PaymentStatus[]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="No se pudieron cargar los pagos" onRetry={() => query.refetch()} />
      ) : !payments.length ? (
        <EmptyState
          icon={CreditCard}
          title={hasActiveFilters ? 'Sin resultados' : 'Todavia no hay pagos'}
          description={
            hasActiveFilters
              ? 'Ningun pago coincide con la busqueda y los filtros aplicados.'
              : 'Los pagos que confirmen los propietarios van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} pago{total === 1 ? '' : 's'} en total
          </p>
          <div className="space-y-2">
            {payments.map((payment) => (
              <article key={payment.id} className="sf-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.booking?.venue ? (
                        <Link
                          href={`/admin/venues/all/${payment.booking.venue.id}/preview`}
                          className="font-semibold hover:underline"
                        >
                          {payment.booking.venue.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">Local eliminado</span>
                      )}
                      <BookingStatusBadge status={payment.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payment.booking?.client?.fullName ?? 'Cliente'} ·{' '}
                      {paymentTypeLabels[payment.paymentType]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>

                {payment.status === 'REFUNDED' && payment.refundReason ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Motivo del reembolso: {payment.refundReason}
                  </p>
                ) : null}

                {payment.status === 'COMPLETED' ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-3"
                    onClick={() => setPaymentToRefund(payment)}
                  >
                    Reembolsar
                  </Button>
                ) : null}
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <AppDrawer
        open={Boolean(paymentToRefund)}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentToRefund(null);
            setReason('');
          }
        }}
        title="Reembolsar pago"
        description={
          paymentToRefund
            ? `Vas a marcar como reembolsado el pago de ${formatCurrency(paymentToRefund.amount)} en "${paymentToRefund.booking?.venue?.name ?? 'este local'}". El propietario va a tener que devolver el dinero por fuera del sistema.`
            : ''
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Motivo</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {reason && reason.trim().length < 3 ? (
              <p className="text-sm text-destructive">Minimo 3 caracteres.</p>
            ) : null}
          </div>
          <SubmitButton
            className="w-full"
            variant="destructive"
            disabled={reason.trim().length < 3}
            isLoading={refundMutation.isPending}
            onClick={submitRefund}
          >
            Reembolsar
          </SubmitButton>
        </div>
      </AppDrawer>
    </div>
  );
};
