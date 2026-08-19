import { Badge } from '@/components/ui/badge';
import type { BookingStatus, PaymentStatus } from '@/types/api';

interface BookingStatusBadgeProps {
  status: BookingStatus | PaymentStatus;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  DEPOSIT_PAID: 'Sena pagada',
  FULLY_PAID: 'Pagada',
  CANCELLED_BY_CLIENT: 'Cancelada por cliente',
  CANCELLED_BY_OWNER: 'Cancelada por owner',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistio',
  FAILED: 'Rechazado',
  REFUNDED: 'Reembolsado',
  PARTIAL: 'Parcial',
};

const variantByStatus: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  APPROVED: 'secondary',
  DEPOSIT_PAID: 'default',
  FULLY_PAID: 'default',
  COMPLETED: 'default',
  CANCELLED_BY_CLIENT: 'destructive',
  CANCELLED_BY_OWNER: 'destructive',
  NO_SHOW: 'destructive',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
  PARTIAL: 'outline',
};

export const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  return (
    <Badge variant={variantByStatus[status] ?? 'outline'}>{statusLabels[status] ?? status}</Badge>
  );
};
