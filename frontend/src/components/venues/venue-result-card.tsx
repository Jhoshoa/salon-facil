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
    <article className="sf-result-card">
      <Link href={`/venues/${venue.slug}`} className="sf-result-image sf-focus-ring">
        {photo ? (
          <Image
            src={photo}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 280px, 100vw"
          />
        ) : (
          <div className="sf-gradient-subtle flex h-full items-center justify-center text-sm text-muted-foreground">
            Foto pendiente
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {venue.instantBooking ? <Badge>Reserva inmediata</Badge> : null}
          {venue.isVerified ? (
            <Badge variant="secondary" className="bg-card/95">
              Verificado
            </Badge>
          ) : null}
        </div>
      </Link>

      <div className="space-y-3 py-1">
        <div>
          <Link
            href={`/venues/${venue.slug}`}
            className="text-xl font-semibold text-foreground hover:text-primary"
          >
            {venue.name}
          </Link>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {venue.district}, {venue.city}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {venue.shortDescription ?? venue.description}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {venue.capacityMin}-{venue.capacityMax} personas
          </Badge>
          {venue.spaceType ? (
            <Badge variant="accent">{spaceTypeLabel[venue.spaceType] ?? venue.spaceType}</Badge>
          ) : null}
        </div>

        {amenities.length ? (
          <div className="grid gap-1.5 text-sm text-primary sm:grid-cols-2">
            {amenities.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {item.amenity.name}
              </span>
            ))}
          </div>
        ) : services.length ? (
          <div className="grid gap-1.5 text-sm text-primary sm:grid-cols-2">
            {services.map((service) => (
              <span key={service.id} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                {service.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sf-result-price-box">
        <div>
          <p className="sf-price-label">Desde</p>
          <p className="sf-price">{basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}</p>
          <p className="sf-price-unit">por {priceUnitLabel[venue.priceUnit] ?? 'evento'}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
