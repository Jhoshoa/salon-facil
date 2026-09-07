'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resendVerificationCode, verifyEmail } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';

interface VerifyEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Deliberately re-openable from anywhere (see SiteHeader's persistent banner) instead of a
// one-time post-registration event, so a refresh or back-button in the middle of registration
// never strands the user without a way back into this flow.
// See docs/auth-improvement/oauth-redirects-verification.md §4.
export const VerifyEmailModal = ({ open, onOpenChange }: VerifyEmailModalProps) => {
  const [code, setCode] = useState('');
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      if (user) updateUser({ ...user, emailVerified: true });
      toast.success('Email verificado');
      setCode('');
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error('Codigo incorrecto', { description: error.message });
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationCode,
    onSuccess: (result) => {
      toast.success(result.message);
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo reenviar el codigo', { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verifica tu email</DialogTitle>
          <DialogDescription>
            Te enviamos un codigo de 6 digitos a {user?.email}. Ingresalo para verificar tu cuenta.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            verifyMutation.mutate(code);
          }}
        >
          <div className="sf-form-group">
            <Label htmlFor="verification-code">Codigo de verificacion</Label>
            <Input
              id="verification-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>

          <SubmitButton
            className="w-full"
            disabled={code.length !== 6}
            isLoading={verifyMutation.isPending}
          >
            Verificar
          </SubmitButton>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
          >
            Reenviar codigo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
