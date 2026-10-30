import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RentalItemLine } from '@/hooks/use-rental-item-selection';
import { createBooking, previewBookingPrice } from '@/lib/api/bookings.api';
import type { Venue, VenueRentalItem } from '@/types/api';
import { BookingForm } from './booking-form';

jest.mock('@/lib/api/bookings.api', () => ({
  createBooking: jest.fn(),
  previewBookingPrice: jest.fn(),
}));
jest.mock('@/lib/api/venues.api', () => ({
  getPublicRentalItems: jest.fn(),
}));
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ isAuthenticated: true, role: 'CLIENT' }),
}));
jest.mock('./login-to-book-modal', () => ({
  LoginToBookModal: () => null,
}));

const venue = {
  id: 'venue-1',
  name: 'Salon Test',
  capacityMax: 200,
  allowsMultipleDays: false,
  instantBooking: true,
  paymentPolicy: 'DEPOSIT_THEN_REMAINING',
  priceUnit: 'DAY',
  prices: [{ priceType: 'BASE', price: 1000 }],
  amenities: [],
  openingHours: [],
} as unknown as Venue;

const line: RentalItemLine = {
  item: {
    id: 'item-1',
    name: 'Mesa redonda',
    pricePerUnit: 12.5,
    isIncluded: false,
    chargeBasis: 'PER_DAY',
    unitLabel: 'unidad',
    stockQty: 10,
  } as VenueRentalItem,
  quantity: 4,
  billedDays: 1,
  subtotal: 50,
};

const renderForm = (lines: RentalItemLine[], onBookingCreated = jest.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BookingForm
        venue={venue}
        rentalItemLines={lines}
        onRentalItemQuantityChange={jest.fn()}
        onBookingCreated={onBookingCreated}
      />
    </QueryClientProvider>,
  );
  return { onBookingCreated };
};

const submitRequest = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Tipo de evento'), 'Boda');
  await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
};

describe('BookingForm con items del catalogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (previewBookingPrice as jest.Mock).mockResolvedValue({
      basePrice: 1000,
      appliedPrice: 1000,
      totalPrice: 1050,
      depositAmount: 315,
      days: [{ date: '2030-01-01', matchedPriceType: 'BASE', unit: 'DAY', appliedPrice: 1000 }],
      rentalItemsTotal: 50,
    });
    (createBooking as jest.Mock).mockResolvedValue({ booking: { depositAmount: 315 } });
  });

  it('pide la cotizacion con los items y muestra cuanto suman', async () => {
    renderForm([line]);

    expect(await screen.findByText(/en items del catalogo/)).toBeInTheDocument();
    expect(previewBookingPrice).toHaveBeenLastCalledWith(
      'venue-1',
      expect.objectContaining({
        selectedRentalItems: [{ rentalItemId: 'item-1', quantity: 4 }],
      }),
    );
  });

  it('envia los items en la solicitud y limpia la seleccion al terminar', async () => {
    const user = userEvent.setup();
    const { onBookingCreated } = renderForm([line]);

    await submitRequest(user);
    await user.click(await screen.findByRole('button', { name: 'Solicitar' }));

    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    expect((createBooking as jest.Mock).mock.calls[0][1].selectedRentalItems).toEqual([
      { rentalItemId: 'item-1', quantity: 4 },
    ]);
    await waitFor(() => expect(onBookingCreated).toHaveBeenCalled());
  });

  it('avisa que el dueño debe aprobar aunque el local tenga reserva inmediata', async () => {
    const user = userEvent.setup();
    renderForm([line]);

    await submitRequest(user);

    expect(
      await screen.findByText(/debe aprobar tu solicitud y confirmar los items del catalogo/),
    ).toBeInTheDocument();
  });

  it('mantiene la confirmacion inmediata cuando no hay items', async () => {
    const user = userEvent.setup();
    renderForm([]);

    await submitRequest(user);

    expect(await screen.findByText(/Este local confirma al instante/)).toBeInTheDocument();
    expect(screen.queryByText('Items del catalogo')).not.toBeInTheDocument();
  });

  it('no envia la solicitud al presionar Enter en la cantidad', async () => {
    const user = userEvent.setup();
    renderForm([line]);
    await user.type(screen.getByLabelText('Tipo de evento'), 'Boda');

    await user.type(screen.getByLabelText('Cantidad de Mesa redonda'), '{Enter}');

    expect(screen.queryByRole('button', { name: 'Solicitar' })).not.toBeInTheDocument();
  });
});
