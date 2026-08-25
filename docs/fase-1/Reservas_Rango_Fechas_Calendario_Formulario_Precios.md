# Reservas por rango de fechas: calendario, formulario y precios

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos
**Fase:** 1 - Evolucion Marketplace
**Estado:** Propuesto - por implementar (planeamiento, sin codigo aun)
**Duracion estimada:** Fase 1 (nucleo) 8-12 dias, Fase 2 (horarios por dia) 3-4 dias, Fase 3 (unidades mixtas) fuera de alcance, se deja como propuesta futura

---

## 1. Objetivo

Hoy una reserva es siempre de **un solo dia**. El calendario visual (`AvailabilityCalendar`) ya deja hacer clic en un dia y llenar el formulario (`BookingForm`), pero no existe forma de elegir un **rango** de dias. Este documento planea:

1. Seleccionar un rango de fechas en el calendario, incluyendo el caso donde el rango cruza de un mes al siguiente.
2. Sincronizacion bidireccional: elegir el rango en el calendario llena las fechas del formulario, y escribir las fechas en el formulario resalta el rango en el calendario.
3. Heredar fecha inicio/fin opcionalmente desde la busqueda (`/venues?startDate=...&endDate=...`) cuando el cliente llega al detalle de un local desde un resultado de busqueda.
4. Resaltar el rango en el calendario con un color suave, distinto del rojo/ambar de "reservado"/"bloqueado".
5. Si el rango tiene mas de un dia y el local cobra por hora, permitir horarios distintos por cada dia del rango, con un valor por defecto tomado de los horarios de atencion del local.
6. Dejar planteado (sin implementar en esta fase) el caso de locales que quieran cobrar por hora ciertos dias y por dia otros dias (ej. entre semana por hora, fin de semana por dia completo).

**No perder de vista el objetivo real**: el problema del usuario no es "queremos una feature de rangos" en abstracto, es que el marketplace no puede vender eventos de varios dias (bodas de fin de semana completo, producciones audiovisuales de varios dias, etc.) porque el sistema de reservas asume un evento = un dia. Todo lo que sigue esta al servicio de eso.

---

## 2. Estado actual del codigo (verificado, no supuesto)

Esto es importante porque cambia el tamaño real del trabajo:

### 2.1 El modelo de datos no tiene rango

`Booking` (`backend/prisma/schema.prisma`) tiene un solo campo `eventDate` (`@db.Date`). No hay `endDate`. Toda la cadena de creacion de reserva (`BookingService.requestBooking`, `CreateBookingDto`, `bookingSchema` en frontend) trabaja con una fecha.

### 2.2 `priceUnit` es cosmetico, no calcula nada

`Venue.priceUnit` (`EVENT | HOUR | DAY`) hoy **solo se usa para el texto** ("por hora", "por evento", "por dia") en el frontend. `PriceCalculatorService.calculate(prices, eventDate)` devuelve un precio **plano** por reserva: no multiplica por horas ni por dias, sin importar el `priceUnit`. Es decir, un local "Bs 450/hora" cobra Bs 450 sea el evento de 4 horas o de 10 horas, hoy mismo, con una sola fecha. Esto es un defecto preexistente independiente de este plan, pero **una reserva de varios dias lo vuelve imposible de ignorar**: sin multiplicar por dias/horas, un rango de 3 dias costaria lo mismo que un evento de 3 horas. Este plan tiene que arreglarlo como parte del trabajo, no puede quedar pendiente.

### 2.3 Ya existen piezas reutilizables, pero desconectadas

- `VenuePrice` ya soporta `dayOfWeek`, `specificDate`, `startDate`/`endDate` (para temporadas) y `discountPercent` — el motor de "precio distinto segun el dia" ya existe a nivel de fila de precio, solo falta que el calculador lo recorra dia por dia en vez de una sola vez.
- `AvailabilityService.checkAvailabilityRange(venueId, startDate, endDate)` **ya esta escrita** (recorre dia por dia con `checkAvailability`) pero **no la llama nadie** — no hay controller que la exponga. Es codigo muerto listo para conectar.
- El buscador (`VenueFilterDto.startDate`/`endDate`) ya filtra locales que tengan **cualquier** reserva o bloqueo dentro del rango completo (`venue.repository.ts` lineas 268-306) — el buscador ya "piensa en rangos" para descartar resultados, aunque la reserva real todavia no.
- `Venue.allowsMultipleDays` existe en el schema y se muestra como badge "Multi-dia" en el detalle, pero **nada lo lee** para habilitar o deshabilitar el flujo de rango. Hoy es puramente informativo.

