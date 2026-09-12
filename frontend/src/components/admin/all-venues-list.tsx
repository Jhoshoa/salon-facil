'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LayoutGrid, Play, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deactivateVenue,
  deleteVenue,
  getAllVenuesAdmin,
  reactivateVenue,
} from '@/lib/api/venues.api';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

export const AllVenuesList = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'all-venues'], queryFn: getAllVenuesAdmin });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'all-venues'] });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateVenue(id),
    onSuccess: () => {
      toast.success('Local desactivado');
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
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar el local', { description: error.message });
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState title="No se pudieron cargar los locales" onRetry={() => query.refetch()} />;
  }

  if (!query.data?.length) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Todavia no hay locales"
        description="Los locales que publiquen los propietarios van a aparecer aca."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {query.data.length} local{query.data.length === 1 ? '' : 'es'} en total
      </p>
      {query.data.map((venue) => (
        <article
          key={venue.id}
          className="sf-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{venue.name}</h3>
              <Badge variant={statusVariant[venue.status]}>{statusLabels[venue.status]}</Badge>
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
                onClick={() => {
                  if (confirm(`¿Desactivar "${venue.name}"? Se puede reactivar despues.`)) {
                    deactivateMutation.mutate(venue.id);
                  }
                }}
                disabled={deactivateMutation.isPending}
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
              onClick={() => {
                if (confirm(`¿Eliminar "${venue.name}"? Esta accion no se puede deshacer.`)) {
                  deleteMutation.mutate(venue.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
};
