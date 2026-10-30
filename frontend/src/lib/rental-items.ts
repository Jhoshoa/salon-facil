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

interface CategorizedItem {
  id: string;
  category: { id: string; name: string; sortOrder: number };
}

/** Items under their category, following the order the owner gave the categories. Keeps the order
 * the items arrive in within each one. */
export const groupRentalItemsByCategory = <T extends CategorizedItem>(items: T[]) => {
  const groups = new Map<string, { category: T['category']; items: T[] }>();
  for (const item of items) {
    const group = groups.get(item.category.id);
    if (group) group.items.push(item);
    else groups.set(item.category.id, { category: item.category, items: [item] });
  }
  return Array.from(groups.values()).sort(
    (a, b) =>
      a.category.sortOrder - b.category.sortOrder || a.category.name.localeCompare(b.category.name),
  );
};

/** The complete order to save after dragging one item onto another, since the API takes every item
 * of the venue. Works on the whole catalog, not just what's visible, so items hidden by a search
 * keep their place. Returns null if the two aren't in the same category. */
export const reorderRentalItemsWithinCategory = <T extends CategorizedItem>(
  items: T[],
  activeId: string,
  overId: string,
): string[] | null => {
  const groups = groupRentalItemsByCategory(items);
  const group = groups.find((candidate) => candidate.items.some((item) => item.id === activeId));
  const from = group?.items.findIndex((item) => item.id === activeId) ?? -1;
  const to = group?.items.findIndex((item) => item.id === overId) ?? -1;
  if (!group || from === -1 || to === -1) return null;

  const [moved] = group.items.splice(from, 1);
  group.items.splice(to, 0, moved);
  return groups.flatMap((candidate) => candidate.items.map((item) => item.id));
};
