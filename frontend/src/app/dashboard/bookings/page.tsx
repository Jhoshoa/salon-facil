import { OwnerBookingManagement } from '@/components/dashboard/owner-booking-management';

const DashboardBookingsPage = () => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reservas y pagos</h1>
        <p className="text-sm text-muted-foreground">
          Aprueba solicitudes y confirma comprobantes pendientes.
        </p>
      </div>
      <OwnerBookingManagement />
    </main>
  );
};

export default DashboardBookingsPage;
