import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-md border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-muted-foreground">Accede para gestionar reservas.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
