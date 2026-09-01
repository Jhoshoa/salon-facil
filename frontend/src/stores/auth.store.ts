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
  setSession: (session: PublicAuthResponse) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      role: null,
      setSession: (session) =>
        set({
          user: session.user,
          isAuthenticated: true,
          role: session.user.role,
        }),
      updateUser: (user) => set({ user, role: user.role }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          role: null,
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
