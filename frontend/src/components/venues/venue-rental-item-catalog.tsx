'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Package, Search } from 'lucide-react';
import { getPublicRentalItems } from '@/lib/api/venues.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface VenueRentalItemCatalogProps {
  venueId: string;
}

const ALL_CATEGORIES = '__all__';

export const VenueRentalItemCatalog = ({ venueId }: VenueRentalItemCatalogProps) => {
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['venue-rental-items', 'public', venueId],
    queryFn: () => getPublicRentalItems(venueId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const categories = useMemo(() => {
    const byId = new Map(items.map((item) => [item.category.id, item.category.name]));
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
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

  return (
    <section className="sf-detail-section">
      <h2 className="sf-detail-title">Catalogo de alquiler</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Items disponibles por separado, con precio y disponibilidad informativa. Consulta por
        WhatsApp para pedirlos junto con tu reserva.
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[var(--radius)] border">
              <div className="relative aspect-[4/3] bg-muted">
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    loader={cloudinaryImageLoader}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-medium">{item.name}</p>
                {item.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-serif italic text-accent-foreground">
                    {formatCurrency(item.pricePerUnit)} / {item.unitLabel}
                  </span>
                  {item.stockQty !== null ? (
                    <span className="text-xs text-muted-foreground">Stock: {item.stockQty}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
