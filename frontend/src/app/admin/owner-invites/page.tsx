import { AdminPendingOwnerInvites } from '@/components/admin/admin-pending-owner-invites';

const AdminOwnerInvitesPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Locales pendientes de reclamo</h1>
        <p className="text-sm text-muted-foreground">
          Dueños cargados por teléfono que todavía no activaron su cuenta. Mandales (o reenviales)
          el link para que vean su local y lo reclamen.
        </p>
      </div>
      <AdminPendingOwnerInvites />
    </main>
  );
};

export default AdminOwnerInvitesPage;
