'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Download, Receipt } from 'lucide-react';
import { getOwnerEarnings } from '@/lib/api/payments.api';
import { formatCurrency } from '@/lib/formatters';
import { paymentMethodLabels } from '@/components/payments/payment-labels';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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

const MONTHS_OPTIONS = [
  { value: 3, label: 'Ultimos 3 meses' },
  { value: 6, label: 'Ultimos 6 meses' },
  { value: 12, label: 'Ultimos 12 meses' },
];

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadBreakdownCsv = (rows: EarningsBreakdownRow[]) => {
  const header = ['Local', 'Mes', 'Pagos', 'Total (Bs)'];
  const lines = rows.map((row) =>
    [row.venueName, monthLabel(row.month), row.count, row.total].map(csvCell).join(','),
  );
  const csv = [header.map(csvCell).join(','), ...lines].join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ganancias-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const OwnerEarnings = () => {
  const [months, setMonths] = useState(6);
  const query = useQuery({
    queryKey: ['dashboard', 'earnings', months],
    queryFn: () => getOwnerEarnings(months),
  });

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

  const { summary, breakdown, byMethod } = query.data;
  const venues = groupByVenue(breakdown);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Total ganado (historico)</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalEarned)}</p>
          </div>
        </div>
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Pagos confirmados (historico)</p>
            <p className="text-2xl font-bold">{summary.paymentCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select className="w-48" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {MONTHS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={breakdown.length === 0}
          onClick={() => downloadBreakdownCsv(breakdown)}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {byMethod.length > 0 ? (
        <div className="sf-card p-5">
          <h3 className="mb-3 font-semibold">Por metodo de pago</h3>
          <div className="space-y-2">
            {byMethod.map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between border-t pt-2 text-sm first:border-t-0 first:pt-0"
              >
                <span className="text-muted-foreground">{paymentMethodLabels[row.method]}</span>
                <span className="text-muted-foreground">{row.count} pago(s)</span>
                <span className="font-medium">{formatCurrency(row.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
