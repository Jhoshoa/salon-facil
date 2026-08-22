'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteVenue, getMyVenues } from '@/lib/api/venues.api';
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

export const OwnerVenueList = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['owner-venues'], queryFn: getMyVenues });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      toast.success('Local eliminado');
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar el local', { description: error.message });
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
                    <Image src={cover} alt={venue.name} fill className="object-cover" />
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
                      {venue.district}, {venue.city}
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
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
