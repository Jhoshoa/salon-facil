# Reglas de precio configurables por el owner (unidad mixta + temporadas) y horarios por día

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos
**Fase:** 1 - Evolucion Marketplace
**Estado:** Propuesto - por implementar (planeamiento, sin codigo aun)
**Depende de:** [Reservas_Rango_Fechas_Calendario_Formulario_Precios.md](Reservas_Rango_Fechas_Calendario_Formulario_Precios.md) Fase 1 (ya implementada) — esto es su Fase 2 y Fase 3 fusionadas y concretadas segun lo que pediste directamente.

---

## 1. Objetivo

Hoy `Venue.priceUnit` es un solo valor (EVENTO/HORA/DIA) para *todo* el local, y el owner solo puede editar el precio **BASE** — no existe forma de configurar "entre semana por hora, fin de semana por dia" ni "en enero cobro mas caro". Este plan agrega:

1. **Configuracion del owner**: elegir si el local cobra solo por dia, solo por hora, o combinado por dia de la semana — y si es combinado, decidir dia por dia.
2. **Precios por temporada/mes**: el owner puede definir un precio distinto para un rango de fechas (mas alto o mas bajo que el base), pensado para meses de alta demanda en Bolivia (fin de año, carnaval, etc.) o baja demanda.
3. **Horarios por dia en la reserva del cliente**: cuando el rango elegido mezcla dias "por hora" y dias "por dia", el formulario pide horario solo en los dias que lo necesitan; en los dias "por dia" usa por defecto el horario de atencion del local.
4. **Validacion estricta en ambos lados**: un horario "por hora" no puede salirse del horario de atencion de ese dia especifico — se valida en el navegador y se vuelve a validar (de forma autoritativa) en el servidor.
5. **Suma de precios correcta** sin importar la combinacion: todo por hora, todo por dia, o mezclado.

---

## 2. Estado actual verificado (no supuesto)

- `Venue.priceUnit` es un campo unico (`EVENT | HOUR | DAY`), aplicado a **todo** el local — no hay variacion por dia de semana.
- `VenuePrice` (`backend/prisma/schema.prisma`) ya tiene `priceType` (`BASE | WEEKEND | HOLIDAY | CUSTOM_DATE | SEASON_HIGH | EARLY_BIRD`), `dayOfWeek`, `specificDate`, `startDate`/`endDate` y `discountPercent` — el motor de "precio distinto por dia/fecha/temporada" **ya existe** a nivel de modelo y de calculo (`PriceCalculatorService.findApplicablePrice`, con prioridad `CUSTOM_DATE > HOLIDAY > SEASON_HIGH > WEEKEND > BASE`).
- El backend **ya acepta y persiste** un arreglo completo de `VenuePrice` al crear/actualizar un local (`venue.repository.ts` lineas 528 y 679, `CreateVenuePriceDto`) — no hace falta tocar esa parte del backend para reglas de *monto*.
- El hueco real esta en el **frontend del owner** (`venue-form.tsx`): la pestaña de precios solo tiene un input para `BASE` y un select de `priceUnit` unico. Cualquier fila `WEEKEND`/`SEASON_HIGH`/etc. que ya exista se preserva al guardar (no se borra), pero **no hay forma de crearla, editarla o borrarla** desde la UI. Esto ya estaba asi antes de este plan, no es una regresion.
- `PriceCalculatorService.calculateRange` (implementado en la Fase 1 de reservas por rango) ya resuelve el precio dia por dia, pero usa un **unico `priceUnit`** para todo el rango (parametro fijo, no por dia).
- `BookingForm` tiene un solo par Inicio/Fin aplicado a todos los dias del rango — no hay horario por dia todavia.
- `VenueOpeningHour` (horarios de atencion) ya existe por dia de semana y ya se usa en el calendario para marcar dias "cerrados" (Fase 1).

**Conclusion**: no hace falta rediseñar el modelo de datos de cero — `VenuePrice` casi alcanza. Falta: (a) que cada regla pueda declarar su **propia unidad** (no solo su monto), (b) la UI de owner para gestionar estas reglas, y (c) que el calculo y el formulario del cliente resuelvan la unidad **dia por dia**, no una sola vez para todo el rango.

---

## 3. Modelo de datos

