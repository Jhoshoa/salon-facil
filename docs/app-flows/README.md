# Flujos de la aplicacion — guia de pruebas manuales

Este documento lista todos los flujos de usuario de SalonFacil para probarlos manualmente:
CLIENT, OWNER y ADMIN. Fue generado revisando el codigo real (rutas del frontend, endpoints
del backend, seed de datos) el 2026-08-28.

**Como usar esta guia:** cada flujo tiene precondiciones, pasos y el resultado esperado. Si
algo no coincide con lo que ves, es un bug — anotalo. Los flujos marcados con ⚠️ tienen una
limitacion conocida del entorno local (explicada en la seccion 0).

---

## 0. Antes de empezar

### 0.1 Usuarios de prueba (seed)

Todos comparten la misma contraseña: **`Password123!`**

| Email | Rol | Nombre | Notas |
|---|---|---|---|
| `admin@salonfacil.bo` | ADMIN | Administrador SalonFacil | Unico admin disponible; no hay forma de crear otro desde la UI |
| `mario.quispe@email.com` | OWNER | Mario Quispe Mamani | Dueño de "Salon Imperial" y "Estudio Creativo Calacoto" |
| `rosa.choque@email.com` | OWNER | Rosa Choque Flores | Dueña de "Espacio Fiesta" |
| `luis.condori@email.com` | OWNER | Luis Condori Apaza | Dueño de "Jardin Los Pinos" y "Terraza Mirador Andino" |
| `cliente1@email.com` | CLIENT | Ana Laura Mendoza | Tiene reservas en varios estados (pendiente, seña pagada, etc.) |
| `cliente2@email.com` | CLIENT | Pedro Vargas Lima | Tiene una reserva COMPLETED con reseña ya publicada en Espacio Fiesta |

Para reponer estos datos si se ensucian: `make seed` desde la raiz del proyecto —
**esto borra TODOS los usuarios y datos, incluyendo cualquier cuenta real que hayas creado
a mano. Nunca lo corras sin confirmar antes.**

### 0.2 Servicios opcionales sin configurar

Este entorno local **no tiene configurado** Cloudinary, Resend (email) ni Twilio (WhatsApp)
— no hay archivo `.env` con esas credenciales. Esto afecta tres flujos:

- **Subir fotos de un local** (owner) y **subir comprobante de pago** (client): la subida
  falla con un error porque Cloudinary no esta configurado. Para probar el resto del flujo
  de todas formas, un desarrollador puede insertar la URL manualmente en la base de datos
  (ver flujo 3.4 y 4.2 mas abajo).
- **Recuperar contraseña**: el correo nunca llega a una bandeja real. El enlace de recuperacion
  queda igual disponible en la tabla `notifications` — ver flujo 1.3.
- **Notificaciones de reserva/pago**: siempre se crean en la campanita de notificaciones
  in-app (`/notifications`, icono de campana en el header), pero nunca llegan por email o
  WhatsApp real. Verifica los flujos ahi, no en tu correo.

Si en algun momento configuran esas credenciales en `backend/.env`, estas limitaciones
desaparecen y esos tres flujos funcionan de punta a punta sin pasos manuales.

### 0.3 Consultar la base de datos directamente

Cuando un flujo pide "revisa la base de datos", usa:

```bash
docker exec -it salonfacil-postgres psql -U salonfacil -d salonfacil_dev
```

---

## 1. Flujos publicos y de autenticacion (sin sesion / cualquier rol)

### 1.1 Explorar y buscar locales
1. Ir a `/` — ver el buscador principal, categorias, carrusel de locales destacados.
2. Buscar con filtros (capacidad, fecha, distrito, tipo de evento) desde `/venues`.
3. Cambiar a vista de mapa (`/venues/map` o boton "Ver en mapa") y confirmar que los pines
   de precio aparecen sobre las coordenadas correctas, que el hover resalta la tarjeta
   correspondiente y que "Buscar en esta area" acota los resultados al mover el mapa.
4. Abrir el detalle de un local (`/venues/[slug]`) — fotos, precio, disponibilidad, resenas.

**Resultado esperado:** todo funciona sin iniciar sesion. Si el mapa no carga tiles, revisa
si `GOOGLE_MAPS_API_KEY` esta configurado (no es obligatorio, pero puede degradar el mapa).

