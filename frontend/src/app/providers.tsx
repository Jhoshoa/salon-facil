'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api/auth.api';
import { useAuthHydrated, useAuthStore } from '@/stores/auth.store';

interface ProvidersProps {
  children: React.ReactNode;
}

// The Google OAuth flow is a full-page redirect the backend drives end-to-end — it sets the
// httpOnly session cookies itself and sends the browser straight to a landing page, so no
// client-side JS ever gets a login response to call setSession with (unlike password
// login/register, which are JSON calls this app makes itself). Without this, a fresh Google
// sign-in lands on a page whose auth guards check the Zustand store, see isAuthenticated: false,
// and bounce straight back to /login — even though the cookies are perfectly valid. This runs
// once after hydration and, only if the store looks logged out, asks the server directly.
const useSyncSessionFromCookies = () => {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const markSessionChecked = useAuthStore((state) => state.markSessionChecked);

  useEffect(() => {
    if (!hydrated || isAuthenticated) return;
    getCurrentUser()
      .then(hydrateSession)
      .catch(() => {
        // No valid cookie — a real guest, not an error. Still have to mark the check done so
        // route guards (waiting on useAuthReady) stop blocking and can redirect for real.
        markSessionChecked();
      });
  }, [hydrated, isAuthenticated, hydrateSession, markSessionChecked]);
};

export const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  useSyncSessionFromCookies();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
