import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { LogoMark } from '@/components/shared/logo-mark';

export default function LoginPage() {
  return (
    <main className="sf-auth-container sf-hero">
      <section className="sf-auth-card-sm">
        <div className="sf-auth-header">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <LogoMark variant="light" className="h-8 w-8" />
            </span>
            <span className="text-lg font-bold">Mi Evento</span>
          </Link>
          <h1 className="sf-auth-title">Iniciar sesion</h1>
          <p className="sf-auth-subtitle">Accede para gestionar tus reservas y espacios.</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
