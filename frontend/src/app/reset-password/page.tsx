import Link from 'next/link';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { LogoMark } from '@/components/shared/logo-mark';

export default function ResetPasswordPage() {
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
          <h1 className="sf-auth-title">Restablecer contrasena</h1>
          <p className="sf-auth-subtitle">Elige una nueva contrasena para tu cuenta.</p>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