### 2.4 Riesgo de concurrencia ya presente, se agrava con rangos

`hasConflict()` (booking.repository.ts) verifica conflictos con un `count()` antes de insertar — **no hay restriccion unica a nivel de base de datos** en `(venueId, eventDate)` para `Booking`. Es un patron "verificar-luego-escribir" (TOCTOU): dos solicitudes simultaneas para la misma fecha podrian pasar la verificacion antes de que la primera inserte. Hoy el impacto es acotado (un dia). Con reservas de varios dias, la ventana de una condicion de carrera crece proporcionalmente al numero de dias del rango. Este plan debe cerrar ese hueco, no solo heredarlo.

En contraste, `CalendarBlock` **si** tiene `@@unique([venueId, date])` — la base de datos rechaza un bloqueo duplicado automaticamente. Es el patron correcto y este plan lo va a reusar.

---

## 3. Decision de alcance: que entra y que no

Dado lo anterior, separar en fases es obligatorio para que esto sea manejable:

| Fase | Contenido | Se implementa ahora? |
|---|---|---|
| **1 - Nucleo** | `Booking` con rango de fechas, disponibilidad por rango atomica (con constraint de BD), precio por rango con el `priceUnit` unico actual del local (EVENT/HOUR/DAY, sin mezclar), calendario con seleccion de rango + resaltado + persistencia entre meses, sincronizacion calendario↔formulario, deep-link desde busqueda | Si, es el foco de este documento |
| **2 - Horarios por dia** | Cuando el rango es multi-dia y el local cobra por hora, permitir horario distinto por cada dia, con default de `VenueOpeningHour` | Si, como segunda etapa del mismo trabajo, depende de la Fase 1 |
| **3 - Unidades mixtas por dia de semana** | Un local que cobra por hora Lunes-Viernes y por dia Sabado-Domingo (o cualquier combinacion configurable por el owner) | **No en este plan.** Requiere rediseñar el modelo de precio para que la *unidad* (no solo el monto) varie por regla, mas una UI de configuracion nueva para el owner. Ver seccion 9. |

---

## 4. Modelo de datos

### 4.1 `Booking`: de un dia a un rango, con desglose diario

Dos maneras de modelarlo:

**Opcion A (rechazada): un campo `endDate` nullable y nada mas.**
Simple, pero no alcanza: no permite horarios distintos por dia (seccion 6), y no da un punto natural para poner una restriccion `UNIQUE` que impida doble reserva por dia (una fila de `Booking` cubre 3 dias, un `UNIQUE` sobre esa fila no puede expresar "estos 3 dias en particular").

**Opcion B (recomendada): tabla hija `BookingDate`, una fila por dia reservado.**

```prisma
model Booking {
  // ... campos existentes ...
  eventDate DateTime @map("event_date") @db.Date // pasa a significar "fecha de inicio"
  endDate   DateTime @map("end_date") @db.Date    // nuevo; igual a eventDate en reservas de un dia

  dates BookingDate[]
}

model BookingDate {
  id           String   @id @default(uuid())
  bookingId    String   @map("booking_id")
  venueId      String   @map("venue_id") // denormalizado a proposito, ver mas abajo
  date         DateTime @db.Date
  startTime    DateTime @db.Time
  endTime      DateTime @db.Time
  appliedPrice Decimal  @db.Decimal(12, 2) // precio ya calculado para ESE dia especifico

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  venue   Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@unique([venueId, date])
  @@index([bookingId])
  @@map("booking_dates")
}
```

Por que `venueId` duplicado en `BookingDate` (en vez de solo `bookingId`): el `@@unique([venueId, date])` es lo que le pide a **la base de datos** que rechace dos reservas para el mismo local el mismo dia, sin importar de que `Booking` vengan. Sin `venueId` ahi, la unicidad solo podria expresarse por `bookingId`, que no sirve para comparar entre reservas distintas. Esto es exactamente el mismo patron que ya usa `CalendarBlock` (`@@unique([venueId, date])`), asi que es consistente con como ya esta resuelto el bloqueo de fechas en este proyecto.

