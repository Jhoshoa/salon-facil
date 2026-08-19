'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { createPayment, uploadPaymentProof } from '@/lib/api/payments.api';
import { validateProofFile } from '@/lib/validators/payment.schema';
import type { Booking, PaymentMethod } from '@/types/api';
import { AppDrawer } from '@/components/shared/app-drawer';
import { SubmitButton } from '@/components/shared/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentProofDrawerProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentProofDrawer = ({ booking, open, onOpenChange }: PaymentProofDrawerProps) => {
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
        paymentType: 'DEPOSIT',
        method,
        amount: booking.depositAmount,
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

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Subir comprobante"
      description="El owner revisara el pago de sena."
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
