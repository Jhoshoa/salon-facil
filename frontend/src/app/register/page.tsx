import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="sf-auth-container sf-hero">
      <section className="sf-auth-card-lg">
        <div className="sf-auth-header">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <span className="sf-logo">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold">SalonFacil</span>
          </Link>
          <h1 className="sf-auth-title">Crear cuenta</h1>
          <p className="sf-auth-subtitle">
            Registrate como cliente o propietario de local para operar en SalonFacil.
          </p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
