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
    <Link href={`/venues/${venue.slug}`} className="sf-carousel-card sf-focus-ring block">
      <div className="sf-carousel-image relative">
        {photo ? (
          <Image src={photo} alt={venue.name} fill className="object-cover" sizes="280px" />
        ) : (
          <div className="sf-gradient-subtle flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Foto pendiente
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-lg font-semibold">{venue.name}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {venue.district}
          </p>
          {venue.averageRating ? (
            <p className="flex items-center gap-1 font-medium text-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {venue.averageRating.toFixed(1)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          {venue.capacityMin}-{venue.capacityMax} personas
        </div>
        <p className="pt-1 text-base font-semibold text-primary">
          {basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}
        </p>
      </div>
    </Link>
  );
};
