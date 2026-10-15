'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { PublicAuthResponse } from '@/types/api';

interface FavoriteLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Unlike LoginToBookModal, there's no role restriction here -- favoriting a venue is open to
 * any authenticated role (CLIENT, OWNER, or ADMIN browsing for their own reasons), so this
 * just needs a session, not a specific one. */
export const FavoriteLoginModal = ({ open, onOpenChange }: FavoriteLoginModalProps) => {
  const handleLoginSuccess = (_session: PublicAuthResponse) => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inicia sesion para guardar favoritos</DialogTitle>
          <DialogDescription>
            Guarda locales para comparar despues -- solo falta iniciar sesion.
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={null}>
          <LoginForm onSuccess={handleLoginSuccess} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
};
