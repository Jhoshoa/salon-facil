import { VenueDetail } from '@/components/venues/venue-detail';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SiteHeader } from '@/components/shared/site-header';

interface VenueDetailPageProps {
  params: {
    slug: string;
  };
  // Next.js passes every query param through at runtime regardless of what's declared here —
  // kept loose so any filter carried over from the search page (district, price, amenities...)
  // round-trips back to the map view via "Ver en el mapa" instead of only startDate/endDate.
  searchParams: Record<string, string | undefined>;
}

// `@/lib/api/client`'s buildQueryString lives in a 'use client' module (it also exports the
// auth-aware apiRequest) — importing it here would pull that boundary into this Server
// Component, so this page builds its own tiny query string instead.
const buildLocalQueryString = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export default function VenueDetailPage({ params, searchParams }: VenueDetailPageProps) {
  const mapQueryString = buildLocalQueryString({ ...searchParams, highlight: params.slug });
  // `searchParams` here already carries the full search+filters query string (VenueResultCard
  // appends it to every "Ver detalles" link) — reuse it as-is so the breadcrumb returns to the
  // exact same results instead of a blank /venues.
  const backToListQueryString = buildLocalQueryString(searchParams);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="sf-top-band border-b px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Breadcrumbs
            className="mb-0"
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'Buscar espacios', href: `/venues${backToListQueryString}` },
              { label: 'Detalle del espacio' },
            ]}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <VenueDetail
          slug={params.slug}
          initialStartDate={searchParams.startDate}
          initialEndDate={searchParams.endDate}
          mapHref={`/venues/map${mapQueryString}`}
        />
      </div>
    </main>
  );
}
