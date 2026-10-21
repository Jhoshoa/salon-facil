import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircleQuestion } from 'lucide-react';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { WhatsAppIcon } from '@/components/shared/brand-icons';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Contacto | Mi Evento',
  description: 'Escribinos por email o WhatsApp — te respondemos a la brevedad.',
};

const SUPPORT_EMAIL = 'soporte@mievento.com.bo';
const SUPPORT_WHATSAPP = '+59174046568';

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: SUPPORT_EMAIL,
    description: 'Para consultas, reclamos o dudas sobre tu cuenta, reserva o local.',
    href: `mailto:${SUPPORT_EMAIL}`,
    cta: 'Escribir un email',
  },
  {
    icon: WhatsAppIcon,
    label: 'WhatsApp',
    value: '+591 74046568',
    description:
      'La via mas rapida para algo urgente — una reserva de hoy, un pago, un problema con un local.',
    href: `https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}`,
    cta: 'Escribir por WhatsApp',
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-hero">
        <div className="sf-container py-16 text-center lg:py-20">
          <Badge variant="accent" className="border border-primary/20">
            Contacto
          </Badge>
          <h1 className="mx-auto mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            Hablemos
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            ¿Tenes una pregunta, un problema con una reserva o queres contarnos algo sobre tu local?
            Elegi el canal que mas te acomode.
          </p>
        </div>
      </section>

      <section className="sf-container py-14 lg:py-16">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.label === 'WhatsApp' ? '_blank' : undefined}
                rel={channel.label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
                className="sf-card-interactive flex flex-col gap-4 p-7"
              >
                <span className="sf-feature-icon h-12 w-12">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{channel.label}</h2>
                  <p className="mt-1 font-serif text-base italic text-accent-foreground">
                    {channel.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
                <span className="sf-link mt-auto text-sm">{channel.cta} →</span>
              </a>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <div className="sf-hairline-row flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MessageCircleQuestion className="h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                ¿Preguntaste algo parecido antes? Puede que ya este respondido.
              </p>
            </div>
            <Link href="/help" className="sf-link text-sm">
              Ir al centro de ayuda
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
