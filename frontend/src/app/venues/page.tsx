import { VenueSearch } from '@/components/venues/venue-search';

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
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase text-muted-foreground">Busqueda</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Locales disponibles</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Compara capacidad, servicios y disponibilidad antes de solicitar tu reserva.
          </p>
        </div>
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
