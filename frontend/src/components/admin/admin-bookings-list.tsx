'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAdminBookings } from '@/lib/api/bookings.api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { BookingStatus } from '@/types/api';

const statusLabels: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  DEPOSIT_PAID: 'Anticipo pagado',
  FULLY_PAID: 'Pagada',
  CANCELLED_BY_CLIENT: 'Cancelada por cliente',
  CANCELLED_BY_OWNER: 'Cancelada por owner',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistio',
};

const MIN_SEARCH_LENGTH = 3;
const LIMIT = 20;

export const AdminBookingsList = () => {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'bookings', activeQuery, status, startDate, endDate, page],
    queryFn: () =>
      getAdminBookings({
        search: activeQuery || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const bookings = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(activeQuery || status || startDate || endDate);

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="Buscar por local o cliente..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as BookingStatus | '');
            resetToFirstPage();
          }}
          className="sm:w-56"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(statusLabels) as BookingStatus[]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="admin-bookings-start">Desde</Label>
          <Input
            id="admin-bookings-start"
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              resetToFirstPage();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-bookings-end">Hasta</Label>
          <Input
            id="admin-bookings-end"
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              resetToFirstPage();
            }}
          />
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="No se pudieron cargar las reservas" onRetry={() => query.refetch()} />
      ) : !bookings.length ? (
        <EmptyState
          icon={CalendarDays}
          title={hasActiveFilters ? 'Sin resultados' : 'Todavia no hay reservas'}
          description={
            hasActiveFilters
              ? 'Ninguna reserva coincide con la busqueda y los filtros aplicados.'
              : 'Las reservas que hagan los clientes van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} reserva{total === 1 ? '' : 's'} en total
          </p>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="sf-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {booking.venue ? (
                      <Link
                        href={`/admin/venues/all/${booking.venue.id}/preview`}
                        className="font-semibold hover:underline"
                      >
                        {booking.venue.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Local eliminado</span>
                    )}
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.client?.fullName ?? 'Cliente'} · {booking.eventType}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(booking.eventDate)}</p>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
