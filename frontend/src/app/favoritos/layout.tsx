'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthReady, useAuthStore } from '@/stores/auth.store';

// Favoriting itself has no role restriction (see venue.controller.ts: no @Roles on the
// favorite endpoints) -- unlike /bookings, this guard only requires *some* session, not
// specifically CLIENT, so an OWNER or ADMIN browsing other venues can use it too.
const FavoritosLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useAuthReady();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, isAuthenticated, pathname, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};

export default FavoritosLayout;
