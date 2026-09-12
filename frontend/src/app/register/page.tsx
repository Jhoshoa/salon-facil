import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { LogoMark } from '@/components/shared/logo-mark';

export default function RegisterPage() {
  return (
    <main className="sf-auth-container sf-hero">
      <section className="sf-auth-card-sm">
        <div className="sf-auth-header">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <span className="sf-logo">
              <LogoMark className="h-6 w-6" />
            </span>
            <span className="text-lg font-bold">Mi Evento</span>
          </Link>
          <h1 className="sf-auth-title">Crear cuenta</h1>
          <p className="sf-auth-subtitle">
            Registrate para comparar espacios y reservar tu proximo evento.
          </p>
        </div>
        <RegisterForm role="CLIENT" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Tienes un espacio para alquilar?{' '}
          <Link href="/propietarios" className="sf-link">
            Publicalo aqui
          </Link>
        </p>
      </section>
    </main>
  );
}
