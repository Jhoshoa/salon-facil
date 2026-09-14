'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { createPayment, uploadPaymentProof } from '@/lib/api/payments.api';
import { validateProofFile } from '@/lib/validators/payment.schema';
import type { Booking, PaymentMethod, PaymentType } from '@/types/api';
import { AppDrawer } from '@/components/shared/app-drawer';
import { SubmitButton } from '@/components/shared/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentProofDrawerProps {
  booking: Booking;
  /** Decided by the caller from the booking's own state + the venue's payment policy — never a
   * free choice inside the drawer, so a client can't submit a comprobante under the wrong type
   * (e.g. a full payment recorded as a DEPOSIT, which used to leave the booking stuck showing
   * "Anticipo pagado" instead of moving on to FULLY_PAID). */
  paymentType: PaymentType;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentTypeCopy: Record<PaymentType, { title: string; description: string }> = {
  DEPOSIT: {
    title: 'Subir comprobante del anticipo',
    description: 'El propietario revisara el pago del anticipo.',
  },
  FULL: {
    title: 'Subir comprobante del pago completo',
    description: 'El propietario revisara tu pago completo.',
  },
  REMAINING: {
    title: 'Subir comprobante del saldo restante',
    description: 'El propietario revisara el pago del saldo restante.',
  },
};

export const PaymentProofDrawer = ({
  booking,
  paymentType,
  amount,
  open,
  onOpenChange,
}: PaymentProofDrawerProps) => {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const validationError = validateProofFile(file);
      if (validationError || !file) {
        setFileError(validationError);
        throw new Error(validationError ?? 'Archivo invalido');
      }

      const payment = await createPayment(booking.id, {
        paymentType,
        method,
        amount,
        transactionReference: reference || undefined,
      });
      return uploadPaymentProof(payment.id, file);
    },
    onSuccess: async () => {
      toast.success('Comprobante enviado');
      await queryClient.invalidateQueries({ queryKey: ['booking-payments', booking.id] });
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar el comprobante', { description: error.message });
    },
  });

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    setFileError(validateProofFile(selected));
  };

  const copy = paymentTypeCopy[paymentType];

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="method">Metodo</Label>
          <select
            id="method"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            <option value="BANK_TRANSFER">Transferencia bancaria</option>
            <option value="QR_BANK">QR bancario</option>
            <option value="TIGO_MONEY">Tigo Money</option>
            <option value="CASH">Efectivo</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Referencia</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Comprobante</Label>
          <Input
            id="file"
            type="file"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
          {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
          {file ? <p className="text-sm text-muted-foreground">{file.name}</p> : null}
        </div>
        <SubmitButton
          className="w-full"
          disabled={Boolean(fileError) || !file}
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Enviar comprobante
        </SubmitButton>
      </div>
    </AppDrawer>
  );
};
