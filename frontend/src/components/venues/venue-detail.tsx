'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Map, MapPin, Plus, Star, X } from 'lucide-react';
import { checkAvailabilityRange } from '@/lib/api/bookings.api';
import { getSimilarVenues, getVenueBySlug } from '@/lib/api/venues.api';
import { formatCurrency, formatTime12h } from '@/lib/formatters';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
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
  const galleryPhotos = photos.slice(0, 3);
  const extraPhotoCount = photos.length - galleryPhotos.length;
  const includedAmenityGroups = Object.entries(groupAmenities(venue, (item) => item.isIncluded)) as [
    AmenityCategory,
    NonNullable<Venue['amenities']>,
  ][];
  const extraAmenityGroups = Object.entries(groupAmenities(venue, (item) => !item.isIncluded)) as [
    AmenityCategory,
    NonNullable<Venue['amenities']>,
  ][];
  const allUses = [
    ...(venue.uses?.filter((item) => item.isPrimary) ?? []),
    ...(venue.uses?.filter((item) => !item.isPrimary).slice(0, 6) ?? []),
  ];
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
  const displayedPrice = liveTotal ?? basePrice;

  return (
    <div className={`space-y-2 ${!isDesktop ? 'pb-24' : ''}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {/* Gallery — scroll horizontal de "prints" enmarcados */}
        <section className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {galleryPhotos.length ? (
            galleryPhotos.map((photo, index) => {
              const showMoreOverlay = index === galleryPhotos.length - 1 && extraPhotoCount > 0;
              const rotate = index % 2 === 0 ? '-rotate-[1.2deg]' : 'rotate-[1deg]';
              return (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  onClick={() => setLightbox({ open: true, index })}
                  aria-label={showMoreOverlay ? `Ver las ${photos.length} fotos` : 'Ver foto ampliada'}
                  className={`relative w-[82%] shrink-0 snap-center cursor-zoom-in border border-border bg-card p-2 pb-8 text-left shadow-md sm:w-[46%] lg:w-[32%] ${rotate}`}
                >
                  <div className="relative h-[190px] sm:h-[240px]">
                    <Image
                      src={photo}
                      alt={`${venue.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 32vw, (min-width: 640px) 46vw, 82vw"
                      priority={index === 0}
                    />
                    {showMoreOverlay ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                        +{extraPhotoCount}
                      </div>
                    ) : null}
                  </div>
                  <p className="absolute bottom-2 left-3 right-3 truncate font-serif text-sm italic text-foreground">
                    {venue.name}
                  </p>
                </button>
              );
            })
          ) : (
            <div className="sf-gradient-subtle flex h-[240px] w-full items-center justify-center text-sm text-muted-foreground">
              Sin fotos
            </div>
          )}
        </section>

        <PhotoLightbox
          photos={photos}
          alt={venue.name}
          index={lightbox.index}
          open={lightbox.open}
          onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
          onIndexChange={(index) => setLightbox((prev) => ({ ...prev, index }))}
        />

        {/* Title */}
        <section className="sf-detail-section">
          <div className="flex items-start justify-between gap-4">
            <div>
              {venue.spaceType ? (
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {venue.spaceType.name}
                  {venue.instantBooking ? ' · Reserva inmediata' : ''}
                </p>
              ) : null}
              <h1 className="mb-2">{venue.name}</h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  <span className="text-accent-foreground">— </span>
                  {venue.district}, {departamentoLabels[venue.departamento]}
                </span>
                {venue.averageRating ? (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {venue.averageRating.toFixed(1)}
                    <span className="font-normal text-muted-foreground">
                      ({venue.reviewCount} {venue.reviewCount === 1 ? 'resena' : 'resenas'})
                    </span>
                  </span>
                ) : null}
              </p>
            </div>
            {venue.isVerified ? (
              <span className="sf-stamp shrink-0">
                verificado
                <br />
                salonfacil
              </span>
            ) : null}
          </div>
          {venue.description ? (
            <p className="font-serif text-base italic leading-7 text-foreground/80">
              {venue.description}
            </p>
          ) : null}
          {venue.contactPhone || venue.facebookUrl || venue.instagramUrl || venue.tiktokUrl ? (
            <div className="flex flex-wrap gap-1">
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
        </section>

        {/* Summary — field-note stats */}
        <section className="sf-detail-section">
          <h2 className="sf-detail-title">Resumen del espacio</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-serif text-2xl font-semibold leading-none text-primary">
                {venue.capacityMin}-{venue.capacityMax}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">personas</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold leading-none text-primary">
                {venue.minimumHours}h
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">minimo por reserva</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold leading-none text-primary">
                {venue.allowsMultipleDays ? 'Multi' : '1'}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {venue.allowsMultipleDays ? 'varios dias' : 'dia por reserva'}
              </p>
            </div>
          </div>
        </section>

        {/* Use Types — tag list */}
        {allUses.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Ideal para</h2>
            <div className="flex flex-wrap text-sm">
              {allUses.map((item, index) => (
                <span
                  key={item.id}
                  className={cn(
                    'mb-1.5 mr-2.5 pr-2.5',
                    index < allUses.length - 1 && 'border-r border-border',
                    item.isPrimary
                      ? 'relative font-bold text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-[1.5px] after:bg-secondary'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.useType.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* Amenities included in the base price */}
        {includedAmenityGroups.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Comodidades y servicios incluidos</h2>
            <div>
              {includedAmenityGroups.map(([category, amenities]) => (
                <div key={category}>
                  <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
                    {amenityCategoryLabels[category]}
                  </p>
                  {amenities.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 border-t border-border py-2.5 text-sm first:border-t-0"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-city-green" />
                      <span>{item.amenity.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Amenities available at an extra cost */}
        {extraAmenityGroups.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Comodidades y servicios con costo extra</h2>
            <div>
              {extraAmenityGroups.map(([category, amenities]) => (
                <div key={category}>
                  <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
                    {amenityCategoryLabels[category]}
                  </p>
                  {amenities.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 border-t border-border py-2.5 text-sm first:border-t-0"
                    >
                      <span className="flex items-center gap-2.5">
                        <Plus className="h-3.5 w-3.5 shrink-0 text-accent-foreground" />
                        {item.amenity.name}
                      </span>
                      {item.extraCost ? (
                        <span className="font-serif italic text-accent-foreground">
                          {formatCurrency(item.extraCost)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Opening Hours */}
        {venue.openingHours?.length ? (
          <section className="sf-detail-section">
            <h2 className="sf-detail-title">Horarios</h2>
            <div>
              {venue.openingHours.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 border-t border-border py-2.5 text-sm first:border-t-0"
                >
                  <span className="font-semibold">{dayLabels[item.dayOfWeek]}</span>
                  <span
                    className={`whitespace-nowrap ${item.isClosed ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
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
          <section className="sf-detail-section grid gap-6 md:grid-cols-2">
            {venue.rules ? (
              <div>
                <div className="sf-kicker">
                  <span>Reglas del espacio</span>
                </div>
                <p className="font-serif text-sm italic leading-6 text-muted-foreground">
                  {venue.rules}
                </p>
              </div>
            ) : null}
            {venue.cancellationPolicy ? (
              <div>
                <div className="sf-kicker">
                  <span>Politica de cancelacion</span>
                </div>
                <p className="font-serif text-sm italic leading-6 text-muted-foreground">
                  {venue.cancellationPolicy}
                </p>
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
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {venue.address ? `${venue.address}, ` : ''}
            {venue.district}, {departamentoLabels[venue.departamento]}
          </p>
          {venue.latitude && venue.longitude ? (
            <div className="isolate h-64 w-full border border-border bg-card p-2 shadow-md">
              <VenueLocationMap
                latitude={venue.latitude}
                longitude={venue.longitude}
                name={venue.name}
              />
            </div>
          ) : (
            <div className="sf-gradient-subtle flex min-h-52 items-center justify-center text-center text-sm">
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

        <section className="sf-detail-section">
          <AvailabilityCalendar
            venueId={venue.id}
            allowsMultipleDays={venue.allowsMultipleDays}
            openingHours={venue.openingHours}
            onRangeSelect={handleRangeChange}
            externalRange={selectedRange}
          />
        </section>

        {venue.reviewCount ? (
          <section className="sf-detail-section">
            <VenueReviews
              venueId={venue.id}
              ownerId={venue.ownerId}
              averageRating={venue.averageRating}
              reviewCount={venue.reviewCount}
            />
          </section>
        ) : null}
      </div>

      {isDesktop ? (
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[380px] lg:space-y-3">
          {staleRangeNotice ? (
            <div className="flex items-start justify-between gap-2 border-l-2 border-warning bg-warning/10 p-3 text-sm text-foreground">
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
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {liveTotal != null ? 'Total estimado' : 'Precio base'}
                </p>
                <p className="font-serif text-xl font-semibold text-primary">
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
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {similarQuery.data.map((similarVenue) => (
              <VenueSimilarCard key={similarVenue.id} venue={similarVenue} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
