import { AdminOwnerInviteForm } from '@/components/admin/admin-owner-invite-form';

const AdminOwnerInviteNewPage = () => {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Registrar local por teléfono</h1>
        <p className="text-sm text-muted-foreground">
          Cargá lo que te dio el dueño en la llamada. Queda en borrador — no es público hasta que lo
          completes y le mandes la invitación.
        </p>
      </div>
      <AdminOwnerInviteForm />
    </main>
  );
};

export default AdminOwnerInviteNewPage;
