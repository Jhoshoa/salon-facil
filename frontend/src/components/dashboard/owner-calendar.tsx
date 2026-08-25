'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { addMonths, eachDayOfInterval, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { CalendarX, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createCalendarBlock, deleteCalendarBlock, getVenueCalendar } from '@/lib/api/calendar.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { formatDate, formatDateInput, getCurrentMonth } from '@/lib/formatters';
import type { BookingStatus } from '@/types/api';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { AppDrawer } from '@/components/shared/app-drawer';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { type DayCellData, MonthCalendarGrid } from '@/components/shared/month-calendar-grid';

const MAX_MONTHS_AHEAD = 24;

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

export const OwnerCalendar = () => {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(formatDateInput());
  const [reason, setReason] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<{ id: string; date: string } | null>(null);

  const maxMonth = useMemo(() => format(addMonths(new Date(), MAX_MONTHS_AHEAD), 'yyyy-MM'), []);
  const today = format(new Date(), 'yyyy-MM-dd');

  const venuesQuery = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const calendarQuery = useQuery({
    queryKey: ['venue-calendar', venueId, month],
    queryFn: () => getVenueCalendar(venueId, month),
    enabled: Boolean(venueId),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!venueId && venuesQuery.data?.[0]) setVenueId(venuesQuery.data[0].id);
  }, [venueId, venuesQuery.data]);

  useEffect(() => {
    setSelectedDay(null);
  }, [venueId, month]);

  const invalidateCalendar = () =>
    queryClient.invalidateQueries({ queryKey: ['venue-calendar', venueId, month] });

  const createBlockMutation = useMutation({
    mutationFn: () =>
      createCalendarBlock(venueId, { date: blockDate, reason: reason || undefined }),
    onSuccess: async () => {
      toast.success('Fecha bloqueada');
      setDrawerOpen(false);
      setReason('');
      await invalidateCalendar();
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo bloquear fecha', { description: error.message }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => deleteCalendarBlock(venueId, blockId),
    onSuccess: async () => {
      toast.success('Bloqueo eliminado');
      setBlockToDelete(null);
      setSelectedDay(null);
      await invalidateCalendar();
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo eliminar bloqueo', { description: error.message }),
  });

  const days: DayCellData[] = useMemo(() => {
    const bookingByDate = new Map(calendarQuery.data?.bookings.map((item) => [item.date, item]) ?? []);
    const blockByDate = new Map(calendarQuery.data?.blocks.map((item) => [item.date, item]) ?? []);
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
  }, [calendarQuery.data, month, today]);

  const handleDayClick = (day: DayCellData) => {
    if (day.variant === 'available') {
      setBlockDate(day.date);
      setReason('');
      setDrawerOpen(true);
      return;
    }
    setSelectedDay(day);
  };

  const selectedBlock = selectedDay
    ? calendarQuery.data?.blocks.find((block) => block.date === selectedDay.date)
    : undefined;

  if (venuesQuery.isLoading) return <Skeleton className="h-40 w-full" />;
  if (venuesQuery.isError)
    return (
      <ErrorState title="No se pudieron cargar tus salones" onRetry={() => venuesQuery.refetch()} />
    );
  if (!venuesQuery.data?.length)
    return <EmptyState icon={CalendarX} title="No tienes salones para calendario" />;

  return (
    <div className="space-y-6">
      <OwnerVenueSelect venues={venuesQuery.data} value={venueId} onChange={setVenueId} />

      <div className="sf-card p-5">
        {calendarQuery.isError ? (
          <ErrorState title="No se pudo cargar el calendario" onRetry={() => calendarQuery.refetch()} />
        ) : (
          <>
            <MonthCalendarGrid
              month={month}
              onMonthChange={setMonth}
              days={days}
              maxMonth={maxMonth}
              isLoading={calendarQuery.isLoading}
              legend={legend}
              onDayClick={handleDayClick}
            />

            {selectedDay ? (
              <div className="sf-surface mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-semibold">{formatDate(selectedDay.date)}</p>
                  <p className="text-muted-foreground">{selectedDay.label}</p>
                </div>
                {selectedBlock ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBlockToDelete({ id: selectedBlock.id, date: selectedDay.date })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar bloqueo
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Reservas del mes</h2>
          {calendarQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : null}
          {!calendarQuery.isLoading && !calendarQuery.data?.bookings.length ? (
            <EmptyState icon={CalendarX} title="Sin reservas este mes" />
          ) : null}
          {calendarQuery.data?.bookings.map((booking) => (
            <div key={booking.id} className="rounded-md border p-3">
              <p className="font-medium">{booking.eventType}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(booking.date)} · {statusLabel[booking.status]}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Fechas bloqueadas</h2>
          {calendarQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : null}
          {!calendarQuery.isLoading && !calendarQuery.data?.blocks.length ? (
            <EmptyState icon={CalendarX} title="Sin bloqueos este mes" />
          ) : null}
          {calendarQuery.data?.blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{formatDate(block.date)}</p>
                <p className="text-sm text-muted-foreground">{block.reason ?? 'Sin motivo'}</p>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setBlockToDelete({ id: block.id, date: block.date })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </section>
      </div>

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Bloquear fecha"
        description="Impide nuevas reservas para este salon."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blockDate">Fecha</Label>
            <Input
              id="blockDate"
              type="date"
              min={formatDateInput()}
              value={blockDate}
              onChange={(event) => setBlockDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blockReason">Motivo</Label>
            <Input
              id="blockReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <SubmitButton
            className="w-full"
            disabled={!blockDate}
            isLoading={createBlockMutation.isPending}
            onClick={() => createBlockMutation.mutate()}
          >
            Guardar bloqueo
          </SubmitButton>
        </div>
      </AppDrawer>

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Eliminar bloqueo"
        description={
          blockToDelete
            ? `Se liberara el ${formatDate(blockToDelete.date)} para nuevas reservas.`
            : ''
        }
        confirmLabel="Eliminar bloqueo"
        isLoading={deleteBlockMutation.isPending}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
        onConfirm={() => blockToDelete && deleteBlockMutation.mutate(blockToDelete.id)}
      />
    </div>
  );
};
