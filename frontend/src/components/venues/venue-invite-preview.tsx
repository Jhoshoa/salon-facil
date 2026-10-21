'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, KeyRound, LinkIcon, MapPin, Users } from 'lucide-react';
import { getVenuesByInviteToken } from '@/lib/api/venues.api';
import { claimInvite } from '@/lib/api/auth.api';
import {
  claimInviteSchema,
  PASSWORD_HINT,
  type ClaimInviteFormValues,
} from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
import { departamentoLabels } from './venue-filter-labels';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LogoMark } from '@/components/shared/logo-mark';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Skeleton } from '@/components/ui/skeleton';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ApiError, Venue } from '@/types/api';

interface VenueInvitePreviewProps {
  token: string;
}

const getVenuePhotos = (venue: Venue) => {
  const mediaPhotos =
    venue.media?.filter((item) => item.type === 'IMAGE').map((item) => item.url) ?? [];
  return mediaPhotos.length ? mediaPhotos : venue.photos;
};

const VenueCard = ({ venue }: { venue: Venue }) => {
  const photos = getVenuePhotos(venue);
  const basePrice = venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;
  const includedAmenities = (venue.amenities ?? []).filter((item) => item.isIncluded);

  return (
    <article className="sf-card overflow-hidden">
      {photos.length ? (
        <div className="grid grid-cols-3 gap-0.5 sm:h-72">
          <div className="relative col-span-3 h-56 sm:col-span-2 sm:h-full">
            <Image
              src={photos[0]}
              alt={venue.name}
              fill
              className="object-cover"
              loader={cloudinaryImageLoader}
              sizes="(min-width: 640px) 66vw, 100vw"
              priority
            />
          </div>
          <div className="col-span-3 hidden grid-rows-2 gap-0.5 sm:col-span-1 sm:grid">
            {photos.slice(1, 3).map((photo, index) => (
              <div key={photo} className="relative h-full min-h-[8.75rem]">
                <Image
                  src={photo}
                  alt={`${venue.name} ${index + 2}`}
                  fill
                  className="object-cover"
                  loader={cloudinaryImageLoader}
                  sizes="33vw"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sf-gradient-subtle flex h-48 w-full items-center justify-center text-sm text-muted-foreground">
          Todavia sin fotos
        </div>
      )}

      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <span className="sf-stamp mb-2 inline-block">borrador</span>
          <h2 className="font-serif text-2xl font-semibold">{venue.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {venue.address ? `${venue.address}, ` : ''}
            {venue.district}, {departamentoLabels[venue.departamento]}
          </p>
        </div>

        {venue.description ? (
          <p className="font-serif text-base italic leading-7 text-foreground/80">
            {venue.description}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 font-serif text-xl font-semibold text-primary">
              <Users className="h-4 w-4" />
              {venue.capacityMin}-{venue.capacityMax}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">personas</p>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-primary">
              {basePrice > 0 ? formatCurrency(basePrice) : 'A coordinar'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">precio referencial</p>
          </div>
          {includedAmenities.length ? (
            <div>
              <p className="font-serif text-xl font-semibold text-primary">
                {includedAmenities.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">comodidades incluidas</p>
            </div>
          ) : null}
        </div>

        {includedAmenities.length ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {includedAmenities.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {item.amenity.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
};

const ClaimSection = ({ token }: { token: string }) => {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<ClaimInviteFormValues>({
    resolver: zodResolver(claimInviteSchema),
    mode: 'onChange',
    defaultValues: { password: '' },
  });

  const claimMutation = useMutation({
    mutationFn: (values: ClaimInviteFormValues) => claimInvite({ token, ...values }),
    onSuccess: (session) => {
      setSession(session);
      toast.success('Cuenta activada');
      router.push('/dashboard');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo activar la cuenta', { description: error.message });
    },
  });

  const canSubmit = form.formState.isValid && !claimMutation.isPending;

  return (
    <aside className="sf-card space-y-4 p-5 sm:p-6 lg:sticky lg:top-24">
      <div className="flex items-center gap-2 text-primary">
        <KeyRound className="h-5 w-5" />
        <h2 className="font-serif text-lg font-semibold">Es tu local?</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Activa tu cuenta para administrarlo vos mismo — cambiar precios, fotos, horarios y responder
        reservas.
      </p>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => claimMutation.mutate(values))}
      >
        <div className="sf-form-group">
          <Label htmlFor="password">Elegi una contrasena</Label>
          <PasswordInput
            id="password"
            placeholder="Tu nueva contrasena"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="sf-form-error">{form.formState.errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          )}
        </div>
        <SubmitButton
          className="w-full"
          disabled={!canSubmit}
          isLoading={claimMutation.isPending}
          loadingText="Activando..."
        >
          Activar mi cuenta
        </SubmitButton>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Si no sos vos, podes cerrar esta pagina sin problema.
      </p>
    </aside>
  );
};

export const VenueInvitePreview = ({ token }: VenueInvitePreviewProps) => {
  const query = useQuery<Venue[], ApiError>({
    queryKey: ['venue-invite-preview', token],
    queryFn: () => getVenuesByInviteToken(token),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError) {
    if (query.error?.statusCode === 404) {
      return (
        <EmptyState
          icon={LinkIcon}
          title="Este enlace ya no es valido"
          description="Puede que haya vencido o que ya no exista. Escribinos y te mandamos uno nuevo."
        />
      );
    }
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const venues = query.data ?? [];
  if (!venues.length) {
    return (
      <EmptyState
        title="Todavia no hay nada que mostrar"
        description="Tu local esta siendo cargado — volve a revisar este mismo enlace mas tarde."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Eye className="h-4 w-4 shrink-0 text-primary" />
        Vista previa privada — solo vos podes verla con este enlace. Todavia no es publica.
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
        <div className="w-full shrink-0 lg:w-[360px]">
          <ClaimSection token={token} />
        </div>
      </div>
    </div>
  );
};

export const VenueInvitePreviewHeader = () => (
  <Link href="/" className="mb-6 inline-flex items-center gap-2">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
      <LogoMark variant="light" className="h-8 w-8" />
    </span>
    <span className="text-lg font-bold">Mi Evento</span>
  </Link>
);
