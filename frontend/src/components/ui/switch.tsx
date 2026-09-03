'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  'aria-label'?: string;
}

export const Switch = ({ checked, onCheckedChange, id, ...props }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    id={id}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
      checked ? 'bg-primary' : 'bg-input',
    )}
    {...props}
  >
    <span
      className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform',
        checked ? 'translate-x-4' : 'translate-x-1',
      )}
    />
  </button>
);
