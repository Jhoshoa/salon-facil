'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/api/auth.api';
import {
  PASSWORD_HINT,
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validators/auth.schema';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: { newPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      resetPassword({ token: token ?? '', newPassword: values.newPassword }),
    onSuccess: (result) => {
      toast.success(result.message);
      router.push('/login');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo restablecer la contrasena', { description: error.message });
    },
  });

  if (!token) {
    return (
      <div className="space-y-5">
        <p className="sf-form-error">
          El enlace no es valido. Solicita uno nuevo para restablecer tu contrasena.
        </p>
        <Link href="/forgot-password" className="sf-link block text-center text-sm">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const canSubmit = form.formState.isValid && !mutation.isPending;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="sf-form-group">
        <Label htmlFor="newPassword">Nueva contrasena</Label>
        <PasswordInput
          id="newPassword"
          placeholder="Tu nueva contrasena"
          {...form.register('newPassword')}
        />
        {form.formState.errors.newPassword ? (
          <p className="sf-form-error">{form.formState.errors.newPassword.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
        )}
      </div>

      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Restablecer contrasena
      </SubmitButton>
    </form>
  );
};
