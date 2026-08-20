# Sprint 7: Catalogo Avanzado, Filtros Profesionales, Mapa y Detalle Rico de Espacios

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos  
**Fase:** 1 - Evolucion MVP Core  
**Sprint:** 7  
**Duracion estimada:** 7-10 dias  
**Stack:** Next.js 14 + NestJS + Prisma + PostgreSQL + TanStack Query + React Hook Form + Zod + Tailwind CSS + shadcn/ui/Radix + Sonner

---

## 1. Contexto y Referencias

### 1.1 Situacion actual

Sprint 6 dejo un MVP funcional:

- Busqueda publica de venues.
- Filtros iniciales por fecha, rango, capacidad, precio, distrito y servicios.
- Detalle de venue con reserva.
- Booking y payment MVP.
- Dashboard owner basico.

El producto ya permite probar el flujo principal, pero aun no tiene la profundidad de catalogo esperada para una plataforma competitiva de alquiler de espacios.

### 1.2 Referencias analizadas y decision UX

Se tomaron como referencias funcionales Booking.com y Spathios.

**Decision:** SalonFacil seguira una estrategia **Booking-first + Spathios-domain**:

- **Booking-first:** estructura de home, header, busqueda principal, resultados escaneables, filtros laterales, detalle rico, confianza y conversion.
- **Spathios-domain:** taxonomia y profundidad especifica para espacios de eventos: comodidades, facilities, catering/bebidas, parking, precio por hora/evento, mapa toggle y filtros avanzados por categorias.

Booking.com es mejor como columna vertebral porque optimiza conversion, claridad, confianza y comparacion rapida. Spathios es mejor como referencia de dominio porque modela mejor espacios para eventos, producciones y reuniones.

De Booking.com se rescata:

- Header claro con marca, navegacion, cuenta, login y CTA.
- Home con busqueda prominente y secciones de descubrimiento.
- Resultados con filtros abundantes, ordenamiento, mapa/ubicacion y cards comparables.
- Detalle con galeria, highlights, disponibilidad, reviews, reglas, FAQ, entorno y servicios.
- Uso fuerte de confianza: badges, reviews, politica, disponibilidad y CTA persistente.

De Spathios se rescata:

- Home con busqueda rapida por tipo de actividad, ciudad y fecha.
- Pagina de resultados con filtros en chips/popovers: fecha y hora, asistentes, comodidades, precio por hora y mas filtros.
- Toggle para mostrar/ocultar mapa.
- Modal de filtros avanzados agrupado por categorias.
- Detalle de espacio con galeria amplia, facilities, comodidades, catering/bebidas, parking, precios, aforo, horarios, reglas, politica de cancelacion, mapa, reviews y espacios similares.

Referencia web consultada: https://spathios.com/

**Importante:** La referencia se usa para patrones UX y amplitud funcional. No se debe copiar marca, colores, textos comerciales ni layout exacto.

### 1.3 Relacion con Sprints 8 y 9

Sprint 7 no debe intentar resolver toda la plataforma avanzada. Este sprint crea la base publica y de catalogo:

- Modelo de datos avanzado.
- Backend de busqueda/filtros/detalle.
- Marketplace publico profesional.
- Detalle de venue enriquecido.

Sprint 8 continuara con owner onboarding y gestion avanzada de espacios. Sprint 9 cerrara confianza, conversion, reviews, favoritos, SEO, recomendaciones y refinamiento.

---

## 2. Objetivo del Sprint

Convertir SalonFacil de un MVP de reservas en un **catalogo avanzado de espacios para eventos**, con datos ricos, busqueda profesional, filtros accionables y detalle de venue preparado para conversion.

Al finalizar Sprint 7:

- El owner podra registrar informacion avanzada del espacio.
- La base de datos tendra modelos normalizados para amenities/facilities, tipos de espacio, usos/eventos, reglas, parking, catering, horarios y media.
- El backend podra filtrar venues por disponibilidad, horario, asistentes, precio, comodidades, tipo de espacio, usos, parking/catering y mapa.
- El frontend tendra una pagina de resultados con toolbar profesional, popovers de filtros, modal de mas filtros y toggle de mapa.
- El detalle del venue tendra una ficha rica, escaneable y confiable.

