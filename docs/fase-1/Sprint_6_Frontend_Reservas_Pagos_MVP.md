# Sprint 6: Frontend MVP, Flujo de Reservas y Pago Manual

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos  
**Fase:** 1 - MVP Core  
**Sprint:** 6 de 6  
**Duracion estimada:** 5-7 dias  
**Stack:** Next.js 14 + NestJS + Prisma + TanStack Query + React Hook Form + Zod + Tailwind CSS + shadcn/ui + Sonner

---

## 1. Decision Arquitectonica

### 1.1 Veredicto

El siguiente paso debe ser **comenzar el frontend del MVP**, no seguir agregando backend de forma aislada.

Los documentos de `docs/brainstorm` ubican la semana/sprint 6 como:

- Booking Frontend: formulario de reserva y flujo completo.
- Payment MVP: comprobante de pago, confirmacion manual y estado de sena.
- Dashboard Owner: reservas entrantes y acciones operativas basicas.

El backend ya cubre el core de los Sprints 1-5:

- Auth con JWT, refresh tokens, roles y guards.
- Venues con CRUD, busqueda, filtros, fotos, precios y ownership.
- Booking con solicitud, aprobacion, rechazo, cancelacion, disponibilidad y calendario.
- Calendar blocks para prevenir doble reserva.
- Transicion inicial a `DEPOSIT_PAID`.

Por tanto, Sprint 6 debe enfocarse en convertir ese backend en una experiencia usable end-to-end.

### 1.2 Backend faltante antes de un MVP real

No falta un gran modulo backend antes de frontend, pero si falta una **capa minima de pagos manuales** para cerrar el flujo de negocio definido en los documentos:

- Cliente debe poder subir comprobante de sena.
- Owner debe poder ver comprobantes pendientes.
- Owner debe poder confirmar o rechazar el pago.
- Al confirmar una sena, la reserva debe pasar a `DEPOSIT_PAID`.
- El frontend debe mostrar estados de pago y reserva de forma coherente.

Esto no debe convertirse en una pasarela compleja en Sprint 6. El MVP recomendado es:

- QR bancario / transferencia / Tigo Money / efectivo registrado manualmente.
- Upload de comprobante a Cloudinary usando el modulo de upload existente.
- Confirmacion manual por el owner.

### 1.3 Lo que NO se debe hacer en Sprint 6

- No integrar Stripe todavia.
- No construir una app mobile nativa.
- No implementar contratos PDF automaticos.
- No implementar WhatsApp/Twilio aun, salvo dejar eventos o puntos de extension.
- No construir un panel admin completo.
- No hacer un rediseno visual grande antes de tener el flujo end-to-end.

---

## 2. Objetivo del Sprint

Construir el MVP usable de SalonFacil:

- Cliente puede buscar locales.
- Cliente puede ver detalle de local con fotos, servicios, precios y disponibilidad.
- Cliente puede iniciar sesion o registrarse.
- Cliente puede solicitar una reserva.
- Owner puede ver solicitudes entrantes.
- Owner puede aprobar o rechazar reservas.
- Cliente puede subir comprobante de sena.
- Owner puede confirmar la sena.
- Cliente y owner pueden ver el estado actualizado de la reserva.

**Al finalizar Sprint 6, el producto debe permitir probar el flujo completo: buscar local -> solicitar reserva -> aprobar -> subir comprobante -> confirmar sena.**

---

## 2.1 Estado de Implementacion

**Estado:** Implementado y validado en build.

Se implemento el flujo MVP end-to-end:

- Frontend publico: home de busqueda, listado de venues, detalle de venue, disponibilidad y formulario de reserva.
- Autenticacion UI: login, registro, persistencia de sesion y redireccion por rol.
- Cliente: mis reservas, detalle de reserva, cancelacion, listado de pagos y drawer para subir comprobante de sena.
- Owner: dashboard operativo, selector de salon, gestion de reservas, aprobacion/rechazo, pagos pendientes, confirmacion/rechazo de comprobantes y calendario con bloqueos.
- Pagos backend MVP: modulo `Payment`, upload de comprobantes, confirmacion manual por owner y transicion de reserva a `DEPOSIT_PAID`.
- UI states: loading skeletons, error states con retry, empty states, confirm dialogs, drawers, toasts con Sonner y validacion previa al submit.
- Arquitectura frontend: componentes pequenos por responsabilidad, `use client` solo en componentes interactivos, contratos TypeScript con interfaces/types y funciones arrow.

### Riesgos detectados y mitigacion

- **Riesgo:** Comprobantes PDF fallaban porque el upload existente estaba optimizado para imagenes.
  **Mitigacion:** Se agrego `CloudinaryService.uploadFile()` con `resource_type: auto` y el modulo de pagos lo usa para comprobantes.
- **Riesgo:** Formularios podian mostrar errores solo de forma global.
  **Mitigacion:** Se agregaron errores por input y submit deshabilitado hasta formulario valido.
- **Riesgo:** Componentes grandes y dificiles de mantener.
  **Mitigacion:** Las pantallas se dividieron en componentes de dominio (`bookings`, `dashboard`, `payments`, `venues`, `shared`) y ningun componente nuevo supera 300 lineas.
- **Riesgo:** Desajustes de tipos entre API y UI.
  **Mitigacion:** Se centralizaron contratos en `frontend/src/types/api.ts` y se valido con `next build`.

---

## 3. Alcance Funcional

### 3.1 Publico / Cliente sin sesion

| Feature | Descripcion | Prioridad |
|---|---|---|
| Home funcional | Primera pantalla orientada a busqueda, no landing generica | Alta |
| Busqueda de locales | Lista de venues usando `GET /api/v1/venues` | Alta |
| Filtros MVP | Ciudad, distrito, capacidad, fecha disponible | Alta |
| Card de local | Foto, nombre, distrito, capacidad, precio base, servicios destacados | Alta |
| Detalle de local | Galeria, descripcion, servicios, reglas, precios, calendario | Alta |
| Disponibilidad | Consultar `GET /venues/:venueId/bookings/availability` o `GET /bookings/availability` | Alta |
| CTA de reserva | Seleccionar fecha, horario, invitados y tipo de evento | Alta |

### 3.2 Cliente autenticado

