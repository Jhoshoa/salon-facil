// Recharts renders to SVG and can't read CSS custom properties at paint time, so the palette
// is duplicated here as resolved hsl() strings matching the tokens in globals.css.
export const CHART_COLORS = {
  primary: 'hsl(250, 35%, 30%)',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  accent: 'hsl(23, 67%, 55%)',
  muted: 'hsl(250, 14%, 70%)',
} as const;

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.destructive,
  CHART_COLORS.accent,
];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  DEPOSIT_PAID: 'Sena pagada',
  FULLY_PAID: 'Pagada',
  CANCELLED_BY_CLIENT: 'Cancelada (cliente)',
  CANCELLED_BY_OWNER: 'Cancelada (propietario)',
  COMPLETED: 'Completada',
  NO_SHOW: 'No se presento',
};
