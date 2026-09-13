'use client';

import Image from 'next/image';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Play, Plus, Power, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deactivateVenue, deleteVenue, getMyVenues, reactivateVenue } from '@/lib/api/venues.api';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export const OwnerVenueList = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });
  const [venueToDeactivate, setVenueToDeactivate] = useState<Venue | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      toast.success('Local eliminado');
      setVenueToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar el local', { description: error.message });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateVenue(id),
    onSuccess: () => {
      toast.success('Local desactivado — ya no aparece en las busquedas');
      setVenueToDeactivate(null);
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo desactivar el local', { description: error.message });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateVenue(id),
    onSuccess: () => {
      toast.success('Local reactivado');
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo reactivar el local', { description: error.message });
    },
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState title="No se pudieron cargar tus locales" onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {query.data?.length ?? 0} local{query.data?.length === 1 ? '' : 'es'} registrado
          {query.data?.length === 1 ? '' : 's'}
        </p>
        <Button asChild>
          <Link href="/dashboard/venues/new">
            <Plus className="h-4 w-4" />
            Nuevo local
          </Link>
        </Button>
      </div>

      {!query.data?.length ? (
        <EmptyState
          icon={Store}
          title="Aun no tienes locales"
          description="Crea tu primer local para empezar a recibir reservas."
          action={
            <Button asChild>
              <Link href="/dashboard/venues/new">
                <Plus className="h-4 w-4" />
                Crear local
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((venue) => {
            const cover = venue.media?.find((item) => item.isCover)?.url ?? venue.photos?.[0];

            return (
              <article key={venue.id} className="sf-card overflow-hidden">
                <div className="relative aspect-[16/9] bg-muted">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={venue.name}
                      fill
                      className="object-cover"
                      loader={cloudinaryImageLoader}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  ) : (
                    <div className="sf-gradient-subtle flex h-full items-center justify-center text-sm text-muted-foreground">
                      Sin foto
                    </div>
                  )}
                  <Badge variant={statusVariant[venue.status]} className="absolute left-2 top-2">
                    {statusLabels[venue.status]}
                  </Badge>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-semibold">{venue.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {venue.district}, {departamentoLabels[venue.departamento]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/venues/${venue.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/venues/${venue.id}/preview`}>
                        <Eye className="h-4 w-4" />
                        Vista previa
                      </Link>
                    </Button>
                    {venue.status === 'ACTIVE' ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Desactivar — deja de aparecer en las busquedas, podes reactivarlo despues"
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(venueToDeactivate)}
        title="Desactivar local"
        description={`"${venueToDeactivate?.name}" va a dejar de aparecer en las busquedas. Podes reactivarlo despues.`}
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