---

## 3. Principios de Implementacion

- No crear componentes gigantes. Mantener componentes React preferentemente bajo 300 lineas y archivos bajo 400 lineas.
- Server Components por defecto; usar `"use client"` solo para estado, eventos, formularios, popovers, drawers, modales, mapa y TanStack Query.
- Usar arrow functions para componentes y handlers nuevos.
- Usar interfaces/types para contratos recibidos del backend y payloads enviados.
- Usar React Hook Form + Zod en formularios complejos de owner.
- Botones `Guardar`, `Buscar`, `Aplicar filtros` deshabilitados hasta que el formulario sea valido.
- Mostrar errores por input antes de enviar.
- Para requests POST/PUT/PATCH/DELETE: Sonner toast success/warning/error/info.
- Para requests GET: skeletons, error states con retry y empty states.
- No copiar colores de referencias. Adaptar a identidad SalonFacil.
- Mantener accesibilidad: labels reales, focus states, keyboard navigation, aria en modales/popovers.
- Evitar filtros decorativos. Todo filtro visible debe afectar el request o estar explicitamente marcado como pendiente.

---

## 4. Alcance de Base de Datos

### 4.1 Nuevos enums propuestos

```prisma
enum VenueSpaceType {
  EVENT_HALL
  GARDEN
  TERRACE
  RESTAURANT
  BAR
  AUDITORIUM
  CONFERENCE_ROOM
  PHOTO_STUDIO
  MULTIPURPOSE
  OUTDOOR_SPACE
}

enum VenueUseType {
  WEDDING
  BIRTHDAY
  CORPORATE_EVENT
  PRIVATE_PARTY
  GRADUATION
  CONFERENCE
  WORKSHOP
  PHOTO_SHOOT
  FILMING
  POP_UP
  TEAM_BUILDING
}

enum AmenityCategory {
  FACILITY
  COMFORT
  AUDIO_VISUAL
  CATERING_DRINKS
  PARKING
  ACCESSIBILITY
  SAFETY
  SERVICES
}

enum VenueMediaType {
  IMAGE
  VIDEO
  VIRTUAL_TOUR
}

enum PriceUnit {
  EVENT
  HOUR
  DAY
}
```

### 4.2 Nuevos modelos propuestos

#### Amenity catalog

```prisma
model Amenity {
  id          String          @id @default(uuid())
  key         String          @unique
  name        String
  category    AmenityCategory
  icon        String?
  sortOrder   Int             @default(0) @map("sort_order")
  isActive    Boolean         @default(true) @map("is_active")
  createdAt   DateTime        @default(now()) @map("created_at")

  venues VenueAmenity[]

  @@index([category])
  @@index([isActive])
  @@map("amenities")
}

model VenueAmenity {
  id          String   @id @default(uuid())
  venueId     String   @map("venue_id")
  amenityId   String   @map("amenity_id")
  isIncluded  Boolean  @default(true) @map("is_included")
  extraCost   Decimal? @map("extra_cost") @db.Decimal(12, 2)
  notes       String?  @db.Text

  venue   Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)
  amenity Amenity @relation(fields: [amenityId], references: [id], onDelete: Restrict)

  @@unique([venueId, amenityId])
  @@index([venueId])
  @@index([amenityId])
  @@map("venue_amenities")
}
```

#### Tipos de uso y tipo de espacio

```prisma
model VenueUse {
  id        String       @id @default(uuid())
  venueId   String       @map("venue_id")
  useType   VenueUseType  @map("use_type")
  isPrimary Boolean      @default(false) @map("is_primary")

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@unique([venueId, useType])
  @@index([useType])
  @@map("venue_uses")
}
```

Agregar a `Venue`:

```prisma
spaceType        VenueSpaceType? @map("space_type")
minimumHours     Int             @default(4) @map("minimum_hours")
priceUnit        PriceUnit       @default(EVENT) @map("price_unit")
instantBooking   Boolean         @default(false) @map("instant_booking")
allowsMultipleDays Boolean       @default(false) @map("allows_multiple_days")
```

