'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminUserCounts,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '@/lib/api/admin.api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { AdminUser } from '@/types/api';

const roleLabels: Record<AdminUser['role'], string> = {
  CLIENT: 'Cliente',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

const statusLabels: Record<AdminUser['status'], string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
  PENDING_VERIFICATION: 'Pendiente de verificacion',
};

const statusBadgeVariant: Record<AdminUser['status'], 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  PENDING_VERIFICATION: 'warning',
};

// Fires no request before this many characters — with hundreds of usuarios, searching on every
// 1-2 character keystroke would be both noisy and useless (too many false-positive matches).
const MIN_SEARCH_LENGTH = 3;
const LIMIT = 20;

interface RoleChangeTarget {
  user: AdminUser;
  nextRole: 'CLIENT' | 'OWNER';
}

interface StatusChangeTarget {
  user: AdminUser;
  nextStatus: AdminUser['status'];
}

export const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState<AdminUser['role'] | ''>('');
  const [status, setStatus] = useState<AdminUser['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [roleChangeTarget, setRoleChangeTarget] = useState<RoleChangeTarget | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<StatusChangeTarget | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'users', activeQuery, role, status, page],
    queryFn: () =>
      getAdminUsers({
        search: activeQuery || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: LIMIT,
      }),
  });

  // Independent of `role`/`status` on their own dimension — the role breakdown describes every
  // role option under the currently selected status (and vice versa), so selecting an option in
  // a dropdown can't affect that same dropdown's own counts.
  const countsQuery = useQuery({
    queryKey: ['admin', 'users', 'counts', activeQuery, role, status],
    queryFn: () =>
      getAdminUserCounts({
        search: activeQuery || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const statusMutation = useMutation({
    mutationFn: ({ userId, nextStatus }: { userId: string; nextStatus: AdminUser['status'] }) =>
      updateAdminUserStatus(userId, nextStatus),
    onSuccess: () => {
      toast.success('Estado actualizado');
      setStatusChangeTarget(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el estado', { description: error.message });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: 'CLIENT' | 'OWNER' }) =>
      updateAdminUserRole(userId, nextRole),
    onSuccess: () => {
      toast.success('Rol actualizado');
      setRoleChangeTarget(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el rol', { description: error.message });
    },
  });

  const users = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(activeQuery || role || status);

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="Buscar por nombre, email o telefono..."
            className="pl-9"
          />
          {searchInput.trim().length > 0 && searchInput.trim().length < MIN_SEARCH_LENGTH ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Escribi al menos {MIN_SEARCH_LENGTH} caracteres para buscar.
            </p>
          ) : null}
        </div>

        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as AdminUser['role'] | '');
            resetToFirstPage();
          }}
          className="sm:w-52"
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {(Object.keys(roleLabels) as AdminUser['role'][]).map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
              {countsQuery.data ? ` (${countsQuery.data.role[value]})` : ''}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AdminUser['status'] | '');
            resetToFirstPage();
          }}
          className="sm:w-56"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(statusLabels) as AdminUser['status'][]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
              {countsQuery.data ? ` (${countsQuery.data.status[value]})` : ''}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !users.length ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? 'Sin resultados' : 'Todavia no hay usuarios'}
          description={
            hasActiveFilters
              ? 'Ningun usuario coincide con la busqueda y los filtros aplicados.'
              : 'Los usuarios registrados van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} usuario{total === 1 ? '' : 's'} en total
          </p>
          <div className="space-y-3">
            {users.map((user) => (
              <article
                key={user.id}
                className="sf-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{user.fullName}</h3>
                    <Badge variant="outline">{roleLabels[user.role]}</Badge>
                    <Badge variant={statusBadgeVariant[user.status]}>{statusLabels[user.status]}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email} · {user.phone}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:w-56">
                  {user.role === 'ADMIN' ? null : (
                    <Select
                      value={user.role}
                      disabled={roleMutation.isPending}
                      onChange={(event) =>
                        setRoleChangeTarget({
                          user,
                          nextRole: event.target.value as 'CLIENT' | 'OWNER',
                        })
                      }
                      aria-label={`Cambiar rol de ${user.fullName}`}
                    >
                      <option value="CLIENT">Cliente</option>
                      <option value="OWNER">Propietario</option>
                    </Select>
                  )}

                  <Select
                    value={user.status}
                    disabled={statusMutation.isPending}
                    onChange={(event) =>
                      setStatusChangeTarget({
                        user,
                        nextStatus: event.target.value as AdminUser['status'],
                      })
                    }
                    aria-label={`Cambiar estado de ${user.fullName}`}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="PENDING_VERIFICATION">Pendiente de verificacion</option>
                  </Select>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(roleChangeTarget)}
        title="Cambiar rol"
        description={
          roleChangeTarget
            ? `"${roleChangeTarget.user.fullName}" va a pasar de ${roleLabels[roleChangeTarget.user.role]} a ${roleLabels[roleChangeTarget.nextRole]}.`
            : ''
        }
        confirmLabel="Cambiar rol"
        isLoading={roleMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setRoleChangeTarget(null);
        }}
        onConfirm={() => {
          if (roleChangeTarget) {
            roleMutation.mutate({
              userId: roleChangeTarget.user.id,
              nextRole: roleChangeTarget.nextRole,
            });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(statusChangeTarget)}
        title="Cambiar estado"
        description={
          statusChangeTarget
            ? `"${statusChangeTarget.user.fullName}" va a pasar de ${statusLabels[statusChangeTarget.user.status]} a ${statusLabels[statusChangeTarget.nextStatus]}.`
            : ''
        }
        confirmLabel="Cambiar estado"
        isLoading={statusMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setStatusChangeTarget(null);
        }}
        onConfirm={() => {
          if (statusChangeTarget) {
            statusMutation.mutate({
              userId: statusChangeTarget.user.id,
              nextStatus: statusChangeTarget.nextStatus,
            });
          }
        }}
      />
    </div>
  );
};
