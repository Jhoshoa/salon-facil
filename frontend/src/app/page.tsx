import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { HomeSearchForm } from '@/components/venues/home-search-form';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { Button } from '@/components/ui/button';

import verdeManzanaGarden from '@/assets/images/venue-verde-manzana-garden.jpg';
import verdeManzanaDusk from '@/assets/images/venue-verde-manzana-dusk.jpg';
import verdeManzanaArchNight from '@/assets/images/venue-verde-manzana-arch-night.jpg';
import salonVipInterior from '@/assets/images/venue-salon-vip-interior.jpg';
import salonVipInteriorAlt from '@/assets/images/venue-salon-vip-interior-alt.jpg';
import megatronFacade from '@/assets/images/venue-megatron-facade.jpg';
import primaveraFacade from '@/assets/images/venue-primavera-facade.jpg';
import primaveraFacadeAlt from '@/assets/images/venue-primavera-facade-alt.jpg';
import bumblebeeFacade from '@/assets/images/venue-bumblebee-facade.jpg';
import elAltoTowerAerial from '@/assets/images/venue-el-alto-tower-aerial.jpg';

const legendItems = [
  { label: 'Santa Cruz — jardines y toldos', colorClass: 'bg-city-green' },
  { label: 'El Alto — cholets y salones VIP', colorClass: 'bg-city-magenta' },
  { label: 'Cochabamba — tinglados', colorClass: 'bg-secondary' },
  { label: 'La Paz — terrazas urbanas', colorClass: 'bg-city-cyan' },
];

const galleryPrints = [
  {
    idx: 'n.º 01',
    city: 'Santa Cruz',
    name: 'Verde Manzana',
    cap: '150–400 personas · jardin + salon',
    image: verdeManzanaDusk,
  },
  {
    idx: 'n.º 02',
    city: 'El Alto',
    name: 'Primavera',
    cap: '200–500 personas · 3 salones',
    image: primaveraFacade,
  },
  {
    idx: 'n.º 03',
    city: 'Santa Cruz',
    name: 'Casona con jardin',
    cap: '80–300 personas · disponible',
    image: verdeManzanaArchNight,
  },
  {
    idx: 'n.º 04',
    city: 'El Alto',
    name: 'Salon VIP · interior',
    cap: 'Hasta 800 personas · 4 niveles',
    image: salonVipInteriorAlt,
  },
  {
    idx: 'n.º 05',
    city: 'El Alto',
    name: 'Eventos Bumblebee',
    cap: 'Fachada tematica · verificado',
    image: bumblebeeFacade,
  },
  {
    idx: 'n.º 06',
    city: 'El Alto',
    name: 'Edificio Bolivar',
    cap: 'Fachada tematica · verificado',
    image: elAltoTowerAerial,
  },
];

const fieldStats = [
  {
    n: '10–800',
    d: 'personas, segun el espacio — de una terraza intima a un salon de siete pisos',
  },
  { n: '04', d: 'estilos arquitectonicos ya catalogados, de jardines a cholets' },
  { n: '100%', d: 'fotos propias de cada espacio — nada de bancos de imagenes' },
];