#### Horarios de operacion

```prisma
model VenueOpeningHour {
  id        String   @id @default(uuid())
  venueId   String   @map("venue_id")
  dayOfWeek Int      @map("day_of_week")
  opensAt   DateTime @map("opens_at") @db.Time
  closesAt  DateTime @map("closes_at") @db.Time
  isClosed  Boolean  @default(false) @map("is_closed")

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@unique([venueId, dayOfWeek])
  @@index([venueId])
  @@map("venue_opening_hours")
}
```

#### Media avanzada

```prisma
model VenueMedia {
  id        String         @id @default(uuid())
  venueId   String         @map("venue_id")
  type      VenueMediaType
  url       String
  alt       String?
  sortOrder Int            @default(0) @map("sort_order")
  isCover   Boolean        @default(false) @map("is_cover")
  createdAt DateTime       @default(now()) @map("created_at")

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId])
  @@index([type])
  @@map("venue_media")
}
```

### 4.3 Campos JSON vs tablas normalizadas

Usar tablas normalizadas para:

- Amenities/facilities/comodidades.
- Tipos de uso/evento.
- Horarios.
- Media.

Usar JSON solo para informacion flexible de baja criticidad, por ejemplo:

- Reglas especificas detalladas.
- Metadata de mapa/proveedor externo.
- Configuracion temporal de filtros experimentales.

### 4.4 Migracion de datos existentes

El modelo actual `VenueService` ya contiene servicios incluidos y costos extra. No se debe borrar en Sprint 7 sin una migracion clara.

Plan:

1. Crear nuevas tablas.
2. Seed de amenities base.
3. Script de migracion opcional:
   - Convertir `VenueService.name` conocido a `Amenity`.
   - Crear `VenueAmenity`.
   - Mantener `VenueService` temporalmente para compatibilidad.
4. Actualizar DTOs/responses para incluir ambos durante transicion si hace falta.
5. Deprecar `VenueService` en Sprint posterior si el nuevo modelo cubre todo.

---

## 5. Alcance Backend

### 5.1 Modulos / responsabilidades

Mantener Clean Architecture por modulo.

Actualizar o crear:

- `venue/application/dto/venue-filter.dto.ts`
- `venue/application/dto/create-venue.dto.ts`
- `venue/application/dto/update-venue.dto.ts`
- `venue/application/services/venue.service.ts`
- `venue/infrastructure/repositories/venue.repository.ts`
- `venue/interface/venue.controller.ts`
- Nuevo seed para amenities y usos.

### 5.2 Endpoints nuevos o ampliados

#### Catalogo publico

```http
GET /api/v1/venues
```

Debe aceptar:

- `query`
- `city`
- `district`
- `startDate`
- `endDate`
- `startTime`
- `endTime`
- `guestCount`
- `minCapacity`
- `maxCapacity`
- `minPrice`
- `maxPrice`
- `priceUnit`
- `spaceTypes`
- `useTypes`
- `amenities`
- `hasParking`
- `parkingCapacity`
- `hasCatering`
- `allowsAlcohol`
- `allowsExternalCatering`
- `instantBooking`
- `mapBounds` o `north/south/east/west`
- `sortBy`
- `sortOrder`
- `page`
- `limit`

#### Detalle publico enriquecido

```http
GET /api/v1/venues/:slug
```

Debe retornar:

- Datos base.
- Media ordenada.
- Amenities agrupados por categoria.
- Usos/eventos recomendados.
- Precios y unidad de precio.
- Deposito.
- Horarios por dia.
- Reglas.
- Politicas.
- Parking/catering.
- Reviews resumen.
- Owner publico.
- Espacios similares.

#### Catalogos para UI

```http
GET /api/v1/venues/catalog/amenities
GET /api/v1/venues/catalog/use-types
GET /api/v1/venues/catalog/space-types
```

Motivo: evitar hardcodear filtros avanzados en frontend.

