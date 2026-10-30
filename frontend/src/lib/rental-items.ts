import { formatCurrency } from '@/lib/formatters';
import type { RentalItemChargeBasis } from '@/types/api';

export const chargeBasisLabels: Record<RentalItemChargeBasis, string> = {
  PER_DAY: 'por dia',
  PER_EVENT: 'por evento',
};

/** Calendar days a booking spans, both ends included. Anything unusable counts as one day, the
 * same as a booking whose dates haven't been picked yet. */
export const countBookingDays = (start?: string, end?: string): number => {
  if (!start || !end) return 1;
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
  return Number.isFinite(days) && days >= 1 ? days : 1;
};

interface RentalItemBreakdown {
  quantity: number;
  unitPrice: number;
  /** Absent on bookings made before items could be charged per day: those were charged once. */
  chargeBasis?: RentalItemChargeBasis;
  billedDays?: number;
}

/** The arithmetic behind a subtotal, so a quote can be checked by hand ("4 × Bs 50 × 3 dias"). */
export const formatRentalItemBreakdown = (item: RentalItemBreakdown, isMultiDay: boolean) => {
  const base = `${item.quantity} × ${formatCurrency(item.unitPrice)}`;
  if (!isMultiDay || !item.chargeBasis) return base;
  return item.chargeBasis === 'PER_EVENT'
    ? `${base} (${chargeBasisLabels.PER_EVENT})`
    : `${base} × ${item.billedDays} dias`;
};
