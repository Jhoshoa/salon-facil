import type { PaymentType } from '@/types/api';

/** Shared across every place a payment shows up (drawer, client "Pagos" list, owner "Pagos
 * pendientes" queue, "Estado de pago") so a REMAINING row never reads as an unlabeled duplicate
 * of a DEPOSIT one. */
export const paymentTypeLabels: Record<PaymentType, string> = {
  DEPOSIT: 'Anticipo',
  FULL: 'Pago completo',
  REMAINING: 'Saldo restante',
};
