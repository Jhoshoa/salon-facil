# Owner Dashboard, Registro Diferenciado y Panel Admin de Catalogos Configurables - Fase 1

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos
**Fase:** 1 - Evolucion Marketplace
**Estado:** Completado
**Stack:** Next.js 14 + NestJS + Prisma + PostgreSQL + TanStack Query + React Hook Form + Zod + Tailwind CSS + shadcn/ui/Radix + Sonner

---

## 1. Objetivo

Dar a la plataforma una capa operativa real para dos roles: **owners** (dueños de espacios) y **admin** (equipo de SalonFacil).

Antes de este trabajo, el sitio solo tenia el marketplace publico. No existia:

- Sesion visible ni proteccion real de rutas del dashboard.
- Un flujo de registro pensado para propietarios (usaban el mismo formulario que un cliente, con un selector de rol).
- Forma de administrar el catalogo de tipos de espacio, tipos de uso y amenities sin tocar la base de datos a mano.
- Un panel para revisar y aprobar locales pendientes de publicacion.
- Un perfil de propietario editable (datos de contacto, redes).

Este trabajo cierra esos huecos.

---

## 2. Alcance Backend

### 2.1 Catalogos configurables (antes: enums fijos en Prisma)

`SpaceType` y `UseType` pasaron de ser enums de Prisma a tablas administrables (`space_type_catalog`, `use_type_catalog`), cada una con `key`, `label`, `active`, `order`. Las venues siguen referenciando el catalogo, pero ahora el admin puede agregar/editar/desactivar valores sin migracion.

Migracion: `backend/prisma/migrations/.../migration.sql` (creacion de tablas + seed de valores iniciales) — ver [Prisma migration workaround](../../CLAUDE.md) sobre por que se aplico con `db push` + SQL manual en este entorno.

### 2.2 Endpoints nuevos

```http
# Perfil propio (cualquier usuario autenticado)
GET  /api/v1/auth/me
PUT  /api/v1/auth/me

# Catalogos publicos (usados por filtros del marketplace y formulario de owner)
GET  /api/v1/venues/catalog/space-types
GET  /api/v1/venues/catalog/use-types
GET  /api/v1/venues/catalog/amenities

# Cola de revision (ADMIN)
GET  /api/v1/venues/admin/pending
PUT  /api/v1/venues/:id/verify

# CRUD de catalogos (ADMIN)
GET  /api/v1/venues/admin/catalog/space-types
POST /api/v1/venues/admin/catalog/space-types
PUT  /api/v1/venues/admin/catalog/space-types/:catalogId

GET  /api/v1/venues/admin/catalog/use-types
POST /api/v1/venues/admin/catalog/use-types
PUT  /api/v1/venues/admin/catalog/use-types/:catalogId

GET  /api/v1/venues/admin/catalog/amenities
POST /api/v1/venues/admin/catalog/amenities
PUT  /api/v1/venues/admin/catalog/amenities/:catalogId
```

Todas las rutas `admin/*` estan protegidas con `@Roles(UserRole.ADMIN)`. Las de catalogo publico son `@Public()`.

### 2.3 Perfil de usuario

`UpdateProfileDto` agrega campos de contacto y redes (telefono, ciudad, bio, redes sociales) sobre `User`. `AuthService`/`AuthController` exponen `GET/PUT /auth/me` para leer y actualizar el perfil propio, reutilizado tanto por owners como por admin.

### 2.4 Registro diferenciado

`RegisterDto` y `AuthService` ya no dependen de un selector de rol en el formulario: el registro de owner y el de cliente son flujos separados en el frontend (ver 3.3), y las reglas de password/telefono se sincronizaron entre frontend (Zod) y backend (class-validator) para evitar que un valor pase un formulario y falle en el otro.

### 2.5 Tests

- `backend/tests/e2e/auth.e2e-spec.ts`: registro owner/cliente, reglas de password y telefono, `GET/PUT /auth/me`.
- `backend/tests/e2e/venue.e2e-spec.ts`: catalogos admin (crear, editar, listar), cola de pendientes, verify.

---

## 3. Alcance Frontend

### 3.1 Sesion y proteccion de rutas

- `site-header.tsx`: header dinamico — nombre y rol del usuario autenticado, boton de cerrar sesion (revoca refresh token via `useLogout`), enlaces de login/registro solo para invitados, "Panel owner" visible solo para OWNER/ADMIN.
- `useAuthHydrated`: hook que espera la hidratacion de Zustand `persist` antes de leer `isAuthenticated`/`role`, evitando el flash de redirecciones al recargar la pagina.
- `app/dashboard/layout.tsx`: guardia client-side — exige sesion OWNER/ADMIN, redirige a `/login?next=...` si no hay sesion o a `/` si el rol no aplica.
- `LoginForm` respeta `?next=` tras autenticar (valida que sea una ruta interna y bloquea `/dashboard` para rol CLIENT).

### 3.2 Dashboard shell y admin shell