| Feature | Descripcion | Prioridad |
|---|---|---|
| Login/register | Formularios contra `POST /auth/login` y `POST /auth/register` | Alta |
| Persistencia de sesion | Guardar access/refresh token con estrategia clara | Alta |
| Solicitar reserva | `POST /venues/:venueId/bookings` | Alta |
| Mis reservas | `GET /bookings/my-bookings` | Alta |
| Detalle de reserva | Estado, precio, sena, local, fecha, acciones disponibles | Alta |
| Cancelar reserva | `PUT /bookings/:id/cancel` | Media |
| Subir comprobante | Crear pago pendiente con comprobante | Alta |

### 3.3 Owner autenticado

| Feature | Descripcion | Prioridad |
|---|---|---|
| Dashboard basico | Resumen de locales y reservas | Alta |
| Mis locales | `GET /venues/my/venues` | Alta |
| Reservas por local | `GET /venues/:venueId/bookings` | Alta |
| Aprobar reserva | `PUT /bookings/:id/approve` | Alta |
| Rechazar reserva | `PUT /bookings/:id/reject` | Alta |
| Calendario mensual | `GET /venues/:venueId/calendar?month=YYYY-MM` | Alta |
| Bloquear fecha | `POST /venues/:venueId/calendar` | Media |
| Confirmar pago | Confirmar comprobante de sena y pasar booking a `DEPOSIT_PAID` | Alta |

---

## 4. Alcance Backend Minimo: Payment MVP

### 4.1 Modulo propuesto

Crear `modules/payment/` siguiendo Clean Architecture.

```
backend/src/modules/payment/
|-- domain/
|   |-- entities/
|   |   `-- payment.entity.ts
|   `-- repositories/
|       `-- payment.repository.interface.ts
|-- application/
|   |-- dto/
|   |   |-- create-payment.dto.ts
|   |   |-- upload-payment-proof.dto.ts
|   |   |-- confirm-payment.dto.ts
|   |   `-- payment-response.dto.ts
|   `-- services/
|       `-- payment.service.ts
|-- infrastructure/
|   `-- repositories/
|       `-- payment.repository.ts
`-- interface/
    |-- payment.controller.ts
    `-- payment.module.ts
```

### 4.2 Endpoints requeridos

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| `POST` | `/payments/bookings/:bookingId` | CLIENT | Crear pago pendiente de sena o saldo |
| `POST` | `/payments/:paymentId/proof` | CLIENT | Subir comprobante a Cloudinary |
| `GET` | `/payments/my` | CLIENT | Mis pagos |
| `GET` | `/payments/booking/:bookingId` | CLIENT/OWNER/ADMIN | Pagos de una reserva con permisos |
| `GET` | `/payments/owner/pending` | OWNER/ADMIN | Comprobantes pendientes de sus locales |
| `PUT` | `/payments/:paymentId/confirm` | OWNER/ADMIN | Confirmar pago |
| `PUT` | `/payments/:paymentId/reject` | OWNER/ADMIN | Rechazar pago con motivo |

### 4.3 Reglas de negocio de pagos

- Solo el cliente propietario de la reserva puede crear/subir comprobante.
- Solo owner del venue o admin puede confirmar/rechazar.
- No se puede pagar una reserva `CANCELLED_*`, `COMPLETED` o `NO_SHOW`.
- Para `PaymentType.DEPOSIT`, el monto esperado debe coincidir con `booking.depositAmount`.
- Al confirmar una sena:
  - `payment.status = COMPLETED`
  - `payment.confirmedAt = now`
  - `payment.confirmedByOwnerId = currentUser.id`
  - `booking.status = DEPOSIT_PAID`
  - `booking.depositPaid = true`
- Al rechazar:
  - `payment.status = FAILED`
  - guardar `notes` con el motivo.
  - no cambiar el estado de booking.

### 4.4 DTOs backend

```typescript
export class CreatePaymentDto {
  paymentType: 'DEPOSIT' | 'FULL' | 'REMAINING';
  method: 'QR_BANK' | 'BANK_TRANSFER' | 'TIGO_MONEY' | 'CASH';
  amount: number;
  transactionReference?: string;
  notes?: string;
}
```

```typescript
export class ConfirmPaymentDto {
  notes?: string;
}
```

```typescript
export class RejectPaymentDto {
  reason: string;
}
```

### 4.5 Tests backend requeridos

- Cliente crea pago para su reserva aprobada.
- Cliente no puede crear pago para reserva de otro cliente.
- Owner puede listar pagos pendientes de sus locales.
- Owner de otro local no puede confirmar pago.
- Confirmar deposito actualiza payment y booking.
- Rechazar pago no actualiza booking.
- No se permite pagar booking cancelado.

---

## 5. Arquitectura Frontend

### 5.1 Estructura recomendada

```
frontend/src/
|-- app/
|   |-- (public)/
|   |   |-- page.tsx
|   |   |-- venues/
|   |   |   `-- page.tsx
|   |   `-- venues/[slug]/
|   |       `-- page.tsx
|   |-- (auth)/
|   |   |-- login/page.tsx
|   |   `-- register/page.tsx
|   |-- (client)/
|   |   `-- bookings/
|   |       |-- page.tsx
|   |       `-- [id]/page.tsx
|   |-- (owner)/
|   |   `-- dashboard/
|   |       |-- page.tsx
|   |       |-- venues/page.tsx
|   |       |-- bookings/page.tsx
|   |       `-- calendar/page.tsx
|   |-- layout.tsx
|   `-- globals.css
|-- components/
|   |-- layout/
|   |-- venues/
|   |-- booking/
|   |-- payments/
|   |-- dashboard/
|   `-- ui/
|-- hooks/
|-- lib/
|   |-- api/
|   |-- auth/
|   |-- formatters.ts
|   `-- validators/
|-- stores/
`-- types/
```

### 5.2 API client

Crear una capa typed API en `frontend/src/lib/api/`:

