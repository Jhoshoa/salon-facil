'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, LogOut, ShieldCheck, Store, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/use-logout';

const roleLabels: Record<string, string> = {
  CLIENT: 'Cliente',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

interface AccountMenuProps {
  /** Which shell renders this — decides whether an ADMIN sees "Cambiar a Panel Admin" (from
   * the owner dashboard) or "Volver a Panel de Propietario" (from the admin panel). Both link
   * to routes ADMIN can already reach (dashboard/layout.tsx allows OWNER+ADMIN), this only
   * controls which direction is offered from which shell. */
  variant: 'owner' | 'admin';
  onNavigate?: () => void;
}

export const AccountMenu = ({ variant, onNavigate }: AccountMenuProps) => {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logoutMutation = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const closeAndNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={containerRef} className="relative border-t pt-3">
      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-10 mb-2 space-y-1 rounded-[var(--radius)] border bg-background p-1.5 shadow-md">
          <Link
            href="/dashboard/profile"
            onClick={closeAndNavigate}
            className="flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-sm text-foreground hover:bg-muted"
          >
            <User className="h-4 w-4" />
            Mi perfil
          </Link>

          {role === 'ADMIN' && variant === 'owner' ? (
            <Link
              href="/admin"
              onClick={closeAndNavigate}
              className="flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-sm font-medium text-primary hover:bg-muted"
            >
              <ShieldCheck className="h-4 w-4" />
              Cambiar a Panel Admin
            </Link>
          ) : null}

          {role === 'ADMIN' && variant === 'admin' ? (
            <Link
              href="/dashboard"
              onClick={closeAndNavigate}
              className="flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-sm font-medium text-primary hover:bg-muted"
            >
              <Store className="h-4 w-4" />
              Volver a Panel de Propietario
            </Link>
          ) : null}

          <div className="my-1 border-t" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logoutMutation.mutate();
            }}
            disabled={logoutMutation.isPending}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius)] px-1 py-1.5 text-left hover:bg-muted"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
          {getInitials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.fullName}</span>
          <span className="block text-xs text-muted-foreground">
            {role ? roleLabels[role] : ''}
          </span>
        </span>
        <ChevronUp
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
};
