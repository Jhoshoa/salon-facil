'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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

// `googleCallback` (backend) appends `?linked=google` to its redirect the one time a Google
// login auto-links to an existing password account (see auth.service.ts justLinked) -- this is
// the only place that ever fires, so it doubles as "first time this account gets a second login
// method" and not a routine repeat. Split into its own component (instead of living directly in
// Providers) so only this leaf needs the Suspense boundary useSearchParams() requires -- wrapping
// all of `children` in Suspense here would opt every page, including the statically-generated
// landing page, out of static rendering.
const GoogleLinkToastWatcher = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('linked') !== 'google') return;
    toast.success('Tu cuenta ya existia y ahora tambien podes entrar con Google', {
      description: 'Te mandamos un aviso a tu email por las dudas de que no hayas sido vos.',
    });
    const rest = new URLSearchParams(searchParams);
    rest.delete('linked');
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Deliberately runs once per redirect landing, not on every searchParams identity change --
    // re-running after router.replace() strips the param would just no-op, but keeping the
    // dependency array narrow avoids relying on that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
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

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <GoogleLinkToastWatcher />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
};
