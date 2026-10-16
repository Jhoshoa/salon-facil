'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Download, Eye, Receipt } from 'lucide-react';
import { getOwnerEarnings, type OwnerCompletedPaymentsFilter } from '@/lib/api/payments.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { formatCurrency } from '@/lib/formatters';
import { paymentMethodLabels } from '@/components/payments/payment-labels';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { EarningsPaymentDrawer } from '@/components/dashboard/earnings-payment-drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { EarningsBreakdownRow } from '@/types/api';

const monthLabel = (isoMonth: string) =>
  new Date(isoMonth).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });

const groupByVenue = <T extends { venueId: string; venueName: string }>(rows: T[]) => {
  const map = new Map<string, { venueName: string; rows: T[] }>();
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
  const [venueId, setVenueId] = useState('');
  const [drawer, setDrawer] = useState<{
    title: string;
    filters: OwnerCompletedPaymentsFilter;
  } | null>(null);
  const venuesQuery = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const query = useQuery({
    queryKey: ['dashboard', 'earnings', months, venueId],
    queryFn: () => getOwnerEarnings(months, venueId || undefined),
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
  const methodVenues = groupByVenue(byMethod);
  const selectedVenueName = venueId
    ? (venuesQuery.data?.find((v) => v.id === venueId)?.name ?? null)
    : null;
  const scopeLabel = selectedVenueName ?? 'todos tus locales';

  const openMonthDetail = (row: EarningsBreakdownRow) =>
    setDrawer({
      title: `${row.venueName} · ${monthLabel(row.month)}`,
      filters: { venueId: row.venueId, month: row.month.slice(0, 7) },
    });

  const monthsOptionLabel = MONTHS_OPTIONS.find((option) => option.value === months)?.label ?? '';

  /** One button per venue (not per method) -- the per-row totals above already show the split
   * by method, so the drawer shows every payment for the venue in the selected period instead
   * of making the owner open a separate drawer per method. */
  const openVenuePaymentsDetail = (venue: { venueId: string; venueName: string }) =>
    setDrawer({
      title: `${venue.venueName} · ${monthsOptionLabel}`,
      filters: { venueId: venue.venueId, monthsBack: months },
    });

  return (
    <div className="space-y-6">
      {venuesQuery.data && venuesQuery.data.length > 1 ? (
        <OwnerVenueSelect
          venues={venuesQuery.data}
          value={venueId}
          onChange={setVenueId}
          allowAll
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Total ganado (historico) · {scopeLabel}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalEarned)}</p>
          </div>
        </div>
        <div className="sf-card flex items-center gap-4 p-5">
          <span className="sf-logo">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              Pagos confirmados (historico) · {scopeLabel}
            </p>
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
        <div className="space-y-3">
          <h3 className="font-semibold">Por metodo de pago</h3>
          <div className="space-y-4">
            {methodVenues.map((venue) => (
              <div key={venue.venueId} className="sf-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  {!selectedVenueName ? (
                    <p className="text-sm font-medium text-muted-foreground">{venue.venueName}</p>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openVenuePaymentsDetail(venue)}
                  >
                    <Eye className="h-4 w-4" />
                    Detalle
                  </Button>
                </div>
                <div className="space-y-2">
                  {venue.rows.map((row) => (
                    <div
                      key={row.method}
                      className="flex items-center justify-between gap-3 border-t pt-2 text-sm first:border-t-0 first:pt-0"
                    >
                      <span className="text-muted-foreground">
                        {paymentMethodLabels[row.method]}
                      </span>
                      <span className="text-muted-foreground">{row.count} pago(s)</span>
                      <span className="font-medium">{formatCurrency(row.total)}</span>
                    </div>
                  ))}
                </div>
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
              {/* Redundant once a single venue is already selected above -- the heading would
               * just repeat what the selector already says. */}
              {!selectedVenueName ? (
                <h3 className="mb-3 font-semibold">{venue.venueName}</h3>
              ) : null}
              <div className="space-y-2">
                {venue.rows.map((row) => (
                  <div
                    key={`${row.venueId}-${row.month}`}
                    className="flex items-center justify-between gap-3 border-t pt-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <span className="capitalize text-muted-foreground">
                      {monthLabel(row.month)}
                    </span>
                    <span className="text-muted-foreground">{row.count} pago(s)</span>
                    <span className="font-medium">{formatCurrency(row.total)}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openMonthDetail(row)}
                    >
                      <Eye className="h-4 w-4" />
                      Detalle
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EarningsPaymentDrawer
        title={drawer?.title ?? ''}
        filters={drawer?.filters ?? null}
        onOpenChange={(open) => {
          if (!open) setDrawer(null);
        }}
      />
    </div>
  );
};
