'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Check, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { getVenueBySlug } from '@/lib/api/venues.api';
import { formatCurrency } from '@/lib/formatters';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';
import { BookingForm } from '@/components/booking/booking-form';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCategory, Venue } from '@/types/api';
import { priceUnitLabels, spaceTypeLabels, useTypeLabels } from './venue-filter-labels';

interface VenueDetailProps {
  slug: string;
}

const VenueDetailSkeleton = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Skeleton className="aspect-[16/9] w-full rounded-md" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
};

const amenityCategoryLabels: Record<AmenityCategory, string> = {
  FACILITY: 'Facilities',
  COMFORT: 'Comodidad',
  AUDIO_VISUAL: 'Audio y visual',
  CATERING_DRINKS: 'Catering y bebidas',
  PARKING: 'Parking',
  ACCESSIBILITY: 'Accesibilidad',
  SAFETY: 'Seguridad',
  SERVICES: 'Servicios',
};

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const getVenuePhotos = (venue: Venue) => {
  const mediaPhotos =
    venue.media?.filter((item) => item.type === 'IMAGE').map((item) => item.url) ?? [];
  return mediaPhotos.length ? mediaPhotos : venue.photos;
};

const groupAmenities = (venue: Venue) => {
  return (venue.amenities ?? []).reduce<Partial<Record<AmenityCategory, typeof venue.amenities>>>(
    (groups, item) => {
      const category = item.amenity.category;
      groups[category] = groups[category] ?? [];
      groups[category]?.push(item);
      return groups;
    },
    {},
  );
};

export const VenueDetail = ({ slug }: VenueDetailProps) => {
  const query = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => getVenueBySlug(slug),
  });

  if (query.isLoading) return <VenueDetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const venue = query.data;
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
  const photos = getVenuePhotos(venue);
  const mainPhoto = photos[0];
  const amenityGroups = Object.entries(groupAmenities(venue)) as [
    AmenityCategory,
    NonNullable<Venue['amenities']>,
  ][];
  const primaryUses = venue.uses?.filter((item) => item.isPrimary) ?? [];
  const secondaryUses = venue.uses?.filter((item) => !item.isPrimary).slice(0, 6) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="grid gap-2 md:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-muted shadow-sm">
            {mainPhoto ? (
              <Image src={mainPhoto} alt={venue.name} fill className="object-cover" priority />
            ) : (
              <div className="sf-empty-gradient flex h-full items-center justify-center text-muted-foreground">
                Sin foto
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {photos.slice(1, 3).map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                className="relative min-h-32 overflow-hidden rounded-md bg-muted shadow-sm"
              >
                <Image
                  src={photo}
                  alt={`${venue.name} ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {!photos.slice(1, 3).length ? (
              <div className="flex min-h-32 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                Galeria pendiente
              </div>
            ) : null}
          </div>
        </section>

        <section className="sf-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                {venue.spaceType ? (
                  <Badge className="sf-badge-muted">{spaceTypeLabels[venue.spaceType]}</Badge>
                ) : null}
                {venue.instantBooking ? (
                  <Badge className="sf-badge-action">Reserva inmediata</Badge>
                ) : null}
                {venue.isVerified ? (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Verificado
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-normal text-foreground">
                {venue.name}
              </h1>
              <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {venue.district}, {venue.city}
              </p>
            </div>
            <div className="sf-surface min-w-44 rounded-md border p-4 text-right shadow-sm">
              <p className="text-sm text-muted-foreground">Desde</p>
              <p className="text-2xl font-bold tracking-normal">
                {basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}
              </p>
              <p className="text-xs text-muted-foreground">
                por {priceUnitLabels[venue.priceUnit].toLowerCase()}
              </p>
            </div>
          </div>
          <p className="mt-4 leading-7 text-muted-foreground">{venue.description}</p>
        </section>

        <section className="sf-card p-5">
          <h2 className="font-semibold">Resumen del espacio</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Badge variant="secondary" className="sf-badge-muted justify-center gap-1 py-2">
              <Users className="h-3.5 w-3.5" />
              {venue.capacityMin}-{venue.capacityMax} personas
            </Badge>
            <Badge variant="secondary" className="sf-badge-info justify-center gap-1 py-2">
              <Clock className="h-3.5 w-3.5" />
              Min. {venue.minimumHours} horas
            </Badge>
            <Badge variant="secondary" className="sf-badge-warm justify-center gap-1 py-2">
              <CalendarClock className="h-3.5 w-3.5" />
              {venue.allowsMultipleDays ? 'Multi-dia' : 'Un dia'}
            </Badge>
          </div>
        </section>

        {primaryUses.length || secondaryUses.length ? (
          <section className="sf-card p-5">
            <h2 className="font-semibold">Ideal para</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...primaryUses, ...secondaryUses].map((item) => (
                <Badge
                  key={item.id}
                  variant={item.isPrimary ? 'secondary' : 'outline'}
                  className={item.isPrimary ? 'sf-badge-muted' : ''}
                >
                  {useTypeLabels[item.useType]}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {amenityGroups.length ? (
          <section className="sf-card p-5">
            <h2 className="font-semibold">Comodidades y servicios</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {amenityGroups.map(([category, amenities]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {amenityCategoryLabels[category]}
                  </h3>
                  <div className="space-y-2">
                    {amenities.map((item) => (
                      <div
                        key={item.id}
                        className="sf-surface flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-primary" />
                        <span>{item.amenity.name}</span>
                        {item.extraCost ? (
                          <span className="text-muted-foreground">
                            + {formatCurrency(item.extraCost)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {venue.openingHours?.length ? (
          <section className="sf-card p-5">
            <h2 className="font-semibold">Horarios</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {venue.openingHours.map((item) => (
                <div
                  key={item.id}
                  className="sf-surface flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>{dayLabels[item.dayOfWeek]}</span>
                  <span className="font-medium">
                    {item.isClosed ? 'Cerrado' : `${item.opensAt} - ${item.closesAt}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {venue.rules || venue.cancellationPolicy ? (
          <section className="grid gap-4 md:grid-cols-2">
            {venue.rules ? (
              <div className="sf-card p-5">
                <h2 className="font-semibold">Reglas del espacio</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{venue.rules}</p>
              </div>
            ) : null}
            {venue.cancellationPolicy ? (
              <div className="sf-card p-5">
                <h2 className="font-semibold">Politica de cancelacion</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {venue.cancellationPolicy}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {venue.latitude && venue.longitude ? (
          <section className="sf-card p-5">
            <h2 className="font-semibold">Ubicacion</h2>
            <div className="sf-soft-gradient mt-3 flex min-h-52 items-center justify-center rounded-md text-center text-sm">
              <div>
                <Sparkles className="mx-auto mb-2 h-5 w-5" />
                Mapa interactivo pendiente. Coordenadas: {venue.latitude}, {venue.longitude}
              </div>
            </div>
          </section>
        ) : null}

        <AvailabilityCalendar venueId={venue.id} />
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <BookingForm venue={venue} />
      </aside>
    </div>
  );
};