- `components/dashboard/dashboard-shell.tsx`: layout operativo para `/dashboard/*` — sidebar fija en desktop, drawer con boton "Menu" en mobile (breakpoint `lg`), pie con nombre/rol del usuario y logout.
- `components/admin/admin-shell.tsx`: mismo patron para `/admin/*`, con nav propia (catalogos, locales pendientes).
- Paginas reorganizadas bajo el shell: `dashboard/page.tsx` (resumen), `dashboard/venues/*`, `dashboard/bookings`, `dashboard/calendar`, `dashboard/profile` (nuevo).

### 3.3 Registro separado por rol

- `app/register/page.tsx`: registro de cliente (sin selector de rol).
- `app/propietarios/page.tsx`: landing + formulario de registro OWNER, con copy propio orientado a "publica tu espacio".
- `components/ui/password-input.tsx`: input de contraseña con toggle mostrar/ocultar, reutilizado en login y ambos registros.

### 3.4 Perfil de propietario

- `components/dashboard/owner-profile-form.tsx`: formulario de datos de contacto y redes sociales, usando `PUT /auth/me`.
- `lib/validators/profile.schema.ts`: schema Zod correspondiente.

### 3.5 Panel admin de catalogos

- `components/admin/catalog-manager.tsx`: componente generico reutilizado para las tres entidades de catalogo (tipos de espacio, tipos de uso, amenities) — listado, alta y edicion via dialog, activar/desactivar, orden.
- `app/admin/catalog/space-types/page.tsx`, `use-types/page.tsx`, `amenities/page.tsx`: instancian el manager por entidad.
- `components/admin/pending-venues-queue.tsx`: cola de locales pendientes de verificacion para el admin (aprobar/rechazar).

### 3.6 Formulario de venue: catalogos dinamicos + errores por pestaña

- `venue-form.tsx` (owner): los selects de tipo de espacio y tipo de uso pasaron de valores hardcodeados a consumir los catalogos via API.
- Fix posterior (`1ee3c68`): el formulario tiene varias pestañas (general, ubicacion, precios, etc.) y los errores de validacion podian quedar "escondidos" en una pestaña no visible. Se agrego un mapeo campo → pestaña; al fallar el submit, el formulario cambia automaticamente a la primera pestaña con errores y las marca visualmente.

### 3.7 Fix de layout: sidebar sticky vs. seccion "Espacios similares"

Durante la verificacion de esta fase se detecto que en `venue-detail.tsx` el formulario de reserva (sticky, dentro de un grid de dos columnas) permanecia fijado en pantalla durante todo el scroll de la columna principal (~3000px), incluyendo cuando aparecia la seccion "Espacios similares" — dando la apariencia de superposicion aunque no hubiera overlap real en el DOM. Causa: en CSS Grid, el *containing block* de un `position: sticky` dentro de un item queda atado a la altura del row track completo, no a la altura propia del item, incluso con `self-start`.

Fix: el layout de dos columnas paso de `grid` a `flex` (`flex lg:flex-row lg:items-start`), donde el sticky si respeta la altura propia del sidebar y se libera apenas termina su contenido. Verificado sin overlap en mobile, tablet, el breakpoint `lg` (1024px) y desktop, y sin overflow horizontal en ninguna de las pantallas nuevas (dashboard shell, admin shell, catalog manager dialog, profile form, venue-form).

---

## 4. Modelo de datos (resumen de cambios en `schema.prisma`)

- `SpaceType` y `UseType`: de enum a tabla (`space_type_catalog`, `use_type_catalog`) con `key`, `label`, `active`, `order`.
- `User`: nuevos campos de perfil (contacto, ciudad, bio, redes sociales).
- Seed (`backend/prisma/seed.ts`) actualizado para poblar los catalogos y usuarios de prueba owner/admin con los nuevos campos.

---

## 5. Criterios de Aceptacion

- [x] Un usuario ve su nombre/rol en el header y puede cerrar sesion (revoca refresh token).
- [x] `/dashboard/*` es inaccesible sin sesion OWNER/ADMIN (redirige a `/login?next=...` o a `/`).
- [x] Registro de owner y de cliente son flujos separados, sin selector de rol.
- [x] Reglas de password/telefono coinciden entre validacion frontend y backend.
- [x] Admin puede crear, editar y activar/desactivar tipos de espacio, tipos de uso y amenities sin migracion.
- [x] Admin puede ver y resolver la cola de locales pendientes de verificacion.
- [x] Owner puede editar su perfil (contacto, redes).
- [x] El formulario de venue consume los catalogos dinamicos y muestra errores en la pestaña correcta.
- [x] Dashboard shell y admin shell son responsive (mobile drawer, sidebar desktop) sin overflow horizontal.
- [x] `venue-detail.tsx`: sin superposicion visual entre el formulario de reserva sticky y "Espacios similares" en ningun breakpoint.
- [x] `tsc --noEmit`, `eslint` y tests (frontend + e2e backend) pasan.

---

## 6. Commits relevantes

```text
45dfbad feat: sesion en header y proteccion de rutas del dashboard
61dd231 refactor: simplificar encabezado del buscador del home
0337707 feat(auth): agrega registro separado para propietarios
30a9727 feat(admin): agrega gestion de catalogos y perfil de propietario
1ee3c68 fix(venues): muestra errores en pestañas del formulario
(sin commitear) fix(venues): layout flex para sidebar sticky en venue-detail
```
