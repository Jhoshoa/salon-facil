import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Venue } from '@/types/api';

interface VenueSimilarCardProps {
  venue: Venue;
}

export const VenueSimilarCard = ({ venue }: VenueSimilarCardProps) => {
  const photo =
    venue.media?.find((item) => item.isCover)?.url ?? venue.media?.[0]?.url ?? venue.photos?.[0];
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

  return (
    <Link href={`/venues/${venue.slug}`} className="sf-carousel-card sf-focus-ring">
      <div className="border border-border bg-card p-1.5 pb-0 shadow-md">
        <div className="sf-carousel-image">
          {photo ? (
            <Image src={photo} alt={venue.name} fill className="object-cover" sizes="210px" />
          ) : (
            <div className="sf-gradient-subtle flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Foto pendiente
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1 pt-2">
        <h3 className="line-clamp-1 font-semibold">{venue.name}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {venue.district}
          </p>
          {venue.averageRating ? (
            <p className="flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {venue.averageRating.toFixed(1)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {venue.capacityMin}-{venue.capacityMax} personas
        </div>
        <p className="pt-0.5 font-serif text-base font-semibold text-primary">
          {basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}
        </p>
      </div>
    </Link>
  );
};