### 3.1 `VenuePrice` gana un campo `unit`

```prisma
model VenuePrice {
  // ... campos existentes ...
  unit PriceUnit? @map("unit") // null = hereda Venue.priceUnit (retrocompatible)
}
```

- `null` (por defecto): la regla no cambia la unidad, solo el monto — comportamiento identico al actual, **cero migracion de datos necesaria** para las filas existentes.
- Con valor: esa regla, para los dias/fechas que cubre, se cobra con **esa** unidad, sin importar cual sea `Venue.priceUnit`.

Con esto, "entre semana por hora, fin de semana por dia" se modela con:

| Regla | dayOfWeek | unit | price |
|---|---|---|---|
| BASE (el default del local) | — | `HOUR` | 100 |
| Fila para Sabado | 6 | `DAY` | 900 |
| Fila para Domingo | 0 | `DAY` | 900 |

`Venue.priceUnit` sigue existiendo como **el default** cuando ninguna regla mas especifica aplica (mismo rol que ya cumple `basePrice`) — no se elimina, se reinterpreta como "la unidad por defecto salvo que una regla diga lo contrario".

### 3.2 Temporadas (`SEASON_HIGH`)

Ya soportado por el modelo (`startDate`/`endDate`). Se usa la UI nueva (seccion 5) para poder crearlas. Para permitir precios **mas bajos** en temporada baja sin agregar un enum nuevo, la UI simplemente no restringe el monto a ser mayor que el base — el nombre `SEASON_HIGH` queda como detalle interno; en la UI se etiqueta genericamente "Precio por temporada" (el propietario puede escribir un monto mayor o menor al base). Evita una migracion de enum.

### 3.3 Catalogo admin de feriados/temporadas sugeridas

Nuevo modelo, independiente de `VenuePrice`, exactamente con el mismo espiritu que `Amenity`/tipos de espacio/tipos de uso (catalogos que hoy administra el admin):

```prisma
model SuggestedSeasonalEvent {
  id        String   @id @default(uuid())
  name      String                          // "Carnaval 2027", "Fin de año", "Independencia"
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  note      String?                         // ej. "Alta demanda en salones de fiesta"
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@map("suggested_seasonal_events")
}
```

- Es un **catalogo de sugerencias**, no una tabla operativa: no tiene relacion (FK) con `VenuePrice`. Cuando un owner "aplica" una sugerencia (seccion 5.4), el backend simplemente copia `name`/`startDate`/`endDate` a una fila `VenuePrice` nueva que el owner controla desde ahi en adelante — si el admin despues edita o desactiva la sugerencia, las reglas que los owners ya crearon a partir de ella **no se alteran** (evita un acoplamiento raro donde un cambio del admin mueve precios ya publicados sin que el owner se entere).
- Fechas explicitas por año (ej. "Carnaval 2027: 15-18 feb"), no logica de recurrencia/feriados moviles calculada automaticamente — Bolivia tiene feriados que dependen del calendario lunar (Carnaval, Semana Santa) o cambian por decreto (feriados departamentales, feriados "puente" declarados año a año), asi que intentar calcularlos seria fragil y probablemente incorrecto. El admin mantiene la lista con un ritual simple y de bajo esfuerzo: una vez al año, cargar los feriados/temporadas del año siguiente (5-10 filas). Se documenta como tarea operativa, no como limitacion tecnica a resolver despues.

### 3.4 Migracion

Dos cambios de esquema, ambos sin riesgo de datos:
1. `VenuePrice.unit` — una sola columna nueva, nullable, sin backfill necesario (todas las filas existentes quedan `unit = null`, que es exactamente su comportamiento actual).
2. `SuggestedSeasonalEvent` — tabla nueva, vacia al crearse (el admin la puebla desde la UI despues, no hace falta seed obligatorio aunque conviene precargar 5-6 feriados nacionales conocidos para que la funcion no se vea vacia el primer dia).

Es la migracion mas simple de las que se han hecho en este proyecto — `db push` + `migration.sql` equivalente, sin pasos de backfill.

---

## 4. Backend

### 4.1 DTOs

`CreateVenuePriceDto` (y su equivalente de actualizacion) ganan:

```ts
@IsOptional()
@IsIn(['EVENT', 'HOUR', 'DAY'])
unit?: PriceUnit;
```

