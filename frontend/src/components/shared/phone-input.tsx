'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';

const COUNTRY_PREFIX = '+591';

const toLocalDigits = (value: string) =>
  (value.startsWith(COUNTRY_PREFIX) ? value.slice(COUNTRY_PREFIX.length) : value).replace(/\D/g, '').slice(0, 8);

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ id, value, onChange, onBlur, placeholder = '71234567', disabled }, ref) => {
    const localDigits = toLocalDigits(value ?? '');

    return (
      <div className="flex items-stretch gap-2">
        <span className="flex shrink-0 items-center rounded-[var(--radius)] border border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
          {COUNTRY_PREFIX}
        </span>
        <Input
          id={id}
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={8}
          placeholder={placeholder}
          value={localDigits}
          disabled={disabled}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
            onChange(digits ? `${COUNTRY_PREFIX}${digits}` : '');
          }}
          onBlur={onBlur}
        />
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
