'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createCalendarBlock, deleteCalendarBlock, getVenueCalendar } from '@/lib/api/calendar.api';
import { getMyVenues } from '@/lib/api/venues.api';
import { formatDate, formatDateInput, getCurrentMonth } from '@/lib/formatters';
import { OwnerVenueSelect } from '@/components/dashboard/owner-venue-select';
import { AppDrawer } from '@/components/shared/app-drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export const OwnerCalendar = () => {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(formatDateInput());
  const [reason, setReason] = useState('');

  const venuesQuery = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const calendarQuery = useQuery({
    queryKey: ['venue-calendar', venueId, month],
    queryFn: () => getVenueCalendar(venueId, month),
    enabled: Boolean(venueId),
  });

  useEffect(() => {
    if (!venueId && venuesQuery.data?.[0]) setVenueId(venuesQuery.data[0].id);
  }, [venueId, venuesQuery.data]);

  const createBlockMutation = useMutation({
    mutationFn: () =>
      createCalendarBlock(venueId, { date: blockDate, reason: reason || undefined }),
    onSuccess: async () => {
      toast.success('Fecha bloqueada');
      setDrawerOpen(false);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['venue-calendar', venueId, month] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo bloquear fecha', { description: error.message }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => deleteCalendarBlock(venueId, blockId),
    onSuccess: async () => {
      toast.success('Bloqueo eliminado');
      await queryClient.invalidateQueries({ queryKey: ['venue-calendar', venueId, month] });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo eliminar bloqueo', { description: error.message }),
  });

  if (venuesQuery.isLoading) return <Skeleton className="h-40 w-full" />;
  if (venuesQuery.isError)
    return (
      <ErrorState title="No se pudieron cargar tus salones" onRetry={() => venuesQuery.refetch()} />
    );
  if (!venuesQuery.data?.length)
    return <EmptyState icon={CalendarX} title="No tienes salones para calendario" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <OwnerVenueSelect venues={venuesQuery.data} value={venueId} onChange={setVenueId} />
        <div className="space-y-2">
          <Label htmlFor="month">Mes</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        <Button onClick={() => setDrawerOpen(true)}>Bloquear fecha</Button>
      </div>

      {calendarQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {calendarQuery.isError ? (
        <ErrorState title="No se pudo cargar calendario" onRetry={() => calendarQuery.refetch()} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Reservas del mes</h2>
          {!calendarQuery.data?.bookings.length ? (
            <EmptyState icon={CalendarX} title="Sin reservas este mes" />
          ) : null}
          {calendarQuery.data?.bookings.map((booking) => (
            <div key={booking.id} className="rounded-md border p-3">
              <p className="font-medium">{booking.eventType}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(booking.date)} · {booking.status}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Fechas bloqueadas</h2>
          {!calendarQuery.data?.blocks.length ? (
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
                onClick={() => deleteBlockMutation.mutate(block.id)}
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
    </div>
  );
};