### 1.2 Registro
1. Cliente: ir a `/register`, completar el formulario. El rol queda fijo en CLIENT.
2. Propietario: ir a `/propietarios` (landing especial para dueños de locales) y registrarse
   ahi — el rol queda fijo en OWNER.
3. Confirmar que despues del registro se inicia sesion automaticamente y redirige al lugar
   correcto (home para CLIENT, `/dashboard` para OWNER).

**No existe forma de auto-registrarse como ADMIN** — es intencional, usa la cuenta seed.

### 1.3 Login / Logout
1. Ir a `/login`, iniciar sesion con cualquier usuario seed.
2. Cerrar sesion desde el menu de usuario en el header.
3. Probar credenciales invalidas — debe mostrar un error claro, no un crash.

### 1.4 Recuperar contraseña ⚠️
1. Ir a `/forgot-password`, ingresar un email valido del seed. El mensaje es siempre el mismo
   exista o no el email (por seguridad, no revela si el correo esta registrado).
2. Como el email no se envia realmente en este entorno, recupera el link manualmente:
   ```sql
   SELECT content FROM notifications WHERE type = 'PASSWORD_RESET' ORDER BY created_at DESC LIMIT 1;
   ```
   El `content` incluye la URL completa con el token: `http://localhost:3000/reset-password?token=...`
3. Abrir esa URL, poner una contraseña nueva en `/reset-password`.
4. Iniciar sesion con la contraseña nueva para confirmar que cambio.

**Nota:** el token vence en 1 hora y solo puede usarse una vez.

---

## 2. Flujos de CLIENT

Inicia sesion con `cliente1@email.com` (tiene reservas en distintos estados) o
`cliente2@email.com` (tiene una reseña ya publicada, util para probar edicion/borrado).

### 2.1 Reservar un local
1. Desde el detalle de un local, elegir fecha(s), horario, cantidad de invitados.
2. Confirmar disponibilidad (el calendario debe bloquear fechas ya ocupadas).
3. Enviar la solicitud de reserva.
4. Verificar que aparece en `/bookings` con estado **PENDIENTE**.

### 2.2 Ver y gestionar mis reservas
1. Ir a `/bookings` ("Mis reservas") — lista de todas las reservas del cliente.
2. Abrir el detalle de una (`/bookings/[id]`) — estado, fechas, precio, pagos.
3. Cancelar una reserva PENDIENTE o APROBADA — confirmar que pasa a estado cancelada y libera
   el calendario del local.

### 2.3 Pagar una reserva (seña o pago completo) ⚠️
1. En una reserva **APROBADA**, ir a la seccion de pago y elegir tipo (seña o completo) y
   metodo (transferencia, QR, efectivo, etc.).
2. Subir el comprobante — **esto falla en este entorno** porque Cloudinary no esta
   configurado (ver 0.2). Para seguir probando el resto del flujo sin esa integracion, un
   desarrollador puede insertar la URL manualmente:
   ```sql
   UPDATE payments SET comprobante_url = 'https://example.com/test.jpg', comprobante_uploaded_at = now()
   WHERE id = '<payment-id>';
   ```
3. Esperar a que el propietario confirme el pago (flujo 3.2) y verificar que el estado de la
   reserva avanza a **SEÑA PAGADA** o **PAGADA**, segun el tipo de pago.

### 2.4 Dejar una reseña
**Precondicion:** una reserva en estado **COMPLETADA**. En el seed, ninguna reserva nueva
llega a ese estado sola — el propietario debe marcarla como completada primero (flujo 3.3,
recien habilitado). Sigue la cadena completa: aprobar → pagar → confirmar pago → marcar
completada, y recien ahi aparece el boton "Dejar reseña" en el detalle de esa reserva.

1. En el detalle de una reserva COMPLETADA sin reseña, click en "Dejar reseña".
2. Poner calificacion (estrellas) y comentario, enviar.
3. Verificar que aparece en el detalle del local (`/venues/[slug]`) y que el promedio de
   calificacion del local se actualiza.
4. Editar la reseña (icono de lapiz) y confirmar que el cambio se refleja.
5. Borrar la reseña (icono de basurero) y confirmar que desaparece.

