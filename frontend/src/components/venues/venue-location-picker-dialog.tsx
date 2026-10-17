'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LatLng } from './venue-location-picker-map';

const VenueLocationPickerMap = dynamic(
  () => import('./venue-location-picker-map').then((mod) => mod.VenueLocationPickerMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

interface VenueLocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current form values (strings, possibly empty) -- parsed into a starting pin position when
   * both are present and valid, otherwise the picker opens with no pin yet. */
  initialLatitude?: string;
  initialLongitude?: string;
  onConfirm: (latitude: number, longitude: number) => void;
}

const parseInitial = (lat?: string, lng?: string): LatLng | null => {
  if (!lat || !lng) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
};

export const VenueLocationPickerDialog = ({
  open,
  onOpenChange,
  initialLatitude,
  initialLongitude,
  onConfirm,
}: VenueLocationPickerDialogProps) => {
  const [position, setPosition] = useState<LatLng | null>(() =>
    parseInitial(initialLatitude, initialLongitude),
  );

  // Re-sync to whatever's currently saved in the form every time the dialog opens, so a
  // cancelled pick from a previous visit never lingers into the next one.
  useEffect(() => {
    if (open) setPosition(parseInitial(initialLatitude, initialLongitude));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    if (!position) return;
    onConfirm(position.lat, position.lng);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[700px] w-[95vw] max-w-2xl flex-col gap-0 p-0 sm:rounded-lg">
        <DialogHeader className="p-5 pb-3 text-left">
          <DialogTitle>Ubicacion del local</DialogTitle>
          <DialogDescription>
            Toca el mapa para marcar la ubicacion, arrastra el pin para ajustarlo, o usa tu
            ubicacion actual.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-5">
          <VenueLocationPickerMap position={position} onChange={setPosition} />
        </div>
        <DialogFooter className="flex-col gap-3 p-5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : 'Todavia no marcaste ningun punto.'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!position}>
              <MapPin className="h-4 w-4" />
              Usar esta ubicacion
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
