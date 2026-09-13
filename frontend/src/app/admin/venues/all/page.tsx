import { AllVenuesList } from '@/components/admin/all-venues-list';

const AdminAllVenuesPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Todos los locales</h1>
        <p className="text-sm text-muted-foreground">
          Cualquier estado, no solo los pendientes de revision — activa, desactiva o elimina un
          local desde aca.
        </p>
      </div>
      <AllVenuesList />
    </main>
  );
};

export default AdminAllVenuesPage;
