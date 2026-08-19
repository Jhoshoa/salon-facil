'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { login } from '@/lib/api/auth.api';
import { loginSchema, type LoginFormValues } from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

export const LoginForm = () => {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session);
      toast.success('Sesion iniciada');
      router.push(session.user.role === 'OWNER' ? '/dashboard' : '/bookings');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo iniciar sesion', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !mutation.isPending;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contrasena</Label>
        <Input id="password" type="password" {...form.register('password')} />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Iniciar sesion
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-foreground underline">
          Registrate
        </Link>
      </p>
    </form>
  );
};
