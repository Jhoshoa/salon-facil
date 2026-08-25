import { BookingDetailClient } from '@/components/bookings/booking-detail-client';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SiteHeader } from '@/components/shared/site-header';

interface BookingDetailPageProps {
  params: {
    id: string;
  };
}

const BookingDetailPage = ({ params }: BookingDetailPageProps) => {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Mis reservas', href: '/bookings' },
            { label: 'Detalle de la reserva' },
          ]}
        />
        <BookingDetailClient bookingId={params.id} />
      </div>
    </main>
  );
};

export default BookingDetailPage;
