'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthReady, useAuthStore } from '@/stores/auth.store';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

const ALLOWED_ROLES = ['OWNER', 'ADMIN'];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const ready = useAuthReady();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const isAllowed = isAuthenticated && role != null && ALLOWED_ROLES.includes(role);

  useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated) {
      router.replace('/login?next=/dashboard');
      return;
    }

    if (!isAllowed) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, isAllowed, router]);

  if (!ready || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
};

export default DashboardLayout;