```
lib/api/
|-- client.ts
|-- auth.api.ts
|-- venues.api.ts
|-- bookings.api.ts
|-- calendar.api.ts
`-- payments.api.ts
```

Responsabilidades:

- Base URL desde `NEXT_PUBLIC_API_URL`.
- Adjuntar `Authorization: Bearer <accessToken>`.
- Manejar `401` con refresh token si existe.
- Normalizar errores para formularios/toasts.
- Evitar fetches duplicados desde componentes.

### 5.3 Estado de sesion

Crear `stores/auth.store.ts` con Zustand:

- `user`
- `accessToken`
- `refreshToken`
- `login()`
- `logout()`
- `setSession()`
- `isAuthenticated`
- `role`

Para MVP se acepta persistencia en storage del navegador, pero documentar deuda tecnica:

- En produccion ideal, migrar tokens a cookies httpOnly.
- Reducir exposicion XSS con CSP y sanitizacion.

### 5.4 React Query

Crear `app/providers.tsx`:

- `QueryClientProvider`
- configuracion de retry conservadora.
- stale time para venues.
- invalidate queries despues de crear/aprobar/cancelar reserva.
- manejo centralizado de errores para queries/mutations.
- estados derivados: `isLoading`, `isFetching`, `isError`, `isPending`.

### 5.5 Librerias UI obligatorias

Usar librerias ampliamente adoptadas y ya alineadas con el stack del proyecto:

| Necesidad | Libreria | Uso obligatorio |
|---|---|---|
| Componentes accesibles | `shadcn/ui` sobre Radix UI | Button, Input, Label, Dialog, Sheet, Skeleton, Badge, Card |
| Iconos | `lucide-react` | Iconos en botones, estados y acciones |
| Formularios | `react-hook-form` | Estado, validacion, dirty/touched, submit controlado |
| Validacion | `zod` + `@hookform/resolvers/zod` | Schemas por formulario y errores por campo |
| Server state | `@tanstack/react-query` | Queries, mutations, cache, invalidaciones |
| Estado cliente | `zustand` | Auth/session y estado UI global minimo |
| Notificaciones | `sonner` | Toasts para POST, PUT, PATCH, DELETE y errores globales |
| Estilos | `tailwindcss` | Layout, responsive, estados visuales, spacing |

### 5.6 Estandares obligatorios de UI Engineering

Estos puntos son parte del Definition of Done del sprint:

- Ningun componente debe superar 300 lineas salvo excepcion justificada.
- Ningun archivo de UI debe acercarse a 1000 lineas. Si un archivo supera 400 lineas, debe dividirse antes de continuar.
- Cada componente debe tener una sola responsabilidad clara.
- Separar composicion de pantalla, logica de datos, formularios, validadores, tipos y componentes visuales.
- No mezclar llamadas API, schemas Zod, transformaciones complejas y JSX grande en el mismo componente.
- Extraer hooks para logica de datos o acciones: `useVenues`, `useBookingForm`, `useOwnerBookings`, `usePaymentActions`.
- Extraer componentes presentacionales pequenos para cards, rows, badges, toolbars, empty states y skeletons.
- Toda llamada `GET` debe tener estado `loading`, `error`, `empty` y `success`.
- Todo componente que depende de backend debe tener skeleton equivalente al layout final.
- Todo `POST`, `PUT`, `PATCH` o `DELETE` debe mostrar toast:
  - `loading` mientras la mutacion esta en curso.
  - `success` cuando termina correctamente.
  - `error` cuando falla.
  - `warning` cuando la accion requiere atencion pero no bloquea el flujo.
  - `info` para confirmaciones no criticas o cambios de estado informativos.
- Todo formulario debe validar antes del submit con Zod.
- Cada input debe mostrar error local bajo el campo.
- El boton `Guardar`, `Crear`, `Enviar` o `Confirmar` debe estar deshabilitado hasta que el formulario sea valido.
- Durante submit, el boton debe quedar deshabilitado y mostrar estado de progreso.
- Los errores de backend deben mapearse a:
  - error de campo si el backend identifica una propiedad.
  - error global del formulario si es una regla de negocio.
  - toast si es fallo de red, permisos o error inesperado.
- Acciones destructivas o irreversibles deben usar modal de confirmacion.
- Formularios de crear/editar en dashboard deben abrir en drawer lateral, no navegar de pagina si el contexto se puede mantener.
- Vistas rapidas de informacion deben usar modal/dialog, no rutas nuevas innecesarias.
- La UI debe ser responsive desde 360px hasta desktop amplio.
- No debe haber texto que desborde botones, cards, inputs o tablas.
- Todo layout debe tener spacing consistente, jerarquia visual clara y estados accesibles.
- No se aceptan pantallas que solo muestran texto plano de error o loading.

### 5.7 Server Components y Client Components

Next.js App Router debe usarse con una separacion clara:

- Usar Server Components por defecto para pages/layouts que solo componen UI o hacen fetch inicial publico.
- Usar `"use client"` solo cuando el componente necesita:
  - hooks de React como `useState`, `useEffect`, `useMemo` interactivo.
  - React Hook Form.
  - Zustand.
  - TanStack Query hooks.
  - eventos del navegador.
  - Dialog/Sheet controlados por estado local.
  - toasts.
- No poner `"use client"` en layouts o pages completas si solo una parte necesita interactividad.
- Crear componentes isla para interactividad:
  - `BookingFormClient`
  - `VenueFiltersClient`
  - `PaymentProofDrawer`
  - `OwnerBookingActions`
  - `CalendarControls`
- Mantener componentes server como contenedores:
  - cargan datos iniciales si conviene.
  - renderizan estructura general.
  - pasan props serializables a componentes client.
- No pasar funciones, clases, Dates sin serializar ni instancias complejas de server a client.
- Convertir fechas a string ISO o `YYYY-MM-DD` antes de pasar a componentes client.

### 5.8 Patrones de componentes asincronos

Cada componente conectado al backend debe implementar esta estructura logica:

```typescript
if (query.isLoading) return <ComponentSkeleton />;
if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
if (!query.data || isEmpty(query.data)) return <EmptyState />;
return <SuccessState data={query.data} />;
```

Componentes base requeridos:

- `PageLoader`
- `PageErrorState`
- `EmptyState`
- `InlineError`
- `FormErrorSummary`
- `SubmitButton`
- `ConfirmDialog`
- `AppDrawer`
- `DataTableSkeleton`
- `VenueCardSkeleton`
- `BookingCardSkeleton`
- `CalendarSkeleton`

### 5.9 Separacion de responsabilidades frontend

Patron por feature:

```
features/booking/
|-- components/
|   |-- booking-form.tsx
|   |-- booking-summary.tsx
|   |-- booking-status-badge.tsx
|   `-- booking-card-skeleton.tsx
|-- hooks/
|   |-- use-booking-form.ts
|   `-- use-booking-actions.ts
|-- schemas/
|   `-- booking.schema.ts
|-- types.ts
`-- utils.ts
```

Reglas:

- `page.tsx` debe ser delgado: layout, parametros, composicion y metadata.
- Los componentes visuales no deben conocer detalles de Axios/fetch.
- Los hooks de feature manejan queries/mutations e invalidaciones.
- Los schemas Zod viven fuera del componente.
- Los tipos viven en `types/` o en carpeta de feature.
- Los formatters viven en `lib/formatters.ts`.
- Los mappers de API viven junto al API client o feature, no dentro del JSX.
- Los componentes shared deben ser genericos; si tienen reglas de negocio, pertenecen a la feature.

### 5.10 Limites de complejidad

Limites obligatorios:

| Elemento | Limite | Accion si se supera |
|---|---:|---|
| Componente React | 300 lineas | dividir en subcomponentes |
| Page component | 180 lineas | extraer sections/components |
| Hook custom | 200 lineas | separar queries/actions/helpers |
| Schema/form file | 200 lineas | separar por formulario |
| Archivo de tipos | 300 lineas | separar por dominio |
| Funcion | 50 lineas | extraer helpers |
| Props por componente | 8 props | agrupar en objeto tipado si tiene sentido |

Un archivo de 1000 lineas queda prohibido para este sprint. La unica excepcion seria un archivo generado automaticamente, y debe estar marcado como generado.

### 5.11 Convenciones TypeScript

Reglas obligatorias:

- Usar arrow functions para componentes, helpers, callbacks y handlers en frontend.
- Evitar `function ComponentName()` en componentes nuevos; preferir:

```typescript
interface VenueCardProps {
  venue: Venue;
  onSelect?: (venue: Venue) => void;
}

