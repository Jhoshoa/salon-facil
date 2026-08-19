import { BookingDetailClient } from '@/components/bookings/booking-detail-client';

interface BookingDetailPageProps {
  params: {
    id: string;
  };
}

const BookingDetailPage = ({ params }: BookingDetailPageProps) => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BookingDetailClient bookingId={params.id} />
    </main>
  );
};

export default BookingDetailPage;
