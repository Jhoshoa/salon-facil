'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Users } from 'lucide-react';
import { getVenueBySlug } from '@/lib/api/venues.api';
import { formatCurrency } from '@/lib/formatters';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';
import { BookingForm } from '@/components/booking/booking-form';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

export const VenueDetail = ({ slug }: VenueDetailProps) => {
  const query = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => getVenueBySlug(slug),
  });

  if (query.isLoading) return <VenueDetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const venue = query.data;
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
  const mainPhoto = venue.photos?.[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-muted">
          {mainPhoto ? (
            <Image src={mainPhoto} alt={venue.name} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sin foto
            </div>
          )}
        </div>

        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{venue.name}</h1>
              <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {venue.district}, {venue.city}
              </p>
            </div>
            {basePrice > 0 ? (
              <Badge variant="outline">Desde {formatCurrency(basePrice)}</Badge>
            ) : null}
          </div>
          <p className="mt-4 leading-7 text-muted-foreground">{venue.description}</p>
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Capacidad y servicios</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3.5 w-3.5" />
              Hasta {venue.capacityMax} personas
            </Badge>
            {venue.services?.map((service) => (
              <Badge key={service.id} variant={service.isIncluded ? 'outline' : 'secondary'}>
                {service.name}
              </Badge>
            ))}
          </div>
        </section>

        <AvailabilityCalendar venueId={venue.id} />
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <BookingForm venue={venue} />
      </aside>
    </div>
  );
};
