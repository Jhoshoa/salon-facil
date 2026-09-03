'use client';

import { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoLightboxProps {
  photos: string[];
  alt: string;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

export const PhotoLightbox = ({
  photos,
  alt,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: PhotoLightboxProps) => {
  const total = photos.length;
  const goTo = (next: number) => onIndexChange(((next % total) + total) % total);

  useEffect(() => {
    if (!open || total < 2) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(index + 1);
      if (event.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, total]);

  if (!total) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none sm:p-8"
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            onClick={(event) => event.stopPropagation()}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:right-6 sm:top-6"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(index - 1);
                }}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(index + 1);
                }}
                aria-label="Foto siguiente"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-full max-h-[85vh] w-full max-w-5xl"
          >
            <Image
              src={photos[index]}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {total > 1 ? (
            <p className="mt-3 text-sm text-white/80">
              {index + 1} / {total}
            </p>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
