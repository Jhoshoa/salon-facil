'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '@/stores/auth.store';
import { AdminShell } from '@/components/admin/admin-shell';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const isAllowed = isAuthenticated && role === 'ADMIN';

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/login?next=/admin');
      return;
    }

    if (!isAllowed) {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated, isAllowed, router]);

  if (!hydrated || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
};

export default AdminLayout;
