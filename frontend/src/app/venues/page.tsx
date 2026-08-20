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
          <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
                Locales disponibles
              </h1>
              <p className="sf-glass-muted mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                Compara capacidad, comodidades, ubicación y disponibilidad con filtros pensados para
                eventos reales.
              </p>
            </div>
            <div className="sf-glass-muted grid grid-cols-3 gap-2 text-center text-xs">
              <div className="sf-glass rounded-md border px-3 py-2">Fecha</div>
              <div className="sf-glass rounded-md border px-3 py-2">Aforo</div>
              <div className="sf-glass rounded-md border px-3 py-2">Filtros</div>
            </div>
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
