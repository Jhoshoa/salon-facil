import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { Venue, VenueCalendar } from '@/types/api';
import { OwnerCalendar } from './owner-calendar';
import { getVenueCalendar } from '@/lib/api/calendar.api';
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

const FIXED_TODAY = new Date('2026-06-15T12:00:00');

const venue = { id: 'venue-1', name: 'Salon de prueba' } as unknown as Venue;

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
  blocks: [],
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
});
