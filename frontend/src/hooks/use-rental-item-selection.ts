import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PricePreviewAccess } from '@/lib/api/bookings.api';
import {
  getOwnerRentalItems,
  getPublicRentalItems,
  getSharedRentalItems,
} from '@/lib/api/venues.api';
import type { VenueRentalItem } from '@/types/api';

/** In `manage` mode this is the same cache entry as the owner's catalog tab, so an item edited
 * there shows up in the preview right away. */
export const rentalItemsQueryKey = (venueId: string | undefined, access?: PricePreviewAccess) => {
  if (access?.mode === 'manage') return ['venue-rental-items', venueId];
  if (access?.mode === 'share') return ['venue-rental-items', 'share', venueId, access.token];
  return ['venue-rental-items', 'public', venueId];
};

const fetchRentalItems = (venueId: string, access?: PricePreviewAccess) => {
  if (access?.mode === 'manage') return getOwnerRentalItems(venueId);
  if (access?.mode === 'share') return getSharedRentalItems(venueId, access.token);
  return getPublicRentalItems(venueId);
};

// `manage` also returns what the owner has turned off, which a visitor would never see.
const keepActiveItems = (items: VenueRentalItem[]) => items.filter((item) => item.isActive);

export const rentalItemsQueryOptions = (venueId: string, access?: PricePreviewAccess) => ({
  queryKey: rentalItemsQueryKey(venueId, access),
  queryFn: () => fetchRentalItems(venueId, access),
  select: keepActiveItems,
});

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
export const useRentalItemSelection = (
  venueId: string | undefined,
  bookingDays = 1,
  access?: PricePreviewAccess,
) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: items } = useQuery({
    ...rentalItemsQueryOptions(venueId as string, access),
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
