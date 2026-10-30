import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPublicRentalItems } from '@/lib/api/venues.api';
import type { VenueRentalItem } from '@/types/api';

export const rentalItemsQueryKey = (venueId: string | undefined) => [
  'venue-rental-items',
  'public',
  venueId,
];

export interface RentalItemLine {
  item: VenueRentalItem;
  quantity: number;
  billedDays: number;
  subtotal: number;
}

/** Only items charged separately and with stock can be added to a quote. An older item with no
 * stock at all has nothing to limit the quantity against, so it can't either until it's completed. */
export const canAddRentalItemToQuote = (item: VenueRentalItem): boolean =>
  !item.isIncluded && item.pricePerUnit !== null && (item.stockQty ?? 0) > 0;

export const maxRentalItemQuantity = (item: VenueRentalItem): number => item.stockQty ?? 0;

/** The client's catalog selection. It lives above both the catalog and the booking form because
 * they're siblings, and the mobile form is unmounted whenever its sheet is closed. Lines are
 * derived from the current catalog, so an item the owner deleted or whose stock dropped corrects
 * itself as soon as the catalog refetches. */
export const useRentalItemSelection = (venueId: string | undefined, bookingDays = 1) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: items } = useQuery({
    queryKey: rentalItemsQueryKey(venueId),
    queryFn: () => getPublicRentalItems(venueId as string),
    enabled: Boolean(venueId),
  });

  const lines = useMemo<RentalItemLine[]>(
    () =>
      (items ?? []).flatMap((item) => {
        const requested = quantities[item.id];
        if (!requested || !canAddRentalItemToQuote(item)) return [];
        const quantity = Math.min(requested, maxRentalItemQuantity(item));
        const billedDays = item.chargeBasis === 'PER_DAY' ? bookingDays : 1;
        const subtotal = Math.round((item.pricePerUnit ?? 0) * quantity * billedDays * 100) / 100;
        return [{ item, quantity, billedDays, subtotal }];
      }),
    [items, quantities, bookingDays],
  );

  // Money just changed without the client touching anything, so they have to be told. Runs only
  // when the catalog itself changes, never on the client's own edits.
  useEffect(() => {
    if (!items) return;
    const current = new Map(lines.map((line) => [line.item.id, line.quantity]));
    const isOutdated = Object.entries(quantities).some(
      ([id, quantity]) => current.get(id) !== quantity,
    );
    if (isOutdated) {
      setQuantities(Object.fromEntries(current));
      toast.info('El local cambio su catalogo y actualizamos tu seleccion.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const total = useMemo(
    () => Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100,
    [lines],
  );

  const setQuantity = (itemId: string, quantity: number) => {
    setQuantities((current) => {
      const { [itemId]: _removed, ...rest } = current;
      return quantity > 0 ? { ...rest, [itemId]: quantity } : rest;
    });
  };

  const clear = () => setQuantities({});

  const includedItems = useMemo(() => (items ?? []).filter((item) => item.isIncluded), [items]);

  return { quantities, lines, total, includedItems, setQuantity, clear };
};
