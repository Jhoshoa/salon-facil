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
import { Select } from '@/components/ui/select';
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
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sf-form-group sm:col-span-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" placeholder="Juan Perez" {...form.register('fullName')} />
          {form.formState.errors.fullName ? (
            <p className="sf-form-error">{form.formState.errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="sf-form-group">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="tu@email.com" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="sf-form-error">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="sf-form-group">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" placeholder="70000000" {...form.register('phone')} />
          {form.formState.errors.phone ? (
            <p className="sf-form-error">{form.formState.errors.phone.message}</p>
          ) : null}
        </div>

        <div className="sf-form-group">
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 caracteres"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="sf-form-error">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <div className="sf-form-group">
          <Label htmlFor="role">Tipo de cuenta</Label>
          <Select id="role" {...form.register('role')}>
            <option value="CLIENT">Cliente</option>
            <option value="OWNER">Propietario de local</option>
          </Select>
          {form.formState.errors.role ? (
            <p className="sf-form-error">{form.formState.errors.role.message}</p>
          ) : null}
        </div>
      </div>

      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        Crear cuenta
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="sf-link">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
};
