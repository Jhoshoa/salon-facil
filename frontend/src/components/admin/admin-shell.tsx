'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarCheck,
  CalendarRange,
  LayoutGrid,
  Menu,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import { AccountMenu } from '@/components/shared/account-menu';
import { AppDrawer } from '@/components/shared/app-drawer';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin/analytics', label: 'Analitica', icon: BarChart3 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/venues', label: 'Verificacion de locales', icon: ShieldCheck },
  { href: '/admin/catalog/space-types', label: 'Tipos de espacio', icon: LayoutGrid },
  { href: '/admin/catalog/use-types', label: 'Tipos de evento', icon: Sparkles },
  { href: '/admin/catalog/amenities', label: 'Comodidades', icon: Tag },
  { href: '/admin/catalog/seasonal-events', label: 'Feriados y temporadas', icon: CalendarRange },
];

interface AdminShellProps {
  children: ReactNode;
}

const NavLinks = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => (
  <nav className="space-y-1">
    {navItems.map((item) => {
      const isActive = pathname.startsWith(item.href);
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

export const AdminShell = ({ children }: AdminShellProps) => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-background p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-1">
          <span className="sf-logo">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <span className="text-base font-bold">SalonFacil admin</span>
        </Link>
        <div className="flex-1">
          <NavLinks pathname={pathname} />
        </div>
        <AccountMenu variant="admin" />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="sf-logo">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold">SalonFacil admin</span>
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
          <AccountMenu variant="admin" onNavigate={() => setDrawerOpen(false)} />
        </div>
      </AppDrawer>
    </div>
  );
};