#### Owner: edicion avanzada

```http
PUT /api/v1/venues/:id/details
PUT /api/v1/venues/:id/amenities
PUT /api/v1/venues/:id/opening-hours
PUT /api/v1/venues/:id/media
```

Se pueden agrupar si el alcance lo requiere, pero no conviene tener un unico endpoint enorme dificil de validar.

### 5.3 Disponibilidad por fecha y hora

Actualmente se filtra por fecha. Sprint 7 debe considerar hora:

- Si `startTime` y `endTime` estan presentes, excluir venues con reservas solapadas.
- Si solo hay fecha, mantener comportamiento actual.
- Si hay rango de fechas, excluir venues con reservas o bloqueos en cualquier fecha del rango.

Regla de solapamiento:

```text
existing.startTime < requested.endTime AND existing.endTime > requested.startTime
```

### 5.4 Busqueda por mapa

Agregar soporte a bounding box:

```text
north, south, east, west
```

Filtrar:

```text
latitude BETWEEN south AND north
longitude BETWEEN west AND east
```

No implementar clustering backend en Sprint 7 salvo que el volumen lo exija. El frontend puede renderizar marcadores simples con paginacion/limit.

### 5.5 Ordenamiento

Soportar:

- `featured`
- `priceAsc`
- `priceDesc`
- `capacityDesc`
- `ratingDesc`
- `newest`

Nota: rating puede requerir agregado en repository o campo materializado futuro. Para Sprint 7 se puede calcular con agregacion simple.

### 5.6 Validaciones backend

- `endDate >= startDate`.
- `endTime > startTime`.
- `guestCount >= 1`.
- `minPrice <= maxPrice`.
- `parkingCapacity >= 0`.
- `minimumHours >= 1`.
- `amenities` deben existir en catalogo.
- `spaceTypes` y `useTypes` deben pertenecer a enums.

### 5.7 Tests backend

Unitarios:

- Filtros por amenities.
- Filtros por tipo de espacio.
- Filtros por uso.
- Filtros por precio.
- Disponibilidad por fecha.
- Disponibilidad por fecha + hora.
- Rango de fechas.
- Bounds de mapa.
- Validaciones negativas.

E2E:

- `GET /venues` con combinacion de filtros.
- `GET /venues/:slug` retorna detalle enriquecido.
- Owner actualiza amenities/horarios/media.

---

## 6. Alcance Frontend

### 6.1 Pagina de busqueda

Ruta:

```text
/venues
```

Patron UI objetivo:

- Header compacto.
- Barra sticky de busqueda/filtros.
- Chips de filtros principales:
  - Busqueda / ciudad.
  - Fecha y hora.
  - Asistentes.
  - Comodidades.
  - Precio.
  - Mas filtros.
  - Toggle mapa.
- Resultados en grid/lista.
- Mapa opcional a la derecha en desktop.
- En mobile: mapa en drawer/fullscreen toggle.

### 6.2 Popovers principales

#### Fecha y Hora

Popover con:

- Start date.
- End date opcional con switch rango.
- Start time.
- End time.
- Boton aplicar.
- Validacion inline.

#### Asistentes

Popover con:

- Adultos/personas.
- Ninos opcional si el negocio lo requiere.
- Capacidad minima derivada.
- Boton aplicar.

#### Comodidades

Popover con categorias rapidas:

- Parking.
- Cocina.
- Aire acondicionado.
- Wi-Fi.
- Sonido.
- Iluminacion.
- Mobiliario.
- Jardin/terraza.

#### Precio

Popover con:

- Min/max.
- Unidad: evento / hora / dia.
- Slider opcional despues de tener rangos reales.

### 6.3 Modal Mas Filtros

Usar Radix Dialog/shadcn dialog.

Estructura:

- Sidebar de categorias:
  - Tipo de espacio.
  - Precio y aforo.
  - Comodidades.
  - Servicios.
  - Zonas y acceso.
  - Catering y bebidas.
  - Parking.
  - Permisos y reglas.
