# Integracion con Libelula -- guia de referencia

Documento de referencia para implementar `LibelulaGateway` (Fase 4 del plan de pagos, ver
[pricing-and-payments.md](pricing-and-payments.md) seccion 4.5). Se arma revisando la
documentacion publica de Libelula -- la guia tecnica oficial y las paginas comerciales del sitio
-- antes de escribir codigo. No reemplaza al manual oficial (que cambia de version), pero deja
todo lo necesario para arrancar sin tener que rebuscar de nuevo.

## 1. Por que Libelula (resumen)

Comparado contra las otras opciones evaluadas para Bolivia (OpenBCB, CUCU, circle.bo -- ver la
conversacion que origino este documento), Libelula es la unica que cubre en una sola integracion
los 4 metodos que `PaymentMethod` ya modela en el backend (`QR_BANK`, `BANK_TRANSFER`,
`TIGO_MONEY`, `CARD`), sin costo de afiliacion ni mensualidad -- solo 2.5% sobre lo efectivamente
cobrado. Contacto: soporte@libelula.bo, telefono +591 70621222 / (2) 2773367, oficina en Calacoto,
La Paz.

## 2. Como se solicitan las credenciales (appkey)

Libelula no tiene un signup self-service -- es un proceso comercial:

1. **Contactar a Libelula** via soporte@libelula.bo o telefono, indicando que se quiere integrar
   la pasarela de pagos para una plataforma propia (no un plugin de e-commerce estandar como
   WooCommerce/Magento -- SalonFacil necesita la integracion REST directa).
2. **Enviar documentacion de la empresa**: SalonFacil necesita estar constituido con
   **NIT** -- la plataforma esta acoplada a la facturacion electronica del SIN (ver seccion 5),
   asi que el NIT no es opcional para operar en serio, aunque en teoria se puede probar sin
   facturar (`emite_factura: false`).
3. **Firmar contrato** -- Libelula publica un modelo de contrato base para personas juridicas
   ("Contrato Base Facturacion y pasarela de pagos JURIDICAS").
4. **Recibir el `appkey`** -- es un identificador tipo GUID, unico por empresa
   (ej. `588e5e10-d794-4910-91d2-b3952b54df4d`), que va en el body de cada request. Segun la
   informacion publica, la puesta en producción se estima en **24 horas** una vez entregada toda
   la documentacion.
5. Libelula tambien asigna una **llave de pruebas** (un `appkey` distinto, de prueba) para
   validar la integracion antes de ir a produccion real -- ver seccion 3.

**No hay documentacion publica del formulario/checklist exacto de documentos legales
requeridos** (NIT, poder del representante legal, etc.) -- eso se confirma recien al contactarlos.
Cuando se inicie el tramite real, anotar aca los requisitos exactos que pidan.

## 3. Ambientes

Libelula **no tiene una URL de sandbox separada**. El modelo es: se apunta siempre a la URL de
produccion, pero mientras se este probando se usa el `appkey` de pruebas que asigna Libelula en
vez del `appkey` real. Esto es distinto a la mayoria de pasarelas modernas (que sí separan
`sandbox.api...` de `api...`) -- hay que tenerlo presente para no asumir que existe un ambiente
aislado.

```
URL base: https://api.libelula.bo
```

`docs/deploy/` y las variables de entorno del backend deberian reflejar esto con dos variables:
`LIBELULA_APPKEY` (produccion) y `LIBELULA_APPKEY_TEST` (pruebas), ambas apuntando a la misma
`LIBELULA_BASE_URL`.

## 4. Referencia de la API (REST, JSON sobre HTTP)

Autenticacion: **sin OAuth ni tokens de sesion** -- cada request lleva el `appkey` como campo
mas dentro del body JSON. No hay firma HMAC en el request ni en la notificacion de pago (ver
seccion 6, es la limitacion de seguridad mas importante a tener en cuenta).

### 4.1 Registrar deuda -- crear un pago

```
POST https://api.libelula.bo/rest/deuda/registrar
```

Es el equivalente a "crear un cobro" -- se llama cuando el cliente esta por pagar (anticipo,
pago completo o saldo restante). La respuesta trae la URL a la que hay que redirigir al cliente
para que efectivamente pague.

**Parametros de entrada relevantes para SalonFacil:**

| Parametro | Requerido | Que mapea en SalonFacil |
|---|---|---|
| `appkey` | si | `LIBELULA_APPKEY` |
| `email_cliente` | si | `booking.client.email` |
| `identificador_deuda` | si | `payment.id` (nuestro UUID) -- Libelula lo guarda como referencia externa |
| `callback_url` | no (recomendado) | endpoint nuevo `POST/GET /api/v1/payments/webhooks/libelula?paymentId=...` |
| `url_retorno` | no (recomendado) | URL del detalle de la reserva en el frontend, para que el cliente vuelva ahi despues de pagar |
| `descripcion` | no | ej. `"Anticipo reserva {venue.name}"` |
| `nombre_cliente` / `apellido_cliente` | no | `booking.client.fullName` partido |
| `numero_documento` + `codigo_tipo_documento` | opcional/requerido segun modalidad de factura (ver 5) | CI o NIT del cliente, si se pide en el flujo |
| `moneda` | no (default BOB) | siempre `"BOB"` -- coincide con `Payment.amount` que ya es en bolivianos |
| `lineas_detalle_deuda` | si, array | una sola linea: `{ concepto: "Anticipo - <venue>", cantidad: 1, costo_unitario: payment.amount }` |
| `emite_factura` | no | decision de negocio -- ver seccion 5 antes de poner esto en `true` |

