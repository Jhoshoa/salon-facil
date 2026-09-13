'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Grid2x2, Map, MapPin, Plus, SearchX, Star, X } from 'lucide-react';
import { checkAvailabilityRange } from '@/lib/api/bookings.api';
import { getSimilarVenues, getVenueById, getVenueBySlug } from '@/lib/api/venues.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency, formatTime12h } from '@/lib/formatters';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { departamentoLabels } from './venue-filter-labels';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';
import { BookingForm } from '@/components/booking/booking-form';
import { VenueReviews } from '@/components/reviews/venue-reviews';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/shared/brand-icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmenityCategory, ApiError, Venue } from '@/types/api';
import { MobileBookingSheet } from './mobile-booking-sheet';
import { PhotoLightbox } from './photo-lightbox';
import { VenueSimilarCard } from './venue-similar-card';

interface VenueDetailProps {
  /** Public lookup by slug — only resolves ACTIVE + verified venues (see getVenueBySlug). */
  slug?: string;
  /** Authenticated preview by ID (the venue's OWNER, or an ADMIN) — resolves a venue in any
   * status, since previewing a draft/pending/deactivated listing is exactly the point. Takes
   * precedence over `slug` when both are somehow passed. The "similar venues" section is
   * skipped in this mode (it's a public-only feature, not worth wiring up for a preview). */
  venueId?: string;
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

// Grid template + per-cell col/row spans for the desktop photo mosaic, keyed by how many photos
// are actually shown (1-5). Tailwind's JIT scanner only picks up classes that appear literally
// in source, so this has to be a lookup of full class strings rather than something built with
// `col-span-${n}` at runtime. Each layout is hand-picked to fill every cell in a 4x2 grid with no
// gaps -- ordinary CSS grid auto-placement leaves blank cells for anything other than exactly 5
// items when one of them spans 2x2.
const MOSAIC_LAYOUTS: Record<number, { container: string; cells: string[] }> = {
  1: { container: 'grid-cols-1 grid-rows-1', cells: ['col-span-1 row-span-1'] },
  2: {
    container: 'grid-cols-2 grid-rows-1',
    cells: ['col-span-1 row-span-1', 'col-span-1 row-span-1'],
  },
  3: {
    container: 'grid-cols-4 grid-rows-2',
    cells: ['col-span-2 row-span-2', 'col-span-2 row-span-1', 'col-span-2 row-span-1'],
  },
  4: {
    container: 'grid-cols-4 grid-rows-2',
    cells: [
      'col-span-2 row-span-2',
      'col-span-2 row-span-1',
      'col-span-1 row-span-1',
      'col-span-1 row-span-1',
    ],
  },
  5: {
    container: 'grid-cols-4 grid-rows-2',
    cells: [
      'col-span-2 row-span-2',
      'col-span-1 row-span-1',
      'col-span-1 row-span-1',
      'col-span-1 row-span-1',
      'col-span-1 row-span-1',
    ],
  },
};

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
  venueId,
  initialStartDate,
  initialEndDate,
  mapHref,
}: VenueDetailProps) => {
  const query = useQuery<Venue, ApiError>({
    queryKey: ['venue', venueId ?? slug],
    queryFn: () => (venueId ? getVenueById(venueId) : getVenueBySlug(slug!)),
  });

  const similarQuery = useQuery({
    queryKey: ['venue', slug, 'similar'],
    queryFn: () => getSimilarVenues(slug!),
    enabled: !venueId && Boolean(slug),
  });

  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | undefined>(
    initialStartDate
      ? { start: initialStartDate, end: initialEndDate ?? initialStartDate }
      : undefined,
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
  if (query.isError) {
    // A 404 here means "doesn't exist or isn't public" (the backend deliberately conflates the
    // two, see getVenueBySlug) -- a permanent state, not a transient failure, so retrying can
    // never help. Point the visitor back to the search instead of a "Reintentar" that only
    // implies a connection problem that isn't actually happening.
    if (query.error?.statusCode === 404) {
      return (
        <EmptyState
          icon={SearchX}
          title="Este local no esta disponible"
          description="Puede que ya no exista o que el propietario todavia no lo haya publicado."
          action={
            <Button asChild variant="outline">
              <Link href="/venues">Buscar otros espacios</Link>
            </Button>
          }
        />
      );
    }
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const venue = query.data;
  const photos = getVenuePhotos(venue);
  // Mobile: a swipeable strip of "prints" -- three is plenty to convey there's more without a
  // grid that would be too cramped on a narrow screen. Desktop/tablet: a mosaic (one big photo +
  // up to four smaller ones) that shows more of the gallery at a glance, closer to how a real
  // photo grid works than a single scrolling row -- see "Ver todas las fotos" analysis this was
  // rebuilt for. Both read from the same underlying `photos` array/order.
  const galleryPhotos = photos.slice(0, 3);
  const extraPhotoCount = photos.length - galleryPhotos.length;
  const mosaicPhotos = photos.slice(0, 5);
  const mosaicExtraCount = photos.length - mosaicPhotos.length;
  const mosaicLayout = MOSAIC_LAYOUTS[mosaicPhotos.length] ?? MOSAIC_LAYOUTS[5];
  const includedAmenityGroups = Object.entries(
    groupAmenities(venue, (item) => item.isIncluded),
  ) as [AmenityCategory, NonNullable<Venue['amenities']>][];
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
          {photos.length ? (
            <>
              {/* Mobile: scroll horizontal de "prints" enmarcados */}
              <section className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 sm:hidden">
                {galleryPhotos.map((photo, index) => {
                  const showMoreOverlay = index === galleryPhotos.length - 1 && extraPhotoCount > 0;
                  const rotate = index % 2 === 0 ? '-rotate-[1.2deg]' : 'rotate-[1deg]';
                  return (
                    <button
                      key={`${photo}-${index}`}
                      type="button"
                      onClick={() => setLightbox({ open: true, index })}
                      aria-label={
                        showMoreOverlay ? `Ver las ${photos.length} fotos` : 'Ver foto ampliada'
                      }
                      className={`relative w-[82%] shrink-0 cursor-zoom-in snap-center border border-border bg-card p-2 pb-8 text-left shadow-md ${rotate}`}
                    >
                      <div className="relative h-[190px]">
                        <Image
                          src={photo}
                          alt={`${venue.name} ${index + 1}`}
                          fill
                          className="object-cover"
                          loader={cloudinaryImageLoader}
                          sizes="82vw"
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
                })}
              </section>

              {/* Desktop/tablet: mosaico -- una foto grande + hasta cuatro chicas, con boton
                  "Ver todas" siempre visible en vez de depender de que la ultima celda alcance a
                  mostrar el overlay "+N" (que solo aparecia con 4+ fotos). */}
              <section
                className={`relative hidden gap-1.5 overflow-hidden rounded-[var(--radius)] sm:grid sm:h-[420px] ${mosaicLayout.container}`}
              >
                {mosaicPhotos.map((photo, index) => {
                  const isBig = index === 0;
                  const isLastVisible = index === mosaicPhotos.length - 1;
                  const showMoreOverlay = isLastVisible && mosaicExtraCount > 0;
                  return (
                    <button
                      key={`${photo}-${index}`}
                      type="button"
                      onClick={() => setLightbox({ open: true, index })}
                      aria-label={
                        showMoreOverlay ? `Ver las ${photos.length} fotos` : 'Ver foto ampliada'
                      }
                      className={`group relative cursor-zoom-in overflow-hidden ${mosaicLayout.cells[index]}`}
                    >
                      <Image
                        src={photo}
                        alt={`${venue.name} ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loader={cloudinaryImageLoader}
                        sizes={isBig ? '50vw' : '25vw'}
                        priority={isBig}
                      />
                      {showMoreOverlay ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                          +{mosaicExtraCount}
                        </div>
                      ) : null}
                    </button>
                  );
                })}

                {photos.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLightbox({ open: true, index: 0 })}
                    className="absolute bottom-3 right-3 bg-background/95 shadow-md"
                  >
                    <Grid2x2 className="h-4 w-4" />
                    Ver las {photos.length} fotos
                  </Button>
                ) : null}
              </section>
            </>
          ) : (
            <div className="sf-gradient-subtle flex h-[240px] w-full items-center justify-center text-sm text-muted-foreground sm:h-[420px]">
              Sin fotos
            </div>
          )}

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
                        ({venue.reviewCount} {venue.reviewCount === 1 ? 'reseña' : 'reseñas'})
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
              {venue.isVerified ? (
                <span className="sf-stamp shrink-0">
                  verificado
                  <br />
                  mi evento
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
              <div className="border-warning bg-warning/10 flex items-start justify-between gap-2 border-l-2 p-3 text-sm text-foreground">
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
