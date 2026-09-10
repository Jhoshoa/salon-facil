'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicAuthResponse, AuthUser, UserRole } from '@/types/api';

// accessToken/refreshToken never live here (or anywhere else in JS-reachable storage) — they're
// httpOnly cookies the browser attaches automatically. `user`/`isAuthenticated`/`role` are not
// secrets; they're only persisted so the UI can render as "logged in" immediately on load
// instead of flashing a logged-out state while the first request round-trips. The cookie is
// still the actual source of truth: if it's missing or expired, the next API call 401s and
// apiRequest's own logout-on-failed-refresh (see lib/api/client.ts) corrects this flag.
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  /** True once providers.tsx's GET /auth/me check (see hydrateSession below) has resolved,
   * one way or the other, for this page load. NOT persisted — always starts false on a fresh
   * load, since it answers "have we verified this specific load's cookies yet", not "were we
   * ever logged in". Route guards must wait for this (not just useAuthHydrated) before treating
   * isAuthenticated: false as final — otherwise they redirect away before the async check that
   * would have proven them wrong even gets a chance to finish. */
  sessionChecked: boolean;
  setSession: (session: PublicAuthResponse) => void;
  updateUser: (user: AuthUser) => void;
  /** Same effect as setSession, for the one flow that never gets a PublicAuthResponse to read:
   * Google OAuth is a full-page redirect the backend drives end-to-end (sets the httpOnly
   * cookies itself and sends the browser straight to a landing page), so no client-side JS ever
   * sees a login response to call setSession with. Whoever detects "cookies look valid but this
   * store still says logged out" (see providers.tsx) calls this instead, from a GET /auth/me. */
  hydrateSession: (user: AuthUser) => void;
  markSessionChecked: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      role: null,
      sessionChecked: false,
      setSession: (session) =>
        set({
          user: session.user,
          isAuthenticated: true,
          role: session.user.role,
          sessionChecked: true,
        }),
      updateUser: (user) => set({ user, role: user.role }),
      hydrateSession: (user) =>
        set({ user, role: user.role, isAuthenticated: true, sessionChecked: true }),
      markSessionChecked: () => set({ sessionChecked: true }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          role: null,
          sessionChecked: true,
        }),
    }),
    {
      name: 'salonfacil-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        role: state.role,
      }),
    },
  ),
);

/**
 * The persisted store starts as its default (logged-out) state on both the server
 * render and the client's first render, then hydrates from localStorage a tick later.
 * Any auth-gated UI must wait for this flag before trusting `isAuthenticated`/`role`,
 * otherwise it will flash-redirect logged-in users before hydration completes.
 */
export const useAuthHydrated = () => {
  // `useAuthStore.persist` only exists in the browser (it's undefined during Next.js SSR),
  // so it must never be touched outside an effect — start `false` unconditionally and let
  // the effect (browser-only) resolve the real hydration state.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
};

/**
 * True once isAuthenticated can be trusted as final for this page load — route guards should
 * wait for this (not useAuthHydrated alone) before redirecting a "logged out" visitor away.
 * Already-authenticated (from localStorage) is trusted immediately, so returning users don't
 * wait on a network round trip; a store that looks logged out has to wait for sessionChecked
 * (providers.tsx's GET /auth/me) first, since that's exactly the case a fresh Google OAuth
 * login leaves the store in until that check resolves.
 */
export const useAuthReady = () => {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);

  return hydrated && (isAuthenticated || sessionChecked);
};