const entries = [
  {
    tag: 'Para bodas',
    title: 'Jardines y salones con catering incluido',
    description:
      'Espacios con capacidad para cortejo, pista y mesas de banquete — filtra por jardin, salon cerrado o ambos.',
    image: verdeManzanaGarden,
  },
  {
    tag: 'Para empresas',
    title: 'Salones con equipo audiovisual y varios niveles',
    description:
      'Auditorios y salones VIP con proyeccion, sonido y capacidad para lanzamientos o convenciones.',
    image: primaveraFacadeAlt,
  },
  {
    tag: 'Para producciones',
    title: 'Luz natural, montaje flexible y parking cerca',
    description:
      'Terrazas y jardines pensados para sesiones de foto, video o activaciones de marca.',
    image: salonVipInterior,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="sf-container grid gap-12 py-10 lg:grid-cols-2 lg:items-center lg:gap-10 lg:py-16">
        <div>
          <p className="mb-4 font-serif text-sm italic text-accent-foreground">
            Cuaderno de bitacora — N.º 001
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.2rem]">
            Un catalogo de los espacios <em className="font-normal italic text-primary">mas singulares</em>{' '}
            de Bolivia, anotados uno por uno.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            No agregamos listados al azar. Cada salon, jardin o cholet que ves aqui fue visitado,
            medido y fotografiado — para que compares con datos reales, no con promesas.
          </p>

          <div className="mt-8">
            <HomeSearchForm />
          </div>
        </div>

        <div className="relative min-h-[380px] sm:min-h-[440px] lg:min-h-[480px]">
          <div className="sf-print absolute left-0 top-0 z-20 w-[68%] rotate-[-4deg] sm:w-[280px]">
            <span className="sf-print-pin" />
            <div className="relative h-[240px] sm:h-[320px]">
              <Image
                src={verdeManzanaGarden}
                alt="Jardin Santa Cruz"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 280px, 68vw"
              />
            </div>
            <p className="absolute bottom-2 left-3 font-serif text-sm italic text-foreground">
              Verde Manzana
            </p>
            <p className="absolute bottom-2.5 right-3 text-[0.62rem] font-bold uppercase tracking-wider text-accent-foreground">
              Santa Cruz
            </p>
          </div>

          <div className="sf-print absolute right-0 top-[190px] z-10 w-[58%] rotate-[3deg] sm:top-[50px] sm:w-[230px]">
            <span className="sf-print-pin" />
            <div className="relative h-[140px] sm:h-[170px]">
              <Image
                src={salonVipInterior}
                alt="Interior El Alto"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 230px, 58vw"
              />
            </div>
            <p className="absolute bottom-2 left-3 font-serif text-sm italic text-foreground">
              Salon VIP
            </p>
            <p className="absolute bottom-2.5 right-3 text-[0.62rem] font-bold uppercase tracking-wider text-accent-foreground">
              El Alto
            </p>
          </div>

          <div className="sf-print absolute bottom-0 left-[16%] z-30 hidden w-[210px] rotate-[2deg] sm:block">
            <span className="sf-print-pin" />
            <div className="relative h-[190px]">
              <Image
                src={megatronFacade}
                alt="Cholet El Alto"
                fill
                className="object-cover"
                sizes="210px"
              />
            </div>
            <p className="absolute bottom-2 left-3 font-serif text-sm italic text-foreground">
              Megatron
            </p>
            <p className="absolute bottom-2.5 right-3 text-[0.62rem] font-bold uppercase tracking-wider text-accent-foreground">
              El Alto
            </p>
          </div>
        </div>
      </section>

      {/* Legend strip */}
      <section className="border-y border-border">
        <div className="sf-container flex flex-wrap justify-center gap-6 py-4 sm:gap-9">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`} />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="sf-container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <div className="sf-kicker justify-center">
            <span className="idx">— 01 —</span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Cada entrada del cuaderno tiene{' '}
            <em className="font-normal italic text-primary">nombre, ciudad y capacidad</em> — nunca
            solo una foto bonita.
          </h2>
        </div>

        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
          {galleryPrints.map((print, index) => {
            const rotate =
              index % 3 === 0 ? '-rotate-[1.4deg]' : index % 3 === 1 ? 'rotate-[1.1deg]' : '-rotate-[0.8deg]';
            return (
              <div key={print.name}>
                <div className={`border border-border bg-card p-2.5 pb-0 shadow-md ${rotate}`}>
                  <div className="relative h-[230px]">
                    <Image
                      src={print.image}
                      alt={print.name}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                </div>
                <div className="pt-3">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="font-serif text-sm italic text-accent-foreground">
                      {print.idx}
                    </span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {print.city}
                    </span>
                  </div>
                  <p className="mb-0.5 font-serif text-lg font-semibold">{print.name}</p>
                  <p className="text-sm text-muted-foreground">{print.cap}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Field notes / stats */}
      <section className="border-y border-border">
        <div className="sf-container grid gap-10 py-16 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <p className="font-serif text-xl italic leading-snug sm:col-span-2 lg:col-span-1 lg:max-w-[280px]">
            No prometemos &ldquo;los mejores espacios de Bolivia&rdquo;. Anotamos los datos para
            que decidas tu.
          </p>
          {fieldStats.map((stat) => (
            <div key={stat.n}>
              <p className="font-serif text-4xl font-semibold leading-none text-primary">
                {stat.n}
              </p>
              <p className="mt-2 border-t border-border pt-2.5 text-sm leading-6 text-muted-foreground">
                {stat.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="sf-container max-w-3xl py-20 sm:py-24">
        <div className="sf-kicker">
          <span className="idx">— 02 —</span>
        </div>
        <h2 className="mb-2 mt-4 text-2xl font-semibold sm:text-3xl">
          Tres formas de usar el mismo cuaderno.
        </h2>

        <div>
          {entries.map((entry, index) => (
            <div
              key={entry.tag}
              className="grid items-center gap-6 border-t border-border py-9 last:border-b sm:grid-cols-[200px_1fr]"
            >
              <div
                className={`border border-border bg-card p-2 pb-0 shadow-md ${
                  index % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[2deg]'
                }`}
              >
                <div className="relative h-[150px]">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
              </div>
              <div>
                <div className="sf-kicker mb-2 max-w-[160px]">
                  <span>{entry.tag}</span>
                </div>
                <h3 className="mb-2 font-serif text-xl font-semibold">{entry.title}</h3>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  {entry.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-center text-primary-foreground sm:py-24">
        <div className="sf-container">
          <span className="sf-stamp mx-auto mb-7 border-primary-foreground/40 text-primary-foreground/75">
            verificado
            <br />
            salonfacil
          </span>
          <h3 className="mx-auto max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
            Tu espacio tambien merece{' '}
            <em className="font-normal italic text-secondary">su propia entrada</em> en el
            cuaderno.
          </h3>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-primary-foreground/70">
            Publica capacidad, precios y disponibilidad real. En cinco minutos tu ficha esta lista
            para recibir reservas.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-8">
            <Link href="/register">
              Publicar espacio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
