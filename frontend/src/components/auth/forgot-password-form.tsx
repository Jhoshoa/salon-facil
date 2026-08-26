'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { forgotPassword } from '@/lib/api/auth.api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validators/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

export const ForgotPasswordForm = () => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (result) => {
      toast.success(result.message);
      form.reset();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo procesar la solicitud', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !mutation.isPending;

  if (mutation.isSuccess) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Si el email esta registrado, te enviamos un enlace para restablecer tu contrasena.
          Revisa tu bandeja de entrada.
        </p>
        <Link href="/login" className="sf-link block text-center text-sm">
          Volver a iniciar sesion
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="sf-form-group">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="tu@email.com" {...form.register('email')} />
        {form.formState.errors.email ? (
          <p className="sf-form-error">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Enviar enlace de recuperacion
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Recordaste tu contrasena?{' '}
        <Link href="/login" className="sf-link">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
};
