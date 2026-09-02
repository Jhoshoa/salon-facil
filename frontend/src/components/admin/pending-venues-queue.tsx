'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPendingVenues, verifyVenue } from '@/lib/api/venues.api';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

export const PendingVenuesQueue = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'pending-venues'], queryFn: getPendingVenues });

  const verifyMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => verifyVenue(id, approve),
    onSuccess: (_venue, variables) => {
      toast.success(variables.approve ? 'Local aprobado' : 'Local rechazado');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el local', { description: error.message });
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState title="No se pudo cargar la cola de verificacion" onRetry={() => query.refetch()} />;
  }

  if (!query.data?.length) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No hay locales pendientes"
        description="Todos los locales enviados a revision ya fueron procesados."
      />
    );
  }

  return (
    <div className="space-y-4">
      {query.data.map((venue) => {
        const cover = venue.media?.find((item) => item.isCover)?.url ?? venue.photos?.[0];

        return (
          <article key={venue.id} className="sf-card flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted sm:w-48">
              {cover ? (
                <Image src={cover} alt={venue.name} fill className="object-cover" />
              ) : (
                <div className="sf-gradient-subtle flex h-full items-center justify-center text-xs text-muted-foreground">
                  Sin foto
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{venue.name}</h3>
                  <Badge variant="warning">En revision</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {venue.district}, {departamentoLabels[venue.departamento]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Propietario: {venue.owner?.fullName ?? 'N/D'}
                  {venue.owner?.phone ? ` · ${venue.owner.phone}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/venues/${venue.slug}`} target="_blank">
                    Ver publicacion
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => verifyMutation.mutate({ id: venue.id, approve: true })}
                  disabled={verifyMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => verifyMutation.mutate({ id: venue.id, approve: false })}
                  disabled={verifyMutation.isPending}
                >
                  <X className="h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
