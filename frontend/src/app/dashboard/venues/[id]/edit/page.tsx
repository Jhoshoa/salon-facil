import { OwnerVenueEdit } from '@/components/dashboard/owner-venue-edit';

interface EditVenuePageProps {
  params: { id: string };
}

const EditVenuePage = ({ params }: EditVenuePageProps) => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <OwnerVenueEdit venueId={params.id} />
    </main>
  );
};

export default EditVenuePage;
