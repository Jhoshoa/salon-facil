import { VenueDetail } from '@/components/venues/venue-detail';

interface VenueDetailPageProps {
  params: {
    slug: string;
  };
}

export default function VenueDetailPage({ params }: VenueDetailPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <VenueDetail slug={params.slug} />
      </div>
    </main>
  );
}
