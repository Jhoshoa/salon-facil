import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { HomeSearchForm } from '@/components/venues/home-search-form';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { HomeVenueCarousel } from '@/components/venues/home-venue-carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const trustLogos = ['Altiplano', 'Eventos 360', 'Casa Luz', 'Urban Hall'];

const features = [
  {
    icon: Building2,
    title: 'Espacios verificados',
    description: 'Datos completos y actualizados',
  },
  {
    icon: ShieldCheck,
    title: 'Reserva con claridad',
    description: 'Precios sin sorpresas',
  },
  {
    icon: Sparkles,
    title: 'Filtros inteligentes',
    description: 'Busca por tipo de evento',
  },
];

const categories = [
  { title: 'Para bodas', description: 'Jardines, salones amplios y espacios con catering.' },
  { title: 'Para empresas', description: 'Auditorios, terrazas y salas con equipo audiovisual.' },
  { title: 'Para producciones', description: 'Estudios con luz natural, montaje flexible y parking.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Search Section */}
      <section className="border-b bg-background">
        <div className="sf-container py-6">
          <div className="sf-card-elevated p-5">
            <div className="mb-5 border-b pb-5">
              <p className="text-base font-semibold text-primary">Busca disponibilidad real</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Fecha e invitados son obligatorios para resultados relevantes.
              </p>
            </div>
            <HomeSearchForm />
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="sf-hero border-b">
        <div className="sf-container grid items-center gap-12 py-16 lg:grid-cols-[1fr_420px] lg:py-20">
          <div>
            <Badge variant="accent" className="border border-primary/20">
              El Alto y La Paz
            </Badge>
            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Encuentra el espacio perfecto para tu evento
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Compara salones, jardines, terrazas y estudios con disponibilidad, capacidad,
              comodidades y precios claros.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="sf-feature-card">
                  <div className="sf-feature-icon">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">{feature.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="sf-card-elevated overflow-hidden p-3">
            <div className="relative min-h-[420px] overflow-hidden rounded-lg">
              <Image
                src="https://res.cloudinary.com/demo/image/upload/c_fill,w_900,h_1050,q_auto/sample.jpg"
                alt="Espacio preparado para eventos"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 420px, 100vw"
                priority
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-card/95 p-4 shadow-lg backdrop-blur-sm">
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

      {/* Trust Section */}
      <section className="border-b">
        <div className="sf-container py-8">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Usado por organizadores y propietarios
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustLogos.map((logo) => (
              <div key={logo} className="sf-trust-logo">
                <span className="sf-logo-ghost text-sm font-bold">
                  {logo.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-semibold">{logo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Carousel Section */}
      <HomeVenueCarousel />

      {/* Categories Section */}
      <section className="sf-section-sm">
        <div className="sf-container grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category.title} className="sf-card p-5">
              <p className="font-semibold">{category.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="sf-section-sm">
        <div className="sf-container">
          <div className="sf-cta">
            <div>
              <Badge variant="accent" className="mb-3">
                Para propietarios
              </Badge>
              <h2 className="sf-cta-title">Convierte tu espacio en una ficha lista para reservar</h2>
              <p className="sf-cta-description max-w-2xl text-sm">
                Publica capacidad, precios, amenities, horarios y reglas para que los clientes
                comparen con confianza.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/register">
                Publicar espacio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
