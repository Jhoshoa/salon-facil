'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, Mail, Search, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminOwnerInvites, sendOwnerInvite } from '@/lib/api/admin.api';
import { createVenuePreviewLink } from '@/lib/api/venues.api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

const MIN_SEARCH_LENGTH = 3;
const LIMIT = 20;

const daysSince = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};

const isExpired = (expiresAtIso: string) => new Date(expiresAtIso).getTime() <= Date.now();

export const AdminPendingOwnerInvites = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'owner-invites', activeQuery, page],
    queryFn: () => getAdminOwnerInvites({ search: activeQuery || undefined, page, limit: LIMIT }),
  });

  const sendMutation = useMutation({
    mutationFn: (venueId: string) => sendOwnerInvite(venueId),
    onSuccess: (result) => {
      toast.success(result.resent ? 'Invitacion reenviada' : 'Invitacion enviada');
      queryClient.invalidateQueries({ queryKey: ['admin', 'owner-invites'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar la invitacion', { description: error.message });
    },
  });

  const previewLinkMutation = useMutation({
    mutationFn: (venueId: string) => createVenuePreviewLink(venueId),
    onSuccess: async ({ token }) => {
      const url = `${window.location.origin}/share-preview/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link de preview copiado', { description: 'Vence en 7 dias' });
      } catch {
        toast.success('Link de preview generado', { description: url });
      }
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo generar el link de preview', { description: error.message });
    },
  });

  const invites = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(activeQuery);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, email o telefono..."
            className="pl-9"
          />
        </div>
        <Button asChild size="sm">
          <Link href="/admin/owner-invites/new">
            <UserPlus className="h-4 w-4" />
            Registrar local por telefono
          </Link>
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="No se pudieron cargar las invitaciones"
          onRetry={() => query.refetch()}
        />
      ) : !invites.length ? (
        <EmptyState
          icon={Mail}
          title={hasActiveFilters ? 'Sin resultados' : 'No hay locales pendientes de reclamo'}
          description={
            hasActiveFilters
              ? 'Ningun dueno pendiente coincide con la busqueda.'
              : 'Los locales que cargues por telefono van a aparecer aca hasta que el dueno active su cuenta.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} pendiente{total === 1 ? '' : 's'}
          </p>
          <div className="space-y-2">
            {invites.map((invite) => {
              const expired = invite.latestInvite
                ? isExpired(invite.latestInvite.expiresAt)
                : false;
              return (
                <article
                  key={invite.id}
                  className="sf-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{invite.fullName}</span>
                      <span className="text-sm text-muted-foreground">{invite.email}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {invite.venues.map((v) => v.name).join(', ') || 'Sin locales'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Cargado hace {daysSince(invite.createdAt)} dias</span>
                      {invite.latestInvite ? (
                        <Badge variant={expired ? 'warning' : 'success'}>
                          {expired ? 'Enlace vencido' : 'Invitacion vigente'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sin invitacion enviada</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!invite.venues.length || previewLinkMutation.isPending}
                      onClick={() => previewLinkMutation.mutate(invite.venues[0].id)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!invite.venues.length || sendMutation.isPending}
                      onClick={() => sendMutation.mutate(invite.venues[0].id)}
                    >
                      <Send className="h-4 w-4" />
                      {invite.latestInvite ? 'Reenviar invitacion' : 'Enviar invitacion'}
                    </Button>
                  </div>
                </article>
              );
            })}
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
