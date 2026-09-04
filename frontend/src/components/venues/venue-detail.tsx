'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  Clock,
  Map,
  MapPin,
  Plus,
  Star,
  Users,
  X,
} from 'lucide-react';
import { checkAvailabilityRange } from '@/lib/api/bookings.api';
import { getSimilarVenues, getVenueBySlug } from '@/lib/api/venues.api';
import { formatCurrency, formatTime12h } from '@/lib/formatters';
import { useMediaQuery } from '@/hooks/use-media-query';
import { departamentoLabels } from './venue-filter-labels';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';
import { BookingForm } from '@/components/booking/booking-form';
import { VenueReviews } from '@/components/reviews/venue-reviews';
import { ErrorState } from '@/components/shared/error-state';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/shared/brand-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCategory, Venue } from '@/types/api';
import { MobileBookingSheet } from './mobile-booking-sheet';
import { PhotoLightbox } from './photo-lightbox';
import { VenueSimilarCard } from './venue-similar-card';

interface VenueDetailProps {
  slug: string;
  initialStartDate?: string;
  initialEndDate?: string;
  /** Link back to the full-page map view, pre-loaded with the same search criteria the user
   * arrived with and this venue highlighted. */
  mapHref?: string;
}

const VenueLocationMap = dynamic(
  () => import('./venue-location-map').then((mod) => mod.VenueLocationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

const VenueDetailSkeleton = () => (
  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
    <div className="min-w-0 flex-1 space-y-6">
      <Skeleton className="aspect-[16/9] w-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-96 w-full shrink-0 lg:w-[380px]" />
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

const groupAmenities = (
  venue: Venue,
  predicate: (item: NonNullable<Venue['amenities']>[number]) => boolean,
) =>
  (venue.amenities ?? [])
    .filter(predicate)
    .reduce<Partial<Record<AmenityCategory, typeof venue.amenities>>>((groups, item) => {
      const category = item.amenity.category;
      groups[category] = groups[category] ?? [];
      groups[category]?.push(item);
      return groups;
    }, {});

export const VenueDetail = ({
  slug,
  initialStartDate,
  initialEndDate,
  mapHref,
}: VenueDetailProps) => {
  const query = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => getVenueBySlug(slug),
  });

  const similarQuery = useQuery({
    queryKey: ['venue', slug, 'similar'],
    queryFn: () => getSimilarVenues(slug),
  });

  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | undefined>(
    initialStartDate ? { start: initialStartDate, end: initialEndDate ?? initialStartDate } : undefined,
  );
  const [staleRangeNotice, setStaleRangeNotice] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);

  const rangeValidationQuery = useQuery({
    queryKey: ['venue-availability-range-check', query.data?.id, initialStartDate, initialEndDate],
    queryFn: () =>
      checkAvailabilityRange(
        query.data!.id,
        initialStartDate!,
        initialEndDate ?? initialStartDate!,
      ),
    enabled: Boolean(initialStartDate) && Boolean(query.data?.id),
  });

  useEffect(() => {
    if (!rangeValidationQuery.data) return;
    const allAvailable = rangeValidationQuery.data.every((day) => day.available);
    if (!allAvailable) {
      setSelectedRange(undefined);
      setStaleRangeNotice('Las fechas que buscaste ya no estan disponibles para este local.');
    }
  }, [rangeValidationQuery.data]);

  const handleRangeChange = (start: string, end: string) => {
    setSelectedRange({ start, end });
    setStaleRangeNotice(null);
  };

  if (query.isLoading) return <VenueDetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const venue = query.data;
  const photos = getVenuePhotos(venue);
  const mainPhoto = photos[0];
  const includedAmenityGroups = Object.entries(groupAmenities(venue, (item) => item.isIncluded)) as [
    AmenityCategory,
    NonNullable<Venue['amenities']>,
  ][];
  const extraAmenityGroups = Object.entries(groupAmenities(venue, (item) => !item.isIncluded)) as [
    AmenityCategory,
    NonNullable<Venue['amenities']>,
  ][];
  const primaryUses = venue.uses?.filter((item) => item.isPrimary) ?? [];
  const secondaryUses = venue.uses?.filter((item) => !item.isPrimary).slice(0, 6) ?? [];
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
  const displayedPrice = liveTotal ?? basePrice;

  return (
    <div className={`space-y-6 ${!isDesktop ? 'pb-24' : ''}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        {/* Gallery */}
        <section className="grid gap-2 md:grid-cols-[2fr_1fr]">
          {mainPhoto ? (
            <button
              type="button"
              onClick={() => setLightbox({ open: true, index: 0 })}
              aria-label="Ver foto ampliada"
              className="sf-result-image min-h-[280px] block w-full cursor-zoom-in border-0 p-0 shadow-sm md:min-h-[360px]"
            >
              <Image src={mainPhoto} alt={venue.name} fill className="object-cover" priority />
            </button>
          ) : (
            <div className="sf-result-image min-h-[280px] shadow-sm md:min-h-[360px]">
              <div className="sf-gradient-subtle flex h-full items-center justify-center text-muted-foreground">
                Sin foto
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {photos.slice(1, 3).map((photo, index) => {
              const photoIndex = index + 1;
              const extraCount = photos.length - 3;
              const showMoreOverlay = index === 1 && extraCount > 0;
              return (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  onClick={() => setLightbox({ open: true, index: photoIndex })}
                  aria-label={showMoreOverlay ? `Ver las ${photos.length} fotos` : 'Ver foto ampliada'}
                  className="relative min-h-32 cursor-zoom-in overflow-hidden rounded-lg border-0 bg-muted p-0 shadow-sm"
                >
                  <Image
                    src={photo}
                    alt={`${venue.name} ${photoIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                  {showMoreOverlay ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                      +{extraCount}
                    </div>
                  ) : null}
                </button>
              );
            })}
            {!photos.slice(1, 3).length ? (
              <div className="sf-gradient-subtle flex min-h-32 items-center justify-center rounded-lg text-sm text-muted-foreground">
                Galeria pendiente
              </div>
            ) : null}
          </div>
        </section>

        <PhotoLightbox
          photos={photos}
          alt={venue.name}
          index={lightbox.index}
          open={lightbox.open}
          onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
          onIndexChange={(index) => setLightbox((prev) => ({ ...prev, index }))}
        />

        {/* Header */}
        <section className="sf-detail-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {venue.spaceType ? <Badge variant="secondary">{venue.spaceType.name}</Badge> : null}
              {venue.instantBooking ? <Badge>Reserva inmediata</Badge> : null}
              {venue.isVerified ? (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Verificado
                </Badge>
              ) : null}
            </div>
            {venue.contactPhone || venue.facebookUrl || venue.instagramUrl || venue.tiktokUrl ? (
              <div className="flex flex-wrap gap-2">
                {venue.contactPhone ? (
                  <a
                    href={`https://wa.me/${venue.contactPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    title="WhatsApp"
                    className="inline-flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-80"
                    style={{ color: '#25D366' }}
                  >
                    <WhatsAppIcon className="h-6 w-6" />
                  </a>
                ) : null}
                {venue.facebookUrl ? (
                  <a
                    href={venue.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    title="Facebook"
                    className="inline-flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-80"
                    style={{ color: '#1877F2' }}
                  >
                    <FacebookIcon className="h-6 w-6" />
                  </a>
                ) : null}
                {venue.instagramUrl ? (
                  <a
                    href={venue.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    title="Instagram"
                    className="inline-flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-80"
                    style={{ color: '#E4405F' }}
                  >
                    <InstagramIcon className="h-6 w-6" />
                  </a>
                ) : null}
                {venue.tiktokUrl ? (
                  <a
                    href={venue.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    title="TikTok"
                    className="inline-flex h-9 w-9 items-center justify-center text-black transition-opacity hover:opacity-80"
                  >
                    <TikTokIcon className="h-6 w-6" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-bold">{venue.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {venue.district}, {departamentoLabels[venue.departamento]}
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
          {venue.description ? (
            <p className="mt-4 leading-7 text-muted-foreground">{venue.description}</p>
          ) : null}
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
                  {item.useType.name}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* Amenities included in the base price */}
        {includedAmenityGroups.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Comodidades y servicios incluidos</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {includedAmenityGroups.map(([category, amenities]) => (
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Amenities available at an extra cost */}
        {extraAmenityGroups.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Comodidades y servicios con costo extra</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {extraAmenityGroups.map(([category, amenities]) => (
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
                        <Plus className="h-4 w-4 text-accent" />
                        <span>{item.amenity.name}</span>
                        {item.extraCost ? (
                          <span className="text-muted-foreground">
                            {formatCurrency(item.extraCost)}
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
            <div className="space-y-2">
              {venue.openingHours.map((item) => (
                <div
                  key={item.id}
                  className="sf-surface flex items-center justify-between gap-2 rounded-[var(--radius)] border p-3 text-sm"
                >
                  <span>{dayLabels[item.dayOfWeek]}</span>
                  <span className="whitespace-nowrap font-medium">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="sf-detail-title">Ubicacion</h2>
            {mapHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={mapHref}>
                  <Map className="h-4 w-4" />
                  Ver en el mapa
                </Link>
              </Button>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {venue.address ? `${venue.address}, ` : ''}
            {venue.district}, {departamentoLabels[venue.departamento]}
          </p>
          {venue.latitude && venue.longitude ? (
            <div className="isolate mt-3 h-64 w-full overflow-hidden rounded-lg border">
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

        <AvailabilityCalendar
          venueId={venue.id}
          allowsMultipleDays={venue.allowsMultipleDays}
          openingHours={venue.openingHours}
          onRangeSelect={handleRangeChange}
          externalRange={selectedRange}
        />

        {venue.reviewCount ? (
          <VenueReviews
            venueId={venue.id}
            ownerId={venue.ownerId}
            averageRating={venue.averageRating}
            reviewCount={venue.reviewCount}
          />
        ) : null}
      </div>

      {isDesktop ? (
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[380px] lg:space-y-3">
          {staleRangeNotice ? (
            <div className="sf-warning flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
              <p>{staleRangeNotice}</p>
              <button
                type="button"
                onClick={() => setStaleRangeNotice(null)}
                aria-label="Cerrar aviso"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <BookingForm
            venue={venue}
            selectedRange={selectedRange}
            onDatesChange={handleRangeChange}
            onPriceChange={setLiveTotal}
          />
        </aside>
      ) : null}
      </div>

      {!isDesktop ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {liveTotal != null ? 'Total estimado' : 'Precio base'}
                </p>
                <p className="text-lg font-bold">
                  {displayedPrice > 0 ? formatCurrency(displayedPrice) : 'Consultar'}
                </p>
              </div>
              <Button onClick={() => setMobileBookingOpen(true)}>Solicitar reserva</Button>
            </div>
          </div>
          <MobileBookingSheet
            open={mobileBookingOpen}
            onOpenChange={setMobileBookingOpen}
            venue={venue}
            selectedRange={selectedRange}
            onDatesChange={handleRangeChange}
            onPriceChange={setLiveTotal}
            staleRangeNotice={staleRangeNotice}
            onDismissStaleNotice={() => setStaleRangeNotice(null)}
          />
        </>
      ) : null}

      {similarQuery.data?.length ? (
        <section className="sf-detail-section">
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
