import Link from 'next/link';
import { CalendarDays, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

        <form
          action="/venues"
          className="mt-8 grid gap-3 rounded-md border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_160px_auto]"
        >
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input name="query" placeholder="Salon, zona o servicio" className="h-11 pl-9" />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input name="date" type="date" className="h-11 pl-9" />
          </div>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              name="capacity"
              type="number"
              min="1"
              placeholder="Invitados"
              className="h-11 pl-9"
            />
          </div>
          <Button type="submit" className="h-11">
            Buscar
          </Button>
        </form>

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
