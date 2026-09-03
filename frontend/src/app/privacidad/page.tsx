import type { Metadata } from 'next';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: 'Politica de privacidad | SalonFacil',
  description: 'Como SalonFacil recolecta, usa y protege tus datos personales.',
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-top-band border-b">
        <div className="sf-container py-10">
          <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
            Politica de privacidad
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ultima actualizacion: 2 de septiembre de 2026
          </p>
        </div>
      </section>

      <section className="sf-container py-10">
        <div className="mx-auto max-w-3xl space-y-10 text-sm leading-6 text-foreground">
          <p className="text-base leading-7 text-muted-foreground">
            Esta politica explica que datos personales recolecta SalonFacil, para que los usamos,
            con quien los compartimos y que derechos tenes sobre ellos. Se aplica a Clientes,
            Propietarios y visitantes del sitio.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Que datos recolectamos</h2>
            <ul className="ml-5 list-disc space-y-1.5">
              <li>
                <span className="font-medium text-foreground">Datos de cuenta:</span> nombre
                completo, correo electronico, telefono, rol (Cliente u Propietario), y
                opcionalmente ciudad y distrito.
              </li>
              <li>
                <span className="font-medium text-foreground">Datos de Propietario:</span> telefono
                de WhatsApp de contacto y enlaces a redes sociales que decidas agregar a tu perfil.
              </li>
              <li>
                <span className="font-medium text-foreground">Datos de locales:</span> direccion,
                zona, fotos, precios, capacidad y comodidades que publiques.
              </li>
              <li>
                <span className="font-medium text-foreground">Datos de reservas y pagos:</span>{' '}
                fecha, horario, numero de invitados, monto acordado, y el comprobante de pago
                (imagen) que subis para confirmar una reserva.
              </li>
              <li>
                <span className="font-medium text-foreground">Reseñas:</span> calificacion,
                comentario y, si sos Propietario, tu respuesta publica a una reseña.
              </li>
              <li>
                <span className="font-medium text-foreground">Datos tecnicos:</span> la cookie de
                sesion que usamos para mantenerte identificado (ver seccion de cookies) y registros
                de seguridad basicos (por ejemplo, intentos de acceso denegados) que guardamos por
                un tiempo limitado para proteger la plataforma.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Para que usamos tus datos</h2>
            <ul className="ml-5 list-disc space-y-1.5">
              <li>Operar la plataforma: crear tu cuenta, mostrar locales, gestionar reservas.</li>
              <li>Verificar comprobantes de pago y confirmar reservas.</li>
              <li>
                Enviarte notificaciones relacionadas con tus reservas por WhatsApp o correo (por
                ejemplo, confirmaciones o recordatorios).
              </li>
              <li>Prevenir fraude y proteger la seguridad de la cuenta y del sitio.</li>
              <li>Mostrar reseñas y calificaciones de locales.</li>
              <li>Mejorar la plataforma con base en como se usa.</li>
            </ul>
            <p>
              No usamos tus datos para publicidad de terceros ni los vendemos a otras empresas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Con quien compartimos datos</h2>
            <p>
              Usamos algunos proveedores externos para operar el servicio, que procesan datos en
              nuestro nombre bajo sus propias politicas de seguridad:
            </p>
            <ul className="ml-5 list-disc space-y-1.5">
              <li>
                <span className="font-medium text-foreground">Cloudinary</span> — almacenamiento de
                fotos de locales y comprobantes de pago.
              </li>
              <li>
                <span className="font-medium text-foreground">Twilio</span> — envio de mensajes de
                WhatsApp (confirmaciones y recordatorios de reserva).
              </li>
              <li>
                <span className="font-medium text-foreground">Resend</span> — envio de correos
                transaccionales (bienvenida, recuperacion de contraseña, notificaciones).
              </li>
            </ul>
            <p>
              Tambien compartimos los datos minimos necesarios de una reserva entre el Cliente y el
              Propietario involucrados (por ejemplo, nombre y telefono de contacto), ya que son
              necesarios para coordinar el evento. No compartimos tus datos con nadie mas, salvo que
              la ley boliviana nos obligue a hacerlo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Cookies</h2>
            <p>
              Usamos una cookie de sesion de tipo <span className="font-mono text-xs">httpOnly</span>{' '}
              para mantenerte con la sesion iniciada; no puede leerse desde JavaScript y no se usa
              para rastrearte en otros sitios. No usamos cookies de publicidad ni de rastreo de
              terceros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Seguridad</h2>
            <p>
              Tu contraseña se guarda de forma cifrada (nunca en texto plano), la sesion viaja en
              una cookie protegida, y limitamos los intentos de acceso para prevenir ataques. Aun
              asi, ningun sistema es perfectamente seguro; si detectamos un incidente que afecte tus
              datos, te lo comunicaremos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Cuanto tiempo guardamos tus datos</h2>
            <p>
              Mientras tu cuenta este activa. Si la eliminas, quitamos o anonimizamos tus datos
              personales, salvo la informacion que debamos conservar por un tiempo razonable por
              motivos contables, legales o para resolver disputas abiertas sobre una reserva.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Tus derechos</h2>
            <p>
              Podes pedirnos acceder a tus datos, corregirlos si estan desactualizados, o eliminar
              tu cuenta. La Constitucion boliviana reconoce el derecho a la privacidad y la accion
              de proteccion de privacidad (habeas data) te permite conocer, actualizar o eliminar
              informacion tuya en manos de terceros. Para ejercer cualquiera de estos derechos,
              escribinos a{' '}
              <a className="sf-link" href="mailto:soporte@salonfacil.bo">
                soporte@salonfacil.bo
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Menores de edad</h2>
            <p>
              SalonFacil no esta dirigido a menores de 18 años y no creamos cuentas a sabiendas para
              menores de edad.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Cambios a esta politica</h2>
            <p>
              Si actualizamos esta politica de forma relevante, lo avisaremos dentro del sitio antes
              de que entre en vigencia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Contacto</h2>
            <p>
              Para consultas sobre privacidad o para ejercer tus derechos sobre tus datos,
              escribinos a{' '}
              <a className="sf-link" href="mailto:soporte@salonfacil.bo">
                soporte@salonfacil.bo
              </a>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Razon social y datos de registro de la empresa responsable del tratamiento de datos:
              [a completar por el propietario de la plataforma].
            </p>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
