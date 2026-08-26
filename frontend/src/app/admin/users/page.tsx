import { AdminUserManagement } from '@/components/admin/admin-user-management';

const AdminUsersPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Busca usuarios y gestiona su estado en la plataforma.
        </p>
      </div>
      <AdminUserManagement />
    </main>
  );
};

export default AdminUsersPage;
