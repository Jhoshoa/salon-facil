'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { publishVenue } from '@/lib/api/venues.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';

interface PublishVenueDialogProps {
  venueId: string;
  disabled?: boolean;
  trigger: React.ReactNode;
}

export const PublishVenueDialog = ({ venueId, disabled, trigger }: PublishVenueDialogProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => publishVenue(venueId),
    onSuccess: () => {
      toast.success('Local enviado a revision', {
        description: 'Un administrador lo revisara antes de publicarlo.',
      });
      queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar a revision', { description: error.message });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar local a revision</DialogTitle>
          <DialogDescription>
            Un administrador revisara la informacion de tu local. Si todo esta correcto, se
            publicara y sera visible para los clientes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <SubmitButton
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Enviar a revision
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
