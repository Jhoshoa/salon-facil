'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { register } from '@/lib/api/auth.api';
import { registerSchema, type RegisterFormValues } from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

export const RegisterForm = () => {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'CLIENT',
      city: 'El Alto',
      district: '',
    },
  });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      setSession(session);
      toast.success('Cuenta creada');
      router.push(session.user.role === 'OWNER' ? '/dashboard' : '/venues');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear la cuenta', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !mutation.isPending;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" {...form.register('fullName')} />
          {form.formState.errors.fullName ? (
            <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" {...form.register('phone')} />
          {form.formState.errors.phone ? (
            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <Input id="password" type="password" {...form.register('password')} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Tipo de cuenta</Label>
          <select
            id="role"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            {...form.register('role')}
          >
            <option value="CLIENT">Cliente</option>
            <option value="OWNER">Dueno de local</option>
          </select>
          {form.formState.errors.role ? (
            <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
          ) : null}
        </div>
      </div>
      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-foreground underline">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
};
