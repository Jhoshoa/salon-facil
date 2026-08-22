'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { addVenueMedia, deleteVenueMedia, reorderVenueMedia } from '@/lib/api/venues.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Venue } from '@/types/api';

interface VenueMediaManagerProps {
  venue: Venue;
}

export const VenueMediaManager = ({ venue }: VenueMediaManagerProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const media = [...(venue.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-venues'] });
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

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadMutation.mutate(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Fotos</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Agregar fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
      </CardHeader>
      <CardContent>
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavia no agregaste fotos. Sube al menos una para poder publicar el local.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item, index) => (
              <div key={item.id} className="overflow-hidden rounded-[var(--radius)] border">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image src={item.url} alt={item.alt ?? venue.name} fill className="object-cover" />
                  {item.isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      <Star className="h-3 w-3 fill-current" />
                      Portada
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === media.length - 1 || reorderMutation.isPending}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.isCover ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setCover(item.id)}
                        disabled={reorderMutation.isPending}
                      >
                        Usar como portada
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
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
    </Card>
  );
};
