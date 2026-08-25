import { OwnerVenueList } from '@/components/dashboard/owner-venue-list';

const DashboardVenuesPage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mis locales</h1>
        <p className="text-sm text-muted-foreground">
          Crea, edita y publica los espacios que ofreces en alquiler.
        </p>
      </div>
      <OwnerVenueList />
    </main>
  );
};

export default DashboardVenuesPage;