**Respuesta exitosa:**

```json
{
  "error": 0,
  "mensaje": "Deuda registrada con exito...",
  "id_transaccion": "b33d3c21-1128-4d48-ac44-081c069c4725",
  "url_pasarela_pagos": "http://www.todotix.com:20888?id=64820cce-952f-4870-8427-6ef7ac92798a",
  "qr_simple_url": "..."
}
```

`url_pasarela_pagos` es a donde se redirige al cliente (equivalente al `redirectUrl` que ya
definimos en `IPaymentGateway.createCharge()`, Fase 3). `id_transaccion` es la referencia que
Libelula espera que guardemos (equivalente a `externalReference`).

### 4.2 Pago exitoso -- notificacion de pago (el "webhook")

```
GET {callback_url}?transaction_id={id_transaccion}
```

Cuando el pago se confirma, Libelula hace un **GET** (no POST) a la `callback_url` que se mando
en el registro de deuda, pasando el `transaction_id` como query param. Si se emitio factura,
tambien vienen `invoice_id` e `invoice_url`.

Este es el mecanismo que reemplaza a `verifyWebhookSignature()` en nuestro `IPaymentGateway` --
**pero sin firma**, ver seccion 6.

### 4.3 Pago exitoso en background

Mismo mecanismo que 4.2, pero para metodos de pago que confirman en segundo plano (PagosNet,
BNB) en vez de instantaneo -- puede tardar hasta algunas horas. No cambia nada del lado de
SalonFacil, solo hay que asumir que el callback puede llegar mucho despues del registro de
deuda, no inmediatamente.

### 4.4 Consultar pagos (conciliacion)

```
POST/GET https://api.libelula.bo/rest/deuda/consultar_pagos
{ "appkey": "...", "fecha_inicial": "2026-01-01", "fecha_final": "2026-01-31" }
```

Devuelve todos los pagos confirmados en un rango de fechas. **Este es el endpoint clave para
verificar el callback** (ver seccion 6) -- en vez de confiar ciegamente en el GET no firmado de
4.2, se puede llamar a este endpoint (o a 4.8) para confirmar independientemente que el pago
realmente ocurrio antes de marcar el `Payment` como `COMPLETED` en nuestra base.

### 4.5 Anular pagos (en caja)

```
POST/DELETE https://api.libelula.bo/rest/deuda/anular_pagos
```

Solo aplica a pagos "en caja" (cobrados manualmente por el comercio, no via la pasarela online).
No es un reembolso real de tarjeta/QR -- es para anular un registro cuando el pago se hizo fuera
del flujo digital. **No mapea directamente a `IPaymentGateway.refund()`** tal como lo definimos
en Fase 3 -- Libelula no expone un refund real para pagos con tarjeta/QR en esta guia; hay que
confirmar con soporte si existe un mecanismo aparte para eso o si el reembolso sigue siendo
manual (transferencia directa del propietario) incluso con Libelula de por medio.

### 4.6 Regenerar facturas

```
POST https://api.libelula.bo/rest/deuda/regenerar_facturas
```

Solo relevante si se activa `emite_factura`. Permite volver a generar la factura de un pago ya
confirmado (ej. si el cliente dio mal su NIT la primera vez).

### 4.7 Consultar deudas por fechas

```
POST/GET https://api.libelula.bo/rest/deuda/consultar_deudas/por_fechas
```

Trae **todas** las deudas registradas (pagadas o no) en un rango -- util para un job de
reconciliacion periodico que detecte deudas que quedaron `pagado: false` mucho tiempo despues de
registradas (an equivalent to nuestro guard de "comprobante pendiente" del flujo manual, pero
del lado de Libelula).

### 4.8 Consultar deudas por identificador

```
POST/GET https://api.libelula.bo/rest/deuda/consultar_deudas/por_identificador
{ "appkey": "...", "identificador": "<payment.id>" }
```

Trae el detalle completo de una deuda puntual por su `identificador` (el que nosotros mandamos)
o por `codigo_recaudacion` (el que asigna Libelula). Es el mas directo para el patron
"verificar antes de confiar" de la seccion 6 -- un solo lookup por el `payment.id` que ya
tenemos.

## 5. Facturacion electronica (SFE) -- decision pendiente

Libelula **no es solo una pasarela de pagos** -- es una suite de pagos + facturacion electronica
SIN (viene del mismo grupo que Todotix). Si se activa `emite_factura: true`, Libelula genera la
factura fiscal boliviana automaticamente al confirmarse el pago, y exige datos adicionales del
cliente (`numero_documento`, `codigo_tipo_documento` -- NIT/CI/PAS/OD) y de cada linea
(`codigo_producto` o `codigo_producto_sin` bajo la modalidad nueva "SFE").

