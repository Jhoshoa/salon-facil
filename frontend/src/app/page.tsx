import Link from 'next/link';
import Image from 'next/image';
import { Building2, CheckCircle2, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { HomeSearchForm } from '@/components/venues/home-search-form';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { HomeVenueCarousel } from '@/components/venues/home-venue-carousel';
import { Badge } from '@/components/ui/badge';

const trustLogos = ['Altiplano', 'Eventos 360', 'Casa Luz', 'Urban Hall'];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="sf-search-dock">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="sf-card-strong p-4 sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 border-b pb-4 md:flex-row md:items-end">
              <div>
                <p className="text-base font-semibold text-primary">Busca disponibilidad real</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Fecha e invitados son obligatorios para evitar resultados irrelevantes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Link
                  href="/venues?query=jardin&startDate=&capacity="
                  className="hover:text-primary"
                >
                  Jardin
                </Link>
                <span>/</span>
                <Link
                  href="/venues?query=terraza&startDate=&capacity="
                  className="hover:text-primary"
                >
                  Terraza
                </Link>
                <span>/</span>
                <Link
                  href="/venues?query=corporativo&startDate=&capacity="
                  className="hover:text-primary"
                >
                  Corporativo
                </Link>
              </div>
            </div>
            <HomeSearchForm />
          </div>
        </div>
      </section>

      <section className="sf-home-hero border-b">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8 lg:py-16">
          <div>
            <Badge variant="outline" className="border-primary/20 text-primary">
              El Alto y La Paz
            </Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Encuentra el espacio correcto para tu evento
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Compara salones, jardines, terrazas y estudios con disponibilidad, capacidad,
              comodidades y precios claros antes de reservar.
            </p>
            <div className="mt-7 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
              <div className="sf-card p-4">
                <Building2 className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold">Espacios verificados</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Datos completos</p>
              </div>
              <div className="sf-card p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold">Reserva con claridad</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Sin sorpresas</p>
              </div>
              <div className="sf-card p-4">
                <Sparkles className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold">Filtros por evento</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Busca por uso real</p>
              </div>
            </div>
          </div>

          <div className="sf-card-strong overflow-hidden p-3">
            <div className="relative min-h-[430px] overflow-hidden rounded-md">
              <Image
                src="https://res.cloudinary.com/demo/image/upload/c_fill,w_900,h_1050,q_auto/sample.jpg"
                alt="Espacio preparado para eventos"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 440px, 100vw"
                priority
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-md bg-card/95 p-4 shadow-lg">
                <div className="mb-2 flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="font-semibold">Locales con datos comparables</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capacidad, precio, amenities y disponibilidad en una sola vista.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-7 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-muted-foreground">
            Usado por organizadores y owners
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustLogos.map((logo) => (
              <div key={logo} className="sf-card flex items-center gap-3 p-4">
                <span className="sf-logo-mark">{logo.slice(0, 2).toUpperCase()}</span>
                <span className="font-semibold">{logo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeVenueCarousel />

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ['Para bodas', 'Jardines, salones amplios y espacios con catering.'],
          ['Para empresas', 'Auditorios, terrazas y salas con equipo audiovisual.'],
          ['Para producciones', 'Estudios con luz natural, montaje flexible y parking.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-md border bg-card p-5 shadow-sm">
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="sf-card-strong grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Para propietarios</p>
            <h2 className="mt-1 text-2xl font-bold tracking-normal">
              Convierte tu espacio en una ficha lista para reservar
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Publica capacidad, precios, amenities, horarios y reglas para que los clientes
              comparen con confianza.
            </p>
          </div>
          <Link
            href="/register"
            className="sf-action inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium"
          >
            Publicar espacio
            <CheckCircle2 className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