- Panel derecho con chips/checkboxes.
- Footer sticky con:
  - Limpiar filtros.
  - Ver resultados.

Reglas:

- No cerrar modal al seleccionar cada filtro.
- Mostrar contador de filtros activos.
- Mantener estado local hasta `Aplicar`.
- Enviar request solo al aplicar.

### 6.4 Toggle de mapa

Implementar en Sprint 7 como:

- Estado `showMap`.
- Desktop: split view `results + map`.
- Mobile: boton para abrir mapa fullscreen/drawer.
- Marcadores con precio base.
- Click en marcador resalta card.

Libreria sugerida:

- `react-map-gl` + Mapbox si se cuenta con token.
- Alternativa open-source: `react-leaflet` + OpenStreetMap.

Recomendacion pragmatica:

- Usar `react-leaflet` para MVP si no hay token Mapbox.
- Encapsular `VenueMap` para poder cambiar proveedor despues.

### 6.5 Cards de resultados

Card debe mostrar:

- Foto cover.
- Precio por unidad.
- Nombre.
- Distrito/ciudad.
- Capacidad.
- Rating/resenas si existe.
- Minimo de horas.
- Servicios destacados.
- Favorito placeholder o funcional si se implementa wishlist.
- CTA: Ver disponibilidad.

### 6.6 Detalle de venue

Ruta:

```text
/venues/[slug]
```

Mejoras:

- Galeria superior amplia con carrusel o masonry.
- Resumen sticky de reserva/precio en desktop.
- Secciones:
  - Sobre el espacio.
  - Caracteristicas.
  - Comodidades.
  - Comodidades adicionales.
  - Catering y bebidas.
  - Parking.
  - Precios.
  - Aforo.
  - Horario.
  - Reglas del espacio.
  - Politicas de cancelacion.
  - Mapa.
  - Reviews.
  - Espacios similares.
- Boton consultar disponibilidad.
- Formulario de reserva con fecha/hora/personas integrado al sticky card.

### 6.7 Owner: formulario avanzado de venue

Crear/actualizar rutas owner:

```text
/dashboard/venues
/dashboard/venues/[id]/edit
```

Secciones en tabs:

- Informacion general.
- Ubicacion.
- Media.
- Capacidad y precios.
- Amenities/facilities.
- Catering/bebidas.
- Parking/accesos.
- Horarios.
- Reglas y politicas.

Buenas practicas:

- React Hook Form + Zod por seccion.
- Guardado por seccion para reducir riesgo de perder datos.
- Dirty state y confirmacion al salir si hay cambios.
- Skeletons al cargar.
- Toasts por update.
- Errores inline.

### 6.8 Estado y URL

Los filtros de busqueda deben sincronizarse con query params:

- Permite compartir URL.
- Permite back/forward del navegador.
- Permite SSR/initial params.

No disparar busqueda en cada tecla:

- Inputs editan estado local.
- Requests solo con `Aplicar` o `Buscar`.
- Debounce solo para autocomplete futuro.

---

## 7. Contratos Frontend

Actualizar `frontend/src/types/api.ts` con:

```ts
export interface Amenity {
  id: string;
  key: string;
  name: string;
  category: AmenityCategory;
  icon: string | null;
}

export interface VenueAmenity {
  id: string;
  amenity: Amenity;
  isIncluded: boolean;
  extraCost: number | null;
  notes: string | null;
}

export interface VenueOpeningHour {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface VenueMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'VIRTUAL_TOUR';
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface VenueSearchParams {
  query?: string;
  city?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  minPrice?: number;
  maxPrice?: number;
  priceUnit?: 'EVENT' | 'HOUR' | 'DAY';
  amenities?: string;
  spaceTypes?: string;
  useTypes?: string;
  hasParking?: boolean;
  hasCatering?: boolean;
  allowsAlcohol?: boolean;
  instantBooking?: boolean;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}
```

---

## 8. UX / UI Design System

### 8.1 Componentes nuevos recomendados

