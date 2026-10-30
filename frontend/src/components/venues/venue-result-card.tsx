import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Clock, MapPin, Sparkles, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
import type { Venue } from '@/types/api';
import { departamentoLabels } from './venue-filter-labels';
import { FavoriteButton } from './favorite-button';

interface VenueResultCardProps {
  venue: Venue;
  startDate?: string;
  endDate?: string;
  /** Full current search query string (no leading "?"), so a later "Ver en el mapa" from the
   * detail page can reopen the map with the exact same criteria instead of just the dates. */
  searchQueryString?: string;
}

/** The real price for the searched date when the backend resolved one (season/holiday/weekend
 * rules already applied) -- falls back to the generic BASE price when there's no date in play. */
const getDisplayPrice = (venue: Venue) => {
  if (venue.effectivePrice != null) return venue.effectivePrice;
  return venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
};

const priceUnitLabel: Record<NonNullable<Venue['priceUnit']>, string> = {
  HOUR: 'hora',
  DAY: 'dia',
};

export const VenueResultCard = ({
  venue,
  startDate,
  endDate,
  searchQueryString,
}: VenueResultCardProps) => {
  const photo =
    venue.media?.find((item) => item.isCover)?.url ?? venue.media?.[0]?.url ?? venue.photos?.[0];
  const displayPrice = getDisplayPrice(venue);
  const amenities = venue.amenities?.slice(0, 4) ?? [];
  const services = amenities.length ? [] : (venue.services?.slice(0, 3) ?? []);

  const detailHref = (() => {
    if (searchQueryString) return `/venues/${venue.slug}?${searchQueryString}`;
    if (!startDate) return `/venues/${venue.slug}`;
    const params = new URLSearchParams({ startDate });
    if (endDate) params.set('endDate', endDate);
    return `/venues/${venue.slug}?${params.toString()}`;
  })();

  return (
    <article className="sf-result-card grid-cols-[96px_1fr] gap-3 md:grid-cols-[280px_1fr] md:gap-4">
      <Link href={detailHref} className="sf-result-image sf-focus-ring">
        {photo ? (
          <Image
            src={photo}
            alt={venue.name}
            fill
            className="object-cover"
            loader={cloudinaryImageLoader}
            sizes="(min-width: 768px) 280px, 96px"
          />
        ) : (
          <div className="sf-gradient-subtle flex h-full items-center justify-center text-sm text-muted-foreground">
            Foto pendiente
          </div>
        )}
        {/* Overlaid badges/favorite only make sense once the photo has room to show them
            legibly -- on the small mobile thumbnail they'd be unreadable, so mobile gets its
            own compact favorite button below instead and drops the badges entirely. */}
        <div className="absolute left-3 top-3 hidden flex-wrap gap-2 md:flex">
          {venue.instantBooking ? <Badge>Reserva inmediata</Badge> : null}
          {venue.isVerified ? (
            <Badge variant="secondary" className="bg-card/95">
              Verificado
            </Badge>
          ) : null}
        </div>
        <FavoriteButton
          venueId={venue.id}
          className="absolute right-3 top-3 hidden md:inline-flex"
        />
      </Link>

      <div className="space-y-2 py-0.5 md:space-y-3 md:py-1">
        <div className="flex items-start justify-between gap-2 md:block">
          <div className="min-w-0 flex-1 md:flex-none">
            <Link
              href={detailHref}
              className="line-clamp-1 text-base font-semibold text-foreground hover:text-primary md:line-clamp-none md:text-xl"
            >
              {venue.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:mt-1.5 md:text-sm">
              <p className="flex min-w-0 items-center gap-1 md:gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                <span className="truncate">
                  {venue.district}, {departamentoLabels[venue.departamento]}
                </span>
              </p>
              {venue.averageRating ? (
                <p className="flex shrink-0 items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 md:h-4 md:w-4" />
                  {venue.averageRating.toFixed(1)}
                  <span className="hidden font-normal text-muted-foreground md:inline">
                    ({venue.reviewCount})
                  </span>
                </p>
              ) : null}
            </div>
          </div>
          {/* Mobile-only: the overlay favorite button above is hidden at this size, so this is
              the only way to favorite a venue straight from the list on a phone. */}
          <FavoriteButton
            venueId={venue.id}
            variant="solid"
            className="h-8 w-8 shrink-0 md:hidden"
          />
        </div>

        {venue.shortDescription || venue.description ? (
          <p className="line-clamp-2 hidden text-sm leading-relaxed text-muted-foreground md:block">
            {venue.shortDescription ?? venue.description}
          </p>
        ) : null}

        <div className="hidden flex-wrap gap-2 md:flex">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {venue.capacityMin}-{venue.capacityMax} personas
          </Badge>
          {venue.spaceType ? <Badge variant="accent">{venue.spaceType.name}</Badge> : null}
        </div>

        {amenities.length ? (
          <div className="hidden gap-1.5 text-sm text-primary sm:grid-cols-2 md:grid">
            {amenities.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {item.amenity.name}
              </span>
            ))}
          </div>
        ) : services.length ? (
          <div className="hidden gap-1.5 text-sm text-primary sm:grid-cols-2 md:grid">
            {services.map((service) => (
              <span key={service.id} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                {service.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="sf-result-footer">
          <div>
            <p className="text-base font-semibold leading-tight md:text-lg">
              {displayPrice > 0 ? formatCurrency(displayPrice) : 'Consultar'}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                por {priceUnitLabel[venue.priceUnit] ?? 'evento'}
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground md:gap-1.5">
              <Users className="h-3.5 w-3.5 md:hidden" />
              <span className="md:hidden">
                {venue.capacityMin}-{venue.capacityMax} personas
              </span>
              <Clock className="hidden h-3.5 w-3.5 md:inline" />
              <span className="hidden md:inline">Min. {venue.minimumHours} h</span>
            </p>
          </div>
          {/* Mobile: a small chevron is enough -- the photo, name and this whole row are
              already tappable, so a full "Ver detalles" button would just repeat itself. */}
          <Link
            href={detailHref}
            aria-label="Ver detalles"
            className="shrink-0 text-primary md:hidden"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href={detailHref}>
              Ver detalles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};
