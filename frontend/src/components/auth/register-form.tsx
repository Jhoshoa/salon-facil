'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { register } from '@/lib/api/auth.api';
import {
  PASSWORD_HINT,
  PHONE_HINT,
  registerSchema,
  type RegisterFormValues,
} from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/shared/submit-button';

interface RegisterFormProps {
  /** Fixed at the call site — the role picker was confusing for clients, so each entry
   * point (client signup vs. the owner landing page) now decides this upfront instead. */
  role: 'CLIENT' | 'OWNER';
  submitLabel?: string;
}

export const RegisterForm = ({ role, submitLabel = 'Crear cuenta' }: RegisterFormProps) => {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '+591',
      password: '',
      role,
      city: 'El Alto',
      district: '',
    },
  });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      setSession(session);
      toast.success('Cuenta creada');
      router.push(session.user.role === 'OWNER' ? '/dashboard/venues/new' : '/venues');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear la cuenta', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !mutation.isPending;
  const passwordValue = form.watch('password');
  const isPasswordValid = passwordValue.length > 0 && !form.formState.errors.password;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="sf-form-group">
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
        <Input id="phone" placeholder="+59171234567" {...form.register('phone')} />
        {form.formState.errors.phone ? (
          <p className="sf-form-error">{form.formState.errors.phone.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{PHONE_HINT}</p>
        )}
      </div>

      <div className="sf-form-group">
        <Label htmlFor="password">Contrasena</Label>
        <PasswordInput
          id="password"
          placeholder="Min. 8 caracteres"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <p className="sf-form-error">{form.formState.errors.password.message}</p>
        ) : isPasswordValid ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Contrasena segura
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
        )}
      </div>

      <SubmitButton className="w-full" disabled={!canSubmit} isLoading={mutation.isPending}>
        {submitLabel}
      </SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        Al crear una cuenta aceptas nuestros{' '}
        <Link href="/terminos" className="sf-link">
          terminos y condiciones
        </Link>{' '}
        y nuestra{' '}
        <Link href="/privacidad" className="sf-link">
          politica de privacidad
        </Link>
        .
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="sf-link">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
};
