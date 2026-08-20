import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { Venue } from '@/types/api';

interface VenueResultCardProps {
  venue: Venue;
}

const getBasePrice = (venue: Venue) => {
  return venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
};

const priceUnitLabel: Record<NonNullable<Venue['priceUnit']>, string> = {
  EVENT: 'evento',
  HOUR: 'hora',
  DAY: 'dia',
};

const spaceTypeLabel: Partial<Record<NonNullable<Venue['spaceType']>, string>> = {
  EVENT_HALL: 'Salon de eventos',
  GARDEN: 'Jardin',
  TERRACE: 'Terraza',
  PHOTO_STUDIO: 'Estudio',
  MULTIPURPOSE: 'Multiproposito',
  OUTDOOR_SPACE: 'Exterior',
};

export const VenueResultCard = ({ venue }: VenueResultCardProps) => {
  const photo =
    venue.media?.find((item) => item.isCover)?.url ?? venue.media?.[0]?.url ?? venue.photos?.[0];
  const basePrice = getBasePrice(venue);
  const amenities = venue.amenities?.slice(0, 4) ?? [];
  const services = amenities.length ? [] : (venue.services?.slice(0, 3) ?? []);

  return (
    <article className="grid gap-4 rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-emerald-500/60 md:grid-cols-[260px_1fr_190px]">
      <Link
        href={`/venues/${venue.slug}`}
        className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted focus:outline-none focus:ring-2 focus:ring-ring md:aspect-auto"
      >
        {photo ? (
          <Image
            src={photo}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 260px, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin foto
          </div>
        )}
      </Link>

      <div className="space-y-3 py-1">
        <div>
          <Link
            href={`/venues/${venue.slug}`}
            className="text-xl font-semibold text-foreground hover:underline"
          >
            {venue.name}
          </Link>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {venue.district}, {venue.city}
          </p>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {venue.shortDescription ?? venue.description}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            {venue.capacityMin}-{venue.capacityMax} personas
          </Badge>
          {venue.isVerified ? <Badge variant="outline">Verificado</Badge> : null}
          {venue.instantBooking ? <Badge variant="outline">Reserva inmediata</Badge> : null}
          {venue.spaceType ? (
            <Badge variant="outline">{spaceTypeLabel[venue.spaceType] ?? venue.spaceType}</Badge>
          ) : null}
        </div>

        {amenities.length ? (
          <div className="grid gap-1 text-sm text-emerald-700 sm:grid-cols-2">
            {amenities.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {item.amenity.name}
              </span>
            ))}
          </div>
        ) : services.length ? (
          <div className="grid gap-1 text-sm text-emerald-700 sm:grid-cols-2">
            {services.map((service) => (
              <span key={service.id} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                {service.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-between gap-4 border-t pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-1">
        <div className="md:text-right">
          <p className="text-sm text-muted-foreground">Desde</p>
          <p className="text-2xl font-semibold">
            {basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}
          </p>
          <p className="text-xs text-muted-foreground">
            por {priceUnitLabel[venue.priceUnit] ?? 'evento'}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Min. {venue.minimumHours} h
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={`/venues/${venue.slug}`}>
            Ver disponibilidad
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
};
