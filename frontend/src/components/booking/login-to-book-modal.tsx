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
import { useAuthStore } from '@/stores/auth.store';
import type { PublicAuthResponse } from '@/types/api';

interface LoginToBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginToBookModal = ({ open, onOpenChange }: LoginToBookModalProps) => {
  const { isAuthenticated, role } = useAuthStore();

  const handleLoginSuccess = (session: PublicAuthResponse) => {
    if (session.user.role === 'CLIENT') {
      onOpenChange(false);
    }
  };

  const wrongRole = isAuthenticated && role !== 'CLIENT';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {wrongRole ? 'Esta cuenta no puede reservar' : 'Inicia sesion para continuar'}
          </DialogTitle>
          <DialogDescription>
            {wrongRole
              ? 'Esta cuenta es de propietario o administrador. Inicia sesion con una cuenta de cliente para solicitar una reserva.'
              : 'Tu solicitud queda lista tal como la dejaste -- solo falta iniciar sesion.'}
          </DialogDescription>
        </DialogHeader>
        {wrongRole ? null : (
          <Suspense fallback={null}>
            <LoginForm onSuccess={handleLoginSuccess} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
};
