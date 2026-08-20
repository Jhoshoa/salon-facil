# Sprint 9: Trust, Conversion, SEO y Recomendaciones

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos  
**Fase:** 1 - Evolucion Marketplace  
**Sprint:** 9  
**Duracion estimada:** 7-10 dias  

---

## 1. Objetivo

Mejorar confianza, conversion y descubrimiento despues de tener catalogo avanzado y owner onboarding.

Sprint 9 debe hacer que la plataforma se sienta confiable, completa y orientada a reserva:

- Reviews verificadas.
- Favoritos.
- Preguntas frecuentes.
- Espacios similares.
- SEO dinamico.
- Recomendaciones.
- Analytics basico.
- Refinamiento visual final.

---

## 2. Alcance Backend

### 2.1 Reviews mejoradas

Extender reviews para:

- Rating general.
- Rating por categorias: limpieza, comunicacion, ubicacion, relacion precio/calidad.
- Solo clientes con booking completado pueden dejar review verificada.
- Agregado por venue: promedio, total, distribucion.

Endpoints:

```http
GET /api/v1/venues/:venueId/reviews
POST /api/v1/bookings/:bookingId/review
GET /api/v1/venues/:venueId/reviews/summary
```

### 2.2 Favoritos

Modelo `FavoriteVenue`:

- userId.
- venueId.
- createdAt.

Endpoints:

```http
GET /api/v1/favorites
POST /api/v1/favorites/:venueId
DELETE /api/v1/favorites/:venueId
```

### 2.3 FAQ por venue

Modelo `VenueQuestion` o FAQ editable por owner:

- Preguntas frecuentes del venue.
- Preguntas creadas por owner.
- Futuro: preguntas de clientes.

### 2.4 Recomendaciones

Inicialmente reglas simples:

- Mismo distrito/ciudad.
- Mismo tipo de espacio.
- Mismos usos.
- Capacidad similar.
- Precio cercano.
- Featured venues primero.

Endpoint:

```http
GET /api/v1/venues/:venueId/similar
```

### 2.5 Analytics basico

Eventos internos:

- venue_view.
- search_performed.
- availability_clicked.
- booking_started.
- booking_submitted.
- payment_proof_uploaded.

No implementar dashboard analitico complejo en Sprint 9; solo capturar datos y exponer resumen basico owner.

---

## 3. Alcance Frontend

### 3.1 Trust en detalle

Agregar secciones:

- Reviews con resumen y cards.
- Preguntas frecuentes.
- Espacios similares.
- Normas y politicas mejor presentadas.
- Badges de verificacion.
- Mensajes de seguridad y pago protegido/manual.

### 3.2 Favoritos

- Boton corazon en cards y detalle.
- Estado autenticado.
- Si no hay sesion, abrir login/register flow o redirigir.
- Pagina `/favorites`.

### 3.3 SEO

Metadata dinamica:

- Venue detail.
- City pages.
- Use type pages.
- Search result canonical basico.

Ejemplos:

```text
Alquiler de salones para bodas en La Paz | SalonFacil
Salon Jardin Norte para eventos en El Alto | SalonFacil
```

### 3.4 Recomendaciones y descubrimiento

Home:

- Espacios destacados.
- Por tipo de evento.
- Por ciudad/zona.
- Recientes.

Detalle:

- Espacios similares.
- Otros espacios del mismo owner.

Resultados:

- Ordenamiento por destacados, precio, capacidad, rating.

---

## 4. UX y Visual Refinement

Usar Booking-first:

- Secciones claras y comparables.
- CTA persistente.
- Confianza visible cerca del CTA.
- Reviews y politica antes de decisiones sensibles.

Mantener identidad propia:

- No copiar paletas.
- Estilo limpio, profesional, orientado a eventos.
- Imagenes grandes y reales.
- Informacion densa pero escaneable.

---

## 5. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| Reviews falsas | Alto | Solo reviews con booking completado |
| Favoritos rompe flujo anonimo | Medio | CTA de login claro y no intrusivo |
| SEO genera URLs duplicadas | Medio | Canonicals y metadata controlada |
| Recomendaciones irrelevantes | Medio | Empezar con reglas simples y medibles |
| Analytics invade codigo | Medio | Servicio centralizado y eventos tipados |

---

## 6. Criterios de Aceptacion

- Usuarios pueden guardar favoritos.
- Reviews verificadas funcionan por booking completado.
- Venue detail muestra reviews, FAQ y similares.
- Home tiene secciones de descubrimiento.
- Metadata dinamica funciona en detail y paginas principales.
- Eventos analiticos basicos se registran.
- Build/lint/tests pasan.

