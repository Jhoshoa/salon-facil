'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, KeyRound, LinkIcon } from 'lucide-react';
import { getVenuesByInviteToken } from '@/lib/api/venues.api';
import { claimInvite } from '@/lib/api/auth.api';
import {
  claimInviteSchema,
  PASSWORD_HINT,
  type ClaimInviteFormValues,
} from '@/lib/validators/auth.schema';
import { useAuthStore } from '@/stores/auth.store';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
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

interface VenueCardProps {
  venue: Venue;
}

/** Just enough to identify the local (stamp, name, one photo) -- used on the claim page, where
 * the point is activating the account, not re-showing the whole listing. A full, real preview
 * of the venue (same as the public page) lives in VenueDetail via its `shareToken` mode, used by
 * the separate "Compartir preview" link instead of this summary card. */
const VenueCard = ({ venue }: VenueCardProps) => {
  const photos = getVenuePhotos(venue);

  return (
    <article className="sf-card overflow-hidden">
      {photos.length ? (
        <div className="relative h-48 w-full sm:h-56">
          <Image
            src={photos[0]}
            alt={venue.name}
            fill
            className="object-cover"
            loader={cloudinaryImageLoader}
            sizes="(min-width: 640px) 50vw, 100vw"
            priority
          />
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
        </div>
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
        <div className="order-2 min-w-0 flex-1 space-y-6 lg:order-1">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
        <div className="order-1 w-full shrink-0 lg:order-2 lg:w-[360px]">
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
