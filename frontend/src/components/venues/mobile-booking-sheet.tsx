'use client';

import { X } from 'lucide-react';
import { BookingForm } from '@/components/booking/booking-form';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Venue } from '@/types/api';

interface MobileBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: Venue;
  selectedRange?: { start: string; end: string };
  onDatesChange: (start: string, end: string) => void;
  onPriceChange: (total: number | null) => void;
  staleRangeNotice: string | null;
  onDismissStaleNotice: () => void;
}

export const MobileBookingSheet = ({
  open,
  onOpenChange,
  venue,
  selectedRange,
  onDatesChange,
  onPriceChange,
  staleRangeNotice,
  onDismissStaleNotice,
}: MobileBookingSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
        <SheetTitle className="sr-only">Solicitar reserva</SheetTitle>
        {staleRangeNotice ? (
          <div className="m-4 flex items-start justify-between gap-2 border-l-2 border-warning bg-warning/10 p-3 text-sm text-foreground">
            <p>{staleRangeNotice}</p>
            <button
              type="button"
              onClick={onDismissStaleNotice}
              aria-label="Cerrar aviso"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {open ? (
          <BookingForm
            venue={venue}
            selectedRange={selectedRange}
            onDatesChange={onDatesChange}
            onPriceChange={onPriceChange}
            stickyHeader
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
