import { z } from 'zod';

export const paymentProofSchema = z.object({
  method: z.enum(['QR_BANK', 'BANK_TRANSFER', 'TIGO_MONEY', 'CASH']),
  transactionReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

export type PaymentProofFormValues = z.infer<typeof paymentProofSchema>;

export const validateProofFile = (file: File | null): string | null => {
  if (!file) return 'El comprobante es requerido';

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) return 'Solo se aceptan JPG, PNG, WEBP o PDF';

  if (file.size > 5 * 1024 * 1024) return 'El comprobante no puede exceder 5MB';

  return null;
};