export const VenueCard = ({ venue, onSelect }: VenueCardProps) => {
  return <article>{venue.name}</article>;
};
```

- Definir `interface` para props de componentes.
- Definir `interface` o `type` para toda respuesta recibida del backend.
- Definir `interface` o `type` para todo payload enviado al backend.
- No usar `any` en frontend salvo excepcion justificada y comentada.
- No acceder a datos de backend sin contrato tipado.
- No duplicar tipos manualmente si ya existe un tipo compartido en `types/` o feature.
- Crear tipos separados para:
  - entidades de dominio frontend: `Venue`, `Booking`, `Payment`, `User`.
  - respuestas paginadas: `PaginatedResponse<T>`.
  - payloads de creacion/update: `CreateBookingPayload`, `CreatePaymentPayload`.
  - errores API normalizados: `ApiError`, `FieldErrorMap`.

Ejemplo:

```typescript
export interface ApiError {
  statusCode: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBookingPayload {
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequests?: string;
}
```

Todos los metodos del API client deben declarar input y output:

```typescript
export const createBooking = async (
  venueId: string,
  payload: CreateBookingPayload,
): Promise<CreateBookingResponse> => {
  return apiClient.post(`/venues/${venueId}/bookings`, payload);
};
```

---

## 6. Pantallas y Componentes

### 6.1 Home publica

Objetivo: busqueda inmediata, no hero generico.

Debe incluir:

- Buscador por texto/distrito.
- Selector de fecha.
- Selector de cantidad de invitados.
- CTA a resultados.
- Seccion compacta de locales destacados o recientes.

Ruta:

- `/`

APIs:

- `GET /api/v1/venues?limit=6`

### 6.2 Busqueda de locales

Ruta:

- `/venues`

Debe incluir:

- Lista responsive de venues.
- Filtros laterales en desktop, sheet en mobile.
- Estados loading, empty, error y success.
- Skeletons de cards durante carga.
- Error state con boton "Reintentar".
- Paginacion.
- Orden basico por fecha de creacion o capacidad.

APIs:

- `GET /api/v1/venues`

Query params MVP:

- `city`
- `district`
- `query`
- `minCapacity`
- `maxCapacity`
- `date`
- `page`
- `limit`

### 6.3 Detalle de local

Ruta:

- `/venues/[slug]`

Debe incluir:

- Galeria real de fotos.
- Nombre, distrito, ciudad, direccion resumida.
- Capacidad.
- Servicios incluidos y extras.
- Reglas y politica de cancelacion.
- Precios visibles por tipo.
- Calendario de disponibilidad.
- Panel de solicitud de reserva.

APIs:

- `GET /api/v1/venues/:slug`
- `GET /api/v1/venues/:venueId/calendar?month=YYYY-MM`
- `GET /api/v1/venues/:venueId/bookings/availability?date=YYYY-MM-DD`
- `POST /api/v1/venues/:venueId/bookings`

### 6.4 Reserva

Puede vivir como componente dentro del detalle del local.

Campos:

- Tipo de evento.
- Fecha.
- Hora inicio.
- Hora fin.
- Numero de invitados.
- Solicitudes especiales.

Validaciones:

- Fecha requerida.
- Fecha no pasada.
- Hora inicio menor a hora fin.
- Invitados entre 1 y capacidad maxima del venue.
- Tipo de evento minimo 2 caracteres.
- Errores visibles bajo cada input.
- Boton de submit deshabilitado si `formState.isValid === false`.
- Boton de submit deshabilitado y con spinner si `formState.isSubmitting === true`.

Estados:

- Disponible.
- No disponible.
- Calculando disponibilidad.
- Reserva pendiente creada.
- Error de conflicto.
- Toast `success` al crear reserva.
- Toast `error` si backend devuelve `409`, `400`, `401` o error de red.
- Dialog de confirmacion antes de enviar la solicitud final con resumen de precio, fecha y sena.

### 6.5 Mis reservas cliente

Ruta:

- `/bookings`

Debe incluir:

- Lista de reservas.
- Skeleton de lista mientras carga.
- Empty state si no hay reservas.
- Error state con retry si falla `GET /bookings/my-bookings`.
- Estados visuales: `PENDING`, `APPROVED`, `DEPOSIT_PAID`, `CANCELLED_BY_CLIENT`, `CANCELLED_BY_OWNER`, `COMPLETED`.
- Acciones segun estado:
  - `PENDING`: cancelar.
  - `APPROVED`: subir comprobante.
  - `DEPOSIT_PAID`: ver confirmacion.
- Modal de confirmacion para cancelar.
- Toast success/error al cancelar.

APIs:

- `GET /api/v1/bookings/my-bookings`
- `PUT /api/v1/bookings/:id/cancel`

### 6.6 Detalle de reserva cliente

Ruta:

- `/bookings/[id]`

Debe incluir:

- Datos de local.
- Fecha/hora.
- Precio total.
- Sena requerida.
- Estado.
- Historial de pagos.
- Subida de comprobante si aplica.
- Drawer para subir comprobante sin perder contexto del detalle.
- Validacion de archivo antes de enviar: tipo permitido, tamanio maximo, requerido.
- Preview rapida del comprobante antes de confirmar.
- Toast loading/success/error para crear pago y subir comprobante.

APIs:

- `GET /api/v1/bookings/:id`
- `GET /api/v1/payments/booking/:bookingId`
- `POST /api/v1/payments/bookings/:bookingId`
- `POST /api/v1/payments/:paymentId/proof`

### 6.7 Dashboard owner

Ruta:

- `/dashboard`

Debe incluir:

- KPIs basicos:
  - reservas pendientes.
  - reservas aprobadas.
  - pagos pendientes.
  - proximos eventos.
- Accesos rapidos a locales, reservas y calendario.

### 6.8 Reservas owner

Ruta:

- `/dashboard/bookings`

Debe incluir:

- Selector de local.
- Tabla/lista de reservas.
- Skeleton de tabla/lista mientras carga.
- Empty state por local sin reservas.
- Error state con retry.
- Filtros por estado.
- Aprobar/rechazar.
- Ver comprobante pendiente.
- Confirmar/rechazar pago.
- Modal de confirmacion para aprobar, rechazar, confirmar pago y rechazar pago.
- Modal de vista rapida para ver detalle de reserva y comprobante.
- Drawer para filtros avanzados en mobile.
- Toast loading/success/error/warning en cada mutacion.

APIs:

- `GET /api/v1/venues/my/venues`
- `GET /api/v1/venues/:venueId/bookings`
- `PUT /api/v1/bookings/:id/approve`
- `PUT /api/v1/bookings/:id/reject`
- `GET /api/v1/payments/owner/pending`
- `PUT /api/v1/payments/:paymentId/confirm`
- `PUT /api/v1/payments/:paymentId/reject`

### 6.9 Calendario owner

Ruta:

- `/dashboard/calendar`

Debe incluir:

- Selector de local.
- Vista mensual simple.
- Estados por dia: libre, pendiente, aprobado, sena pagada, bloqueado.
- Crear bloqueo manual.
- Skeleton del calendario mientras carga.
- Drawer para crear bloqueo manual.
- Modal para ver detalle rapido del dia.
- Toast success/error al crear o eliminar bloqueo.

APIs:

- `GET /api/v1/venues/:venueId/calendar?month=YYYY-MM`
- `POST /api/v1/venues/:venueId/calendar`
- `DELETE /api/v1/venues/:venueId/calendar/:blockId`

---

## 7. Diseno UX

### 7.1 Principios

- Mobile-first: muchos usuarios usaran celulares con datos limitados.
- Interfaz directa: el usuario debe poder buscar y reservar sin leer instrucciones largas.
- Estados claros: una reserva pendiente no debe parecer confirmada.
- Confianza: mostrar precio, sena, servicios incluidos y reglas antes de reservar.
- Owner dashboard utilitario: denso, claro, operativo, sin estetica de landing.
- Cada pantalla debe tener una tarea principal clara.
- La informacion critica debe ser escaneable: precio, disponibilidad, estado y siguiente accion.
- No usar textos explicativos largos dentro de la UI para compensar interacciones confusas.
- Mantener consistencia entre public, client y owner: mismos badges, mismos estados, mismas acciones.

### 7.2 Componentes base a crear

| Componente | Ruta sugerida | Uso |
|---|---|---|
| `AppShell` | `components/layout/app-shell.tsx` | Layout publico |
| `DashboardShell` | `components/layout/dashboard-shell.tsx` | Layout owner |
| `MobileNav` | `components/layout/mobile-nav.tsx` | Navegacion mobile |
| `PageHeader` | `components/layout/page-header.tsx` | Encabezados consistentes |
| `VenueCard` | `components/venues/venue-card.tsx` | Resultados |
| `VenueCardSkeleton` | `components/venues/venue-card-skeleton.tsx` | Loading resultados |
| `VenueFilters` | `components/venues/venue-filters.tsx` | Filtros |
| `VenueGallery` | `components/venues/venue-gallery.tsx` | Detalle |
| `VenueServices` | `components/venues/venue-services.tsx` | Servicios |
| `AvailabilityCalendar` | `components/booking/availability-calendar.tsx` | Calendario |
| `CalendarSkeleton` | `components/booking/calendar-skeleton.tsx` | Loading calendario |
| `BookingForm` | `components/booking/booking-form.tsx` | Solicitud |
| `BookingStatusBadge` | `components/booking/booking-status-badge.tsx` | Estados |
| `BookingCardSkeleton` | `components/booking/booking-card-skeleton.tsx` | Loading reservas |
| `PaymentProofUploader` | `components/payments/payment-proof-uploader.tsx` | Comprobante |
| `OwnerBookingTable` | `components/dashboard/owner-booking-table.tsx` | Gestion owner |
| `ConfirmDialog` | `components/shared/confirm-dialog.tsx` | Confirmaciones |
| `EmptyState` | `components/shared/empty-state.tsx` | Sin datos |
| `ErrorState` | `components/shared/error-state.tsx` | Error con retry |
| `SubmitButton` | `components/shared/submit-button.tsx` | Boton con valid/loading |
| `AppDrawer` | `components/shared/app-drawer.tsx` | Crear/editar/contexto |

### 7.3 Paleta y estilo

Recomendacion:

- Base: blanco, gris neutro, texto oscuro.
- Acento principal: verde/emerald sobrio para disponibilidad y confirmacion.
- Acento secundario: amber para pendiente y advertencias.
- Rojo solo para cancelaciones/errores.
- Evitar UI dominada por morado, azul oscuro o beige.
- Cards solo para elementos repetidos, no para envolver secciones completas.
- Border radius maximo recomendado: 8px salvo componentes existentes de shadcn.
- Sombras sutiles solo donde ayuden a separar capas; evitar apariencia de landing decorativa en dashboard.
- Usar `lucide-react` para acciones: buscar, filtrar, calendario, subir, aprobar, rechazar, cancelar, editar.
- Botones icon-only deben tener texto accesible o tooltip.
- No usar gradientes decorativos como base de interfaz.
- Usar Tailwind con clases consistentes; evitar CSS custom salvo variables globales o casos justificados.

### 7.4 Layout responsive

Breakpoints objetivo:

- `360px`: telefono pequeno.
- `390px-430px`: telefono comun.
- `768px`: tablet.
- `1024px`: laptop.
- `1280px+`: desktop.

Reglas:

- Public search:
  - mobile: filtros en `Sheet`, lista en una columna.
  - tablet: filtros arriba o drawer, lista en dos columnas si hay espacio.
  - desktop: filtros laterales y grid de cards.
- Venue detail:
  - mobile: galeria, datos y booking form en una sola columna.
  - desktop: contenido principal + panel sticky de reserva.
- Dashboard:
  - mobile: cards/listas, no tablas horizontales obligatorias.
  - desktop: tablas densas con columnas visibles.
  - tablas grandes deben tener alternativa mobile basada en cards.
- Formularios:
  - mobile: una columna.
  - desktop: dos columnas solo si mejora lectura.
- Drawers:
  - mobile: bottom sheet o full-width sheet.
  - desktop: side drawer derecho.
- Modales:
  - ancho maximo controlado.
  - contenido scrollable si excede viewport.

### 7.5 Formularios y validacion UI

Todos los formularios deben usar:

- `react-hook-form`
- `zod`
- `zodResolver`
- `mode: 'onChange'` para habilitar/deshabilitar submit segun validez.
- `reValidateMode: 'onChange'`.

Patron obligatorio:

```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  mode: 'onChange',
  reValidateMode: 'onChange',
});

