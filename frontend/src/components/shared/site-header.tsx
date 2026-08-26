'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarCheck, LayoutDashboard, LogIn, LogOut, Menu, UserPlus } from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/use-logout';
import { Button } from '@/components/ui/button';
import { AppDrawer } from '@/components/shared/app-drawer';

const roleLabels: Record<string, string> = {
  CLIENT: 'Cliente',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

export const SiteHeader = () => {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const logoutMutation = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const showAuthed = hydrated && isAuthenticated;
  const showGuest = hydrated && !isAuthenticated;
  const canManageVenues = role === 'OWNER' || role === 'ADMIN';

  const closeMenu = () => setMenuOpen(false);

  const mobileLinkClass =
    'flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted';

  return (
    <header className="sf-header">
      <div className="sf-container flex h-full items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="sf-logo">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-base font-bold leading-5">SalonFacil</span>
            <span className="block text-xs text-muted-foreground">Espacios para eventos</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/venues" className="sf-nav-link">
            Buscar espacios
          </Link>
          {showAuthed && canManageVenues ? (
            <Link href="/dashboard" className="sf-nav-link">
              Panel owner
            </Link>
          ) : null}
          {showAuthed && role === 'ADMIN' ? (
            <Link href="/admin" className="sf-nav-link">
              Panel admin
            </Link>
          ) : null}
          {showGuest ? (
            <Link href="/propietarios" className="sf-nav-link">
              Publica tu espacio
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {showAuthed ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline-flex sm:items-center sm:gap-1.5">
                {user?.fullName?.split(' ')[0]}
                <span className="sf-badge sf-badge-primary">
                  {role ? roleLabels[role] : ''}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesion</span>
              </Button>
            </>
          ) : null}

          {showGuest ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Iniciar sesion
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Crear cuenta</span>
                  <span className="sm:hidden">Registro</span>
                </Link>
              </Button>
            </>
          ) : null}

          {!hydrated ? <span className="h-8 w-20" aria-hidden /> : null}

          {showAuthed && !canManageVenues ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/bookings">
                <LayoutDashboard className="h-4 w-4" />
                Mis reservas
              </Link>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>

      <AppDrawer open={menuOpen} title="Menu" onOpenChange={setMenuOpen}>
        <div className="flex flex-col gap-4">
          <nav className="flex flex-col gap-1">
            <Link href="/venues" className={mobileLinkClass} onClick={closeMenu}>
              Buscar espacios
            </Link>
            {showAuthed && canManageVenues ? (
              <Link href="/dashboard" className={mobileLinkClass} onClick={closeMenu}>
                Panel owner
              </Link>
            ) : null}
            {showAuthed && role === 'ADMIN' ? (
              <Link href="/admin" className={mobileLinkClass} onClick={closeMenu}>
                Panel admin
              </Link>
            ) : null}
            {showAuthed && !canManageVenues ? (
              <Link href="/bookings" className={mobileLinkClass} onClick={closeMenu}>
                Mis reservas
              </Link>
            ) : null}
            {showGuest ? (
              <Link href="/propietarios" className={mobileLinkClass} onClick={closeMenu}>
                Publica tu espacio
              </Link>
            ) : null}
          </nav>

          <div className="space-y-3 border-t pt-4">
            {showAuthed ? (
              <>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm font-medium">{user?.fullName}</span>
                  <span className="sf-badge sf-badge-primary">{role ? roleLabels[role] : ''}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    logoutMutation.mutate();
                    closeMenu();
                  }}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesion
                </Button>
              </>
            ) : null}

            {showGuest ? (
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full justify-start" onClick={closeMenu}>
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    Iniciar sesion
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" onClick={closeMenu}>
                  <Link href="/register">
                    <UserPlus className="h-4 w-4" />
                    Crear cuenta
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </AppDrawer>
    </header>
  );
};
