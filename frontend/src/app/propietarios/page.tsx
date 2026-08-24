import Link from 'next/link';
import { CalendarClock, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { RegisterForm } from '@/components/auth/register-form';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { Badge } from '@/components/ui/badge';

const benefits = [
  {
    icon: Wallet,
    title: 'Genera ingresos con tu espacio',
    description: 'Publica tu salon, jardin o terraza y recibe solicitudes de alquiler sin costo.',
  },
  {
    icon: CalendarClock,
    title: 'Controla tu disponibilidad',
    description: 'Tu maneja el calendario, precios y reglas de cada reserva desde tu panel.',
  },
  {
    icon: ShieldCheck,
    title: 'Reservas mas seguras',
    description: 'Verificamos cada local y confirmamos los pagos antes de cada evento.',
  },
  {
    icon: TrendingUp,
    title: 'Llega a mas clientes',
    description: 'Aparece en las busquedas de personas activamente buscando un espacio como el tuyo.',
  },
];

export default function OwnersLandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-hero border-b">
        <div className="sf-container grid items-start gap-12 py-16 lg:grid-cols-[1fr_420px] lg:py-20">
          <div>
            <Badge variant="accent" className="border border-primary/20">
              Para propietarios
            </Badge>
            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Publica tu espacio y empieza a recibir reservas
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Miles de personas buscan salones, jardines y terrazas para sus eventos cada mes.
              Crea tu cuenta de propietario y publica tu primer local en minutos.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="flex gap-3">
                    <span className="sf-surface-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sf-card-elevated w-full p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Crea tu cuenta de propietario</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Es gratis. Despues de registrarte podras cargar la informacion de tu local.
              </p>
            </div>
            <RegisterForm role="OWNER" submitLabel="Registrar mi espacio" />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Buscas un espacio para tu evento?{' '}
              <Link href="/register" className="sf-link">
                Registrate como cliente
              </Link>
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
