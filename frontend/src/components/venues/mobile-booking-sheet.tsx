'use client';

import { X } from 'lucide-react';
import { BookingForm } from '@/components/booking/booking-form';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { RentalItemLine } from '@/hooks/use-rental-item-selection';
import type { PricePreviewAccess } from '@/lib/api/bookings.api';
import type { Venue } from '@/types/api';

interface MobileBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: Venue;
  selectedRange?: { start: string; end: string };
  onDatesChange: (start: string, end: string) => void;
  onPriceChange: (total: number | null) => void;
  rentalItemLines: RentalItemLine[];
  onRentalItemQuantityChange: (itemId: string, quantity: number) => void;
  onBookingCreated: () => void;
  staleRangeNotice: string | null;
  onDismissStaleNotice: () => void;
  pricePreviewAccess?: PricePreviewAccess;
}

export const MobileBookingSheet = ({
  open,
  onOpenChange,
  venue,
  selectedRange,
  onDatesChange,
  onPriceChange,
  rentalItemLines,
  onRentalItemQuantityChange,
  onBookingCreated,
  staleRangeNotice,
  onDismissStaleNotice,
  pricePreviewAccess,
}: MobileBookingSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
        <SheetTitle className="sr-only">Solicitar reserva</SheetTitle>
        {staleRangeNotice ? (
          <div className="border-warning bg-warning/10 m-4 flex items-start justify-between gap-2 border-l-2 p-3 text-sm text-foreground">
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
            rentalItemLines={rentalItemLines}
            onRentalItemQuantityChange={onRentalItemQuantityChange}
            onBookingCreated={onBookingCreated}
            stickyHeader
            pricePreviewAccess={pricePreviewAccess}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
