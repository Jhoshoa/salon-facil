# Sprint 8: Owner Onboarding y Gestion Avanzada de Espacios

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos  
**Fase:** 1 - Evolucion Marketplace  
**Sprint:** 8  
**Duracion estimada:** 7-10 dias  
**Stack:** Next.js 14 + NestJS + Prisma + PostgreSQL + TanStack Query + React Hook Form + Zod + Tailwind CSS + shadcn/ui/Radix + Sonner

---

## 1. Objetivo

Crear una experiencia profesional para que owners puedan registrar, completar, editar y publicar espacios con la informacion avanzada definida en Sprint 7.

El resultado debe permitir que un owner cargue un espacio competitivo con:

- Datos generales.
- Ubicacion precisa.
- Galeria/media.
- Capacidad y precios.
- Amenities/facilities.
- Catering y bebidas.
- Parking y accesos.
- Horarios.
- Reglas.
- Politicas.
- Preview publico.
- Estado de completitud.

---

## 2. Principios

- Formularios por seccion, no un formulario gigante.
- Guardado independiente por seccion.
- React Hook Form + Zod en cada seccion.
- Errores por input y validacion antes de submit.
- Botones disabled hasta formulario valido.
- Toasts Sonner para create/update/delete.
- Skeletons y error states en datos cargados del backend.
- Confirmacion al salir si hay cambios sin guardar.
- Componentes pequenos y single responsibility.
- Usar `"use client"` solo en tabs, formularios, upload, drag/drop, modales y estado interactivo.

---

## 3. Alcance Backend

### 3.1 Endpoints owner

```http
GET /api/v1/venues/my/venues
GET /api/v1/venues/:id/edit
PUT /api/v1/venues/:id/details
PUT /api/v1/venues/:id/location
PUT /api/v1/venues/:id/pricing-capacity
PUT /api/v1/venues/:id/amenities
PUT /api/v1/venues/:id/opening-hours
PUT /api/v1/venues/:id/rules-policies
POST /api/v1/venues/:id/media
PUT /api/v1/venues/:id/media/order
DELETE /api/v1/venues/:id/media/:mediaId
PUT /api/v1/venues/:id/publish
```

### 3.2 Validaciones

- Owner solo puede editar venues propios.
- Admin puede editar cualquier venue si se mantiene regla actual.
- Venue no puede publicarse si no cumple completitud minima.
- Media: maximo de fotos por venue, formatos permitidos, tamano maximo.
- Horarios: `closesAt > opensAt` salvo regla overnight explicitamente habilitada.
- Pricing: precio base requerido, deposito requerido, minimumHours >= 1.
- Ubicacion: address, city, district requeridos; lat/lng recomendados para mapa.

### 3.3 Completion score

Agregar servicio backend para calcular completitud:

```ts
interface VenueCompletion {
  score: number;
  missingSections: string[];
  canPublish: boolean;
}
```

Reglas minimas para publicar:

- Informacion general completa.
- Ubicacion completa.
- Al menos 3 imagenes.
- Precio base.
- Capacidad maxima.
- Al menos 5 amenities.
- Horarios configurados.
- Reglas o politica basica.

---

## 4. Alcance Frontend

### 4.1 Rutas

```text
/dashboard/venues
/dashboard/venues/new
/dashboard/venues/[id]/edit
/dashboard/venues/[id]/preview
```

### 4.2 Estructura edit page

Usar layout de dashboard operacional, no landing page.

Tabs:

- General.
- Ubicacion.
- Fotos y media.
- Capacidad y precios.
- Amenities.
- Catering y bebidas.
- Parking y accesos.
- Horarios.
- Reglas y politicas.

Panel lateral:

- Completion score.
- Estado: draft/pending/active/rejected.
- CTA preview.
- CTA publicar.
- Ultima actualizacion.

### 4.3 Componentes recomendados

```text
frontend/src/components/dashboard/venues/
  owner-venues-list.tsx
  venue-edit-shell.tsx
  venue-completion-card.tsx
  venue-general-form.tsx
  venue-location-form.tsx
  venue-media-manager.tsx
  venue-pricing-capacity-form.tsx
  venue-amenities-form.tsx
  venue-catering-form.tsx
  venue-parking-form.tsx
  venue-opening-hours-form.tsx
  venue-rules-policies-form.tsx
  publish-venue-dialog.tsx
```

### 4.4 UX esperada

- Owner puede crear borrador rapidamente.
- Puede guardar cada seccion sin perder contexto.
- Puede ver errores especificos.
- Puede ver que falta para publicar.
- Puede previsualizar como lo vera el cliente.
- Puede ordenar fotos.
- Puede marcar foto cover.
- Puede configurar amenities desde catalogo.

---

## 5. Datos y Contratos

Tipos frontend:

```ts
interface OwnerVenueEdit {
  id: string;
  status: VenueStatus;
  completion: VenueCompletion;
  general: VenueGeneralSection;
  location: VenueLocationSection;
  media: VenueMedia[];
  pricingCapacity: VenuePricingCapacitySection;
  amenities: VenueAmenity[];
  openingHours: VenueOpeningHour[];
  rulesPolicies: VenueRulesPoliciesSection;
}
```

Cada seccion debe tener DTO propio en backend y schema Zod propio en frontend.

---

## 6. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| Formulario owner demasiado grande | Alto | Tabs por seccion, save independiente, componentes pequenos |
| Owner abandona por demasiados campos | Alto | Crear borrador rapido, completion score, required vs recommended |
| Upload/media falla o queda inconsistente | Medio | Endpoint separado, transacciones para metadata, retries y mensajes claros |
| Publicacion con datos pobres | Alto | Completion score y reglas minimas de publish |
| Duplicacion con DTOs existentes | Medio | Reusar validaciones donde tenga sentido, pero crear DTOs por seccion |

---

## 7. Criterios de Aceptacion

- Owner puede crear venue draft.
- Owner puede editar todas las secciones avanzadas.
- Owner puede subir, ordenar y marcar cover de imagenes.
- Owner puede ver completion score.
- Venue incompleto no puede publicarse.
- Venue completo puede enviarse a publicacion/activarse segun reglas actuales.
- Formularios tienen errores inline, disabled submit, loading states y toasts.
- `npm run lint`, `npm run build` y tests backend pasan.

