import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, Lock, MailCheck, ShieldAlert, ShieldCheck, Star, Wallet } from 'lucide-react';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Seguridad | Mi Evento',
  description: 'Como Mi Evento protege tu cuenta, tus pagos y los locales que publicamos.',
};

const points = [
  {
    icon: ShieldCheck,
    title: 'Locales verificados',
    description:
      'Un administrador revisa cada local antes de que quede visible en la busqueda — datos, fotos y ubicacion.',
  },
  {
    icon: Wallet,
    title: 'Pagos revisados antes de confirmar',
    description:
      'Cada comprobante que sube un cliente lo revisa el propietario (o un admin) antes de que la reserva quede confirmada.',
  },
  {
    icon: Lock,
    title: 'Contraseñas nunca en texto plano',
    description:
      'Encriptamos tu contraseña con un algoritmo de una sola via — ni nosotros podemos verla, solo confirmar que coincide.',
  },
  {
    icon: KeyRound,
    title: 'Sesiones protegidas',
    description:
      'Tu sesion viaja en cookies que el navegador nunca expone a scripts de terceros — no guardamos tokens accesibles por JavaScript.',
  },
  {
    icon: MailCheck,
    title: 'Email verificado',
    description:
      'Confirmamos que tu correo es real antes de dejarte reservar o publicar un local, para reducir cuentas falsas.',
  },
  {
    icon: Star,
    title: 'Reseñas de reservas reales',
    description:
      'Solo quien reservo y paso por un evento puede dejar una reseña — nada de opiniones compradas o inventadas.',
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-hero">
        <div className="sf-container py-16 lg:py-20">
          <Badge variant="accent" className="border border-primary/20">
            Seguridad
          </Badge>
          <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            Como cuidamos tu cuenta y tus reservas
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Mi Evento conecta a personas que buscan un espacio con propietarios reales. Esto es lo
            que hacemos, en concreto, para que esa conexion sea confiable.
          </p>
        </div>
      </section>

      <section className="sf-container py-14 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="sf-feature-card">
                <span className="sf-feature-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-base font-semibold">{point.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sf-container pb-16 lg:pb-20">
        <div className="sf-card-elevated mx-auto max-w-3xl p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-accent-foreground" />
          <h2 className="mt-4 text-xl font-semibold">¿Encontraste algo que no cuadra?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Si ves un local sospechoso, un comprobante que no corresponde, o cualquier cosa que te
            parezca un riesgo, contanos — lo revisamos nosotros mismos.
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">Reportar algo</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