**Beneficio extra, no buscado pero real:** crear un `Booking` + sus `BookingDate` dentro de una misma transaccion de Prisma convierte la verificacion de disponibilidad de "verificar y despues escribir" (con ventana de carrera) a "intentar escribir y dejar que la base de datos rechace si ya existe" — cierra el hueco de concurrencia descrito en 2.4, incluso para reservas de un solo dia.

Migracion: seguir el patron ya documentado en el proyecto (`db push` + SQL a mano + `migrate resolve`, ver la nota interna sobre por que `migrate dev` no funciona en este entorno) — no es nuevo, ya se hizo para los catalogos configurables.

### 4.2 Retrocompatibilidad de datos existentes

Las reservas ya creadas (`Booking.eventDate` sin `endDate`) necesitan un backfill: `endDate = eventDate`, y una fila de `BookingDate` por cada una con `startTime`/`endTime`/`appliedPrice` copiados de la reserva. Esto va en el mismo script SQL de migracion, no como paso manual aparte — si se olvida, `hasConflict`/`findActiveByVenueInRange` dejarian de ver las reservas viejas al migrar esas consultas a usar `BookingDate` (ver 5.2), lo que **abriria huecos de doble reserva en fechas ya comprometidas**. Es el riesgo mas serio de esta migracion y hay que probarlo explicitamente antes de desplegar.

### 4.3 Precio: calcular por rango en vez de una vez

`PriceCalculatorService.calculate()` cambia de recibir una fecha a recibir un arreglo de fechas (una por dia del rango) y devolver un desglose:

```ts
interface DailyPriceBreakdown {
  date: string;
  matchedPriceType: PriceType;
  appliedPrice: number; // ya resuelto para ESE dia (BASE, WEEKEND, HOLIDAY, etc.)
}

interface RangePriceCalculationResult {
  days: DailyPriceBreakdown[];
  subtotal: number;       // suma de appliedPrice de todos los dias (o de todas las horas, ver abajo)
  totalPrice: number;
  depositAmount: number;
}
```

Logica segun `priceUnit` del local (sigue siendo uno solo por local en esta fase, ver seccion 3):

- **EVENT**: sin cambios de fondo — se calcula una vez usando la fecha de inicio del rango, sin importar cuantos dias dure. (Coherente con "evento" como concepto: una boda de 3 dias con precio "por evento" cobra un monto fijo por el paquete completo.)
- **DAY**: se calcula el precio aplicable (BASE/WEEKEND/HOLIDAY/SEASON_HIGH/CUSTOM_DATE) **para cada dia del rango por separado** y se suman. Un rango que cruza de semana a fin de semana ya cobra distinto por dia automaticamente porque `VenuePrice.dayOfWeek`/`WEEKEND` ya existe.
- **HOUR**: igual que DAY pero multiplicado por las horas de *ese dia* (`endTime - startTime` del `BookingDate` de ese dia, ver seccion 6). Si el owner no personaliza horarios por dia, se usa el mismo horario para todos los dias del rango (comportamiento por defecto, sin pedirle nada extra al cliente).

El frontend debe mostrar el desglose (no solo el total) cuando hay mas de un dia, para que el cliente entienda por que el total no es "precio x dias" simple si hay un fin de semana con recargo en medio.

### 4.4 Disponibilidad por rango

`AvailabilityService.checkAvailabilityRange` ya existe (2.3) — se expone en un endpoint nuevo:

