'use client';

import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import {
  getOwnerCompletedPayments,
  type OwnerCompletedPaymentsFilter,
} from '@/lib/api/payments.api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { paymentMethodLabels, paymentTypeLabels } from '@/components/payments/payment-labels';
import { AppDrawer } from '@/components/shared/app-drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface EarningsPaymentDrawerProps {
  title: string;
  filters: OwnerCompletedPaymentsFilter | null;
  onOpenChange: (open: boolean) => void;
}

/** Opened from a row in the earnings breakdown (by venue+month, or by venue+method) -- shows the
 * individual COMPLETED payments that sum up to that row's total, like a receipt per payment. */
export const EarningsPaymentDrawer = ({
  title,
  filters,
  onOpenChange,
}: EarningsPaymentDrawerProps) => {
  const query = useQuery({
    queryKey: ['owner-earnings-payments', filters],
    queryFn: () => getOwnerCompletedPayments(filters!),
    enabled: Boolean(filters),
  });

  return (
    <AppDrawer
      open={Boolean(filters)}
      onOpenChange={onOpenChange}
      title={title}
      description="Pagos confirmados que forman este total."
    >
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}

      {!query.isLoading && !query.isError && query.data?.length === 0 ? (
        <EmptyState icon={Receipt} title="Sin pagos para este filtro" />
      ) : null}

      <div className="space-y-3">
        {query.data?.map((payment) => (
          <div key={payment.id} className="sf-card space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{payment.booking?.eventType ?? 'Reserva'}</p>
              <p className="font-semibold">{formatCurrency(payment.amount)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {payment.booking?.client?.fullName ?? 'Cliente'}
              {payment.booking?.venue?.name ? ` · ${payment.booking.venue.name}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{paymentTypeLabels[payment.paymentType]}</span>
              <span>·</span>
              <span>{paymentMethodLabels[payment.method]}</span>
              <span>·</span>
              <span>{payment.paidAt ? formatDate(payment.paidAt) : 'Sin fecha'}</span>
              {payment.transactionReference ? (
                <>
                  <span>·</span>
                  <span>Ref: {payment.transactionReference}</span>
                </>
              ) : null}
            </div>
            {payment.comprobanteUrl ? (
              <a
                href={payment.comprobanteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-primary hover:underline"
              >
                Ver comprobante
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </AppDrawer>
  );
};
