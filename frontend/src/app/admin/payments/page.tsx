import { AdminPaymentDisputes } from '@/components/admin/admin-payment-disputes';

const AdminPaymentsPage = () => {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pagos y disputas</h1>
        <p className="text-sm text-muted-foreground">
          Todos los pagos de la plataforma — reembolsa un pago confirmado cuando sea necesario
          resolver una disputa.
        </p>
      </div>
      <AdminPaymentDisputes />
    </main>
  );
};

export default AdminPaymentsPage;
