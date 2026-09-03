'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/api/auth.api';
import { profileSchema, type ProfileFormValues } from '@/lib/validators/profile.schema';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/shared/submit-button';

export const OwnerProfileForm = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: user?.fullName ?? '',
      city: user?.city ?? '',
      district: user?.district ?? '',
      whatsappPhone: user?.whatsappPhone ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile({
        fullName: values.fullName,
        city: values.city || undefined,
        district: values.district || undefined,
        whatsappPhone: values.whatsappPhone || undefined,
      }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Perfil actualizado');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el perfil', { description: error.message });
    },
  });

  const errors = form.formState.errors;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="sf-form-group">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" {...form.register('fullName')} />
            {errors.fullName ? <p className="sf-form-error">{errors.fullName.message}</p> : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sf-form-group">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" placeholder="El Alto" {...form.register('city')} />
            </div>
            <div className="sf-form-group">
              <Label htmlFor="district">Distrito o zona</Label>
              <Input id="district" placeholder="Villa Adela" {...form.register('district')} />
            </div>
          </div>

          <div className="sf-form-group">
            <Label htmlFor="whatsappPhone">WhatsApp / telefono de contacto</Label>
            <Input
              id="whatsappPhone"
              placeholder="+59171234567"
              {...form.register('whatsappPhone')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isLoading={mutation.isPending}>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
};
