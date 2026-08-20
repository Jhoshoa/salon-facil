# Data Model: Catalogo Avanzado de Espacios

## 1. Objetivo

Definir la base de datos necesaria para que SalonFacil soporte un marketplace profesional de espacios para eventos, con busqueda avanzada, detalle rico y gestion owner.

---

## 2. Modelo Actual

Ya existe:

- `Venue`
- `VenueService`
- `VenuePrice`
- `Booking`
- `CalendarBlock`
- `Review`
- `Payment`

Limitacion actual:

- `VenueService` mezcla servicios, amenities y extras.
- No hay catalogo normalizado de amenities.
- No hay tipos de espacio.
- No hay usos/eventos recomendados.
- No hay horarios normalizados.
- Fotos viven como JSON en `Venue.photos`.
- Filtros avanzados requieren relaciones consultables.

---

## 3. Modelo Objetivo Sprint 7

Nuevos conceptos:

- Amenity catalog.
- Venue amenities.
- Venue use types.
- Venue opening hours.
- Venue media.
- Venue space type.
- Price unit.
- Minimum hours.
- Instant booking flag.
- Allows multiple days flag.

---

## 4. Enums

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

---

## 5. Tablas Nuevas

### Amenity

Catalogo global para filtros y seleccion owner.

Campos:

- id.
- key unico.
- name.
- category.
- icon.
- sortOrder.
- isActive.

### VenueAmenity

Relacion entre venue y amenity.

Campos:

- venueId.
- amenityId.
- isIncluded.
- extraCost.
- notes.

### VenueUse

Tipos de evento o produccion ideales para el espacio.

Campos:

- venueId.
- useType.
- isPrimary.

### VenueOpeningHour

Horario semanal normalizado.

Campos:

- venueId.
- dayOfWeek.
- opensAt.
- closesAt.
- isClosed.

### VenueMedia

Media ordenable.

Campos:

- venueId.
- type.
- url.
- alt.
- sortOrder.
- isCover.

---

## 6. Cambios en Venue

Agregar:

- `spaceType`
- `minimumHours`
- `priceUnit`
- `instantBooking`
- `allowsMultipleDays`

Mantener:

- `photos` como compatibilidad temporal.
- `VenueService` como compatibilidad temporal.

---

## 7. Indices Requeridos

- `Venue.status`
- `Venue.city`
- `Venue.district`
- `Venue.capacityMax`
- `Venue.spaceType`
- `Venue.latitude, Venue.longitude`
- `VenueAmenity.venueId`
- `VenueAmenity.amenityId`
- `VenueUse.useType`
- `VenueOpeningHour.venueId, dayOfWeek`
- `VenueMedia.venueId, sortOrder`

---

## 8. Migracion

Orden:

1. Crear enums.
2. Crear tablas nuevas.
3. Agregar campos nullable/default a Venue.
4. Crear indices.
5. Seed catalogos.
6. Poblar venues existentes con valores default.
7. Mantener compatibilidad con `photos` y `VenueService`.

No borrar columnas ni tablas existentes en Sprint 7.

---

## 9. Seed Base

Amenities iniciales:

- Cocina.
- Banos.
- Jardin.
- Terraza.
- Aire acondicionado.
- Wi-Fi.
- Sonido.
- Microfonos.
- Proyector.
- Iluminacion.
- Catering propio.
- Permite catering externo.
- Permite alcohol.
- Parqueo privado.
- Acceso silla de ruedas.

Use types:

- Boda.
- Cumpleanos.
- Corporativo.
- Fiesta privada.
- Graduacion.
- Conferencia.
- Sesion de fotos.
- Rodaje.
- Pop up.
- Team building.

---

## 10. Compatibilidad

Frontend y backend deben soportar temporalmente:

- `venue.photos`
- `venue.services`
- `venue.media`
- `venue.amenities`

Regla de lectura:

- Preferir `VenueMedia` si existe.
- Fallback a `Venue.photos`.
- Preferir `VenueAmenity` si existe.
- Fallback a `VenueService`.

---

## 11. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Romper venues existentes | No eliminar tablas actuales; migracion additive |
| Filtros lentos | Indices y paginacion |
| Doble modelo services/amenities | Mapper de compatibilidad y deprecacion documentada |
| Seed inconsistente | Seed idempotente con keys estables |

