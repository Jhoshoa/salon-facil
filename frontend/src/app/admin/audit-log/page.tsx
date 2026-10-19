import { AdminAuditLog } from '@/components/admin/admin-audit-log';

const AdminAuditLogPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Historial de acciones</h1>
        <p className="text-sm text-muted-foreground">
          Registro de lo que hicieron los administradores: cambios de estado o rol de usuarios,
          aprobacion o rechazo de locales, moderacion de reseñas y reembolsos de pagos.
        </p>
      </div>
      <AdminAuditLog />
    </main>
  );
};

export default AdminAuditLogPage;
