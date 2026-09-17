# Modelo de monetizacion: suscripcion al propietario, no comision por reserva

Este documento registra la decision tomada sobre como SalonFacil va a generar ingresos, y por
que se descartaron las otras dos opciones consideradas. Es un documento de **decision de
producto**, separado del plan tecnico de pagos ([pricing-and-payments.md](pricing-and-payments.md))
-- ese documento resuelve "como se cobra una reserva", este resuelve "como cobra SalonFacil
como plataforma".

**Estado: decidido a nivel de modelo, sin implementar todavia.** No hay codigo de suscripciones,
planes ni facturacion en el repo -- se construye recien cuando haya traccion real (ver seccion 4).

## 1. Las opciones que se descartaron, y por que

- **Comision por reserva, cobrada de buena fe** (el propietario avisa y transfiere su parte
  manualmente cuando consigue un cliente): descartada. Es el problema clasico de "fuga" en
  marketplaces de dos lados -- una vez que el propietario y el cliente se conocieron a traves de
  la plataforma, no tienen ningun incentivo para seguir pasando por SalonFacil en la proxima
  reserva. No hay forma de hacer cumplir esto sin control real sobre el dinero.
- **Comision por reserva, descontada automaticamente de la pasarela de pago**: descartada **por
  ahora**, no para siempre. Ninguna pasarela boliviana revisada (Libelula, OpenBCB, circle.bo,
  CUCU) confirma soporte de "split payments" -- pagar automaticamente una parte al propietario y
  quedarse con la comision, desde un solo pago del cliente. Sin eso, SalonFacil tendria que
  recibir el 100% y re-girar la parte del propietario a mano, lo cual es mas trabajo y mas riesgo
  (confianza de que SalonFacil efectivamente gire la plata) del que se justifica antes de tener
  usuarios reales. Se revisita cuando la Fase 4 (integracion real con Libelula, ver
  `pricing-and-payments.md`) confirme si existe esa capacidad.
- **Construir una pasarela de pago propia**: descartada de plano -- operar como pasarela requiere
  licencia y regulacion del ASFI, es un negocio financiero regulado aparte, no algo que se arma
  como feature de SalonFacil.

## 2. El modelo elegido: suscripcion mensual al propietario

SalonFacil le cobra al **propietario del local** una suscripcion mensual fija por usar la
plataforma (calendario, gestion de reservas, presencia en la busqueda) -- no una comision sobre
cada reserva. El cliente le sigue pagando al propietario directamente (transferencia/QR/Tigo
Money, como ya funciona hoy), SalonFacil nunca toca ese dinero.

Ventajas sobre las opciones descartadas:
- No depende de resolver split de pagos con ninguna pasarela -- se puede activar sin esperar a
  la Fase 4.
- Es un cobro que SalonFacil controla directamente (le cobra al propietario, no depende de que
  el propietario reporte nada) -- no tiene el problema de fuga de la opcion de "buena fe".

## 3. El trial no se mide en dias -- se mide en reservas completadas de verdad

Un trial de calendario (ej. "30 dias gratis") castiga al propietario por algo que no controla:
si en esos 30 dias no le llego ninguna reserva (temporada baja, recien publico su local), en el
dia 31 se le estaria cobrando por una herramienta que todavia no le demostro nada -- alto riesgo
de espantar la oferta justo cuando la plataforma mas necesita locales publicados.

En cambio, el trial se mide en **reservas reales completadas a traves de la plataforma**:

- **Gratis, sin limite de tiempo, para siempre**: crear cuenta, crear/editar/publicar locales,
  aparecer en la busqueda publica una vez verificado, gestionar calendario y disponibilidad,
  recibir y aprobar/rechazar solicitudes de reserva. Esto nunca se bloquea -- es lo que le da
  contenido al marketplace desde el dia uno; bloquearlo mata la oferta antes de que exista.
- **Se activa el cobro de la suscripcion** recien cuando el local acumula un numero de reservas
  en estado `COMPLETED` (propuesta inicial: **3 a 5 reservas completadas** -- numero a confirmar,
  no cerrado en piedra). Este umbral ya se apoya en infraestructura que existe hoy: `BookingStatus`
  ya tiene el estado `COMPLETED`, y el propietario ya tiene el boton "Marcar como completada" en
  su dashboard (`owner-booking-management.tsx`) -- no hace falta inventar una nueva señal de
  "esto funciono de verdad", ya esta ahi.

Pitch al propietario: *"Usalo gratis. Si te consigue reservas de verdad, ahi recien empezas a
pagar un poco por mes."*

## 4. Que falta definir (fuera de alcance de este documento, a resolver antes de construir)

Estas son decisiones pendientes, deliberadamente no resueltas aca todavia:

- **Precio de la suscripcion mensual** -- cuanto cobrar, y si es un monto fijo unico o escalonado
  por tamaño/actividad del local.
- **Como se factura** -- depende de que SalonFacil tenga la empresa constituida (ver
  conversacion sobre Empresa Unipersonal); no se puede facturar formalmente sin eso.
- **Que pasa si un propietario deja de pagar** -- se bloquea todo el dashboard, o solo ciertas
  funciones (ej. seguir viendo reservas pasadas pero no recibir nuevas, o el local deja de
  aparecer en la busqueda)? No decidido.
- **Infraestructura tecnica**: no existe hoy ningun modelo de `Subscription`/`Plan` en el schema
  de Prisma, ni logica de gating en el dashboard ni en el backend. Se diseña e implementa recien
  cuando el punto anterior (que bloquea, que no) este resuelto y haya señales reales de que se
  necesita (primeros locales acercandose al umbral de reservas completadas).
- **Revisitar comision por transaccion** una vez que la Fase 4 confirme (o descarte) split de
  pagos con Libelula -- podria terminar siendo un modelo complementario a la suscripcion, no
  necesariamente un reemplazo.

## 5. Por que no se construye nada de esto todavia

Coherente con la decision de no crear la Empresa Unipersonal todavia (ver la conversacion que
origino este documento): no tiene sentido construir logica de cobro, ni activar ningun cobro
real, antes de tener la empresa constituida para poder facturar, y antes de tener locales reales
generando reservas reales para saber si el umbral de 3-5 reservas es el numero correcto. Este
documento existe para no perder la decision de modelo, no para arrancar la implementacion.
