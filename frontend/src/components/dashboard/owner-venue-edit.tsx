'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Share2, UserPlus } from 'lucide-react';
import { createVenuePreviewLink, getVenueById } from '@/lib/api/venues.api';
import { useAuthStore } from '@/stores/auth.store';
import { VenueForm, tabs, type TabKey } from './venue-form';
import { VenueMediaManager } from './venue-media-manager';
import { VenueCompletionCard } from './venue-completion-card';
import { AssignVenueOwnerModal } from '@/components/admin/assign-venue-owner-modal';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface OwnerVenueEditProps {
  venueId: string;
}

export const OwnerVenueEdit = ({ venueId }: OwnerVenueEditProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const isAdmin = useAuthStore((state) => state.role) === 'ADMIN';

  const previewLinkMutation = useMutation({
    mutationFn: (id: string) => createVenuePreviewLink(id),
    onSuccess: async ({ token }) => {
      const url = `${window.location.origin}/share-preview/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link de preview copiado', { description: 'Vence en 7 dias' });
      } catch {
        toast.success('Link de preview generado', { description: url });
      }
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo generar el link de preview', { description: error.message });
    },
  });
  // By id (not getMyVenues + find) so this also works for an ADMIN editing a venue they don't
  // literally own -- e.g. completing a placeholder venue from the phone-onboarding flow. The
  // backend's canBeEditedBy already permits this; getMyVenues only ever returns the caller's
  // own venues regardless of role, which silently 404'd this page for an admin before.
  const query = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => getVenueById(venueId),
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Local no encontrado"
        description="Puede que no exista o que no tengas permiso para editarlo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const venue = query.data;
  if (!venue) {
    return (
      <ErrorState
        title="Local no encontrado"
        description="Puede que no exista o que no tengas permiso para editarlo."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Breadcrumbs
              items={[{ label: 'Mis locales', href: '/dashboard/venues' }, { label: venue.name }]}
            />
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <p className="text-sm text-muted-foreground">Edita la informacion de tu local.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Link temporal de solo lectura -- vence en 7 dias, no activa ninguna cuenta"
                disabled={previewLinkMutation.isPending}
                onClick={() => previewLinkMutation.mutate(venue.id)}
              >
                <Share2 className="h-4 w-4" />
                Compartir preview
              </Button>
            ) : null}
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Solo funciona si el local todavia no tiene un dueno real"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                Invitar dueno
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/venues/${venue.id}/preview`}>
                <Eye className="h-4 w-4" />
                Vista previa
              </Link>
            </Button>
          </div>
        </div>
        {/* Below `xl` the sidebar column stacks to the bottom of the
         * page (after the whole form and the photo manager), which would bury both the tab
         * nav and the completion status somewhere a user has to scroll past everything to
         * reach. Show compact equivalents right here instead; the xl+ sidebar versions below
         * take over once there's room for a persistent side column. */}
        <div className="space-y-4 xl:hidden">
          <VenueCompletionCard venue={venue} />
          <nav className="flex flex-wrap gap-2 rounded-[var(--radius)] border bg-card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[var(--radius)] px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <VenueForm venue={venue} activeTab={activeTab} onTabChange={setActiveTab} />
        <VenueMediaManager venue={venue} />
      </div>
      <div className="hidden space-y-6 xl:sticky xl:top-24 xl:block xl:self-start">
        <nav className="flex flex-col gap-1 rounded-[var(--radius)] border bg-card p-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[var(--radius)] px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <VenueCompletionCard venue={venue} />
      </div>

      {isAdmin ? (
        <AssignVenueOwnerModal
          venue={showInviteModal ? venue : null}
          onOpenChange={setShowInviteModal}
        />
      ) : null}
    </div>
  );
};