```http
GET /api/v1/venues/:venueId/bookings/availability-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Reusa el mismo guard de rango maximo que ya se agrego para el calendario (120 dias, `booking.service.ts`) para que nadie pida un rango de 5 años en una sola consulta. Devuelve disponibilidad dia por dia (igual forma que hoy usa `AvailabilityCalendar` para pintar el mes) para que el frontend pueda validar el rango elegido **antes** de que el cliente llene todo el formulario, no solo al enviar.

---

## 5. Backend: creacion de reserva con rango

### 5.1 DTO

```ts
class CreateRangeBookingDto {
  eventType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD, >= startDate
  guestCount: number;
  specialRequests?: string;
  // Fase 1: un solo horario para todo el rango (igual para cada dia)
  startTime: string;
  endTime: string;
  // Fase 2: horario por dia, opcional — si viene, tiene que cubrir EXACTAMENTE
  // cada fecha entre startDate y endDate, ni una de mas ni una de menos
  dailySchedule?: { date: string; startTime: string; endTime: string }[];
}
```

Validaciones nuevas en `BookingService` (ademas de las que ya existen — capacidad, horas invalidas, fecha pasada):

- `endDate >= startDate`.
- Si `venue.allowsMultipleDays === false`, rechazar con `BadRequestException` cualquier `endDate !== startDate` — el rango de mas de un dia solo es valido si el local lo habilito explicitamente. Este es el primer uso real de ese campo, hoy decorativo (2.3).
- Rango maximo razonable (ej. 30 dias) para evitar abuso — un local no se reserva por un año en una sola solicitud.
- Si viene `dailySchedule`, sus fechas tienen que ser exactamente el conjunto de dias entre `startDate` y `endDate`, sin huecos ni duplicados ni fechas fuera de rango.
- Cada dia del rango tiene que caer en un dia de la semana donde el local **no** este cerrado (`VenueOpeningHour.isClosed`) — ver el hallazgo relacionado en 6.3.

### 5.2 Creacion transaccional

```ts
await this.prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({ data: { ...bookingData, eventDate: startDate, endDate } });
  await tx.bookingDate.createMany({
    data: dailyBreakdown.map((day) => ({
      bookingId: booking.id,
      venueId,
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
      appliedPrice: day.appliedPrice,
    })),
  });
  return booking;
});
```

Si cualquier `BookingDate` choca con el `@@unique([venueId, date])` (porque otra reserva o bloqueo tomo esa fecha entre que el cliente vio el calendario y envio el formulario), Prisma lanza un error de restriccion unica (codigo `P2002`, el mismo que ya se maneja hoy para `CalendarBlock` en `isUniqueCalendarBlockError`) y **toda la transaccion se revierte** — no queda una reserva a medias con solo algunos dias del rango ocupados. El mensaje al usuario debe ser especifico: "La fecha X ya no esta disponible, elegi otro rango" (no un generico "error del servidor").

### 5.3 Consultas existentes que hay que migrar a `BookingDate`

`hasConflict`, `isDateBlocked` (no cambia, ya es por bloqueo no por reserva), `findActiveByVenueInRange` (el que alimenta el calendario visual) tienen que leer de `BookingDate` en vez de filtrar `Booking.eventDate` por rango, para que una reserva de 3 dias aparezca ocupando esos 3 dias exactos en el calendario de cualquier otro cliente/owner que lo consulte — no solo el primer dia.

---

## 6. Frontend: calendario con seleccion de rango

### 6.1 Maquina de estados de la seleccion

Estado levantado a `VenueDetail` (generalizando el `selectedBookingDate` que ya se agrego para fecha unica):

```ts
type DateRangeSelection =
  | { status: 'empty' }
  | { status: 'pending'; start: string }        // un extremo elegido, falta el otro
  | { status: 'complete'; start: string; end: string };
