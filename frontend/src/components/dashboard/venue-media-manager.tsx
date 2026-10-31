'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { addVenueMedia, deleteVenueMedia, reorderVenueMedia } from '@/lib/api/venues.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { Venue } from '@/types/api';

// Matches MAX_PHOTOS in backend/src/modules/venue/interface/venue.controller.ts -- keep both in
// sync if this ever changes. The backend is the real source of truth (it rejects a request that
// would push the venue's TOTAL photo count over this, not just a single oversized batch); this
// copy only drives the owner-facing counter/label so they see the limit before hitting it.
const MAX_VENUE_PHOTOS = 10;

interface VenueMediaManagerProps {
  venue: Venue;
}

export const VenueMediaManager = ({ venue }: VenueMediaManagerProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const media = [...(venue.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const remainingSlots = MAX_VENUE_PHOTOS - media.length;
  const atLimit = remainingSlots <= 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
    queryClient.invalidateQueries({ queryKey: ['owner-venue', venue.id] });
  };

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => addVenueMedia(venue.id, files),
    onSuccess: () => {
      toast.success('Fotos agregadas');
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudieron subir las fotos', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => deleteVenueMedia(venue.id, mediaId),
    onSuccess: () => {
      toast.success('Foto eliminada');
      setPhotoToDelete(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar la foto', { description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ order, coverId }: { order: string[]; coverId?: string }) =>
      reorderVenueMedia(venue.id, order, coverId),
    onSuccess: invalidate,
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el orden', { description: error.message });
    },
  });

  const handleFilesSelected = (files: FileList | null, inputEl: HTMLInputElement | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);

    if (selected.length > remainingSlots) {
      toast.error('Demasiadas fotos', {
        description: `Puedes subir ${remainingSlots} foto${remainingSlots === 1 ? '' : 's'} mas como maximo (elegiste ${selected.length}).`,
      });
      if (inputEl) inputEl.value = '';
      return;
    }

    uploadMutation.mutate(selected);
    if (inputEl) inputEl.value = '';
  };

  const move = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= media.length) return;

    const next = [...media];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderMutation.mutate({ order: next.map((item) => item.id) });
  };

  const setCover = (mediaId: string) => {
    reorderMutation.mutate({ order: media.map((item) => item.id), coverId: mediaId });
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-3 sm:p-5">
        <div>
          <CardTitle>Fotos</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {media.length}/{MAX_VENUE_PHOTOS} fotos — maximo {MAX_VENUE_PHOTOS} por local
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || atLimit}
            title={atLimit ? `Ya llegaste al maximo de ${MAX_VENUE_PHOTOS} fotos` : undefined}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Galeria
          </Button>
          {/* Camera capture only makes sense on a device that has one -- `capture` is a no-op on
           * desktop browsers. Shown via the `touch` variant (coarse pointer, see
           * tailwind.config.ts) rather than a width breakpoint, so it stays correct on a
           * landscape phone or a tablet -- both can be wider than a `sm:hidden` cutoff would
           * allow, despite still being touch devices with a camera. */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden touch:inline-flex"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadMutation.isPending || atLimit}
            title={atLimit ? `Ya llegaste al maximo de ${MAX_VENUE_PHOTOS} fotos` : undefined}
          >
            <Camera className="h-4 w-4" />
            Camara
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => handleFilesSelected(event.target.files, fileInputRef.current)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          hidden
          onChange={(event) => handleFilesSelected(event.target.files, cameraInputRef.current)}
        />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavia no agregaste fotos. Sube al menos una para poder publicar el local.
          </p>
        ) : (
          // By available width, not screen width: this column changes size with the side panels, so
          // a breakpoint would give the same photos very different sizes across screens.
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-3">
            {media.map((item, index) => (
              <div key={item.id} className="overflow-hidden rounded-[var(--radius)] border">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={item.url}
                    alt={item.alt ?? venue.name}
                    fill
                    className="object-cover"
                    loader={cloudinaryImageLoader}
                    sizes="(min-width: 640px) 240px, 50vw"
                  />
                  {item.isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      <Star className="h-3 w-3 fill-current" />
                      Portada
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between p-1">
                  <div className="flex items-center">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                      title="Mover antes"
                      aria-label="Mover antes"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => move(index, 1)}
                      disabled={index === media.length - 1 || reorderMutation.isPending}
                      title="Mover despues"
                      aria-label="Mover despues"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center">
                    {!item.isCover ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setCover(item.id)}
                        disabled={reorderMutation.isPending}
                        title="Usar como portada"
                        aria-label="Usar como portada"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setPhotoToDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      title="Eliminar foto"
                      aria-label="Eliminar foto"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={photoToDelete !== null}
        title="Eliminar foto"
        description="Esta accion no se puede deshacer. La foto se eliminara del local."
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setPhotoToDelete(null);
        }}
        onConfirm={() => {
          if (photoToDelete) deleteMutation.mutate(photoToDelete);
        }}
      />
    </Card>
  );
};
