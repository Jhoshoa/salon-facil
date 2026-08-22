import { VenueSearch } from '@/components/venues/venue-search';
import { SiteHeader } from '@/components/shared/site-header';
import { Badge } from '@/components/ui/badge';

interface VenuesPageProps {
  searchParams: {
    query?: string;
    startDate?: string;
    endDate?: string;
    capacity?: string;
  };
}

export default function VenuesPage({ searchParams }: VenuesPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="sf-top-band border-b">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Badge className="sf-glass">Marketplace de espacios</Badge>
          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
              Locales disponibles
            </h1>
            <p className="sf-glass-muted mt-2 max-w-2xl text-sm leading-6 sm:text-base">
              Compara capacidad, comodidades, ubicación y disponibilidad con filtros pensados para
              eventos reales.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <VenueSearch
          initialQuery={searchParams.query}
          initialStartDate={searchParams.startDate}
          initialEndDate={searchParams.endDate}
          initialCapacity={searchParams.capacity}
        />
      </div>
    </main>
  );
}
