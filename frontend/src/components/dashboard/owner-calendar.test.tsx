import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Venue, VenueCalendar } from '@/types/api';
import { OwnerCalendar } from './owner-calendar';
import { createCalendarBlock, getVenueCalendar } from '@/lib/api/calendar.api';
import { getMyVenues } from '@/lib/api/venues.api';

jest.mock('@/lib/api/calendar.api', () => ({
  getVenueCalendar: jest.fn(),
  createCalendarBlock: jest.fn(),
  deleteCalendarBlock: jest.fn(),
}));
jest.mock('@/lib/api/venues.api', () => ({
  getMyVenues: jest.fn(),
}));

const mockGetVenueCalendar = getVenueCalendar as jest.MockedFunction<typeof getVenueCalendar>;
const mockGetMyVenues = getMyVenues as jest.MockedFunction<typeof getMyVenues>;
const mockCreateCalendarBlock = createCalendarBlock as jest.MockedFunction<
  typeof createCalendarBlock
>;

const FIXED_TODAY = new Date('2026-06-15T12:00:00');

const venue = {
  id: 'venue-1',
  name: 'Salon de prueba',
  uses: [
    { id: 'vu-1', useTypeId: 'use-wedding', useType: { id: 'use-wedding', name: 'Boda' } },
    {
      id: 'vu-2',
      useTypeId: 'use-birthday',
      useType: { id: 'use-birthday', name: 'Cumpleanos' },
    },
  ],
} as unknown as Venue;

const calendarData: VenueCalendar = {
  venueId: 'venue-1',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  bookings: [
    { id: 'b-pending', date: '2026-06-20', type: 'booking', status: 'PENDING', eventType: 'Boda' },
    {
      id: 'b-paid',
      date: '2026-06-21',
      type: 'booking',
      status: 'FULLY_PAID',
      eventType: 'Cumpleanos',
    },
    {
      id: 'b-past',
      date: '2026-06-05',
      type: 'booking',
      status: 'COMPLETED',
      eventType: 'Quince anos',
    },
  ],
  blocks: [
    {
      id: 'block-1',
      date: '2026-06-22',
      type: 'block',
      status: 'CONFIRMED',
      useTypeName: 'Boda',
      reason: null,
    },
    {
      id: 'block-2',
      date: '2026-06-23',
      type: 'block',
      status: 'BLOCKED',
      useTypeName: null,
      reason: null,
    },
  ],
};

const renderCalendar = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OwnerCalendar />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_TODAY);
  mockGetMyVenues.mockResolvedValue([venue]);
  mockGetVenueCalendar.mockResolvedValue(calendarData);
  mockCreateCalendarBlock.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('OwnerCalendar - mapeo de estados de reserva a variantes visuales', () => {
  it('una reserva PENDING se muestra distinta de una reserva FULLY_PAID', async () => {
    renderCalendar();

    const pendingCell = await screen.findByRole('button', { name: /20 de junio: Pendiente/i });
    const paidCell = await screen.findByRole('button', { name: /21 de junio: Pagada/i });
    expect(pendingCell.className).not.toBe(paidCell.className);
  });

  it('un dia pasado con reserva se distingue de un dia pasado libre', async () => {
    renderCalendar();

    const pastEventCell = await screen.findByRole('button', { name: /5 de junio: Completada/i });
    const plainPastCell = await screen.findByRole('button', { name: /^1 de junio$/i });
    expect(pastEventCell.className).not.toBe(plainPastCell.className);
  });

  it('marca el dia de hoy', async () => {
    renderCalendar();

    const today = await screen.findByRole('button', { name: /15 de junio.*\(hoy\)/i });
    expect(today).toHaveAttribute('aria-current', 'date');
  });

  it('un bloqueo CONFIRMED con tipo de evento se ve distinto de uno BLOCKED sin tipo', async () => {
    renderCalendar();

    const confirmedCell = await screen.findByRole('button', { name: /22 de junio: Boda/i });
    const blockedCell = await screen.findByRole('button', { name: /^23 de junio: Bloqueado$/i });
    expect(confirmedCell.className).not.toBe(blockedCell.className);
  });
});

describe('OwnerCalendar - formulario "Agregar al calendario"', () => {
  it('al hacer click en un dia disponible, el estado por defecto es Bloqueado y no pide tipo de evento', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderCalendar();

    const availableDay = await screen.findByRole('button', { name: /^25 de junio$/i });
    await user.click(availableDay);

    expect(await screen.findByText('Agregar al calendario')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toHaveValue('BLOCKED');
    expect(screen.queryByLabelText(/Tipo de evento/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    // The old label/copy should be gone entirely, not just renamed.
    expect(screen.queryByText('Guardar bloqueo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Motivo')).not.toBeInTheDocument();
  });

  it('al elegir "Reservado" aparece el dropdown de tipo de evento, con las opciones del local', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderCalendar();

    const availableDay = await screen.findByRole('button', { name: /^25 de junio$/i });
    await user.click(availableDay);

    const statusSelect = await screen.findByLabelText('Estado');
    await user.selectOptions(statusSelect, 'CONFIRMED');

    const useTypeSelect = await screen.findByLabelText(/Tipo de evento/i);
    expect(useTypeSelect).toBeInTheDocument();
    const options = Array.from(useTypeSelect.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['Sin especificar', 'Boda', 'Cumpleanos']);
  });

  it('envia status y useTypeId al guardar una reserva', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderCalendar();

    const availableDay = await screen.findByRole('button', { name: /^25 de junio$/i });
    await user.click(availableDay);

    await user.selectOptions(await screen.findByLabelText('Estado'), 'TENTATIVE');
    await user.selectOptions(await screen.findByLabelText(/Tipo de evento/i), 'use-wedding');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockCreateCalendarBlock).toHaveBeenCalled());
    expect(mockCreateCalendarBlock).toHaveBeenCalledWith(
      'venue-1',
      expect.objectContaining({ status: 'TENTATIVE', useTypeId: 'use-wedding' }),
    );
  });

  it('nunca envia useTypeId cuando el estado es Bloqueado, aunque haya quedado uno elegido antes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderCalendar();

    const availableDay = await screen.findByRole('button', { name: /^25 de junio$/i });
    await user.click(availableDay);

    await user.selectOptions(await screen.findByLabelText('Estado'), 'CONFIRMED');
    await user.selectOptions(await screen.findByLabelText(/Tipo de evento/i), 'use-wedding');
    // Back to Bloqueado -- the use-type dropdown disappears, its earlier selection must not ride along.
    await user.selectOptions(await screen.findByLabelText('Estado'), 'BLOCKED');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockCreateCalendarBlock).toHaveBeenCalled());
    expect(mockCreateCalendarBlock).toHaveBeenCalledWith(
      'venue-1',
      expect.objectContaining({ status: 'BLOCKED', useTypeId: undefined }),
    );
  });
});
