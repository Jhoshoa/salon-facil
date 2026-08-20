import Link from 'next/link';
import { CalendarCheck, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SiteHeader = () => {
  return (
    <header className="sf-header sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-bold leading-5 tracking-normal">SalonFacil</span>
            <span className="block text-xs text-muted-foreground">Espacios para eventos</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/venues" className="transition-colors hover:text-foreground">
            Buscar espacios
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
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
          <Button asChild size="sm" className="sf-action">
            <Link href="/register">
              <UserPlus className="h-4 w-4" />
              Crear cuenta
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
