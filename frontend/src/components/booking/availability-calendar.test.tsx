import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { VenueCalendar, VenueOpeningHour } from '@/types/api';
import { AvailabilityCalendar } from './availability-calendar';
import { getVenueCalendar } from '@/lib/api/calendar.api';

jest.mock('@/lib/api/calendar.api', () => ({
  getVenueCalendar: jest.fn(),
}));

const mockGetVenueCalendar = getVenueCalendar as jest.MockedFunction<typeof getVenueCalendar>;

// Fixed "today" so past/future and the visible month (June 2026) are deterministic.
const FIXED_TODAY = new Date('2026-06-15T12:00:00');

const calendarData: VenueCalendar = {
  venueId: 'venue-1',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  bookings: [
    { id: 'b-pending', date: '2026-06-20', type: 'booking', status: 'PENDING', eventType: 'Boda' },
    {
      id: 'b-approved',
      date: '2026-06-21',
      type: 'booking',
      status: 'APPROVED',
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
  blocks: [{ id: 'block-1', date: '2026-06-18', type: 'block', reason: 'Mantenimiento' }],
};

const renderCalendar = (openingHours?: VenueOpeningHour[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AvailabilityCalendar
        venueId="venue-1"
        allowsMultipleDays={false}
        openingHours={openingHours}
      />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_TODAY);
  mockGetVenueCalendar.mockResolvedValue(calendarData);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('AvailabilityCalendar - mapeo de estados de reserva a variantes visuales', () => {
  it('una reserva PENDING se muestra como "Reservado temporalmente", no como "Reservado"', async () => {
    renderCalendar();

    const pendingCell = await screen.findByRole('button', { name: /20 de junio: Pendiente/i });
    expect(pendingCell).toBeInTheDocument();
    // Different wording/state from a firm booking -- regression guard for the PENDING-vs-rest split.
    expect(
      screen.queryByRole('button', { name: /20 de junio: Aprobada/i }),
    ).not.toBeInTheDocument();
  });

  it('una reserva APPROVED se muestra como "Reservado" (no pendiente)', async () => {
    renderCalendar();

    const approvedCell = await screen.findByRole('button', { name: /21 de junio: Aprobada/i });
    expect(approvedCell).toBeInTheDocument();

    const pendingCell = await screen.findByRole('button', { name: /20 de junio: Pendiente/i });
    // Pending and approved must render with visibly different styling.
    expect(approvedCell.className).not.toBe(pendingCell.className);
  });

  it('un dia pasado con una reserva se distingue de un dia pasado libre ("tuvo un evento")', async () => {
    renderCalendar();

    const pastEventCell = await screen.findByRole('button', { name: /5 de junio: Completada/i });
    const plainPastCell = await screen.findByRole('button', { name: /^1 de junio$/i });
    expect(pastEventCell.className).not.toBe(plainPastCell.className);
  });

  it('marca el dia de hoy (15 de junio)', async () => {
    renderCalendar();

    const today = await screen.findByRole('button', { name: /15 de junio.*\(hoy\)/i });
    expect(today).toHaveAttribute('aria-current', 'date');
  });

  it('un bloqueo del dueno y un dia cerrado por horario se ven igual (misma variante), con una sola entrada en la leyenda', async () => {
    const closedDate = '2026-06-24';
    const closedDayOfWeek = new Date(`${closedDate}T00:00:00`).getDay();
    const openingHours: VenueOpeningHour[] = [
      {
        id: 'oh-1',
        dayOfWeek: closedDayOfWeek,
        opensAt: '09:00',
        closesAt: '18:00',
        isClosed: true,
      },
    ];

    renderCalendar(openingHours);

    const ownerBlockedCell = await screen.findByRole('button', {
      name: /18 de junio: Mantenimiento/i,
    });
    const closedWeekdayCell = await screen.findByRole('button', {
      name: /24 de junio: Local cerrado/i,
    });
    // Different reason text (visible per-cell), same visual treatment -- the distinction
    // between "owner blocked this one day" and "closed every week on this weekday" only
    // matters to the owner, not to someone deciding whether they can book.
    expect(ownerBlockedCell.className).toBe(closedWeekdayCell.className);

    // The legend should show a single merged entry, not "Bloqueado" and "Local cerrado" apart
    // (those two still appear as per-cell labels above -- just not duplicated in the legend).
    const legend = within(screen.getByTestId('calendar-legend'));
    expect(legend.getByText('No disponible')).toBeInTheDocument();
    expect(legend.queryByText('Bloqueado')).not.toBeInTheDocument();
    expect(legend.queryByText('Local cerrado')).not.toBeInTheDocument();
  });
});
