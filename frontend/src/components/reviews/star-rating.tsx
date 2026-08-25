'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export const StarRating = ({ value, onChange, size = 'md' }: StarRatingProps) => {
  const interactive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1" role={interactive ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={cn(
            'transition-colors',
            interactive ? 'cursor-pointer' : 'cursor-default',
          )}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          aria-pressed={interactive ? value >= star : undefined}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= value ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  );
};
