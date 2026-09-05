'use client';

import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, parse, startOfMonth } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getVenueCalendar } from '@/lib/api/calendar.api';
import { formatDate, getCurrentMonth } from '@/lib/formatters';
import type { BookingStatus, VenueOpeningHour } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { type DayCellData, type DayVariant, MonthCalendarGrid } from '@/components/shared/month-calendar-grid';

interface AvailabilityCalendarProps {
  venueId: string;
  allowsMultipleDays: boolean;
  openingHours?: VenueOpeningHour[];
  onRangeSelect?: (startDate: string, endDate: string) => void;
  /** Reflects a range chosen elsewhere (e.g. typed directly into the booking form) back onto the grid. */
  externalRange?: { start: string; end: string };
}

type RangeSelection =
  | { status: 'empty' }
  | { status: 'pending'; start: string }
  | { status: 'complete'; start: string; end: string };

const MAX_MONTHS_AHEAD = 18;

const statusLabel: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  DEPOSIT_PAID: 'Sena',
  FULLY_PAID: 'Pagada',
  CANCELLED_BY_CLIENT: 'Cancelada',
  CANCELLED_BY_OWNER: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No show',
};

const legend = [
  { variant: 'available' as const, label: 'Disponible' },
  { variant: 'booked' as const, label: 'Reservado' },
  { variant: 'blocked' as const, label: 'Bloqueado' },
  { variant: 'closed' as const, label: 'Local cerrado' },
];

