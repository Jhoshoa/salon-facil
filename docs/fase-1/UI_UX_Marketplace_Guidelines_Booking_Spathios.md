# UI/UX Guidelines: Marketplace SalonFacil

## 1. Direccion General

SalonFacil debe usar una direccion **Booking-first + Spathios-domain**.

- Booking-first: estructura, confianza, conversion, resultados, detalle y claridad.
- Spathios-domain: filtros, amenities, facilities, precio/hora, mapa toggle y taxonomia de espacios.

No copiar colores, marca, textos ni layout exacto. Usar patrones probados adaptados a eventos y alquiler de espacios.

---

## 2. Header

Desktop:

- Nombre/logo de SalonFacil a la izquierda.
- Navegacion:
  - Buscar espacios.
  - Publica tu espacio.
  - Ayuda.
- Acciones:
  - Crear cuenta.
  - Iniciar sesion.
  - Dashboard si esta autenticado.

Mobile:

- Logo.
- Menu icon.
- CTA principal contextual.

Reglas:

- Header consistente en home, resultados y detalle.
- No esconder login/register.
- CTA owner "Publica tu espacio" debe estar visible.

---

## 3. Home Page

Objetivo: iniciar busqueda y educar rapido.

Secciones:

1. Hero con imagen real/aspiracional de eventos.
2. Search box prominente:
   - Que estas organizando.
   - Donde.
   - Fecha.
   - Asistentes.
   - Buscar.
3. Categorias por tipo de evento:
   - Bodas.
   - Cumpleanos.
   - Eventos corporativos.
   - Graduaciones.
   - Sesiones de fotos.
   - Conferencias.
4. Espacios destacados.
5. Como funciona.
6. CTA para owners.
7. Reviews/testimonios cuando exista data real.

Reglas:

- El primer viewport debe dejar claro que se alquilan espacios para eventos.
- Search debe ser usable sin depender de Enter.
- Fecha y asistentes obligatorios para busqueda de disponibilidad.

---

## 4. Search Results

Desktop Booking-style:

- Search toolbar sticky.
- Filtros principales como chips/popovers.
- Filtros laterales o modal avanzado.
- Resultados en cards comparables.
- Toggle mapa.
- Ordenamiento.
- Active filter chips.

Toolbar:

- Query/ubicacion.
- Fecha y hora.
- Asistentes.
- Comodidades.
- Precio.
- Mas filtros.
- Mapa toggle.

No hacer requests por cada tecla. Aplicar busqueda con boton.

---

## 5. Advanced Filters Modal

Inspiracion Spathios:

- Modal centrado.
- Sidebar de categorias.
- Panel derecho con chips/checkboxes.
- Footer con limpiar y buscar.

Categorias:

- Tipo de espacio.
- Precio y aforo.
- Comodidades.
- Servicios.
- Catering y bebidas.
- Parking.
- Zonas y accesos.
- Permisos y reglas.

Reglas:

- Filtros visibles deben funcionar.
- Mantener estado local hasta aplicar.
- Mostrar contador de filtros activos.
- Mobile debe usar drawer/fullscreen.

---

## 6. Venue Detail

Booking-style adaptado a eventos:

- Header de venue con nombre, ubicacion, rating, compartir/favorito.
- Galeria amplia.
- Highlights rapidos.
- Sticky booking sidebar en desktop.
- CTA persistente mobile.

Secciones:

- Sobre el espacio.
- Ideal para.
- Caracteristicas.
- Amenities/facilities.
- Catering y bebidas.
- Parking y accesos.
- Precios.
- Aforo.
- Horario.
- Reglas.
- Politicas.
- Mapa.
- Reviews.
- FAQ.
- Espacios similares.

Reglas:

- Informacion densa pero escaneable.
- CTA visible sin tapar contenido.
- Mostrar solo secciones con datos.
- Skeletons para carga.
- Error states claros.

---

## 7. Visual System

- Profesional, limpio, confiable.
- Evitar paletas de una sola familia.
- No copiar azul Booking ni naranja Spathios.
- Cards con radius moderado, max 8px salvo componentes existentes.
- Imágenes reales grandes.
- Iconos lucide en botones y labels.
- Texto sin overlap en mobile.
- Spacing consistente.
- No usar landing generica donde debe existir herramienta usable.

---

## 8. Component Architecture

Componentes recomendados:

```text
components/layout/
  app-header.tsx
  app-footer.tsx

components/search/
  search-toolbar.tsx
  date-time-filter-popover.tsx
  guests-filter-popover.tsx
  amenities-filter-popover.tsx
  price-filter-popover.tsx
  advanced-filters-dialog.tsx
  active-filter-chips.tsx
  map-toggle.tsx

components/venues/
  venue-result-card.tsx
  venue-map.tsx
  venue-gallery.tsx
  venue-booking-sidebar.tsx
  venue-amenities-section.tsx
  venue-rules-section.tsx
```

Reglas:

- No componentes de 1000 lineas.
- Formularios complejos por seccion.
- Hooks para estado de filtros.
- Types/interfaces centralizados.
- `use client` solo cuando sea necesario.

