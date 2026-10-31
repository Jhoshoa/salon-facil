'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Check, Package, Search } from 'lucide-react';
import {
  canAddRentalItemToQuote,
  maxRentalItemQuantity,
  rentalItemsQueryOptions,
} from '@/hooks/use-rental-item-selection';
import type { PricePreviewAccess } from '@/lib/api/bookings.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
import { chargeBasisLabels, groupRentalItemsByCategory } from '@/lib/rental-items';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VenueRentalItem } from '@/types/api';
import { RentalItemQuantityStepper } from './rental-item-quantity-stepper';

interface VenueRentalItemCatalogProps {
  venueId: string;
  /** Only venues that take bookings of several days have a difference to explain. */
  showChargeBasis?: boolean;
  quantities: Record<string, number>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  /** Set when this catalog is shown in a preview, where the venue may not be public yet. */
  access?: PricePreviewAccess;
}

const ALL_CATEGORIES = '__all__';

export const VenueRentalItemCatalog = ({
  venueId,
  showChargeBasis = false,
  quantities,
  onQuantityChange,
  access,
}: VenueRentalItemCatalogProps) => {
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');

  const query = useQuery(rentalItemsQueryOptions(venueId, access));

  // Included items are listed with the rest of what the rental price covers: here only what the
  // client can add to their quote.
  const items = useMemo(() => (query.data ?? []).filter((item) => !item.isIncluded), [query.data]);

  const categories = useMemo(() => {
    const byId = new Map(items.map((item) => [item.category.id, item.category]));
    return Array.from(byId.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }, [items]);

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== ALL_CATEGORIES && item.category.id !== categoryFilter) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  if (items.length === 0) return null;

  // A title only helps when there's more than one category on screen to tell apart.
  const showCategoryTitles = categoryFilter === ALL_CATEGORIES && categories.length > 1;

  const renderItem = (item: VenueRentalItem) => {
    const isSelectable = canAddRentalItemToQuote(item);
    const quantity = isSelectable ? (quantities[item.id] ?? 0) : 0;
    const isAdded = quantity > 0;

    return (
      <div
        key={item.id}
        className={cn(
          'flex gap-3 rounded-[var(--radius)] border p-2 transition-colors',
          isAdded && 'border-primary bg-primary/5',
        )}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted sm:h-20 sm:w-20">
          {item.photoUrl ? (
            <Image
              src={item.photoUrl}
              alt={item.name}
              fill
              className="object-cover"
              loader={cloudinaryImageLoader}
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
          {item.description ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-0.5">
            <div className="min-w-0">
              <p className="font-serif text-sm italic text-accent-foreground">
                {formatCurrency(item.pricePerUnit ?? 0)} / {item.unitLabel}
                {showChargeBasis ? ` · ${chargeBasisLabels[item.chargeBasis]}` : ''}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {item.stockQty === 0 ? <span>Sin stock</span> : null}
                {item.stockQty === null ? <span>Consultar disponibilidad</span> : null}
                {item.stockQty ? <span>Stock: {item.stockQty}</span> : null}
                {isAdded ? (
                  <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                    <Check className="h-3 w-3" />
                    Agregado
                  </span>
                ) : null}
              </p>
            </div>
            {isAdded ? (
              <RentalItemQuantityStepper
                itemName={item.name}
                quantity={quantity}
                max={maxRentalItemQuantity(item)}
                onChange={(next) => onQuantityChange(item.id, next)}
              />
            ) : isSelectable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                aria-label={`Agregar ${item.name} a la cotizacion`}
                onClick={() => onQuantityChange(item.id, 1)}
              >
                Agregar
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="sf-detail-section">
      <h2 className="sf-detail-title">Agrega a tu reserva</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Se suma a tu cotizacion. El propietario confirma que lo tenga disponible para tu fecha al
        revisar tu solicitud.
      </p>

      {categories.length > 1 || items.length > 4 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter(ALL_CATEGORIES)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                categoryFilter === ALL_CATEGORIES
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input text-muted-foreground hover:bg-muted',
              )}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  categoryFilter === category.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted',
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningun item coincide con tu busqueda.</p>
      ) : (
        <div className="space-y-5">
          {groupRentalItemsByCategory(filteredItems).map((group) => (
            <div key={group.category.id}>
              {showCategoryTitles ? (
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.category.name}
                </h3>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">{group.items.map(renderItem)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
