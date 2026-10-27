import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type DayCellData, MonthCalendarGrid } from './month-calendar-grid';

const FIXED_TODAY = new Date('2026-06-15T12:00:00');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

const legend = [
  { variant: 'available' as const, label: 'Disponible' },
  { variant: 'pending' as const, label: 'Reservado temporalmente' },
  { variant: 'booked' as const, label: 'Reservado' },
  { variant: 'blocked' as const, label: 'Bloqueado' },
  { variant: 'pastEvent' as const, label: 'Tuvo un evento' },
];

describe('MonthCalendarGrid - marcador de "hoy"', () => {
  it('marca el dia actual con aria-current="date" aunque no venga en `days`', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={[]} legend={legend} />,
    );

    const today = screen.getByRole('button', { name: /15 de junio.*\(hoy\)/i });
    expect(today).toHaveAttribute('aria-current', 'date');
  });

  it('no marca otros dias del mismo mes como hoy', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={[]} legend={legend} />,
    );

    const otherDay = screen.getByRole('button', { name: /^14 de junio/i });
    expect(otherDay).not.toHaveAttribute('aria-current');
  });

  it('siempre agrega "Hoy" a la leyenda cuando se pasa una leyenda', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={[]} legend={legend} />,
    );

    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('no muestra leyenda si no se pasa la prop', () => {
    render(<MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={[]} />);

    expect(screen.queryByText('Hoy')).not.toBeInTheDocument();
  });
});

describe('MonthCalendarGrid - variantes de estado', () => {
  const days: DayCellData[] = [
    { date: '2026-06-05', day: 5, variant: 'pending', label: 'Pendiente' },
    { date: '2026-06-06', day: 6, variant: 'booked', label: 'Pagada' },
    { date: '2026-06-07', day: 7, variant: 'blocked', label: 'Mantenimiento' },
    { date: '2026-06-02', day: 2, variant: 'pastEvent', label: 'Completada' },
    { date: '2026-06-01', day: 1, variant: 'past' },
  ];

  it('muestra el label de cada variante dentro de la celda', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={days} legend={legend} />,
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Pagada')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
  });

  it('un dia pasado con reserva (pastEvent) no es lo mismo que un pasado sin reserva (past)', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={days} legend={legend} />,
    );

    const pastEventCell = screen.getByRole('button', { name: /^2 de junio: Completada$/i });
    const plainPastCell = screen.getByRole('button', { name: /^1 de junio$/i });
    expect(pastEventCell.className).not.toBe(plainPastCell.className);
  });

  it('pending y booked tienen estilos distintos entre si', () => {
    render(
      <MonthCalendarGrid month="2026-06" onMonthChange={jest.fn()} days={days} legend={legend} />,
    );

    const pendingCell = screen.getByRole('button', { name: /^5 de junio: Pendiente$/i });
    const bookedCell = screen.getByRole('button', { name: /^6 de junio: Pagada$/i });
    expect(pendingCell.className).not.toBe(bookedCell.className);
  });
});

describe('MonthCalendarGrid - interaccion', () => {
  it('llama a onDayClick solo para dias clickeables (no past, no closed)', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onDayClick = jest.fn();
    const days: DayCellData[] = [
      { date: '2026-06-01', day: 1, variant: 'past' },
      { date: '2026-06-10', day: 10, variant: 'closed' },
      { date: '2026-06-20', day: 20, variant: 'available' },
    ];

    render(
      <MonthCalendarGrid
        month="2026-06"
        onMonthChange={jest.fn()}
        days={days}
        onDayClick={onDayClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^1 de junio$/i }));
    await user.click(screen.getByRole('button', { name: /^10 de junio$/i }));
    expect(onDayClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^20 de junio$/i }));
    expect(onDayClick).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-06-20', variant: 'available' }),
    );
  });
});