### 4.2 `PriceCalculatorService.calculateRange`: resolver unidad por dia

Cambia la firma: en vez de recibir un `priceUnit` fijo para todo el rango, recibe (por dia) las horas propuestas por el cliente **solo quando aplica**:

```ts
calculateRange(
  prices: VenuePriceEntity[],
  defaultUnit: PriceUnit,           // Venue.priceUnit, el fallback
  days: { date: Date; hours?: number }[], // hours solo si ese dia resulta ser HOUR
): RangePriceCalculationResult
```

Por cada dia:
1. Encuentra la regla aplicable (misma logica de prioridad ya existente).
2. La unidad efectiva de ese dia = `matched.unit ?? defaultUnit`.
3. Si la unidad es `HOUR`, multiplica por las horas de *ese* dia (ver 4.4 — vienen del `dailySchedule` del cliente). Si el cliente no mando horas para un dia que resulto ser HOUR, es un error de validacion (4.4 lo impide antes de llegar aqui).
4. Si es `DAY` o `EVENT`, no multiplica por horas.

El invariante `sum(days[].appliedPrice) === totalPrice` (ya cubierto por tests en la Fase 1) se mantiene igual, ahora con unidades mixtas dentro del mismo resultado.

### 4.3 `BookingService.requestBooking`: horario por dia

El DTO de creacion de reserva gana un campo opcional (ya anticipado en el plan anterior, seccion 5.1, ahora se concreta):

```ts
class DailyScheduleEntryDto {
  @IsDateString() date!: string;
  @IsString() @Matches(TIME_REGEX) startTime!: string;
  @IsString() @Matches(TIME_REGEX) endTime!: string;
}

class CreateBookingDto {
  // ... campos existentes (eventDate, endDate, startTime, endTime = fallback/legacy) ...
  @IsOptional() @ValidateNested({ each: true }) @Type(() => DailyScheduleEntryDto)
  dailySchedule?: DailyScheduleEntryDto[];
}
```

Reglas de validacion en `requestBooking`, **antes** de calcular precio:

1. Para cada dia del rango, resolver su unidad efectiva (4.2).
2. Si la unidad es `HOUR`:
   - Debe existir una entrada en `dailySchedule` para esa fecha exacta (si no vino `dailySchedule`, se usa el `startTime`/`endTime` global como fallback para *todos* los dias HOUR — retrocompatible con reservas de un solo dia).
   - `startTime`/`endTime` de ese dia deben caer dentro de `VenueOpeningHour` del dia de semana correspondiente (`opensAt <= startTime` y `endTime <= closesAt`), y ese dia de semana no puede estar `isClosed`. Si falla, `BadRequestException` con el dia y el horario permitido en el mensaje (ej. "El 12 de octubre el local abre de 08:00 a 22:00").
3. Si la unidad es `DAY`:
   - Se ignora cualquier horario que el cliente haya mandado para ese dia (no afecta precio); internamente se guarda el horario de atencion completo de ese dia de semana como `BookingDate.startTime/endTime` (informativo, para que el owner sepa "todo el dia").
4. `dailySchedule`, si viene, debe cubrir exactamente los dias del rango que resultaron `HOUR` — ni de mas ni de menos (fechas fuera de rango o duplicadas → `BadRequestException`).

`BookingDate.startTime`/`endTime` (la tabla ya creada en la Fase 1) pasan a poder variar por fila — el modelo ya lo permite, solo cambia quien decide el valor de cada fila (antes: el mismo horario global para todas; ahora: por dia, segun 2-3 de arriba).

### 4.4 `previewPrice`: mismo tratamiento

El endpoint de vista previa (ya existente) recibe el mismo `dailySchedule` opcional y aplica las mismas validaciones, para que el desglose que ve el cliente **antes** de enviar sea el mismo calculo que el servidor usara al crear la reserva — nunca deben divergir.

### 4.5 Catalogo de feriados/temporadas sugeridas: endpoints

Mismo patron ya usado por `venues/admin/catalog/...` (space types, use types, amenities) — se agrega un cuarto catalogo al mismo controller, no un modulo nuevo:

