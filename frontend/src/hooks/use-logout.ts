'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logout as logoutRequest } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export const useLogout = () => {
  const router = useRouter();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const storeLogout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => logoutRequest(refreshToken ?? undefined),
    onSettled: () => {
      storeLogout();
      toast.success('Sesion cerrada');
      router.push('/');
    },
  });
};
