import type { Metadata } from 'next';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: 'Terminos y condiciones | SalonFacil',
  description: 'Terminos y condiciones de uso de la plataforma SalonFacil.',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="sf-top-band border-b">
        <div className="sf-container py-10">
          <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
            Terminos y condiciones
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ultima actualizacion: 2 de septiembre de 2026
          </p>
        </div>
      </section>

      <section className="sf-container py-10">
        <div className="mx-auto max-w-3xl space-y-10 text-sm leading-6 text-foreground">
          <p className="text-base leading-7 text-muted-foreground">
            Estos terminos regulan el uso de SalonFacil, una plataforma en linea que conecta a
            personas que buscan un espacio para eventos (&quot;Clientes&quot;) con personas o
            negocios que ofrecen espacios en alquiler (&quot;Propietarios&quot;). Al crear una
            cuenta o usar el sitio aceptas estos terminos. Si no estas de acuerdo, no deberias usar
            la plataforma.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Que es SalonFacil</h2>
            <p>
              SalonFacil es un intermediario: publicamos espacios de terceros, facilitamos la
              busqueda, la solicitud de reserva y la coordinacion del pago entre Cliente y
              Propietario. SalonFacil no es dueño de los locales publicados, no organiza los
              eventos y no es parte del contrato de alquiler entre Cliente y Propietario, aunque
              intervenimos para verificar locales, mediar pagos y resolver disputas cuando es
              posible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Cuentas de usuario</h2>
            <p>
              Para reservar o publicar un espacio necesitas crear una cuenta con datos reales
              (nombre, correo, telefono). Sos responsable de mantener tu contraseña segura y de
              toda actividad que ocurra desde tu cuenta. Podes tener el rol de Cliente, Propietario
              o Administrador; cada rol tiene permisos distintos dentro de la plataforma.
            </p>
            <p>
              Podemos suspender o cerrar una cuenta que incumpla estos terminos, que suba
              informacion falsa, o que sea usada de forma fraudulenta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Publicacion de espacios (Propietarios)</h2>
            <p>
              Si publicas un local, declaras que la informacion (fotos, capacidad, precios,
              ubicacion, comodidades, reglas y politica de cancelacion) es real y esta actualizada.
              Los locales pasan por una revision antes de quedar visibles publicamente y pueden
              recibir una insignia de &quot;verificado&quot;, que indica que revisamos la
              informacion basica del local, no que garantizamos su estado fisico en todo momento.
            </p>
            <p>
              Como Propietario te comprometes a honrar las reservas que aceptes y a comunicar con
              anticipacion cualquier cambio o cancelacion de tu lado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Proceso de reserva y pago</h2>
            <p>
              Una reserva pasa por estas etapas: el Cliente envia una solicitud con fecha, horario
              y numero de invitados; el Propietario la aprueba o rechaza; si se aprueba, el Cliente
              sube un comprobante del pago (deposito u otro monto acordado); el Propietario o un
              administrador verifica el comprobante y confirma la reserva.
            </p>
            <p>
              SalonFacil no procesa ni retiene el dinero de la transaccion: los pagos se coordinan
              directamente entre Cliente y Propietario (transferencia, QR u otro medio que el local
              acepte) y nosotros solo verificamos que el comprobante subido corresponda a lo
              acordado. No somos responsables por errores en transferencias hechas fuera de la
              plataforma ni por comprobantes falsificados que hayan pasado la revision.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Cancelaciones y reembolsos</h2>
            <p>
              Cada local define su propia politica de cancelacion, visible en su ficha antes de
              reservar. Te recomendamos leerla antes de confirmar. Las disputas sobre reembolsos se
              resuelven en primer lugar entre Cliente y Propietario; si no llegan a un acuerdo,
              podes escribirnos y mediamos con la informacion disponible en la plataforma, sin que
              esto garantice un resultado especifico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Reseñas</h2>
            <p>
              Solo podes dejar una reseña de un local que hayas reservado. Las reseñas deben
              reflejar tu experiencia real; no se permite contenido falso, difamatorio o que
              exponga datos personales de terceros. Los Propietarios pueden responder
              publicamente a las reseñas de su local.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Conducta prohibida</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Suplantar a otra persona o negocio, o publicar informacion falsa.</li>
              <li>Usar la plataforma para fines ilegales o para eventos que infrinjan la ley.</li>
              <li>Intentar eludir la revision de pagos o de locales.</li>
              <li>Acosar, amenazar o discriminar a otros usuarios.</li>
              <li>Intentar vulnerar la seguridad del sitio o acceder a cuentas ajenas.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Propiedad intelectual</h2>
            <p>
              El contenido que subis (fotos de tu local, descripciones, reseñas) sigue siendo tuyo;
              al subirlo nos das permiso para mostrarlo dentro de SalonFacil con el fin de operar la
              plataforma (busquedas, fichas de local, promocion del sitio). El diseño, marca y
              codigo de SalonFacil son propiedad de sus operadores.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Limitacion de responsabilidad</h2>
            <p>
              SalonFacil facilita el contacto y la coordinacion entre Cliente y Propietario, pero no
              controla el estado fisico de los locales, la conducta de los usuarios durante un
              evento, ni el cumplimiento de acuerdos hechos fuera de la plataforma. En la medida
              permitida por ley, no somos responsables por daños, perdidas o conflictos derivados
              del uso de un local o de la relacion entre Cliente y Propietario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Cambios a estos terminos</h2>
            <p>
              Podemos actualizar estos terminos para reflejar cambios en la plataforma o en la
              normativa aplicable. Si el cambio es importante, lo avisaremos dentro del sitio. Seguir
              usando SalonFacil despues de un cambio implica que lo aceptas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Ley aplicable</h2>
            <p>
              Estos terminos se rigen por las leyes del Estado Plurinacional de Bolivia. Cualquier
              disputa que no se resuelva de forma directa se somete a los tribunales competentes de
              Bolivia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">12. Contacto</h2>
            <p>
              Si tenes preguntas sobre estos terminos, escribinos a{' '}
              <a className="sf-link" href="mailto:soporte@salonfacil.bo">
                soporte@salonfacil.bo
              </a>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Razon social y datos de registro de la empresa operadora: [a completar por el
              propietario de la plataforma].
            </p>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
