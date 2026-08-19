import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { Venue } from '@/types/api';

interface VenueCardProps {
  venue: Venue;
}

const getBasePrice = (venue: Venue) => {
  return venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
};

export const VenueCard = ({ venue }: VenueCardProps) => {
  const photo = venue.photos?.[0];
  const basePrice = getBasePrice(venue);

  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="block focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <Card className="h-full overflow-hidden transition-colors hover:border-foreground/30">
        <div className="relative aspect-[4/3] bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={venue.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin foto
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-1 font-semibold text-foreground">{venue.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {venue.district}, {venue.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3.5 w-3.5" />
              Hasta {venue.capacityMax}
            </Badge>
            {basePrice > 0 ? (
              <Badge variant="outline">Desde {formatCurrency(basePrice)}</Badge>
            ) : null}
          </div>
          {venue.services?.length ? (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {venue.services
                .slice(0, 3)
                .map((service) => service.name)
                .join(' · ')}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
};
