'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, Mail, Phone } from 'lucide-react';
import { getAdminUserDetail } from '@/lib/api/admin.api';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { AdminUser, AdminUserVenueSummary } from '@/types/api';

interface AdminUserDetailProps {
  userId: string;
}

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

const statusBadgeVariant: Record<
  AdminUser['status'],
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  PENDING_VERIFICATION: 'warning',
};

const venueStatusVariant: Record<AdminUserVenueSummary['status'], BadgeProps['variant']> = {
  DRAFT: 'outline',
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  REJECTED: 'destructive',
};

const venueStatusLabels: Record<AdminUserVenueSummary['status'], string> = {
  DRAFT: 'Borrador',
  PENDING: 'En revision',
  ACTIVE: 'Publicado',
  INACTIVE: 'Inactivo',
  REJECTED: 'Rechazado',
};

export const AdminUserDetailView = ({ userId }: AdminUserDetailProps) => {
  const query = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => getAdminUserDetail(userId),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState title="No se pudo cargar el usuario" onRetry={() => query.refetch()} />;
  }

  const { user, venues, bookings } = query.data;

  return (
    <div className="space-y-6">
      <article className="sf-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{user.fullName}</h2>
          <Badge variant="outline">{roleLabels[user.role]}</Badge>
          <Badge variant={statusBadgeVariant[user.status]}>{statusLabels[user.status]}</Badge>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            {user.email}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            {user.phone}
          </p>
          {user.city || user.district ? (
            <p className="flex items-center gap-2 sm:col-span-2">
              {[user.district, user.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            Registrado el {formatDate(user.createdAt)}
          </p>
          {user.lastLoginAt ? (
            <p className="flex items-center gap-2">
              Ultimo ingreso: {formatDate(user.lastLoginAt)}
            </p>
          ) : null}
        </div>
      </article>

      {venues ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Locales ({venues.length})</h3>
          {venues.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Todavia no tiene locales"
              description="Este propietario no publico ningun local."
            />
          ) : (
            <div className="space-y-2">
              {venues.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/admin/venues/all/${venue.id}/preview`}
                  className="sf-card block p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{venue.name}</span>
                    <Badge variant={venueStatusVariant[venue.status]}>
                      {venueStatusLabels[venue.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {venue.district}, {departamentoLabels[venue.departamento]} · Publicado el{' '}
                    {formatDate(venue.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {bookings ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Reservas ({bookings.length})</h3>
          {bookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Todavia no tiene reservas"
              description="Este cliente no hizo ninguna reserva."
            />
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div key={booking.id} className="sf-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{booking.venueName ?? 'Local eliminado'}</span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(booking.eventDate)} · {formatCurrency(booking.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
