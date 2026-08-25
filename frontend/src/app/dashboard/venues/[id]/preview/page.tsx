import { OwnerVenuePreview } from '@/components/dashboard/owner-venue-preview';

interface PreviewVenuePageProps {
  params: { id: string };
}

const PreviewVenuePage = ({ params }: PreviewVenuePageProps) => {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <OwnerVenuePreview venueId={params.id} />
    </main>
  );
};

export default PreviewVenuePage;
