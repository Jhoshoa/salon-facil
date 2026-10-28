'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { addMonths, eachDayOfInterval, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { CalendarX, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  createCalendarBlock,
  deleteCalendarBlock,
  getVenueCalendar,
  updateCalendarBlock,
} from '@/lib/api/calendar.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { formatDate, formatDateInput, getCurrentMonth } from '@/lib/formatters';
import type { BookingStatus, CalendarBlockStatus, CalendarDayBlock } from '@/types/api';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { AppDrawer } from '@/components/shared/app-drawer';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { type DayCellData, MonthCalendarGrid } from '@/components/shared/month-calendar-grid';

const MAX_MONTHS_AHEAD = 24;

const statusLabel: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  DEPOSIT_PAID: 'Anticipo',
  FULLY_PAID: 'Pagada',
  CANCELLED_BY_CLIENT: 'Cancelada',
  CANCELLED_BY_OWNER: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No show',
};

// Same wording everywhere a CalendarBlockStatus shows up (the "Estado" dropdown, the legend,
// the fallback label on a block with no tipo de evento) so the owner never sees two different
// names for the same thing.
const blockStatusLabel: Record<CalendarBlockStatus, string> = {
  TENTATIVE: 'Reservado temporalmente',
  CONFIRMED: 'Reservado',
  BLOCKED: 'Bloqueado',
};

const blockStatusToVariant: Record<CalendarBlockStatus, 'pending' | 'booked' | 'blocked'> = {
  TENTATIVE: 'pending',
  CONFIRMED: 'booked',
  BLOCKED: 'blocked',
};

const legend = [
  { variant: 'available' as const, label: 'Disponible' },
  { variant: 'pending' as const, label: 'Reservado temporalmente' },
  { variant: 'booked' as const, label: 'Reservado' },
  { variant: 'blocked' as const, label: 'Bloqueado' },
  { variant: 'pastEvent' as const, label: 'Tuvo un evento' },
];

