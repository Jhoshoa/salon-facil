import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { LogoMark } from '@/components/shared/logo-mark';

export default function ForgotPasswordPage() {
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
          <h1 className="sf-auth-title">Recuperar contrasena</h1>
          <p className="sf-auth-subtitle">
            Ingresa tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
