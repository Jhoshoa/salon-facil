import { VenueDetail } from '@/components/venues/venue-detail';
import { SiteHeader } from '@/components/shared/site-header';

interface VenueDetailPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
}

export default function VenueDetailPage({ params, searchParams }: VenueDetailPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="sf-top-band border-b px-4 py-5">
        <div className="mx-auto w-full max-w-7xl">
          <p className="sf-glass-muted text-sm">Detalle del espacio</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <VenueDetail
          slug={params.slug}
          initialStartDate={searchParams.startDate}
          initialEndDate={searchParams.endDate}
        />
      </div>
    </main>
  );
}