```text
frontend/src/components/search/
  search-toolbar.tsx
  date-time-filter-popover.tsx
  guests-filter-popover.tsx
  amenities-filter-popover.tsx
  price-filter-popover.tsx
  advanced-filters-dialog.tsx
  active-filter-chips.tsx
  map-toggle.tsx

frontend/src/components/venues/
  venue-result-card.tsx
  venue-map.tsx
  venue-gallery.tsx
  venue-amenities-section.tsx
  venue-pricing-section.tsx
  venue-opening-hours-section.tsx
  venue-rules-section.tsx
  venue-similar-section.tsx
  venue-booking-sidebar.tsx
```

### 8.2 Librerias UI

Usar lo ya instalado:

- Tailwind.
- shadcn/Radix primitives existentes.
- Sonner.
- lucide-react.
- TanStack Query.
- React Hook Form.
- Zod.

Agregar solo si se implementa mapa:

- `react-leaflet leaflet`

o si se decide Mapbox:

- `react-map-gl mapbox-gl`

### 8.3 Responsive

Desktop:

- Toolbar sticky.
- Resultados + mapa split view.
- Modal avanzado ancho.
- Sidebar sticky en filtros si el mapa esta oculto.

Tablet:

- Toolbar wrap.
- Mapa debajo o drawer.

Mobile:

- Toolbar compacta.
- Filtros en drawer/modal.
- Cards verticales.
- Sticky bottom CTA en detalle.

---

## 9. Seed Data

Agregar seed para:

### Amenities base

Facility:

- Cocina.
- Banos.
- Vestidor.
- Escenario.
- Jardin.
- Terraza.
- Area exterior.

Comfort:

- Aire acondicionado.
- Calefaccion.
- Wi-Fi.
- Luz natural.
- Mobiliario.

Audio visual:

- Equipo de sonido.
- Microfonos.
- Proyector.
- Iluminacion profesional.

Catering and drinks:

- Catering propio.
- Permite catering externo.
- Permite bebidas alcoholicas.
- Barra incluida.

Parking:

- Parqueo privado.
- Parqueo para autos.
- Valet parking.

Accessibility:

- Acceso silla de ruedas.
- Ascensor.
- Entrada independiente.

### Use types

- Boda.
- Cumpleanos.
- Evento corporativo.
- Fiesta privada.
- Graduacion.
- Conferencia.
- Sesion de fotos.
- Rodaje.
- Pop up.
- Team building.

### Datos en venues existentes

Actualizar seed actual para que cada venue tenga:

- `spaceType`.
- `minimumHours`.
- `priceUnit`.
- `VenueUse[]`.
- `VenueAmenity[]`.
- `VenueOpeningHour[]`.
- `VenueMedia[]`.
- Coordenadas validas.

---

## 10. Orden de Implementacion Recomendado

### Paso 1: DB y Prisma

- Crear migracion para enums/modelos nuevos.
- Actualizar `schema.prisma`.
- Ejecutar `prisma generate`.
- Crear seed de catalogos.
- Actualizar seed de venues.

### Paso 2: Backend catalogos

- Endpoints de amenities/use-types/space-types.
- DTOs de filtros ampliados.
- Repository search con filtros nuevos.
- Tests unitarios.

### Paso 3: Backend detalle enriquecido

- `GET /venues/:slug` con includes nuevos.
- Mapper a entity/response.
- Similar venues basico.
- Tests.

### Paso 4: Frontend busqueda avanzada

- Search toolbar.
- Popovers.
- Advanced filters dialog.
- Query params.
- Active filter chips.

### Paso 5: Mapa

- `VenueMap`.
- Toggle mapa.
- Bounds opcional.
- Seleccion marcador/card.

### Paso 6: Detalle enriquecido

- Galeria.
- Sections.
- Booking sidebar.
- Similar venues.

### Paso 7: Owner edit avanzado

- Formularios por tabs.
- Update endpoints.
- Validaciones.

---

