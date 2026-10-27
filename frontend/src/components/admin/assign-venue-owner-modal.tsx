'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { assignVenueOwner } from '@/lib/api/admin.api';
import {
  assignVenueOwnerFormSchema,
  type AssignVenueOwnerFormValues,
} from '@/lib/validators/admin.schema';
import { PhoneInput } from '@/components/shared/phone-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';
import type { Venue } from '@/types/api';

interface AssignVenueOwnerModalProps {
  venue: Venue | null;
  onOpenChange: (open: boolean) => void;
}

export const AssignVenueOwnerModal = ({ venue, onOpenChange }: AssignVenueOwnerModalProps) => {
  const queryClient = useQueryClient();

  const form = useForm<AssignVenueOwnerFormValues>({
    resolver: zodResolver(assignVenueOwnerFormSchema),
    mode: 'onChange',
    defaultValues: { ownerFullName: '', ownerEmail: '', ownerPhone: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: AssignVenueOwnerFormValues) =>
      assignVenueOwner(venue!.id, {
        fullName: values.ownerFullName,
        email: values.ownerEmail,
        phone: values.ownerPhone,
      }),
    onSuccess: () => {
      toast.success('Invitacion enviada');
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'owner-invites'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar la invitacion', { description: error.message });
    },
  });

  return (
    <Dialog
      open={Boolean(venue)}
      onOpenChange={(open) => {
        if (!open) form.reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar al dueno de &quot;{venue?.name}&quot;</DialogTitle>
          <DialogDescription>
            Solo funciona si este local todavia no tiene un dueno real asignado. Si el email ya
            existe como cliente o propietario, se vincula esa cuenta en vez de crear una nueva.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="sf-form-group">
            <Label htmlFor="assignOwnerFullName">Nombre completo</Label>
            <Input id="assignOwnerFullName" {...form.register('ownerFullName')} />
            {form.formState.errors.ownerFullName ? (
              <p className="sf-form-error">{form.formState.errors.ownerFullName.message}</p>
            ) : null}
          </div>
          <div className="sf-form-group">
            <Label htmlFor="assignOwnerEmail">Email</Label>
            <Input id="assignOwnerEmail" type="email" {...form.register('ownerEmail')} />
            {form.formState.errors.ownerEmail ? (
              <p className="sf-form-error">{form.formState.errors.ownerEmail.message}</p>
            ) : null}
          </div>
          <div className="sf-form-group">
            <Label htmlFor="assignOwnerPhone">Telefono</Label>
            <PhoneInput
              id="assignOwnerPhone"
              value={form.watch('ownerPhone') ?? ''}
              onChange={(value) =>
                form.setValue('ownerPhone', value, { shouldValidate: true, shouldDirty: true })
              }
            />
            {form.formState.errors.ownerPhone ? (
              <p className="sf-form-error">{form.formState.errors.ownerPhone.message}</p>
            ) : null}
          </div>
          <SubmitButton
            className="w-full"
            disabled={!form.formState.isValid}
            isLoading={mutation.isPending}
            loadingText="Enviando..."
          >
            Enviar invitacion
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
};
