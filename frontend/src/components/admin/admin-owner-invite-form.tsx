'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { createOwnerInvite } from '@/lib/api/admin.api';
import { ownerInviteFormSchema, type OwnerInviteFormValues } from '@/lib/validators/admin.schema';
import { departamentoLabels } from '@/components/venues/venue-filter-labels';
import { PhoneInput } from '@/components/shared/phone-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/shared/submit-button';
import type { CreateOwnerInviteResult } from '@/types/api';

export const AdminOwnerInviteForm = () => {
  const [created, setCreated] = useState<CreateOwnerInviteResult | null>(null);

  const form = useForm<OwnerInviteFormValues>({
    resolver: zodResolver(ownerInviteFormSchema),
    mode: 'onChange',
    defaultValues: {
      ownerFullName: '',
      ownerEmail: '',
      ownerPhone: '',
      venueName: '',
      venueAddress: '',
      venueDistrict: '',
      venueDepartamento: undefined,
      venueCapacityMax: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: OwnerInviteFormValues) =>
      createOwnerInvite({
        owner: {
          fullName: values.ownerFullName,
          email: values.ownerEmail,
          phone: values.ownerPhone,
        },
        venue: {
          name: values.venueName,
          address: values.venueAddress,
          district: values.venueDistrict,
          departamento: values.venueDepartamento,
          capacityMax: values.venueCapacityMax,
        },
      }),
    onSuccess: (result) => {
      toast.success('Local cargado en borrador');
      setCreated(result);
      form.reset();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo cargar el local', { description: error.message });
    },
  });

  if (created) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-city-green" />
          <div>
            <p className="font-serif text-lg font-semibold">{created.venue.name} quedo cargado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Todavia esta en borrador — no es publico. Completa fotos y el resto de los datos antes
              de enviarle la invitacion al dueno.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href={`/dashboard/venues/${created.venue.id}/edit`}>Completar el local</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/owner-invites">Ver locales pendientes</Link>
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(null)}>
            Cargar otro local
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Card>
        <CardHeader>
          <CardTitle>Datos del propietario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sf-form-group">
            <Label htmlFor="ownerFullName">Nombre completo</Label>
            <Input id="ownerFullName" {...form.register('ownerFullName')} />
            {form.formState.errors.ownerFullName ? (
              <p className="sf-form-error">{form.formState.errors.ownerFullName.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sf-form-group">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input id="ownerEmail" type="email" {...form.register('ownerEmail')} />
              {form.formState.errors.ownerEmail ? (
                <p className="sf-form-error">{form.formState.errors.ownerEmail.message}</p>
              ) : null}
            </div>
            <div className="sf-form-group">
              <Label htmlFor="ownerPhone">Telefono</Label>
              <PhoneInput
                id="ownerPhone"
                value={form.watch('ownerPhone') ?? ''}
                onChange={(value) =>
                  form.setValue('ownerPhone', value, { shouldValidate: true, shouldDirty: true })
                }
              />
              {form.formState.errors.ownerPhone ? (
                <p className="sf-form-error">{form.formState.errors.ownerPhone.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sf-form-group">
            <Label htmlFor="venueName">Nombre del local</Label>
            <Input id="venueName" {...form.register('venueName')} />
            {form.formState.errors.venueName ? (
              <p className="sf-form-error">{form.formState.errors.venueName.message}</p>
            ) : null}
          </div>
          <div className="sf-form-group">
            <Label htmlFor="venueAddress">Direccion</Label>
            <Input id="venueAddress" {...form.register('venueAddress')} />
            {form.formState.errors.venueAddress ? (
              <p className="sf-form-error">{form.formState.errors.venueAddress.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sf-form-group">
              <Label htmlFor="venueDistrict">Zona / distrito</Label>
              <Input id="venueDistrict" {...form.register('venueDistrict')} />
              {form.formState.errors.venueDistrict ? (
                <p className="sf-form-error">{form.formState.errors.venueDistrict.message}</p>
              ) : null}
            </div>
            <div className="sf-form-group">
              <Label htmlFor="venueDepartamento">Departamento</Label>
              <Select id="venueDepartamento" {...form.register('venueDepartamento')}>
                <option value="">Selecciona...</option>
                {Object.entries(departamentoLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              {form.formState.errors.venueDepartamento ? (
                <p className="sf-form-error">{form.formState.errors.venueDepartamento.message}</p>
              ) : null}
            </div>
            <div className="sf-form-group">
              <Label htmlFor="venueCapacityMax">Capacidad maxima</Label>
              <Input
                id="venueCapacityMax"
                type="number"
                min={1}
                max={5000}
                {...form.register('venueCapacityMax')}
              />
              {form.formState.errors.venueCapacityMax ? (
                <p className="sf-form-error">{form.formState.errors.venueCapacityMax.message}</p>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El resto (fotos, comodidades, horarios, precio) se completa despues, antes de enviarle
            la invitacion al dueno.
          </p>
        </CardContent>
      </Card>

      <SubmitButton
        isLoading={mutation.isPending}
        loadingText="Cargando..."
        disabled={!form.formState.isValid || mutation.isPending}
      >
        Cargar local
      </SubmitButton>
    </form>
  );
};
