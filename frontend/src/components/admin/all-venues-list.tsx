'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, LayoutGrid, Play, Power, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deactivateVenue,
  deleteVenue,
  getAllVenuesAdmin,
  reactivateVenue,
} from '@/lib/api/venues.api';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { Venue } from '@/types/api';

const statusVariant: Record<Venue['status'], BadgeProps['variant']> = {
  DRAFT: 'outline',
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  REJECTED: 'destructive',
};

const statusLabels: Record<Venue['status'], string> = {
  DRAFT: 'Borrador',
  PENDING: 'En revision',
  ACTIVE: 'Publicado',
  INACTIVE: 'Inactivo',
  REJECTED: 'Rechazado',
};

// Fires no request before this many characters — with hundreds of venues, searching on every
// 1-2 character keystroke would be both noisy and useless (too many false-positive matches).
const MIN_SEARCH_LENGTH = 3;

export const AllVenuesList = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [venueToDeactivate, setVenueToDeactivate] = useState<Venue | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'all-venues', activeQuery, page],
    queryFn: () => getAllVenuesAdmin({ query: activeQuery, page, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'all-venues'] });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateVenue(id),
    onSuccess: () => {
      toast.success('Local desactivado');
      setVenueToDeactivate(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo desactivar el local', { description: error.message });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateVenue(id),
    onSuccess: () => {
      toast.success('Local reactivado');
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo reactivar el local', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      toast.success('Local eliminado');
      setVenueToDelete(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar el local', { description: error.message });
    },
  });

  const venues = query.data?.venues ?? [];
  const total = query.data?.total ?? 0;
  const currentPage = query.data?.page ?? page;
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre de local, distrito o propietario..."
          className="pl-9"
        />
        {searchInput.trim().length > 0 && searchInput.trim().length < MIN_SEARCH_LENGTH ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Escribi al menos {MIN_SEARCH_LENGTH} caracteres para buscar.
          </p>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="No se pudieron cargar los locales" onRetry={() => query.refetch()} />
      ) : !venues.length ? (
        <EmptyState
          icon={LayoutGrid}
          title={activeQuery ? 'Sin resultados' : 'Todavia no hay locales'}
          description={
            activeQuery
              ? `Ningun local coincide con "${activeQuery}".`
              : 'Los locales que publiquen los propietarios van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} local{total === 1 ? '' : 'es'} en total
          </p>
          <div className="space-y-3">
            {venues.map((venue) => (
              <article
                key={venue.id}
                className="sf-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{venue.name}</h3>
                    <Badge variant={statusVariant[venue.status]}>
                      {statusLabels[venue.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {venue.district}, {departamentoLabels[venue.departamento]} · Capacidad{' '}
                    {venue.capacityMin}-{venue.capacityMax}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Propietario: {venue.owner?.fullName ?? 'N/D'}
                    {venue.owner?.phone ? ` · ${venue.owner.phone}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/venues/all/${venue.id}/preview`}>
                      <Eye className="h-4 w-4" />
                      Ver detalle
                    </Link>
                  </Button>
                  {venue.status === 'ACTIVE' ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="Desactivar — deja de aparecer en las busquedas, se puede reactivar despues"
                      onClick={() => setVenueToDeactivate(venue)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {venue.status === 'INACTIVE' ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="Reactivar"
                      onClick={() => reactivateMutation.mutate(venue.id)}
                      disabled={reactivateMutation.isPending}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Eliminar — accion permanente"
                    onClick={() => setVenueToDelete(venue)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(venueToDeactivate)}
        title="Desactivar local"
        description={`"${venueToDeactivate?.name}" va a dejar de aparecer en las busquedas. Se puede reactivar despues.`}
        confirmLabel="Desactivar"
        isLoading={deactivateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setVenueToDeactivate(null);
        }}
        onConfirm={() => {
          if (venueToDeactivate) deactivateMutation.mutate(venueToDeactivate.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(venueToDelete)}
        title="Eliminar local"
        description={`"${venueToDelete?.name}" se va a eliminar. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setVenueToDelete(null);
        }}
        onConfirm={() => {
          if (venueToDelete) deleteMutation.mutate(venueToDelete.id);
        }}
      />
    </div>
  );
};