export const AvailabilityCalendar = ({
  venueId,
  allowsMultipleDays,
  openingHours,
  onRangeSelect,
  externalRange,
}: AvailabilityCalendarProps) => {
  const currentMonth = getCurrentMonth();
  const maxMonth = useMemo(() => format(addMonths(new Date(), MAX_MONTHS_AHEAD), 'yyyy-MM'), []);
  const [month, setMonth] = useState(currentMonth);
  const [selection, setSelection] = useState<RangeSelection>({ status: 'empty' });
  const [inspectedDay, setInspectedDay] = useState<DayCellData | null>(null);

  useEffect(() => {
    if (!externalRange) return;
    setSelection((prev) =>
      prev.status === 'complete' &&
      prev.start === externalRange.start &&
      prev.end === externalRange.end
        ? prev
        : { status: 'complete', start: externalRange.start, end: externalRange.end },
    );
    const targetMonth = externalRange.start.slice(0, 7);
    setMonth((prev) => (prev === targetMonth ? prev : targetMonth));
  }, [externalRange]);

  const query = useQuery({
    queryKey: ['venue-calendar', venueId, month],
    queryFn: () => getVenueCalendar(venueId, month),
    placeholderData: keepPreviousData,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const closedWeekdays = useMemo(() => {
    const set = new Set<number>();
    openingHours?.forEach((hour) => {
      if (hour.isClosed) set.add(hour.dayOfWeek);
    });
    return set;
  }, [openingHours]);

  const baseVariant = (dateKey: string, dayOfWeek: number): { variant: DayVariant; label?: string } => {
    const booking = query.data?.bookings.find((item) => item.date === dateKey);
    const block = query.data?.blocks.find((item) => item.date === dateKey);

    if (dateKey < today) {
      return { variant: 'past', label: booking ? statusLabel[booking.status] : block?.reason ?? undefined };
    }
    if (booking) return { variant: 'booked', label: statusLabel[booking.status] };
    if (block) return { variant: 'blocked', label: block.reason ?? 'Bloqueado' };
    if (closedWeekdays.has(dayOfWeek)) return { variant: 'closed', label: 'Local cerrado' };
    return { variant: 'available' };
  };

  const rangePositionFor = (dateKey: string): DayCellData['rangePosition'] => {
    if (selection.status === 'pending' && selection.start === dateKey) return 'single';
    if (selection.status === 'complete') {
      if (selection.start === selection.end && selection.start === dateKey) return 'single';
      if (dateKey === selection.start) return 'start';
      if (dateKey === selection.end) return 'end';
      if (dateKey > selection.start && dateKey < selection.end) return 'middle';
    }
    return undefined;
  };

  const monthDate = parse(month, 'yyyy-MM', new Date());
  const days: DayCellData[] = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  }).map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const { variant, label } = baseVariant(dateKey, getDay(date));
    const rangePosition = variant === 'available' ? rangePositionFor(dateKey) : undefined;
    return { date: dateKey, day: date.getDate(), variant, label, rangePosition };
  });

  const isRangeFullyAvailable = (start: string, end: string): boolean => {
    return days
      .filter((day) => day.date >= start && day.date <= end)
      .every((day) => day.variant === 'available');
  };

  const handleDayClick = (day: DayCellData) => {
    setInspectedDay(day);

    if (day.variant !== 'available') return;

    if (!allowsMultipleDays) {
      setSelection({ status: 'complete', start: day.date, end: day.date });
      return;
    }

    if (selection.status === 'empty' || selection.status === 'complete') {
      setSelection({ status: 'pending', start: day.date });
      return;
    }

    // status === 'pending'
    if (day.date === selection.start) {
      setSelection({ status: 'complete', start: day.date, end: day.date });
      return;
    }
    if (day.date < selection.start) {
      setSelection({ status: 'pending', start: day.date });
      return;
    }

    if (!isRangeFullyAvailable(selection.start, day.date)) {
      toast.warning('Ese rango incluye fechas no disponibles', {
        description: 'Elegi otro cierre para el rango.',
      });
      return;
    }
    setSelection({ status: 'complete', start: selection.start, end: day.date });
  };

  const clearSelection = () => {
    setSelection({ status: 'empty' });
    setInspectedDay(null);
  };

  const confirmSelection = () => {
    if (selection.status !== 'complete' || !onRangeSelect) return;
    onRangeSelect(selection.start, selection.end);
    toast.success('Fechas seleccionadas', {
      description: 'Revisa el formulario de reserva para continuar.',
    });
  };

  if (query.isError) {
    return (
      <div>
        <h2 className="sf-detail-title mb-4">Disponibilidad</h2>
        <ErrorState title="No se pudo cargar la disponibilidad" onRetry={() => query.refetch()} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="sf-detail-title">Disponibilidad</h2>
        {selection.status !== 'empty' ? (
          <Button size="sm" variant="outline" onClick={clearSelection}>
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        ) : null}
      </div>

      {allowsMultipleDays ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Este local permite reservas de varios dias: elegi el primer y ultimo dia de tu evento.
        </p>
      ) : null}

      <MonthCalendarGrid
        month={month}
        onMonthChange={setMonth}
        days={days}
        minMonth={currentMonth}
        maxMonth={maxMonth}
        isLoading={query.isLoading}
        legend={legend}
        onDayClick={handleDayClick}
      />

      {selection.status === 'pending' ? (
        <div className="sf-surface mt-4 rounded-md border p-3 text-sm">
          <p className="font-semibold">Inicio: {formatDate(selection.start)}</p>
          <p className="text-muted-foreground">Elegi el ultimo dia de tu evento en el calendario.</p>
        </div>
      ) : null}

      {selection.status === 'complete' ? (
        <div className="sf-surface mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
          <div>
            <p className="font-semibold">
              {selection.start === selection.end
                ? formatDate(selection.start)
                : `${formatDate(selection.start)} - ${formatDate(selection.end)}`}
            </p>
            <p className="text-muted-foreground">Disponible para reservar</p>
          </div>
          {onRangeSelect ? (
            <Button size="sm" onClick={confirmSelection}>
              {selection.start === selection.end ? 'Usar esta fecha' : 'Usar este rango'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {selection.status === 'empty' && inspectedDay && inspectedDay.variant !== 'available' ? (
        <div className="sf-surface mt-4 rounded-md border p-3 text-sm">
          <p className="font-semibold">{formatDate(inspectedDay.date)}</p>
          <p className="text-muted-foreground">{inspectedDay.label}</p>
        </div>
      ) : null}
    </div>
  );
};
