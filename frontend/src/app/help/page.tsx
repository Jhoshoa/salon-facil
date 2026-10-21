import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, LifeBuoy } from 'lucide-react';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Centro de ayuda | Mi Evento',
  description: 'Respuestas a las preguntas mas comunes sobre reservar o publicar un local.',
};

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  idx: string;
  title: string;
  items: FaqItem[];
}

const categories: FaqCategory[] = [
  {
    idx: '01',
    title: 'Para quienes buscan un local',
    items: [
      {
        question: '¿Como reservo un espacio?',
        answer:
          'Elegi un local, mira su disponibilidad y enviá una solicitud con la fecha, el horario y la cantidad de invitados. Algunos locales confirman al instante; el resto espera la aprobacion del propietario antes de pedirte el pago.',
      },
      {
        question: '¿Como pago mi reserva?',
        answer:
          'Una vez aprobada tu solicitud, subis el comprobante del anticipo (o el pago completo, segun la politica del local) por transferencia, QR u otro medio que acepte el local. El propietario o un administrador revisa el comprobante y confirma la reserva.',
      },
      {
        question: '¿Puedo cancelar una reserva?',
        answer:
          'Cada local define su propia politica de cancelacion, visible en su ficha antes de reservar — te recomendamos leerla antes de confirmar. Si necesitas cancelar, el primer paso es coordinar directamente con el propietario.',
      },
      {
        question: '¿Cuando puedo dejar una reseña?',
        answer:
          'Solo despues de haber completado una reserva real en ese local — asi nos aseguramos de que las reseñas reflejen experiencias genuinas, no opiniones de quien nunca estuvo ahi.',
      },
      {
        question: '¿Que significa que un local este "verificado"?',
        answer:
          'Que un administrador reviso su informacion basica (datos, fotos, ubicacion) antes de publicarlo. No es una garantia de su estado fisico en todo momento, pero si de que no es un perfil inventado.',
      },
    ],
  },
  {
    idx: '02',
    title: 'Para propietarios',
    items: [
      {
        question: '¿Como publico mi local?',
        answer:
          'Crea una cuenta de propietario y completa los datos de tu espacio: capacidad, direccion, fotos, comodidades y precio. Tu local queda en borrador hasta que lo completes y lo envies a revision.',
      },
      {
        question: '¿Cuanto tarda en aprobarse mi local?',
        answer:
          'Un administrador revisa cada local antes de que quede visible publicamente. El tiempo exacto varia, pero lo normal es que sea cuestion de dias, no semanas.',
      },
      {
        question: '¿Como confirmo un pago de un cliente?',
        answer:
          'Cuando un cliente sube su comprobante, te llega una notificacion. Entra a tu panel de reservas, revisa el comprobante contra lo acordado, y confirma o rechaza el pago desde ahi.',
      },
      {
        question: '¿Puedo tener mas de un local?',
        answer:
          'Si, una misma cuenta de propietario puede administrar varios locales, cada uno con su propio calendario, precios y reglas.',
      },
      {
        question: '¿Como cambio mis precios o disponibilidad?',
        answer:
          'Desde tu panel, en la edicion de cada local — podes definir un precio unico, reglas por dia de la semana, o precios especiales para fechas puntuales. El calendario de cada local es tuyo para bloquear fechas cuando quieras.',
      },
    ],
  },
  {
    idx: '03',
    title: 'Cuenta y acceso',
    items: [
      {
        question: 'Olvide mi contraseña, ¿que hago?',
        answer:
          'Desde la pantalla de inicio de sesion, toca "Olvidaste tu contraseña" e ingresa tu email — te mandamos un enlace para elegir una nueva.',
      },
      {
        question: '¿Puedo entrar con mi cuenta de Google?',
        answer:
          'Si, podes registrarte o iniciar sesion directamente con Google, sin necesidad de elegir una contraseña aparte.',
      },
      {
        question: '¿Como cambio mi email o telefono?',
        answer:
          'Desde tu perfil, en la seccion de datos de cuenta. Si tenes problemas para actualizarlos, escribinos y te ayudamos.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-hero">
        <div className="sf-container py-16 text-center lg:py-20">
          <Badge variant="accent" className="border border-primary/20">
            Centro de ayuda
          </Badge>
          <h1 className="mx-auto mt-6 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            ¿En que te podemos ayudar?
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Las preguntas que mas nos hacen, agrupadas por tema. Si no encontras lo que buscas,
            escribinos directamente.
          </p>
        </div>
      </section>

      <section className="sf-container py-14 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-12">
          {categories.map((category) => (
            <div key={category.idx}>
              <div className="sf-kicker">
                <span className="idx">{category.idx}</span>
                {category.title}
              </div>
              <div className="mt-5 space-y-3">
                {category.items.map((item) => (
                  <details key={item.question} className="sf-card group p-5 open:pb-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sf-card-elevated mx-auto mt-14 max-w-3xl p-8 text-center">
          <LifeBuoy className="mx-auto h-8 w-8 text-accent-foreground" />
          <h2 className="mt-4 text-xl font-semibold">¿No encontraste tu respuesta?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Escribinos por email o WhatsApp y te respondemos directamente.
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">Contactanos</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
