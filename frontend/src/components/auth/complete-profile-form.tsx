'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/api/auth.api';
import {
  PHONE_HINT,
  completeProfileSchema,
  type CompleteProfileFormValues,
} from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

const defaultRedirectForRole = (role?: string | null) => {
  if (role === 'OWNER') return '/dashboard';
  if (role === 'ADMIN') return '/admin';
  return '/bookings';
};

// Only reachable by accounts still carrying the `pending:<providerId>` placeholder phone that
// Google sign-up leaves behind (see AuthService.loginOrRegisterWithGoogle) — a real Bolivian
// number is required before the account can do anything that needs one (WhatsApp booking
// notifications). See docs/auth-improvement/oauth-redirects-verification.md §1.
export const CompleteProfileForm = () => {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const updateUser = useAuthStore((state) => state.updateUser);

  const form = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onChange',
    defaultValues: { phone: '+591' },
  });

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      updateUser(user);
      toast.success('Perfil completado');
      router.push(defaultRedirectForRole(role));
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo guardar tu telefono', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !mutation.isPending;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="sf-form-group">
        <Label htmlFor="phone">Telefono</Label>
        <Input id="phone" placeholder="+59171234567" {...form.register('phone')} />
        {form.formState.errors.phone ? (
          <p className="sf-form-error">{form.formState.errors.phone.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{PHONE_HINT}</p>
        )}
      </div>

      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Continuar
      </SubmitButton>
    </form>
  );
};
