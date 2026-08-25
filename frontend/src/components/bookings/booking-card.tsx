'use client';

import Link from 'next/link';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Booking } from '@/types/api';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Button } from '@/components/ui/button';

interface BookingCardProps {
  booking: Booking;
}

export const BookingCard = ({ booking }: BookingCardProps) => {
  return (
    <article className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{booking.venue?.name ?? 'Salon'}</h2>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">{booking.eventType}</p>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {booking.eventDate === booking.endDate
                ? formatDate(booking.eventDate)
                : `${formatDate(booking.eventDate)} - ${formatDate(booking.endDate)}`}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {booking.guestCount}
            </span>
            {booking.venue?.district ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {booking.venue.district}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-lg font-semibold">{formatCurrency(booking.totalPrice)}</p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/bookings/${booking.id}`}>Ver detalle</Link>
          </Button>
        </div>
      </div>
    </article>
  );
};
