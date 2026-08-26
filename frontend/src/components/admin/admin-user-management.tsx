'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminUsers, updateAdminUserStatus, type AdminUsersParams } from '@/lib/api/admin.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

const LIMIT = 20;

export const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const params: AdminUsersParams = {
    search: search || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  };

  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getAdminUsers(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, nextStatus }: { userId: string; nextStatus: string }) =>
      updateAdminUserStatus(userId, nextStatus),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el estado', { description: error.message });
    },
  });

  const users = query.data?.data ?? [];
  const totalPages = query.data?.totalPages ?? 1;

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="sf-card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Nombre, email o telefono"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetToFirstPage();
            }}
          />
        </div>
        <div>
          <Label htmlFor="role">Rol</Label>
          <select
            id="role"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              resetToFirstPage();
            }}
          >
            <option value="">Todos</option>
            <option value="CLIENT">Cliente</option>
            <option value="OWNER">Propietario</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div>
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetToFirstPage();
            }}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="PENDING_VERIFICATION">Pendiente de verificacion</option>
          </select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : null}

      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}

      {!query.isLoading && !query.isError && users.length === 0 ? (
        <EmptyState icon={Users} title="No se encontraron usuarios" description="Ajusta los filtros de busqueda." />
      ) : null}

      {users.length > 0 ? (
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

              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-56"
                value={user.status}
                disabled={statusMutation.isPending}
                onChange={(event) =>
                  statusMutation.mutate({ userId: user.id, nextStatus: event.target.value })
                }
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="PENDING_VERIFICATION">Pendiente de verificacion</option>
              </select>
            </article>
          ))}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <Button
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
    </div>
  );
};
