import Link from 'next/link';
import { CompleteProfileForm } from '@/components/auth/complete-profile-form';
import { LogoMark } from '@/components/shared/logo-mark';

export default function CompleteProfilePage() {
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
          <h1 className="sf-auth-title">Completa tu perfil</h1>
          <p className="sf-auth-subtitle">
            Tu cuenta de Google no incluye un telefono. Necesitamos uno boliviano para notificarte
            por WhatsApp sobre tus reservas.
          </p>
        </div>
        <CompleteProfileForm />
      </section>
    </main>
  );
}
