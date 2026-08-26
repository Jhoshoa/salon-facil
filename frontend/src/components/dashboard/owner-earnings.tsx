'use client';

import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Receipt } from 'lucide-react';
import { getOwnerEarnings } from '@/lib/api/payments.api';
import { formatCurrency } from '@/lib/formatters';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { EarningsBreakdownRow } from '@/types/api';

const monthLabel = (isoMonth: string) =>
  new Date(isoMonth).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });

const groupByVenue = (rows: EarningsBreakdownRow[]) => {
  const map = new Map<string, { venueName: string; rows: EarningsBreakdownRow[] }>();
  for (const row of rows) {
    const entry = map.get(row.venueId);
    if (entry) {
      entry.rows.push(row);
    } else {
      map.set(row.venueId, { venueName: row.venueName, rows: [row] });
    }
  }
  return Array.from(map.entries()).map(([venueId, value]) => ({ venueId, ...value }));
};

export const OwnerEarnings = () => {
  const query = useQuery({ queryKey: ['dashboard', 'earnings'], queryFn: () => getOwnerEarnings(6) });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const { summary, breakdown } = query.data;
  const venues = groupByVenue(breakdown);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Total ganado</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalEarned)}</p>
          </div>
        </div>
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Pagos confirmados</p>
            <p className="text-2xl font-bold">{summary.paymentCount}</p>
          </div>
        </div>
      </div>

      {venues.length === 0 ? (
        <EmptyState
          title="Todavia no tenes ganancias"
          description="Cuando se confirmen pagos de tus locales, van a aparecer aca desglosados por mes."
        />
      ) : (
        <div className="space-y-4">
          {venues.map((venue) => (
            <div key={venue.venueId} className="sf-card p-5">
              <h3 className="mb-3 font-semibold">{venue.venueName}</h3>
              <div className="space-y-2">
                {venue.rows.map((row) => (
                  <div
                    key={`${row.venueId}-${row.month}`}
                    className="flex items-center justify-between border-t pt-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <span className="capitalize text-muted-foreground">
                      {monthLabel(row.month)}
                    </span>
                    <span className="text-muted-foreground">{row.count} pago(s)</span>
                    <span className="font-medium">{formatCurrency(row.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