const canSubmit = form.formState.isValid && !form.formState.isSubmitting;
```

Reglas:

- Cada campo debe tener label visible.
- Cada campo debe mostrar error debajo del input.
- Errores de negocio deben aparecer en `FormErrorSummary`.
- Submit disabled si el formulario no es valido.
- Submit disabled durante mutation.
- Inputs deben preservar valores si el backend responde error.
- Formularios en drawer deben pedir confirmacion si hay cambios sin guardar.

### 7.6 Notificaciones

Usar `sonner` para mutaciones:

```typescript
toast.promise(mutation.mutateAsync(payload), {
  loading: 'Guardando cambios...',
  success: 'Cambios guardados',
  error: 'No se pudo guardar',
});
```

Politica:

- `success`: creacion, actualizacion, aprobacion, confirmacion completada.
- `error`: fallo de red, 4xx/5xx, validacion backend no mapeable.
- `warning`: accion parcial, conflicto de disponibilidad, comprobante rechazado.
- `info`: sesion expirada, datos actualizados, filtros aplicados si aporta claridad.

No usar toast para reemplazar errores por campo. Los errores por campo van en el formulario.

### 7.7 Loading, skeletons y estados vacios

Cada pantalla debe definir:

- skeleton inicial.
- loading inline para refetch.
- empty state con siguiente accion.
- error state con retry.

Ejemplos:

- `/venues`: `VenueCardSkeleton` en grid.
- `/venues/[slug]`: skeleton de galeria + bloque de texto + panel de reserva.
- `/bookings`: `BookingCardSkeleton`.
- `/dashboard/bookings`: `DataTableSkeleton` en desktop y card skeleton en mobile.
- `/dashboard/calendar`: `CalendarSkeleton`.

Los skeletons deben tener dimensiones estables para evitar layout shift.

### 7.8 Modales y drawers

Usar `Dialog` para:

- confirmacion de cancelar reserva.
- confirmacion de aprobar/rechazar.
- confirmacion de pago.
- ver comprobante en grande.
- vista rapida de reserva.

Usar `Sheet` / drawer para:

- filtros mobile.
- crear/editar bloqueo de calendario.
- subir comprobante.
- crear/editar venue en dashboard cuando aplique.
- filtros avanzados owner.

Reglas:

- Dialog para decisiones puntuales.
- Drawer para formularios o tareas contextuales.
- Cerrar automaticamente solo si la mutacion fue exitosa.
- Mantener abierto si hay error para que el usuario corrija.

---

## 8. Contratos de Datos Frontend

### 8.1 Venue

```typescript
export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  address: string;
  district: string;
  city: string;
  capacityMin: number;
  capacityMax: number;
  photos: string[];
  rules: string | null;
  cancellationPolicy: string | null;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  isVerified: boolean;
  services?: VenueService[];
  prices?: VenuePrice[];
}
```

### 8.2 Booking

```typescript
export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DEPOSIT_PAID'
  | 'FULLY_PAID'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_OWNER'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface Booking {
  id: string;
  venueId: string;
  clientId: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: BookingStatus;
  specialRequests: string | null;
  venue?: Venue;
}
```

### 8.3 Payment

```typescript
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
export type PaymentType = 'DEPOSIT' | 'FULL' | 'REMAINING';
export type PaymentMethod = 'QR_BANK' | 'BANK_TRANSFER' | 'TIGO_MONEY' | 'CARD' | 'CASH';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  comprobanteUrl: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}
```

---

## 9. Seguridad

### 9.1 Frontend

- No mostrar acciones si el rol no corresponde.
- Aun asi, confiar en backend para autorizacion real.
- No renderizar HTML enviado por usuarios.
- Validar todos los formularios con Zod.
- Manejar `401` cerrando sesion o refrescando token.
- No incluir secrets en variables `NEXT_PUBLIC_*`.

### 9.2 Backend Payment

- Confirmar ownership de venue antes de confirmar pagos.
- Verificar que el payment pertenece a una booking del owner.
- Validar tipos MIME y tamanio para comprobantes.
- Guardar notas de rechazo para auditoria minima.
- No permitir hard delete de pagos.

---

## 10. Testing

### 10.1 Backend

Comandos:

```bash
cd backend
npm run build
npm test -- --runTestsByPath tests/unit/booking/booking.service.spec.ts tests/unit/booking/price-calculator.service.spec.ts
npm test -- --runTestsByPath tests/unit/payment/payment.service.spec.ts
```

Tests nuevos:

- `tests/unit/payment/payment.service.spec.ts`
- `tests/unit/payment/payment.repository.spec.ts` si se mockea Prisma.

### 10.2 Frontend

Comandos:

```bash
cd frontend
npm run build
npm test
```

Tests minimos:

- `VenueCard` renderiza nombre, precio, distrito y link.
- `VenueCardSkeleton` mantiene dimensiones esperadas.
- `BookingForm` valida fecha, horario e invitados.
- `BookingForm` deshabilita submit cuando es invalido.
- `BookingForm` muestra errores por campo antes de enviar.
- `BookingStatusBadge` mapea estados correctamente.
- `PaymentProofUploader` valida archivo requerido.
- `PaymentProofUploader` rechaza tipo/tamanio invalido antes de llamar API.
- `auth.store` guarda y limpia sesion.
- `SubmitButton` muestra loading y respeta disabled.
- `ErrorState` ejecuta retry.
- `ConfirmDialog` llama callback solo al confirmar.

### 10.3 QA visual y responsive

Se debe probar manualmente en estos viewports:

- 360 x 740
- 390 x 844
- 768 x 1024
- 1024 x 768
- 1280 x 800
- 1440 x 900

Checklist visual:

- No hay overflow horizontal.
- Botones no rompen texto.
- Cards no cambian de altura de forma inesperada al cargar datos.
- Skeleton ocupa dimensiones similares al contenido final.
- Drawers son usables en mobile y desktop.
- Modales no exceden el viewport.
- Tablas owner tienen alternativa mobile.
- Formularios son legibles en una columna mobile.
- Toasts no tapan acciones criticas.
- Estados de reserva/pago usan colores consistentes.

### 10.4 E2E manual obligatorio

Antes de cerrar Sprint 6:

1. Registrar usuario CLIENT.
2. Registrar usuario OWNER.
3. Como owner, verificar que existe al menos un local activo.
4. Como cliente, buscar local.
5. Abrir detalle.
6. Seleccionar fecha disponible.
7. Solicitar reserva.
8. Como owner, aprobar reserva.
9. Como cliente, subir comprobante de sena.
10. Como owner, confirmar pago.
11. Ver que reserva queda `DEPOSIT_PAID`.

---

## 11. Criterios de Aceptacion

| # | Criterio | Como verificar |
|---|---|---|
| CA1 | Home muestra busqueda real | `/` permite buscar por texto/fecha/capacidad |
| CA2 | Listado de venues consume backend | `/venues` muestra datos de `GET /venues` |
| CA3 | Filtros funcionan | cambiar filtros actualiza resultados |
| CA4 | Detalle de venue carga por slug | `/venues/:slug` muestra venue real |
| CA5 | Calendario muestra disponibilidad | detalle muestra dias bloqueados/reservados |
| CA6 | Cliente puede registrarse/login | formularios consumen `/auth/register` y `/auth/login` |
| CA7 | Cliente puede solicitar reserva | `POST /venues/:venueId/bookings` crea `PENDING` |
| CA8 | Owner puede aprobar/rechazar | dashboard ejecuta endpoints de booking |
| CA9 | Cliente puede subir comprobante | payment queda `PENDING` con `comprobanteUrl` |
| CA10 | Owner puede confirmar pago | payment `COMPLETED`, booking `DEPOSIT_PAID` |
| CA11 | Mis reservas funciona | cliente ve reservas reales |
| CA12 | Dashboard owner funciona | owner ve reservas por sus locales |
| CA13 | Build backend pasa | `npm run build` en backend |
| CA14 | Build frontend pasa | `npm run build` en frontend |
| CA15 | Tests criticos pasan | unit tests backend/frontend del sprint pasan |
| CA16 | Todas las queries tienen skeleton/error/empty | revisar `/venues`, detalle, bookings, dashboard y calendar |
| CA17 | Todas las mutaciones tienen toast | crear reserva, cancelar, aprobar, rechazar, pago, bloqueo |
| CA18 | Formularios bloquean submit invalido | boton disabled hasta `formState.isValid` |
| CA19 | Errores por campo se muestran en UI | inputs muestran mensajes bajo el campo |
| CA20 | Drawers se usan para crear/editar contextual | filtros mobile, comprobante, bloqueo |
| CA21 | Modales se usan para confirmaciones | cancelar, aprobar, rechazar, confirmar pago |
| CA22 | Responsive completo | sin overflow ni texto roto desde 360px hasta desktop |
| CA23 | UI profesional con Tailwind/shadcn | componentes consistentes, accesibles y sin estilos improvisados |
| CA24 | Componentes respetan responsabilidad unica | pages delgadas, hooks separados, schemas fuera del JSX |
| CA25 | No existen componentes gigantes | ningun archivo UI supera 400 lineas; ninguno se acerca a 1000 |
| CA26 | `"use client"` se usa solo donde corresponde | componentes interactivos son islas client, pages/layouts server por defecto |
| CA27 | API y UI estan tipadas | interfaces/types para responses, payloads, props y errores |
| CA28 | Frontend usa arrow functions | componentes, hooks, handlers y helpers nuevos siguen la convencion |

---

## 12. Checklist de Implementacion

### Backend Payment

- [ ] Crear `PaymentEntity`
- [ ] Crear `IPaymentRepository`
- [ ] Crear `PaymentRepository`
- [ ] Crear DTOs de payment
- [ ] Crear `PaymentService`
- [ ] Crear `PaymentController`
- [ ] Registrar `PaymentModule` en `AppModule`
- [ ] Integrar Cloudinary para comprobantes
- [ ] Confirmar deposito actualiza booking a `DEPOSIT_PAID`
- [ ] Tests unitarios de payment

### Frontend Base

- [ ] Crear `providers.tsx` con React Query
- [ ] Crear API client typed
- [ ] Crear auth store con Zustand
- [ ] Crear formatters de moneda, fecha y hora
- [ ] Crear tipos compartidos frontend
- [ ] Crear validators Zod
- [ ] Crear layout publico
- [ ] Crear layout dashboard
- [ ] Crear `PageHeader`
- [ ] Crear `EmptyState`
- [ ] Crear `ErrorState`
- [ ] Crear `InlineError`
- [ ] Crear `FormErrorSummary`
- [ ] Crear `SubmitButton`
- [ ] Crear `ConfirmDialog`
- [ ] Crear `AppDrawer`
- [ ] Configurar `Toaster` global con Sonner
- [ ] Definir convencion de toast para mutations
- [ ] Definir convencion de skeletons por componente backend
- [ ] Definir estructura por feature (`components`, `hooks`, `schemas`, `types`, `utils`)
- [ ] Definir convencion de Server Components por defecto
- [ ] Definir convencion de `"use client"` solo para componentes interactivos
- [ ] Definir convencion de arrow functions para componentes y helpers frontend
- [ ] Crear interfaces/types para respuestas backend
- [ ] Crear interfaces/types para payloads enviados al backend
- [ ] Crear interfaces para props de componentes
- [ ] Crear tipo `ApiError` y `FieldErrorMap`
- [ ] Crear tipo generico `PaginatedResponse<T>`
- [ ] Verificar que `page.tsx` no contiene formularios grandes ni logica de mutation directa
- [ ] Verificar que schemas Zod no viven dentro del JSX
- [ ] Verificar que llamadas API no viven dentro de componentes presentacionales
- [ ] Verificar que no se usa `any` en frontend sin justificacion

### Frontend Publico

- [ ] Home de busqueda
- [ ] Pagina `/venues`
- [ ] `VenueCard`
- [ ] `VenueCardSkeleton`
- [ ] `VenueFilters`
- [ ] Estados loading/empty/error
- [ ] Pagina `/venues/[slug]`
- [ ] `VenueGallery`
- [ ] `VenueServices`
- [ ] `AvailabilityCalendar`
- [ ] `CalendarSkeleton`
- [ ] `BookingForm`
- [ ] Booking form con `react-hook-form`, `zod`, errores por input y submit disabled si invalido
- [ ] Dialog de confirmacion antes de crear reserva
- [ ] Toast para crear reserva

### Frontend Auth

- [ ] Login
- [ ] Register
- [ ] Logout
- [ ] Guard de rutas cliente
- [ ] Guard de rutas owner
- [ ] Manejo de token expirado
- [ ] Forms auth con validacion onChange y errores por campo
- [ ] Submit auth disabled si invalido o loading
- [ ] Toast success/error para login/register/logout

### Frontend Cliente

- [ ] `/bookings`
- [ ] `/bookings/[id]`
- [ ] Skeletons para lista y detalle de reservas
- [ ] Empty/error states para reservas
- [ ] Cancelar reserva
- [ ] Crear pago de sena
- [ ] Subir comprobante
- [ ] Drawer para subir comprobante
- [ ] Validacion de archivo antes de subir
- [ ] Preview de comprobante
- [ ] Dialog de confirmacion para cancelar reserva
- [ ] Toast para cancelar, crear pago y subir comprobante
- [ ] Mostrar estados claros

### Frontend Owner

- [ ] `/dashboard`
- [ ] `/dashboard/venues`
- [ ] `/dashboard/bookings`
- [ ] Skeletons dashboard/tabla/listas
- [ ] Empty/error states por local
- [ ] Aprobar/rechazar reserva
- [ ] Ver pagos pendientes
- [ ] Confirmar/rechazar pago
- [ ] Dialog para aprobar/rechazar/confirmar/rechazar pago
- [ ] Modal de vista rapida de reserva/comprobante
- [ ] Toast para todas las mutaciones owner
- [ ] `/dashboard/calendar`
- [ ] Crear bloqueo manual
- [ ] Drawer para crear bloqueo
- [ ] Modal para detalle rapido de dia
- [ ] Skeleton de calendario

### QA

- [ ] Build backend
- [ ] Tests backend
- [ ] Build frontend
- [ ] Tests frontend
- [ ] E2E manual completo
- [ ] Revisar responsive mobile
- [ ] Revisar responsive tablet
- [ ] Revisar responsive desktop
- [ ] Revisar no overflow desde 360px
- [ ] Revisar errores 401/403/409
- [ ] Revisar todos los POST/PUT/PATCH/DELETE con toast
- [ ] Revisar todos los formularios con submit disabled hasta validos
- [ ] Revisar todos los inputs con errores visibles
- [ ] Revisar skeletons en conexiones lentas
- [ ] Revisar modales/drawers con error de backend sin cierre automatico
- [ ] Revisar que ningun componente supere 300 lineas sin justificacion
- [ ] Revisar que ningun archivo UI supere 400 lineas
- [ ] Revisar que no exista ningun componente/archivo manual cercano a 1000 lineas
- [ ] Revisar que `"use client"` no este aplicado innecesariamente en layouts/pages completos
- [ ] Revisar separacion: API client, hooks, schemas, tipos y UI en archivos distintos
- [ ] Revisar que componentes nuevos usan arrow functions
- [ ] Revisar que responses/payloads del backend tienen interfaces/types
- [ ] Revisar que props de componentes tienen interfaces
- [ ] Revisar que no hay `any` injustificado en frontend

---

## 13. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Frontend intenta cubrir demasiadas pantallas | Sprint se diluye | Priorizar flujo end-to-end antes de polish |
| Payment MVP se vuelve pasarela real | Retraso alto | Mantener solo comprobante + confirmacion manual |
| Tokens en frontend quedan mal manejados | Riesgo seguridad/UX | API client centralizado y auth store unico |
| Backend devuelve formas inconsistentes | Bugs de UI | Definir tipos TS y normalizar respuestas |
| Calendario se complica visualmente | Retraso medio | Vista mensual simple, sin drag/drop |
| Datos seed insuficientes | QA pobre | Asegurar locales, reservas y estados variados |

---

## 14. Orden de Ejecucion Recomendado

1. Cerrar backend Payment MVP.
2. Definir estructura frontend por features y componentes compartidos.
3. Crear API client + auth store frontend.
4. Crear providers, shared states, skeletons, dialogs, drawers y submit button.
5. Construir home/listado/detalle de venues con pages delgadas.
6. Construir booking form conectado como client island.
7. Construir pantallas de cliente para reservas y pagos.
8. Construir dashboard owner para aprobar y confirmar.
9. Agregar calendario owner simple.
10. Ejecutar QA end-to-end.
11. Auditar tamanio de componentes, `"use client"`, estados, errores y responsive.
12. Pulir estados vacios, errores, loading y mobile.

---

## 15. Definicion de Done

Sprint 6 esta completo cuando:

- Un usuario real puede completar el flujo critico sin Postman.
- El owner puede operar reservas desde dashboard.
- La sena manual queda registrada con comprobante.
- El backend compila.
- El frontend compila.
- Los tests criticos pasan.
- Hay instrucciones claras para probar localmente.
- No quedan endpoints criticos sin UI para el flujo MVP.
- No hay componentes gigantes ni archivos UI cercanos a 1000 lineas.
- Las pages/layouts usan Server Components por defecto.
- `"use client"` aparece solo en componentes que realmente necesitan interactividad.
- La logica de API, hooks, schemas, tipos y UI esta separada por responsabilidad.
- Los componentes, hooks, handlers y helpers nuevos del frontend usan arrow functions.
- Los datos recibidos/enviados al backend tienen interfaces/types explicitos.
- Las props de componentes estan tipadas con interfaces.

---

## 16. Conclusion

El backend core ya esta suficientemente avanzado para dejar de construir en abstracto. El riesgo principal ahora no es falta de arquitectura backend, sino falta de producto usable.

La siguiente inversion debe ser Sprint 6: **frontend end-to-end con una capa minima de pagos manuales**. Eso nos lleva de una API funcional a un MVP demostrable para validar con clientes y owners en El Alto.