`cliente2@email.com` ya tiene una reseña publicada en "Espacio Fiesta" (reserva COMPLETED del
seed) — usala para probar edicion/borrado sin tener que armar la cadena completa de arriba.

### 2.5 Notificaciones
1. Abrir la campanita de notificaciones en el header — deberia mostrar el contador de no
   leidas y la lista (aprobaciones, pagos confirmados, recordatorios de reserva, etc.).
2. Marcar una como leida y confirmar que el contador baja.

---

## 3. Flujos de OWNER

Inicia sesion con `mario.quispe@email.com`, `rosa.choque@email.com` o `luis.condori@email.com`.
Todo lo de este bloque vive bajo `/dashboard`.

### 3.1 Publicar y gestionar un local
1. `/dashboard/venues/new` — crear un local nuevo (nombre, descripcion, capacidad, precio,
   ubicacion, tipos de espacio/uso, amenidades).
2. `/dashboard/venues/[id]/edit` — editar un local existente.
3. `/dashboard/venues/[id]/preview` — ver como se ve publicamente antes de publicar.
4. Revisar el checklist de completitud del perfil y publicar el local (`Publicar`) — un local
   nuevo no es visible en `/venues` hasta que se publica **y** un admin lo verifica (flujo 4.1).
5. Subir fotos del local ⚠️ — **falla en este entorno** por Cloudinary no configurado (igual
   que el comprobante de pago en 2.3); para seguir probando sin esa integracion, insertar una
   URL de imagen manualmente en la tabla `venue_media`.

### 3.2 Gestionar reservas y pagos entrantes
En `/dashboard/bookings`:
1. Ver solicitudes de reserva PENDIENTES de tu local, Aprobar o Rechazar (con motivo).
2. Ver pagos pendientes de confirmacion (comprobante subido por el cliente), Confirmar o
   Rechazar. Al confirmar, la reserva avanza automaticamente a SEÑA PAGADA o PAGADA segun el
   tipo de pago (ver nota tecnica al final del documento — esto se corrigio en esta sesion).

### 3.3 Marcar una reserva como completada (recien agregado)
En `/dashboard/bookings`, una reserva en estado **SEÑA PAGADA** o **PAGADA** ahora muestra el
boton **"Marcar como completada"**. Esto:
- Cambia el estado a COMPLETADA.
- Notifica al cliente pidiendole que deje una reseña.
- Habilita el boton "Dejar reseña" en el detalle de esa reserva para el cliente (flujo 2.4).

Este paso no existia antes en la interfaz — sin el, ninguna reserva llegaba nunca a COMPLETADA
y la funcionalidad de reseñas era imposible de usar de principio a fin. Se agrego en esta
sesion (ver seccion final del documento).

### 3.4 Calendario y bloqueos
En `/dashboard/calendar`:
1. Bloquear una fecha manualmente (mantenimiento, evento privado, etc.).
2. Confirmar que esa fecha ya no aparece disponible en la busqueda publica ni permite nuevas
   reservas.
3. Quitar el bloqueo y confirmar que la fecha vuelve a estar disponible.

### 3.5 Ganancias
`/dashboard/earnings` — resumen de ingresos totales, cantidad de pagos, y desglose por local
y mes. Usa un owner con pagos CONFIRMADOS en el seed (Mario o Rosa) para ver datos reales.

### 3.6 Responder reseñas
En el detalle publico de tu local (`/venues/[slug]`), bajo cada reseña sin respuesta todavia,
hay un boton "Responder". Escribir la respuesta y confirmar que aparece debajo de la reseña
del cliente y que el cliente recibe una notificacion.

### 3.7 Mi perfil
`/dashboard/profile` — editar nombre, telefono, etc.

---

## 4. Flujos de ADMIN

Inicia sesion con `admin@salonfacil.bo`. Todo vive bajo `/admin`.

### 4.1 Verificar locales
`/admin/venues` — cola de locales publicados por sus dueños que esperan verificacion.
1. Revisar un local pendiente, Verificar o Rechazar.
2. Confirmar que un local recien verificado aparece en la busqueda publica (`/venues`) y que
   uno rechazado no.

### 4.2 Gestion de usuarios
`/admin/users` — buscar por nombre/email, filtrar por rol/estado.
1. Suspender un usuario de prueba (nunca uno real) y confirmar que no puede iniciar sesion
   mientras esta suspendido.
