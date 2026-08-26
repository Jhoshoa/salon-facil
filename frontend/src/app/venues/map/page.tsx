import { VenueMapExplorer } from '@/components/venues/venue-map-explorer';
import { SiteHeader } from '@/components/shared/site-header';
import type { PriceUnit, VenueSearchParams } from '@/types/api';

interface VenueMapPageProps {
  searchParams: {
    query?: string;
    startDate?: string;
    endDate?: string;
    capacity?: string;
    district?: string;
    minPrice?: string;
    maxPrice?: string;
    minCapacity?: string;
    services?: string;
    amenities?: string;
    spaceTypes?: string;
    useTypes?: string;
    priceUnit?: string;
    instantBooking?: string;
    highlight?: string;
  };
}

const splitCsv = (value?: string) => (value ? value.split(',').filter(Boolean) : undefined);

export default function VenueMapPage({ searchParams }: VenueMapPageProps) {
  const params: VenueSearchParams = {
    query: searchParams.query,
    district: searchParams.district,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    guestCount: searchParams.capacity ? Number(searchParams.capacity) : undefined,
    minCapacity: searchParams.minCapacity ? Number(searchParams.minCapacity) : undefined,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    services: searchParams.services,
    amenities: splitCsv(searchParams.amenities),
    spaceTypes: splitCsv(searchParams.spaceTypes),
    useTypes: splitCsv(searchParams.useTypes),
    priceUnit: (searchParams.priceUnit as PriceUnit | undefined) || undefined,
    instantBooking: searchParams.instantBooking === 'true' ? true : undefined,
  };

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <VenueMapExplorer searchParams={params} highlightSlug={searchParams.highlight} />
    </main>
  );
}
