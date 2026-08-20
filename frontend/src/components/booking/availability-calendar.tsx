'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { getVenueCalendar } from '@/lib/api/calendar.api';
import { getCurrentMonth } from '@/lib/formatters';
import type { BookingStatus } from '@/types/api';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailabilityCalendarProps {
  venueId: string;
  month?: string;
}

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

export const CalendarSkeleton = () => {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, index) => (
        <Skeleton key={index} className="aspect-square rounded-md" />
      ))}
    </div>
  );
};

export const AvailabilityCalendar = ({
  venueId,
  month = getCurrentMonth(),
}: AvailabilityCalendarProps) => {
  const query = useQuery({
    queryKey: ['venue-calendar', venueId, month],
    queryFn: () => getVenueCalendar(venueId, month),
  });

  if (query.isLoading) return <CalendarSkeleton />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const calendar = query.data;
  const occupied = new Map<string, string>();

  calendar?.bookings.forEach((booking) => {
    occupied.set(booking.date, statusLabel[booking.status]);
  });
  calendar?.blocks.forEach((block) => {
    occupied.set(block.date, block.reason ?? 'Bloqueado');
  });

  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    return { day, date, label: occupied.get(date) };
  });

  return (
    <div className="sf-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Disponibilidad</h2>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {days.map((day) => (
          <div
            key={day.date}
            className={
              day.label
                ? 'sf-warning min-h-16 rounded-md border p-2'
                : 'sf-surface min-h-16 rounded-md border p-2 text-muted-foreground'
            }
          >
            <div className="font-semibold">{day.day}</div>
            {day.label ? <div className="mt-1 line-clamp-2">{day.label}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};