2. Reactivarlo y confirmar que vuelve a poder iniciar sesion.

### 4.3 Analitica
`/admin/analytics` — tarjetas resumen (ingresos del mes, reservas del mes, usuarios nuevos,
locales activos) y graficos (ingresos en el tiempo, reservas por estado, usuarios nuevos,
top 5 locales por ingresos).

### 4.4 Catalogos
- `/admin/catalog/amenities` — amenidades disponibles para los locales (piscina, estacionamiento, etc.)
- `/admin/catalog/space-types` — tipos de espacio (salon cerrado, terraza, jardin, etc.)
- `/admin/catalog/use-types` — tipos de evento (boda, cumpleaños, corporativo, etc.)
- `/admin/catalog/seasonal-events` — feriados y temporadas con precios especiales

Para cada uno: crear un item nuevo, editarlo, y confirmar que aparece como opcion en el
formulario de creacion/edicion de un local (flujo 3.1).

---

## 5. Casos cruzados a probar (permisos y bordes)

Estos no son flujos de negocio sino chequeos de que cada rol solo puede hacer lo suyo:

1. **Un OWNER visita `/bookings`** (la pagina de "mis reservas" de un CLIENT) — debe
   redirigir automaticamente a `/dashboard/bookings`, no mostrar un error. *(Bug encontrado y
   corregido en esta sesion — antes mostraba "No se pudieron cargar tus reservas" con un
   boton de reintentar que nunca funcionaba.)*
2. **Un CLIENT intenta entrar a `/dashboard` o `/admin`** — debe redirigir a `/`.
3. **Un OWNER intenta editar/aprobar/rechazar una reserva o local de otro OWNER** (probar con
   dos cuentas owner distintas, ej. Mario intentando aprobar una reserva de un local de Rosa)
   — debe dar error de permiso (403), nunca dejarlo pasar.
4. **Cualquier usuario no autenticado visita `/bookings`, `/dashboard` o `/admin`** — debe
   mandar a `/login?next=<pagina-original>` y, despues de iniciar sesion, volver ahi mismo.

---

## Nota tecnica: cambios hechos durante esta sesion

Mientras se armaba esta guia se encontraron y corrigieron dos problemas que bloqueaban
flujos completos:

1. **`/bookings` no distinguia rol** ([frontend/src/app/bookings/layout.tsx](../../frontend/src/app/bookings/layout.tsx)) — permitia
   pasar a OWNER/ADMIN aunque la API subyacente es solo para CLIENT, mostrando un error
   generico sin salida. Ahora redirige a `/dashboard/bookings` para esos roles.

2. **Confirmar un pago nunca avanzaba el estado de la reserva** ([backend/src/modules/payment/application/services/payment.service.ts](../../backend/src/modules/payment/application/services/payment.service.ts))
   — `confirmPayment` marcaba el pago como COMPLETED pero la reserva se quedaba en APROBADA
   para siempre. Como `markAsCompleted` (necesario para dejar reseña) solo acepta reservas en
   SEÑA PAGADA o PAGADA, esto hacia que ninguna reserva pudiera completarse ni recibir una
   reseña nunca, sin importar cuantos pagos se confirmaran. Ahora la confirmacion avanza la
   reserva automaticamente segun el tipo de pago (seña → SEÑA PAGADA, completo/resto → PAGADA).

3. **No existia forma de marcar una reserva como completada** — el metodo `markAsCompleted`
   existia en el backend pero sin endpoint ni boton en la interfaz; nunca se llamaba desde
   ningun lado. Se agrego el endpoint `PUT /bookings/:id/complete` (y `PUT /bookings/:id/no-show`
   de paso, mismo patron) y el boton "Marcar como completada" en `/dashboard/bookings`
   ([frontend/src/components/dashboard/owner-booking-management.tsx](../../frontend/src/components/dashboard/owner-booking-management.tsx)).

Los tres se verificaron con la suite de tests (`npx jest` en `backend/`, 171 tests en verde)
y con una prueba end-to-end real contra la base de datos de desarrollo (reserva → pago →
confirmacion → completada → reseña), revirtiendo despues los datos de prueba creados.
