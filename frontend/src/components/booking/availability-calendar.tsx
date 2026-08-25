'use client';

import { addMonths, eachDayOfInterval, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { getVenueCalendar } from '@/lib/api/calendar.api';
import { formatDate, getCurrentMonth } from '@/lib/formatters';
import type { BookingStatus } from '@/types/api';
import { ErrorState } from '@/components/shared/error-state';
import { type DayCellData, MonthCalendarGrid } from '@/components/shared/month-calendar-grid';

interface AvailabilityCalendarProps {
  venueId: string;
}

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
];

export const AvailabilityCalendar = ({ venueId }: AvailabilityCalendarProps) => {
  const currentMonth = getCurrentMonth();
  const maxMonth = useMemo(
    () => format(addMonths(new Date(), MAX_MONTHS_AHEAD), 'yyyy-MM'),
    [],
  );
  const [month, setMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);

  const query = useQuery({
    queryKey: ['venue-calendar', venueId, month],
    queryFn: () => getVenueCalendar(venueId, month),
    placeholderData: keepPreviousData,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const days: DayCellData[] = useMemo(() => {
    const bookingByDate = new Map(query.data?.bookings.map((item) => [item.date, item]) ?? []);
    const blockByDate = new Map(query.data?.blocks.map((item) => [item.date, item]) ?? []);
    const monthDate = parse(month, 'yyyy-MM', new Date());

    return eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) }).map(
      (date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const day = date.getDate();
        const booking = bookingByDate.get(dateKey);
        const block = blockByDate.get(dateKey);

        if (dateKey < today) {
          return {
            date: dateKey,
            day,
            variant: 'past' as const,
            label: booking ? statusLabel[booking.status] : block?.reason ?? undefined,
          };
        }
        if (booking) {
          return { date: dateKey, day, variant: 'booked' as const, label: statusLabel[booking.status] };
        }
        if (block) {
          return { date: dateKey, day, variant: 'blocked' as const, label: block.reason ?? 'Bloqueado' };
        }
        return { date: dateKey, day, variant: 'available' as const };
      },
    );
  }, [query.data, month, today]);

  if (query.isError) {
    return (
      <div className="sf-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Disponibilidad</h2>
        </div>
        <ErrorState
          title="No se pudo cargar la disponibilidad"
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="sf-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Disponibilidad</h2>
      </div>

      <MonthCalendarGrid
        month={month}
        onMonthChange={setMonth}
        days={days}
        minMonth={currentMonth}
        maxMonth={maxMonth}
        isLoading={query.isLoading}
        legend={legend}
        onDayClick={setSelectedDay}
      />

      {selectedDay ? (
        <div className="sf-surface mt-4 rounded-md border p-3 text-sm">
          <p className="font-semibold">{formatDate(selectedDay.date)}</p>
          <p className="text-muted-foreground">
            {selectedDay.label ?? 'Disponible para reservar'}
          </p>
        </div>
      ) : null}
    </div>
  );
};
