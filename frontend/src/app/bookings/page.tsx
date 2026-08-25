import { ClientBookings } from '@/components/bookings/client-bookings';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SiteHeader } from '@/components/shared/site-header';

const BookingsPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Mis reservas' }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mis reservas</h1>
          <p className="text-sm text-muted-foreground">
            Revisa solicitudes, pagos y estados de tus eventos.
          </p>
        </div>
        <ClientBookings />
      </div>
    </main>
  );
};

export default BookingsPage;
