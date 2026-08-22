import Link from 'next/link';
import { CalendarCheck, LogIn, Menu, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SiteHeader = () => {
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
          <Link href="/dashboard" className="sf-nav-link">
            Panel owner
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="icon-sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
