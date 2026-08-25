'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, AuthUser, UserRole } from '@/types/api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  setSession: (session: AuthResponse) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      role: null,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          isAuthenticated: true,
          role: session.user.role,
        }),
      updateUser: (user) => set({ user, role: user.role }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          role: null,
        }),
    }),
    {
      name: 'salonfacil-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
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
