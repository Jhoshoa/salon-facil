import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { Booking } from '@/types/api';
import { BookingDetailClient } from './booking-detail-client';
import { getBooking } from '@/lib/api/bookings.api';
import { getBookingPayments } from '@/lib/api/payments.api';

jest.mock('@/lib/api/bookings.api', () => ({
  getBooking: jest.fn(),
  cancelBooking: jest.fn(),
}));
jest.mock('@/lib/api/payments.api', () => ({
  getBookingPayments: jest.fn(),
}));
jest.mock('@/lib/api/reviews.api', () => ({
  getBookingReview: jest.fn(),
  deleteReview: jest.fn(),
}));
jest.mock('@/components/payments/payment-proof-drawer', () => ({
  PaymentProofDrawer: () => null,
}));
jest.mock('@/components/reviews/review-form-dialog', () => ({
  ReviewFormDialog: () => null,
}));

const booking = {
  id: 'booking-1',
  venueId: 'venue-1',
  clientId: 'client-1',
  eventType: 'Boda',
  eventDate: '2027-03-10',
  endDate: '2027-03-10',
  startTime: '14:00',
  endTime: '20:00',
  guestCount: 50,
  basePrice: 350,
  appliedPrice: 2100,
  totalPrice: 2262.5,
  depositAmount: 678.75,
  depositPaid: false,
  status: 'PENDING',
  specialRequests: null,
  selectedExtras: null,
  selectedRentalItems: [
    {
      rentalItemId: 'item-1',
      name: 'Mesa redonda',
      unitLabel: 'unidad',
      unitPrice: 50,
      quantity: 3,
      subtotal: 150,
    },
    {
      rentalItemId: 'item-2',
      name: 'Vajilla',
      unitLabel: 'por juego',
      unitPrice: 12.5,
      quantity: 1,
      subtotal: 12.5,
    },
  ],
} as unknown as Booking;

const renderDetail = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BookingDetailClient bookingId="booking-1" />
    </QueryClientProvider>,
  );
};

describe('BookingDetailClient', () => {
  beforeEach(() => {
    (getBookingPayments as jest.Mock).mockResolvedValue([]);
  });

  it('muestra los items del catalogo guardados en la reserva, con cantidad y subtotal', async () => {
    (getBooking as jest.Mock).mockResolvedValue(booking);
    renderDetail();

    expect(await screen.findByText('Items del catalogo')).toBeInTheDocument();
    expect(screen.getByText('Mesa redonda × 3')).toBeInTheDocument();
    expect(screen.getByText('Vajilla × 1')).toBeInTheDocument();
    expect(screen.getByText(/12,50/)).toBeInTheDocument();
  });

  it('no muestra la seccion si la reserva no tiene items', async () => {
    (getBooking as jest.Mock).mockResolvedValue({ ...booking, selectedRentalItems: null });
    renderDetail();

    expect((await screen.findAllByText(/Boda/)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Items del catalogo')).not.toBeInTheDocument();
  });
});
