'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { CalendarCheck, LayoutDashboard, LogIn, LogOut, Menu, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logout as logoutRequest } from '@/lib/api/auth.api';
import { useAuthHydrated, useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

const roleLabels: Record<string, string> = {
  CLIENT: 'Cliente',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

export const SiteHeader = () => {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeLogout = useAuthStore((state) => state.logout);

  const logoutMutation = useMutation({
    mutationFn: () => logoutRequest(refreshToken ?? undefined),
    onSettled: () => {
      storeLogout();
      toast.success('Sesion cerrada');
      router.push('/');
    },
  });

  const showAuthed = hydrated && isAuthenticated;
  const showGuest = hydrated && !isAuthenticated;
  const canManageVenues = role === 'OWNER' || role === 'ADMIN';

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

          <Button variant="ghost" size="icon-sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