- `GET /venues/catalog/seasonal-events` (`@Public()`): lista solo `isActive: true`, ordenado por `sortOrder`/`startDate` — lo consume el owner al armar su seccion de temporadas (5.4).
- `GET /venues/admin/catalog/seasonal-events` (`@Roles(ADMIN)`): lista completa, incluye inactivos — vista de administracion.
- `POST /venues/admin/catalog/seasonal-events` / `PUT /venues/admin/catalog/seasonal-events/:id` (`@Roles(ADMIN)`): crear/editar (`CreateSeasonalEventDto`: `name`, `startDate`, `endDate`, `note?`, `sortOrder?`, con `@IsDateString()` y una validacion `endDate >= startDate`, mismo estilo que las validaciones ya existentes en `booking.dto.ts`).
- `DELETE /venues/admin/catalog/seasonal-events/:id` (`@Roles(ADMIN)`): igual que los otros tres catalogos, es un soft-delete (`isActive: false`), nunca borrado fisico — asi una sugerencia ya aplicada por owners sigue siendo trazable si el admin necesita auditar.

No hace falta un modulo `catalog` nuevo si el proyecto sigue el patron actual de tener estos catalogos dentro de `venue` (confirmar contra el codigo real al implementar — el plan anterior de dashboard/admin, si ya está implementado, puede haber introducido un modulo `catalog` dedicado; en ese caso este cuarto catalogo va ahi en vez de en `venue`).

---

## 5. Frontend: owner — gestion de reglas de precio

### 5.1 Nueva seccion en la pestaña "Precios" de `venue-form.tsx`

Reemplaza el input unico de `basePrice` + select de `priceUnit` por:

1. **Precio base y unidad por defecto** (lo que ya existe hoy, sin cambios de UX).
2. **Modo de precio**: tres opciones con radio buttons —
   - "Un solo precio y unidad para todo el local" (comportamiento actual, sin reglas adicionales).
   - "Reglas por dia de la semana" — activa una grilla de 7 dias (Lun-Dom), cada uno con un selector Hora/Dia y un precio opcional (si no se especifica precio, hereda el base).
   - "Ambos" — la grilla de dias de semana, **mas** la seccion de temporadas de 5.2 activa simultaneamente.
3. La grilla de dias de semana se guarda como filas `VenuePrice` con `priceType: WEEKEND` (o un nuevo valor generico si se prefiere distinguir "override de dia especifico" de "fin de semana" — se recomienda reusar `WEEKEND` para dias 0 y 6, y agregar `CUSTOM_DATE`-like con `dayOfWeek` para el resto, ya que el enum no distingue "lunes especial" de "fin de semana especial"; alternativa mas limpia: renombrar conceptualmente el uso de `WEEKEND` a "por dia de semana" en la UI, sin importar cual dia sea — el campo `dayOfWeek` ya identifica cual es).

### 5.2 Seccion "Precios por temporada"

Lista (patron `CatalogManager`, ya usado para catalogos de amenities/tipos — se reusa el mismo componente/estetica) de reglas `SEASON_HIGH` con: nombre/etiqueta libre ("Fin de año", "Carnaval"), rango de fechas, precio, unidad (opcional, hereda si no se especifica). Crear/editar/desactivar, igual que ya funciona para amenities.

Sobre el formulario para crear una fila nueva se agrega un boton secundario **"Usar una sugerencia"** que abre un selector con el catalogo admin de feriados/temporadas (seccion 5.4) — al elegir una, precarga `name`/`startDate`/`endDate` en el formulario, pero el owner sigue siendo quien escribe el precio y puede editar las fechas antes de guardar. Es un atajo, no una obligacion: el owner puede seguir escribiendo una temporada completamente propia sin tocar el catalogo sugerido.

### 5.3 Validaciones de la UI (antes de guardar)

- Rango de temporada `startDate <= endDate`.
- No dejar crear dos reglas de temporada con rangos que se superpongan exactamente igual (advertencia, no bloqueo — la prioridad de calculo ya definida en 4.2 resuelve el empate de forma predecible, pero superponer sin querer suele ser un error del owner y vale la pena avisarle).
- Precio de cualquier regla `>= 0`.

### 5.4 Admin: catalogo de feriados y temporadas sugeridas

