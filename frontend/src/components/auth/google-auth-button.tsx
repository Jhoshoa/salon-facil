'use client';

import { getGoogleAuthUrl } from '@/lib/api/auth.api';
import { Button } from '@/components/ui/button';

interface GoogleAuthButtonProps {
  /** Where the OAuth callback should send the browser back to — mirrors the `next=` pattern
   * the password-login form already uses. */
  next?: string;
  /** Only meaningful for a fresh signup: which role the entry point intends (mirrors the
   * fixed-role-per-entry-point pattern in RegisterForm). Ignored on an existing account. */
  intent?: 'CLIENT' | 'OWNER';
  label?: string;
}

export const GoogleAuthButton = ({
  next,
  intent,
  label = 'Continuar con Google',
}: GoogleAuthButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.href = getGoogleAuthUrl({ next, intent });
      }}
    >
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.2-17.7 10.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.5 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z"
        />
      </svg>
      {label}
    </Button>
  );
};
