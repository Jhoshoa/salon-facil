'use client';

import type { Venue } from '@/types/api';
import { Label } from '@/components/ui/label';

interface OwnerVenueSelectProps {
  venues: Venue[];
  value: string;
  onChange: (venueId: string) => void;
}

export const OwnerVenueSelect = ({ venues, value, onChange }: OwnerVenueSelectProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="venueId">Salon</Label>
      <select
        id="venueId"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name}
          </option>
        ))}
      </select>
    </div>
  );
};
