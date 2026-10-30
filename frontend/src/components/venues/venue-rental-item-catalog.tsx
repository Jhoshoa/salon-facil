'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Package, Search } from 'lucide-react';
import { getPublicRentalItems } from '@/lib/api/venues.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

  return (
    <section className="sf-detail-section">
      <h2 className="sf-detail-title">Catalogo de alquiler</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Lo que ofrece el local, con precio y disponibilidad informativa. Lo que se cobra aparte se
        consulta por WhatsApp junto con tu reserva.
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
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-[var(--radius)] border p-2">
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
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 pt-0.5">
                  {item.pricePerUnit === null ? (
                    <Badge variant="secondary">Incluido con el local</Badge>
                  ) : (
                    <span className="font-serif text-sm italic text-accent-foreground">
                      {formatCurrency(item.pricePerUnit)} / {item.unitLabel}
                    </span>
                  )}
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
