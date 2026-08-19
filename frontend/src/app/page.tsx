import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HomeSearchForm } from '@/components/venues/home-search-form';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            El Alto, Bolivia
          </p>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Encuentra el local correcto para tu evento
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Busca salones con disponibilidad, precios claros y servicios incluidos antes de visitar.
          </p>
        </div>

        <HomeSearchForm />

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Button asChild variant="outline">
            <Link href="/login">Iniciar sesion</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