export const OwnerCalendar = () => {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(formatDateInput());
  const [blockStatus, setBlockStatus] = useState<CalendarBlockStatus>('BLOCKED');
  const [blockUseTypeId, setBlockUseTypeId] = useState('');
  // Non-null while the drawer is editing an existing marked date instead of creating a new one --
  // same form, same fields, just a different mutation (and the date becomes read-only) on submit.
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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

  // The "tipo de evento" dropdown only ever offers this venue's own "Ideal para" selections --
  // not the full global catalog -- so it never asks the owner to re-pick something they already
  // configured when setting up the local.
  const selectedVenueUses = venuesQuery.data?.find((v) => v.id === venueId)?.uses ?? [];

  const invalidateCalendar = () =>
    queryClient.invalidateQueries({ queryKey: ['venue-calendar', venueId, month] });

  const createBlockMutation = useMutation({
    mutationFn: () =>
      createCalendarBlock(venueId, {
        date: blockDate,
        status: blockStatus,
        // Tipo de evento only makes sense when there's an actual event (TENTATIVE/CONFIRMED) --
        // dropped for BLOCKED so a selection left over from a previous open of the drawer can
        // never attach itself to a "just closing the date" block.
        useTypeId: blockStatus === 'BLOCKED' ? undefined : blockUseTypeId || undefined,
      }),
    onSuccess: async () => {
      toast.success('Fecha guardada');
      setDrawerOpen(false);
      setBlockStatus('BLOCKED');
      setBlockUseTypeId('');
      await invalidateCalendar();
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo guardar la fecha', { description: error.message }),
  });

  const updateBlockMutation = useMutation({
    mutationFn: () =>
      updateCalendarBlock(venueId, editingBlockId as string, {
        status: blockStatus,
        useTypeId: blockStatus === 'BLOCKED' ? undefined : blockUseTypeId || undefined,
      }),
    onSuccess: async () => {
      toast.success('Fecha actualizada');
      setDrawerOpen(false);
      setEditingBlockId(null);
      setBlockStatus('BLOCKED');
      setBlockUseTypeId('');
      setSelectedDay(null);
      await invalidateCalendar();
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo actualizar la fecha', { description: error.message }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => deleteCalendarBlock(venueId, blockId),
    onSuccess: async () => {
      toast.success('Fecha eliminada');
      setBlockToDelete(null);
      setSelectedDay(null);
      await invalidateCalendar();
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo eliminar la fecha', { description: error.message }),
  });

  const days: DayCellData[] = useMemo(() => {
    const bookingByDate = new Map(
      calendarQuery.data?.bookings.map((item) => [item.date, item]) ?? [],
    );
    const blockByDate = new Map(calendarQuery.data?.blocks.map((item) => [item.date, item]) ?? []);
    const monthDate = parse(month, 'yyyy-MM', new Date());

    return eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) }).map(
      (date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const day = date.getDate();
        const booking = bookingByDate.get(dateKey);
        const block = blockByDate.get(dateKey);

        if (dateKey < today) {
          if (booking) {
            return {
              date: dateKey,
              day,
              variant: 'pastEvent' as const,
              label: statusLabel[booking.status],
            };
          }
          return {
            date: dateKey,
            day,
            variant: 'past' as const,
            label: block?.useTypeName ?? block?.reason ?? undefined,
          };
        }
        if (booking) {
          // PENDING hasn't been accepted yet -- it could still fall through, so it reads
          // differently from an approved/paid booking rather than sharing 'booked'.
          return {
            date: dateKey,
            day,
            variant: booking.status === 'PENDING' ? ('pending' as const) : ('booked' as const),
            label: statusLabel[booking.status],
          };
        }
        if (block) {
          return {
            date: dateKey,
            day,
            variant: blockStatusToVariant[block.status],
            label: block.useTypeName ?? block.reason ?? blockStatusLabel[block.status],
          };
        }
        return { date: dateKey, day, variant: 'available' as const };
      },
    );
  }, [calendarQuery.data, month, today]);

  const monthBookings = useMemo(() => {
    // The calendar lists one entry per occupied day, so a multi-day booking appears once
    // per day it spans — collapse those back into a single row with its full date range.
    const byId = new Map<
      string,
      { id: string; eventType: string; status: BookingStatus; firstDate: string; lastDate: string }
    >();
    calendarQuery.data?.bookings.forEach((entry) => {
      const existing = byId.get(entry.id);
      if (!existing) {
        byId.set(entry.id, {
          id: entry.id,
          eventType: entry.eventType,
          status: entry.status,
          firstDate: entry.date,
          lastDate: entry.date,
        });
        return;
      }
      if (entry.date < existing.firstDate) existing.firstDate = entry.date;
      if (entry.date > existing.lastDate) existing.lastDate = entry.date;
    });
    return Array.from(byId.values()).sort((a, b) => a.firstDate.localeCompare(b.firstDate));
  }, [calendarQuery.data]);

  const handleDayClick = (day: DayCellData) => {
    if (day.variant === 'available') {
      setEditingBlockId(null);
      setBlockDate(day.date);
      setBlockStatus('BLOCKED');
      setBlockUseTypeId('');
      setDrawerOpen(true);
      return;
    }
    setSelectedDay(day);
  };

  const openEditDrawer = (block: CalendarDayBlock) => {
    setEditingBlockId(block.id);
    setBlockDate(block.date);
    setBlockStatus(block.status);
    setBlockUseTypeId(block.useTypeId ?? '');
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) setEditingBlockId(null);
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
          <ErrorState
            title="No se pudo cargar el calendario"
            onRetry={() => calendarQuery.refetch()}
          />
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDrawer(selectedBlock)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setBlockToDelete({ id: selectedBlock.id, date: selectedDay.date })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
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
          {monthBookings.map((booking) => (
            <div key={booking.id} className="rounded-md border p-3">
              <p className="font-medium">{booking.eventType}</p>
              <p className="text-sm text-muted-foreground">
                {booking.firstDate === booking.lastDate
                  ? formatDate(booking.firstDate)
                  : `${formatDate(booking.firstDate)} - ${formatDate(booking.lastDate)}`}{' '}
                · {statusLabel[booking.status]}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Fechas marcadas</h2>
          {calendarQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : null}
          {!calendarQuery.isLoading && !calendarQuery.data?.blocks.length ? (
            <EmptyState icon={CalendarX} title="Sin fechas marcadas este mes" />
          ) : null}
          {calendarQuery.data?.blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{formatDate(block.date)}</p>
                <p className="text-sm text-muted-foreground">
                  {blockStatusLabel[block.status]}
                  {block.useTypeName || block.reason
                    ? ` · ${block.useTypeName ?? block.reason}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => openEditDrawer(block)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setBlockToDelete({ id: block.id, date: block.date })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </section>
      </div>

      <AppDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        title={editingBlockId ? 'Editar fecha marcada' : 'Agregar al calendario'}
        description={
          editingBlockId
            ? 'Actualiza el estado o el tipo de evento de esta fecha.'
            : 'Marca esta fecha como reservada o bloqueala para que no se pueda pedir.'
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blockDate">Fecha</Label>
            <Input
              id="blockDate"
              type="date"
              min={formatDateInput()}
              value={blockDate}
              disabled={Boolean(editingBlockId)}
              onChange={(event) => setBlockDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blockStatus">Estado</Label>
            <Select
              id="blockStatus"
              value={blockStatus}
              onChange={(event) => setBlockStatus(event.target.value as CalendarBlockStatus)}
            >
              {(Object.keys(blockStatusLabel) as CalendarBlockStatus[]).map((status) => (
                <option key={status} value={status}>
                  {blockStatusLabel[status]}
                </option>
              ))}
            </Select>
          </div>
          {blockStatus !== 'BLOCKED' ? (
            <div className="space-y-2">
              <Label htmlFor="blockUseType">Tipo de evento (opcional)</Label>
              {selectedVenueUses.length ? (
                <Select
                  id="blockUseType"
                  value={blockUseTypeId}
                  onChange={(event) => setBlockUseTypeId(event.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {selectedVenueUses.map((use) => (
                    <option key={use.useTypeId} value={use.useTypeId}>
                      {use.useType.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Este local todavia no tiene tipos de evento configurados (pestaña General,
                  &quot;Ideal para&quot;).
                </p>
              )}
            </div>
          ) : null}
          <SubmitButton
            className="w-full"
            disabled={!blockDate}
            isLoading={
              editingBlockId ? updateBlockMutation.isPending : createBlockMutation.isPending
            }
            onClick={() =>
              editingBlockId ? updateBlockMutation.mutate() : createBlockMutation.mutate()
            }
          >
            Guardar
          </SubmitButton>
        </div>
      </AppDrawer>

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Eliminar fecha marcada"
        description={
          blockToDelete
            ? `Se liberara el ${formatDate(blockToDelete.date)} para nuevas reservas.`
            : ''
        }
        confirmLabel="Eliminar"
        isLoading={deleteBlockMutation.isPending}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
        onConfirm={() => blockToDelete && deleteBlockMutation.mutate(blockToDelete.id)}
      />
    </div>
  );
};