Cuarto catalogo administrado, mismo lugar y misma UI que ya existe para space types / use types / amenities (`frontend/src/app/admin/catalog/{amenities,space-types,use-types}/page.tsx` + `CatalogManager`):

- Nueva pagina `frontend/src/app/admin/catalog/seasonal-events/page.tsx`, agregada al sidebar del admin ("Feriados y temporadas") junto a los otros tres catalogos.
- `CatalogManager` hoy esta pensado para filas `key`/`name`/`icon`/`sortOrder`/`isActive` (catalogos "planos"). Este catalogo tiene campos distintos (`name`, rango de fechas, `note` opcional) — dos opciones, a decidir al implementar segun cuanto cueste generalizar el componente existente:
  - **Opcion A (recomendada, menos riesgo)**: un componente hermano `SeasonalEventCatalogManager`, mismo layout visual (lista + dialogo de alta/edicion + toggle activo/inactivo + eliminar) pero con un formulario propio (nombre, fecha inicio, fecha fin, nota) en vez del generico de `key`/`icon`.
  - **Opcion B**: generalizar `CatalogManager` para aceptar un `renderFields`/schema de campos por catalogo. Mas trabajo, se justifica solo si en el futuro aparece un quinto catalogo con esta misma forma.
- Validaciones del formulario admin: `startDate <= endDate`, `name` no vacio; advertencia (no bloqueo) si se superpone con otra sugerencia activa — mismo criterio que 5.3 para el owner.
- El admin **no** define precios ni unidades aca — el catalogo es puramente "nombre + rango de fechas", la parte de precio la decide cada owner al aplicar la sugerencia (5.2). Esto evita que el admin termine fijando precios de terceros, algo fuera del rol que la plataforma le da hoy (el admin aprueba/modera, no fija tarifas).
- Esta seccion es **opcional para el lanzamiento**: si no hay tiempo, el owner sigue pudiendo crear temporadas escribiendo las fechas a mano (5.2 sin el boton de sugerencias) — el catalogo admin es una mejora de UX, no un bloqueante funcional. Se puede entregar en una iteracion separada dentro de esta misma fase.

---

## 6. Frontend: cliente — horario por dia en la reserva

### 6.1 Cuando se activa

Se activa automaticamente cuando el rango elegido por el cliente contiene **al menos un dia cuya unidad efectiva es `HOUR`** (resuelto llamando a la misma logica de 4.2, expuesta al frontend a traves del `preview-price` ya existente — el desglose por dia que devuelve ya incluye, con este plan, la unidad resuelta de cada dia, no solo el precio).

### 6.2 Diseño del formulario

- Si **todos** los dias del rango son `DAY`/`EVENT`: el formulario se ve exactamente como hoy (un horario global, puramente informativo, precargado con el horario de atencion del primer dia y bloqueado — no editable, ya que no afecta precio ni tiene sentido variarlo dia a dia si ninguno depende de la hora).
- Si **algun** dia es `HOUR`: aparece una lista, una fila por cada dia del rango:
  - Dias `HOUR`: par de inputs de hora, editables, precargados con el horario de atencion de ese dia de semana como sugerencia, con `min`/`max` nativos del input ligados al horario de atencion (ademas de la validacion explicita).
  - Dias `DAY`: fila sin inputs, solo el texto "Dia completo (horario del local: 08:00 - 22:00)".
- Debajo de cada input de hora invalido (fuera del horario de atencion), el mismo patron de error inline ya usado en el resto del formulario (`text-sm text-destructive`).
- El boton de enviar se deshabilita si cualquier dia `HOUR` tiene un horario invalido o incompleto (mismo patron `canSubmit` ya usado).

### 6.3 Sincronizacion con el calculo de precio

