'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '@/stores/auth.store';

// "Mis reservas" and its detail page are client-only account data — without this guard,
// visiting them signed out just falls through to a generic error state (getMyBookings/getBooking
// return 401) instead of sending the visitor to log in. Mirrors dashboard/layout.tsx's guard,
// but redirects to the exact page the visitor tried to reach (not a fixed path), since this
// covers both /bookings and /bookings/[id].
const BookingsLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};

export default BookingsLayout;
