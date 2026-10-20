'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { getAuditLog } from '@/lib/api/admin.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { AuditLogEntry } from '@/types/api';

const ACTION_LABELS: Record<string, string> = {
  'user.status_changed': 'Cambio de estado de usuario',
  'user.role_changed': 'Cambio de rol de usuario',
  'venue.approved': 'Local aprobado',
  'venue.rejected': 'Local rechazado',
  'review.deleted': 'Reseña eliminada',
  'review.responded': 'Respuesta a reseña',
  'payment.refunded': 'Pago reembolsado',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  User: 'Usuario',
  Venue: 'Local',
  Review: 'Reseña',
  Payment: 'Pago',
};

const formatMetadata = (metadata: Record<string, unknown> | null): string | null => {
  if (!metadata) return null;
  if (typeof metadata.previousStatus === 'string' && typeof metadata.newStatus === 'string') {
    return `${metadata.previousStatus} → ${metadata.newStatus}`;
  }
  if (typeof metadata.previousRole === 'string' && typeof metadata.newRole === 'string') {
    return `${metadata.previousRole} → ${metadata.newRole}`;
  }
  if (typeof metadata.venueName === 'string') {
    return metadata.venueName;
  }
  if (typeof metadata.reason === 'string') {
    return `Motivo: ${metadata.reason}`;
  }
  const rest = Object.entries(metadata).filter(([key]) => key !== 'reason');
  if (!rest.length) return null;
  return rest.map(([key, value]) => `${key}: ${value}`).join(' · ');
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AdminAuditLog = () => {
  const [targetType, setTargetType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin', 'audit-log', targetType, action, page],
    queryFn: () =>
      getAuditLog({
        targetType: targetType || undefined,
        action: action || undefined,
        page,
        limit: 20,
      }),
  });

  const entries = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const currentPage = query.data?.page ?? page;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(targetType || action);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[auto_auto]">
        <Select
          value={targetType}
          onChange={(event) => {
            setTargetType(event.target.value);
            setPage(1);
          }}
          className="sm:w-48"
          aria-label="Filtrar por tipo de recurso"
        >
          <option value="">Todos los recursos</option>
          {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="sm:w-64"
          aria-label="Filtrar por accion"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="No se pudo cargar el historial" onRetry={() => query.refetch()} />
      ) : !entries.length ? (
        <EmptyState
          icon={History}
          title={hasActiveFilters ? 'Sin resultados' : 'Todavia no hay acciones registradas'}
          description={
            hasActiveFilters
              ? 'Ninguna entrada coincide con los filtros aplicados.'
              : 'Las acciones que hagan los administradores (suspender usuarios, aprobar o rechazar locales, moderar reseñas, reembolsar pagos) van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} accion{total === 1 ? '' : 'es'} registrada{total === 1 ? '' : 's'}
          </p>
          <div className="space-y-2">
            {entries.map((entry: AuditLogEntry) => {
              const detail = formatMetadata(entry.metadata);
              return (
                <article key={entry.id} className="sf-card flex flex-col gap-1.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {TARGET_TYPE_LABELS[entry.targetType] ?? entry.targetType}
                        {entry.targetId ? ` · ${entry.targetId}` : ''}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {entry.adminName ?? 'Administrador eliminado'}
                    </span>
                    {entry.adminEmail ? (
                      <span className="text-muted-foreground"> · {entry.adminEmail}</span>
                    ) : null}
                  </p>
                  {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
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
    </div>
  );
};