Cada cambio en cualquier horario de cualquier dia dispara de nuevo `previewBookingPrice` (ya existe desde la Fase 1, solo se le agrega el `dailySchedule`) — el desglose por dia que ya se muestra hoy (Fase 1) sigue funcionando igual, ahora reflejando que cada fila puede tener una hora distinta.

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| El owner configura reglas contradictorias (ej. dos reglas de temporada superpuestas con precios distintos) | Medio | Prioridad de resolucion ya determinista (4.2); UI avisa de superposiciones al guardar (5.3) |
| El cliente arma un horario "por hora" fuera de atencion manipulando el DOM o llamando la API directo (bypass del frontend) | Alto si no se valida en servidor | Validacion identica y autoritativa en `requestBooking` (4.3) — el frontend es solo UX, nunca la unica barrera |
| Migrar `unit` nullable rompe el calculo existente para reservas ya creadas o locales sin reglas nuevas | Alto si se rompe | `unit: null` es explicitamente "sin cambio de comportamiento"; ningun dato existente necesita backfill |
| El desglose de precio mostrado al cliente (`previewPrice`) diverge del que realmente cobra `requestBooking` | Alto (perdida de confianza) | Mismo codigo de resolucion de unidad y de validacion se usa en ambos, sin duplicar logica |
| Owner configura "por hora" un dia que ademas esta marcado `isClosed` en horarios de atencion | Bajo | Ya imposible de seleccionar como parte de un rango (variante `closed` del calendario, Fase 1); si igual llega al backend (bypass), se rechaza en la misma validacion de 4.3 |
| La grilla de 7 dias + temporadas hace la pestaña de precios abrumadora para un owner que solo quiere un precio simple | Medio | El modo "Un solo precio para todo el local" (5.1, opcion 1) es el default y oculta toda la complejidad adicional — nadie ve la grilla ni las temporadas a menos que la elija explicitamente |
| El catalogo admin de feriados queda desactualizado (feriados moviles como Carnaval requieren carga manual cada año) | Bajo-Medio | Documentado como tarea operativa anual del admin (3.3); si no se actualiza, el owner simplemente no ve esa sugerencia y sigue pudiendo escribir la fecha a mano — nunca bloquea la creacion de una temporada propia |
| El admin edita o desactiva una sugerencia despues de que varios owners ya la aplicaron, y eso altera precios ya publicados sin que el owner se entere | Alto si ocurriera | Explicitamente evitado por diseño (3.3): aplicar una sugerencia **copia** los valores a la fila `VenuePrice` del owner, sin FK ni referencia viva al catalogo — cambios posteriores del admin no tocan reglas ya creadas |

---

## 8. Fuera de alcance

- Precios distintos por **capacidad de invitados** (ej. mas caro con mas de 200 personas) — no se pidio, no se incluye.
- Descuentos automaticos por reserva anticipada (`EARLY_BIRD` ya existe en el enum pero su logica de "cuantos dias antes" no esta implementada ni se pidio ahora) — se deja como esta hoy (dato del modelo sin UI, igual que `SEASON_HIGH` estaba antes de este plan).
- Multiples monedas o impuestos — todo sigue en BOB, sin cambios.

---

## 9. Criterios de aceptacion

- El owner puede elegir, por local: un precio/unidad unico, reglas por dia de semana, o reglas por dia de semana + temporadas — sin tocar codigo ni base de datos a mano.
- Un local configurado "por hora entre semana, por dia el fin de semana" calcula correctamente una reserva que cruza ambos tipos de dia, con el desglose mostrando cada dia por separado y el total como la suma exacta.
- Una reserva de fechas dentro de una temporada configurada usa el precio de esa temporada, no el base, sin importar si es mas alto o mas bajo.
- El cliente ve inputs de horario solo en los dias que los necesitan (unidad `HOUR`); en los dias `DAY` ve el horario de atencion sin poder alterarlo.
- Un horario fuera del horario de atencion de ese dia especifico es rechazado con un mensaje claro, tanto si se intenta desde el formulario como si se envia directo a la API.
- El desglose de precio mostrado antes de enviar (`preview-price`) siempre coincide con el precio final de la reserva creada.
- El admin puede crear/editar/desactivar sugerencias de feriados y temporadas desde su panel, y esas sugerencias aparecen inmediatamente disponibles para que cualquier owner las aplique al crear una regla de temporada propia.
- Aplicar una sugerencia precarga nombre y fechas pero nunca fija el precio — el owner siempre decide el monto, y editar o desactivar la sugerencia despues no altera las reglas de precio que los owners ya crearon a partir de ella.
- `tsc`, `eslint`/`next lint` y tests (nuevos para `calculateRange` con unidades mixtas, para la validacion de horario por dia, y para el CRUD admin del catalogo de temporadas incluyendo rechazo por rol no-admin) pasan antes de dar la fase por terminada.
