'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Check, Clock, Map, MapPin, Star, Users } from 'lucide-react';
import { getSimilarVenues, getVenueBySlug } from '@/lib/api/venues.api';
import { formatCurrency, formatTime12h } from '@/lib/formatters';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';
import { BookingForm } from '@/components/booking/booking-form';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCategory, Venue } from '@/types/api';
import { priceUnitLabels, spaceTypeLabels, useTypeLabels } from './venue-filter-labels';
import { VenueSimilarCard } from './venue-similar-card';

interface VenueDetailProps {
  slug: string;
}

const VenueLocationMap = dynamic(
  () => import('./venue-location-map').then((mod) => mod.VenueLocationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

const VenueDetailSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
    <div className="space-y-6">
      <Skeleton className="aspect-[16/9] w-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

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

const groupAmenities = (venue: Venue) =>
  (venue.amenities ?? []).reduce<Partial<Record<AmenityCategory, typeof venue.amenities>>>(
    (groups, item) => {
      const category = item.amenity.category;
      groups[category] = groups[category] ?? [];
      groups[category]?.push(item);
      return groups;
    },
    {},
  );

export const VenueDetail = ({ slug }: VenueDetailProps) => {
  const query = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => getVenueBySlug(slug),
  });

  const similarQuery = useQuery({
    queryKey: ['venue', slug, 'similar'],
    queryFn: () => getSimilarVenues(slug),
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
        {/* Gallery */}
        <section className="grid gap-2 md:grid-cols-[2fr_1fr]">
          <div className="sf-result-image min-h-[280px] shadow-sm md:min-h-[360px]">
            {mainPhoto ? (
              <Image src={mainPhoto} alt={venue.name} fill className="object-cover" priority />
            ) : (
              <div className="sf-gradient-subtle flex h-full items-center justify-center text-muted-foreground">
                Sin foto
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {photos.slice(1, 3).map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                className="relative min-h-32 overflow-hidden rounded-lg bg-muted shadow-sm"
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
              <div className="sf-gradient-subtle flex min-h-32 items-center justify-center rounded-lg text-sm text-muted-foreground">
                Galeria pendiente
              </div>
            ) : null}
          </div>
        </section>

        {/* Header */}
        <section className="sf-detail-section">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                {venue.spaceType ? (
                  <Badge variant="secondary">{spaceTypeLabels[venue.spaceType]}</Badge>
                ) : null}
                {venue.instantBooking ? <Badge>Reserva inmediata</Badge> : null}
                {venue.isVerified ? (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Verificado
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-bold">{venue.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {venue.district}, {venue.city}
                </p>
                {venue.averageRating ? (
                  <p className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {venue.averageRating.toFixed(1)}
                    <span className="font-normal text-muted-foreground">
                      ({venue.reviewCount} {venue.reviewCount === 1 ? 'resena' : 'resenas'})
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="sf-surface min-w-44 border p-4 text-right shadow-sm">
              <p className="sf-price-label">Desde</p>
              <p className="sf-price">{basePrice > 0 ? formatCurrency(basePrice) : 'Consultar'}</p>
              <p className="sf-price-unit">por {priceUnitLabels[venue.priceUnit].toLowerCase()}</p>
            </div>
          </div>
          <p className="mt-4 leading-7 text-muted-foreground">{venue.description}</p>
        </section>

        {/* Summary */}
        <section className="sf-detail-section">
          <h2 className="sf-detail-title">Resumen del espacio</h2>
          <div className="sf-detail-grid">
            <Badge variant="secondary" className="justify-center gap-1.5 py-2.5">
              <Users className="h-4 w-4" />
              {venue.capacityMin}-{venue.capacityMax} personas
            </Badge>
            <Badge variant="accent" className="justify-center gap-1.5 py-2.5">
              <Clock className="h-4 w-4" />
              Min. {venue.minimumHours} horas
            </Badge>
            <Badge variant="warning" className="justify-center gap-1.5 py-2.5">
              <CalendarClock className="h-4 w-4" />
              {venue.allowsMultipleDays ? 'Multi-dia' : 'Un dia'}
            </Badge>
          </div>
        </section>

        {/* Use Types */}
        {primaryUses.length || secondaryUses.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Ideal para</h2>
            <div className="flex flex-wrap gap-2">
              {[...primaryUses, ...secondaryUses].map((item) => (
                <Badge key={item.id} variant={item.isPrimary ? 'secondary' : 'outline'}>
                  {useTypeLabels[item.useType]}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* Amenities */}
        {amenityGroups.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Comodidades y servicios</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {amenityGroups.map(([category, amenities]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {amenityCategoryLabels[category]}
                  </h3>
                  <div className="space-y-2">
                    {amenities.map((item) => (
                      <div
                        key={item.id}
                        className="sf-surface flex items-center gap-2.5 px-3 py-2.5 text-sm"
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

        {/* Opening Hours */}
        {venue.openingHours?.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Horarios</h2>
            <div className="sf-detail-grid">
              {venue.openingHours.map((item) => (
                <div key={item.id} className="sf-surface flex items-center justify-between border p-3 text-sm">
                  <span>{dayLabels[item.dayOfWeek]}</span>
                  <span className="font-medium">
                    {item.isClosed
                      ? 'Cerrado'
                      : `${formatTime12h(item.opensAt)} - ${formatTime12h(item.closesAt)}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Rules & Cancellation */}
        {venue.rules || venue.cancellationPolicy ? (
          <section className="grid gap-4 md:grid-cols-2">
            {venue.rules ? (
              <div className="sf-detail-section">
                <h2 className="sf-detail-title">Reglas del espacio</h2>
                <p className="text-sm leading-6 text-muted-foreground">{venue.rules}</p>
              </div>
            ) : null}
            {venue.cancellationPolicy ? (
              <div className="sf-detail-section">
                <h2 className="sf-detail-title">Politica de cancelacion</h2>
                <p className="text-sm leading-6 text-muted-foreground">{venue.cancellationPolicy}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Location */}
        <section className="sf-detail-section">
          <h2 className="sf-detail-title">Ubicacion</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {venue.address ? `${venue.address}, ` : ''}
            {venue.district}, {venue.city}
          </p>
          {venue.latitude && venue.longitude ? (
            <div className="mt-3 h-64 w-full overflow-hidden rounded-lg border">
              <VenueLocationMap
                latitude={venue.latitude}
                longitude={venue.longitude}
                name={venue.name}
              />
            </div>
          ) : (
            <div className="sf-gradient-subtle mt-3 flex min-h-52 items-center justify-center rounded-lg text-center text-sm">
              <div>
                <Map className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-semibold">Mapa no disponible</p>
                <p className="mt-1 text-muted-foreground">
                  Coordenadas exactas no disponibles todavia.
                </p>
              </div>
            </div>
          )}
        </section>

        <AvailabilityCalendar venueId={venue.id} />
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <BookingForm venue={venue} />
      </aside>

      {similarQuery.data?.length ? (
        <section className="sf-detail-section lg:col-span-2">
          <h2 className="sf-detail-title">Espacios similares</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarQuery.data.map((similarVenue) => (
              <VenueSimilarCard key={similarVenue.id} venue={similarVenue} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