## 11. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| Migracion rompe venues existentes | Alto | Crear tablas nuevas sin borrar `VenueService`; migrar gradualmente; seed idempotente |
| Filtros muy lentos por muchas relaciones | Alto | Indices por `amenityId`, `useType`, `spaceType`, `capacityMax`, `latitude/longitude`; limitar pagina; medir queries |
| UI de filtros se vuelve compleja | Medio | Componentes pequenos por filtro; estado local + aplicar; schemas Zod por filtro |
| Mapa agrega dependencia pesada | Medio | Encapsular provider en `VenueMap`; lazy load/dynamic import; fallback lista sin mapa |
| Datos incompletos hacen que la ficha se vea pobre | Alto | Mostrar secciones solo si hay datos; seed completo; checklist owner de completitud |
| Doble fuente `VenueService` vs `VenueAmenity` | Medio | Marcar `VenueService` como legacy durante Sprint 7; mapper de compatibilidad |
| Filtro por hora mal implementado permite doble reserva | Alto | Tests de solapamiento; usar regla formal de overlap; validar timezone/date-only |
| Popovers/modales inaccesibles | Medio | Radix primitives, labels, focus management, keyboard testing |
| Owner form demasiado grande | Alto | Tabs por responsabilidad; save por seccion; componentes bajo 300 lineas |
| Copiar demasiado la referencia | Medio | Usar patrones, no colores/textos/marca; adaptar a eventos en Bolivia |

---

## 12. Criterios de Aceptacion

### BD

- Migraciones corren en base limpia y base con seed existente.
- Seed crea amenities/usos/horarios/media.
- No se pierden venues actuales.
- `prisma generate` sin errores.

### Backend

- `GET /venues` filtra por fecha, hora, capacidad, precio, amenities, use type, space type y mapa.
- `GET /venues/:slug` retorna detalle enriquecido.
- Catalog endpoints retornan filtros disponibles.
- Tests unitarios y e2e pasan.
- Swagger actualizado.

### Frontend

- Busqueda no dispara request por cada tecla.
- Popovers aplican filtros manualmente.
- Modal de mas filtros agrupa opciones.
- Toggle mapa funciona.
- Cards muestran informacion rica.
- Detalle de venue tiene secciones profesionales.
- Owner puede editar datos avanzados.
- Loading/error/empty states presentes.
- UI responsive en mobile/tablet/desktop.
- `npm run lint`, `npm run build`, `npm run format:check` pasan.

---

## 13. Fuera de Alcance para Sprint 7

- Pasarela de pago real.
- Facturacion fiscal.
- Chat entre cliente y owner.
- Algoritmo avanzado de ranking/ML.
- Wishlist completa.
- Reviews con moderacion avanzada.
- Contratos PDF automaticos.
- Clustering backend de mapa a gran escala.
- Multi-idioma completo.

---

## 14. Preguntas Abiertas

Antes de implementar, conviene definir:

1. Proveedor de mapa: `react-leaflet/OpenStreetMap` o Mapbox.
2. Si el precio principal sera por evento, por hora o ambos.
3. Si se requiere booking multi-dia real en Sprint 7 o solo busqueda por rango.
4. Si catering/bebidas deben ser filtros booleanos o catalogo de opciones.
5. Si el owner puede crear amenities custom o solo seleccionar del catalogo.
6. Si se implementara favoritos en Sprint 7 o se deja como UI futura.

---

## 15. Checklist de Implementacion

- [ ] Disenar migracion Prisma.
- [ ] Crear seed de catalogos.
- [ ] Actualizar seed venues.
- [ ] Actualizar DTOs backend.
- [ ] Actualizar repository search.
- [ ] Crear endpoints catalogo.
- [ ] Enriquecer endpoint detalle.
- [ ] Tests backend filtros/disponibilidad.
- [ ] Crear tipos frontend.
- [ ] Crear API clients catalogos.
- [ ] Crear search toolbar.
- [ ] Crear popovers filtros.
- [ ] Crear advanced filters dialog.
- [ ] Crear active filter chips.
- [ ] Crear map toggle y VenueMap.
- [ ] Mejorar result cards.
- [ ] Mejorar detail page.
- [ ] Crear owner advanced edit.
- [ ] Validar responsive.
- [ ] Ejecutar lint/build/tests.
