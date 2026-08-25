'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/use-logout';
import { Button } from '@/components/ui/button';
import { AppDrawer } from '@/components/shared/app-drawer';

const roleLabels: Record<string, string> = {
  CLIENT: 'Cliente',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/venues', label: 'Mis locales', icon: Store },
  { href: '/dashboard/bookings', label: 'Reservas', icon: CalendarCheck },
  { href: '/dashboard/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/dashboard/profile', label: 'Mi perfil', icon: User },
];

interface DashboardShellProps {
  children: ReactNode;
}

const NavLinks = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => (
  <nav className="space-y-1">
    {navItems.map((item) => {
      const isActive =
        item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </Link>
      );
    })}
  </nav>
);

const UserFooter = () => {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logoutMutation = useLogout();

  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
        <span className="sf-badge sf-badge-primary mt-1 inline-flex">
          {role ? roleLabels[role] : ''}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesion
      </Button>
    </div>
  );
};

export const DashboardShell = ({ children }: DashboardShellProps) => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-background p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-1">
          <span className="sf-logo">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <span className="text-base font-bold">SalonFacil</span>
        </Link>
        <div className="flex-1">
          <NavLinks pathname={pathname} />
        </div>
        <UserFooter />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="sf-logo">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold">SalonFacil</span>
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <AppDrawer open={drawerOpen} title="Menu" onOpenChange={setDrawerOpen}>
        <div className="flex flex-col gap-6">
          <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          <UserFooter />
        </div>
      </AppDrawer>
    </div>
  );
};
