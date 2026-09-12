import { AdminVenuePreview } from '@/components/admin/admin-venue-preview';

interface AdminVenuePreviewPageProps {
  params: { id: string };
}

const AdminVenuePreviewPage = ({ params }: AdminVenuePreviewPageProps) => {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminVenuePreview venueId={params.id} />
    </main>
  );
};

export default AdminVenuePreviewPage;