**Esto es una decision de producto, no solo tecnica**, que hay que resolver con el dueño antes de
integrar:
- ¿SalonFacil quiere que Libelula emita la factura fiscal de cada anticipo/pago automaticamente?
- Si es asi, hay que pedirle el NIT/CI al cliente en el flujo de pago (hoy el `PaymentProofDrawer`
  no lo pide).
- Si no, simplemente no se manda `emite_factura` (o se manda `false`) y Libelula opera solo como
  pasarela, sin facturar -- la facturacion de SalonFacil como plataforma (si corresponde) queda
  fuera de este flujo.

Este documento no resuelve esa pregunta -- solo la deja anotada para cuando se arranque la
implementacion real.

## 6. Seguridad: el callback de pago NO esta firmado

Hallazgo importante revisando el manual: a diferencia de pasarelas modernas (Stripe, Libelula
misma no lo dice explicito pero se confirma leyendo el manual completo), **el callback de "pago
exitoso" es un GET plano sin ningun mecanismo de firma o verificacion** (no hay HMAC, no hay
secret compartido, no hay header de autenticacion). Cualquiera que adivine o intercepte un
`transaction_id` podria, en teoria, golpear nuestro `callback_url` directamente y hacer que el
sistema crea que un pago se confirmo sin que haya ocurrido.

**Implicancia de diseno para `LibelulaGateway`**: el handler del callback (Fase 4,
`POST /api/v1/payments/webhooks/libelula` mencionado en 4.4 del plan) **no debe confiar
directamente en el GET entrante**. Antes de marcar un `Payment` como `COMPLETED`, tiene que:
1. Extraer el `transaction_id` (o nuestro `identificador` / `payment.id`) del callback.
2. Llamar de vuelta a Libelula (`CONSULTAR DEUDAS POR IDENTIFICADOR`, seccion 4.8, o
   `CONSULTAR PAGOS`, seccion 4.4) para confirmar independientemente, contra la fuente de
   verdad de Libelula, que el pago realmente esta `pagado: true` y por el monto esperado.
3. Recien ahi actualizar el estado de la reserva -- exactamente el mismo patron de "no confiar
   en el cliente, revalidar contra el estado real" que ya aplicamos en Fase 2 para el
   `paymentType`/`BookingStatus` (`payment.service.ts`).

Esto tambien significa que **`IPaymentGateway.verifyWebhookSignature()`** (definido en Fase 3
para proveedores con confirmacion automatica via webhook) **no aplica tal cual a Libelula** --
no hay firma que verificar. El metodo queda `undefined` para `LibelulaGateway` tambien, igual
que para `ManualProofGateway`, y la verificacion real se hace con un round-trip a la API de
consulta en vez de validar una firma criptografica. Vale la pena anotar esto en la propia
interfaz cuando se implemente, para que quede claro que no es un descuido.

## 7. Como encaja con lo que ya construimos (Fase 3)

`LibelulaGateway implements IPaymentGateway` (`backend/src/modules/payment/domain/gateways/payment-gateway.interface.ts`):

| Metodo del puerto | Se implementa con... |
|---|---|
| `createCharge()` | `POST /rest/deuda/registrar` -- devuelve `externalReference: id_transaccion`, `redirectUrl: url_pasarela_pagos`, `qrData: qr_simple_url` |
| `verifyWebhookSignature()` | No aplica (ver seccion 6) -- queda sin implementar, igual que en `ManualProofGateway` |
| `refund()` | Sin equivalente directo confirmado en la documentacion publica (ver 4.5) -- a confirmar con soporte antes de implementar, podria seguir siendo manual |

El endpoint nuevo que menciona el plan (`POST /api/v1/payments/webhooks/libelula`) debe:
1. Recibir el GET de la seccion 4.2/4.3.
2. Revalidar contra la API de Libelula (seccion 6).
3. Llamar a la misma logica que hoy dispara `PaymentService.confirmPayment()` -- la diferencia
   es quien la dispara (Libelula via este endpoint, en vez del propietario tocando un boton en
   el dashboard).
4. El comprobante manual (`ManualProofGateway`, ya construido) sigue disponible en paralelo --
   no todos los clientes van a preferir pagar por la pasarela.

## Fuentes

- [Guia de Integracion para Empresas v2.145 (PDF, manual tecnico completo)](https://web.archive.org/web/20240216130408/https://libelula.bo/Libelula%20Manual%20de%20Integraci%C3%B3n%20v2.145.pdf) -- la URL en vivo del sitio devuelve 404 al momento de escribir esto, se uso la copia archivada de Wayback Machine; conviene volver a pedirle a Libelula el manual vigente al iniciar el contacto comercial, puede haber una version mas nueva.
- [Libelula.bo -- sitio oficial](https://libelula.bo/)
- [Comparativa de pasarelas de pago en Bolivia -- LaGuiaEmprendedor](https://laguiaemprendedor.com/pasarelas-pagos/bo) (fuente de la comision 2.5% y comparacion con otras opciones)
- Contacto directo: soporte@libelula.bo, +591 70621222, (2) 2773367
