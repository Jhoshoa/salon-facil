import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-2xl rounded-md border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registrate como cliente o dueno de local para operar en SalonFacil.
          </p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
