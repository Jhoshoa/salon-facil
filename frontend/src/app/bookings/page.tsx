import { ClientBookings } from '@/components/bookings/client-bookings';

const BookingsPage = () => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mis reservas</h1>
        <p className="text-sm text-muted-foreground">
          Revisa solicitudes, pagos y estados de tus eventos.
        </p>
      </div>
      <ClientBookings />
    </main>
  );
};

export default BookingsPage;
