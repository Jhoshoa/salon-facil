import { PendingVenuesQueue } from '@/components/admin/pending-venues-queue';

const AdminVenuesPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Verificacion de locales</h1>
        <p className="text-sm text-muted-foreground">
          Revisa la informacion antes de publicar un local a los clientes.
        </p>
      </div>
      <PendingVenuesQueue />
    </main>
  );
};

export default AdminVenuesPage;
