'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RentalItemQuantityStepperProps {
  itemName: string;
  quantity: number;
  max: number;
  /** Receives 0 when the client removes the item with the minus button. */
  onChange: (quantity: number) => void;
}

export const RentalItemQuantityStepper = ({
  itemName,
  quantity,
  max,
  onChange,
}: RentalItemQuantityStepperProps) => {
  // Holds what's being typed so the field can be empty for a moment without removing the item.
  const [draft, setDraft] = useState<string | null>(null);

  const handleTyping = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const typed = Number.parseInt(digits, 10);
    if (typed > 0) {
      const next = Math.min(typed, max);
      setDraft(String(next));
      onChange(next);
    } else {
      setDraft(digits);
    }
  };

  return (
    <div className="flex shrink-0 items-center">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none"
        aria-label={quantity === 1 ? `Quitar ${itemName}` : `Reducir cantidad de ${itemName}`}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        aria-label={`Cantidad de ${itemName}`}
        value={draft ?? String(quantity)}
        onChange={(event) => handleTyping(event.target.value)}
        onBlur={() => setDraft(null)}
        // This also renders inside the booking form, where Enter would submit the whole request.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        className="h-8 w-12 rounded-none border-x-0 px-1 text-center text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none"
        aria-label={`Aumentar cantidad de ${itemName}`}
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