```

Transiciones al hacer clic en un dia **disponible** `D` del calendario:

- `empty` → clic en D → `pending { start: D }`.
- `pending { start: A }` → clic en D:
  - Si `D === A`: se interpreta como reserva de un solo dia → `complete { start: A, end: A }`.
  - Si `D > A`: se valida que **todos** los dias entre A y D (inclusive) esten en estado `available` (ni reservado, ni bloqueado, ni pasado, ni un dia en que el local este cerrado por horario — ver 6.3). Si pasa, `complete { start: A, end: D }`. Si no pasa, no se completa la seleccion: se muestra un aviso puntual ("Ese rango incluye fechas no disponibles, elegi otro cierre") y se queda en `pending { start: A }` para que el cliente intente otro cierre.
  - Si `D < A`: se trata como si D fuera el nuevo inicio → `pending { start: D }` (permite corregir sin tener que cancelar y empezar de cero).
- `complete { ... }` → clic en cualquier dia disponible → arranca una seleccion nueva, `pending { start: D }` (elegir de nuevo reemplaza al rango anterior, no lo extiende).
- Boton explicito "Limpiar seleccion" en cualquier estado no vacio → `empty`.

Clic en un dia **no disponible** (reservado/bloqueado/pasado) nunca cambia el estado de seleccion — sigue mostrando su info como hoy, sin afectar el rango en progreso.

### 6.2 Persistencia entre meses

`MonthCalendarGrid` sigue mostrando un mes a la vez, pero el estado de seleccion vive en el padre como fechas absolutas (`YYYY-MM-DD`), no como posiciones dentro del mes visible. El calculo de que variante visual pintar en cada celda (`available`/`booked`/`blocked`/`past`, mas el nuevo overlay de seleccion, ver 6.4) compara la fecha de esa celda contra `selection.start`/`selection.end` sin importar que mes este mostrando el calendario en ese momento. Consecuencia practica: si el cliente elige el 30 de agosto como inicio y navega a septiembre para elegir el cierre, al volver a agosto el 30 sigue apareciendo marcado como inicio del rango — no hace falta ningun manejo especial "cruce de mes", es una consecuencia natural de que el estado no dependa del mes visible.

Caso limite a probar explicitamente: elegir inicio y fin en **meses no consecutivos** (ej. inicio en agosto, fin en octubre, saltando septiembre) — el calendario solo puede mostrar un mes por vez, asi que septiembre (mes intermedio, completamente dentro del rango) nunca se ve resaltado mientras se elige, pero el rango en si es valido igual; el detalle/resumen fuera del calendario (seccion 6.5) es el que le confirma al cliente que eligio agosto 30 -> octubre 3, siendan aunque nunca vio setiembre marcado.

### 6.3 Un hallazgo relacionado que hay que resolver de paso

El calendario hoy **no tiene en cuenta `VenueOpeningHour.isClosed`** — si un local esta cerrado todos los domingos, el calendario igual pinta los domingos como `available` (verde) porque solo mira reservas y bloqueos, no horario de atencion. Esto ya es un bug hoy (un cliente podria intentar reservar un domingo "cerrado" y recien enterarse al enviar, si es que el backend siquiera lo valida — hoy tampoco lo hace). Para que la validacion de rango de 6.1 sea correcta (no dejar que un dia cerrado quede "en medio" de un rango valido sin que se note), este plan tiene que agregar una variante mas a los dias del calendario: `closed` (local cerrado ese dia de la semana), calculada en el frontend a partir de `venue.openingHours` sin pedir nada nuevo al backend. Un dia `closed` se trata igual que `blocked` para efectos de seleccion de rango (rompe el rango, no se puede elegir como extremo ni quedar en medio).

### 6.4 Resaltado visual del rango

`DayCellData` (en `month-calendar-grid.tsx`) gana un campo opcional, independiente de `variant`:

```ts
interface DayCellData {
  date: string;
  day: number;
  variant: 'available' | 'booked' | 'blocked' | 'past' | 'closed'; // 'closed' nuevo, ver 6.3
  label?: string;
  rangePosition?: 'start' | 'middle' | 'end' | 'single'; // nuevo, solo para disponibles
}
```

Se mantiene separado de `variant` a proposito: la seleccion es una capa visual sobre la disponibilidad, no la reemplaza. Estilo propuesto (consistente con los tokens `sf-*` ya usados): fondo `bg-primary/10` para dias intermedios del rango, `bg-primary/20` con esquinas redondeadas solo en el extremo para inicio/fin, en vez de un color fuerte que compita con el ambar de "reservado". Esto responde directamente al pedido de "un color suave".

### 6.5 Resumen fuera de la grilla

Debajo del calendario (donde hoy se muestra el detalle de un dia clickeado), cuando la seleccion esta en estado `complete`, se agrega un resumen: "29 ago - 31 ago 2026 (3 dias) · Bs X" con el boton "Usar este rango" (evolucion del "Usar esta fecha" que ya existe) — se mantiene el mismo patron de "elegir en el calendario no aplica solo hasta que el cliente confirma explicitamente", ya validado con la fecha unica.

### 6.6 Sincronizacion bidireccional calendario <-> formulario

Misma fuente de verdad: el estado de seleccion vive en `VenueDetail` y baja por props a ambos componentes (ya es el patron actual para fecha unica, se generaliza).

- **Calendario → formulario**: al confirmar el rango (boton "Usar este rango"), se actualiza el estado levantado; `BookingForm` reacciona con un `useEffect` (mismo patron que ya existe para `selectedDate`) y llena `startDate`/`endDate` (mas, si aplica, el desglose de horarios de 6.7).
- **Formulario → calendario**: el formulario pasa a tener DOS inputs de fecha (inicio/fin) en vez de uno. Al cambiar cualquiera de los dos manualmente, se notifica hacia arriba (callback `onDatesChange`) y el mismo estado levantado se actualiza — el calendario lo recibe como prop y recalcula el resaltado. Cuidado a implementar: comparar el valor entrante contra el que ya esta antes de disparar `form.setValue` o el callback hacia arriba, para no crear un ciclo infinito de renders entre los dos `useEffect` (el del formulario escuchando el estado levantado, y el callback del formulario escribiendo ese mismo estado).
- Si la fecha que el cliente escribe a mano en el formulario cae en un mes distinto al que el calendario esta mostrando, el calendario debe navegar automaticamente a ese mes (pero **solo** cuando el cambio vino del formulario — si el cliente esta navegando el calendario manualmente con las flechas, eso no debe verse interrumpido por el estado del formulario).

### 6.7 Horarios por dia (Fase 2, depende de que 6.1-6.6 esten funcionando)

Condicion de activacion: `selection.status === 'complete' && selection.start !== selection.end && venue.priceUnit === 'HOUR'`.

- Por defecto, se usa el **mismo** horario de inicio/fin para todos los dias del rango (el comportamiento simple, sin pedirle nada extra al cliente) — el desglose por dia con horarios distintos es una opcion, no un paso obligatorio.
- Si el cliente quiere personalizar, se muestra un desplegable/lista con una fila por fecha del rango, cada una con su propio par de inputs de hora, precargados con `VenueOpeningHour` del dia de semana correspondiente (ej. viernes 18:00-02:00, sabado 14:00-23:00), editables pero validados contra ese mismo horario de atencion (no se puede reservar fuera del horario en que el local abre ese dia especifico).
- El precio total se recalcula (llamando al backend, no solo estimando en el cliente — el calculo autoritativo siempre es del servidor) cada vez que cambia algun horario, mostrando el desglose de 4.3.

---

## 7. Deep-link desde la busqueda

`VenueResultCard` ("Ver detalles") agrega `startDate`/`endDate` a la URL cuando la busqueda actual los tiene:

```
/venues/terraza-mirador-andino-sopocachi?startDate=2026-09-15&endDate=2026-09-17
```

La pagina de detalle (`app/venues/[slug]/page.tsx`, server component) lee `searchParams` y pasa el rango inicial a `VenueDetail` como valor por defecto del estado de seleccion (arranca en `complete` en vez de `empty`).

**Edge case importante**: el buscador garantiza disponibilidad *en el momento de la busqueda*, no en el momento en que el cliente hace clic y llega al detalle (pueden pasar minutos, otro cliente pudo reservar esas fechas mientras tanto). El rango heredado por URL **tiene que re-validarse** contra el calendario ya cargado del local (mismo chequeo de 6.1) antes de darlo por bueno visualmente. Si alguna fecha del rango heredado ya no esta disponible, se descarta silenciosamente esa precarga (vuelve a `empty`) y se muestra un aviso breve ("Las fechas que buscaste ya no estan disponibles para este local") en vez de mostrar un rango invalido marcado como si fuera valido.

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| Doble reserva por condicion de carrera en un rango de varios dias | Alto | `BookingDate` con `@@unique([venueId, date])` + creacion transaccional (5.1-5.2); la base de datos rechaza el choque en vez de confiar en un `count()` previo |
| Backfill de reservas existentes mal hecho deja huecos en `BookingDate` | Alto | Backfill dentro del mismo script de migracion, mas un chequeo posterior: `COUNT(bookings) == COUNT(DISTINCT booking_id) FROM booking_dates` antes de considerar la migracion terminada |
| `priceUnit` sigue siendo cosmetico y el total de un rango no tiene sentido | Alto | Seccion 4.3 lo resuelve como parte obligatoria de esta fase, no queda pendiente |
| Ciclo infinito de renders en la sincronizacion calendario <-> formulario | Medio | Comparar valor entrante vs. actual antes de propagar en ambos `useEffect` (6.6); cubrir con una prueba manual especifica de "escribir fecha en el formulario no debe re-disparar el callback del calendario" |
| Rango heredado de la busqueda ya no valido al llegar al detalle | Medio | Re-validacion obligatoria contra el calendario cargado antes de aceptar el deep-link (seccion 7) |
| Dia cerrado por horario (`isClosed`) se cuela en medio de un rango como si estuviera disponible | Medio | Variante `closed` nueva en el calendario (6.3), tratada igual que bloqueado para roturas de rango |
| Horario por dia personalizado (Fase 2) fuera del horario de atencion de ese dia especifico | Medio | Validacion server-side contra `VenueOpeningHour` por dia de semana, no solo client-side |
| Cliente arma un rango enorme (ej. 6 meses) para "reservar" y bloquear fechas sin intencion real de pagar | Bajo-Medio | Rango maximo de dias por solicitud (30 dias, igual de criterio que el limite ya existente en el endpoint de calendario) |
| Migracion de `hasConflict`/`findActiveByVenueInRange` a `BookingDate` rota alguna consulta existente (calendario del owner, pagos, etc.) | Medio | Cubrir con los tests unitarios ya existentes de `booking.service.spec.ts` extendidos para el nuevo modelo, correr la suite completa antes de dar por cerrada esta fase |

---

## 9. Fuera de alcance: unidades de precio mixtas por dia de semana

El usuario planteo un caso real: un local podria querer cobrar **por hora** de lunes a viernes y **por dia completo** sabado y domingo (o cualquier combinacion). Hoy `priceUnit` es un solo valor por local (`Venue.priceUnit`), no por regla de precio. Soportar esto de verdad requiere:

- Que `VenuePrice` (o una tabla de reglas nueva) tenga su **propio** `priceUnit`, no heredado del local.
- Que el calculador de precios (4.3) resuelva, para cada dia del rango, no solo *cuanto* cobrar sino *como* cobrarlo (por hora ese dia especifico vs. por dia completo).
- Una UI de configuracion nueva para el owner (hoy el formulario de precios no expone "unidad" por regla, solo el monto) — esto es trabajo de `venue-form.tsx` y su DTO, no menor.
- Reglas de conflicto: que pasa si un rango cruza de un dia "por hora" a uno "por dia" — el desglose de 4.3 tiene que poder mostrar esa mezcla sin confundir al cliente.

Se deja explicitamente **fuera** de este plan porque mezclarlo con el trabajo de la Fase 1 (que ya es sustancial: tabla nueva, transacciones, calendario con seleccion de rango) haria el alcance inmanejable en una sola entrega. Si se decide construirlo, amerita su propio documento de planeamiento una vez que la Fase 1 este en produccion y se haya visto como los owners usan `allowsMultipleDays` en la practica.

---

## 10. Criterios de aceptacion

**Fase 1:**

- Un cliente puede elegir un rango de 2 o mas dias en el calendario del detalle de un local, incluyendo un rango que empieza en un mes y termina en el siguiente.
- El calendario no permite confirmar un rango que incluya un dia reservado, bloqueado, pasado o cerrado por horario; avisa especificamente cual fecha es el problema.
- Confirmar el rango en el calendario llena las fechas del formulario de reserva; escribir las fechas a mano en el formulario resalta el mismo rango en el calendario, sin ciclos de actualizacion visibles.
- Un local con `allowsMultipleDays = false` rechaza (backend, no solo frontend) cualquier intento de reservar mas de un dia.
- El precio total de una reserva de varios dias refleja el `priceUnit` del local (suma por dia o por hora segun corresponda) y muestra el desglose, no solo un total opaco.
- Dos solicitudes simultaneas para fechas superpuestas nunca generan dos reservas activas para el mismo dia — la segunda recibe un error claro, no una reserva fantasma.
- Llegar al detalle de un local desde un resultado de busqueda con fechas precarga ese rango, pero lo revalida contra disponibilidad real antes de darlo por bueno.
- `tsc`, `eslint`/`next lint`, tests backend y frontend pasan; se agregan tests unitarios nuevos para `PriceCalculatorService` (calculo por rango) y para la transaccion de creacion de `Booking`+`BookingDate` (incluyendo el caso de colision).

**Fase 2:**

- Con un rango multi-dia y local por hora, el cliente puede personalizar el horario de cada dia individualmente, con default tomado de `VenueOpeningHour`.
- Un horario personalizado fuera del horario de atencion de ese dia especifico es rechazado (backend).
