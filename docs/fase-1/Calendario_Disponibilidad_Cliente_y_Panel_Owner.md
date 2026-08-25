# Calendario de disponibilidad: vista de cliente y panel de owner

**Proyecto:** SalonFacil - Plataforma de alquiler de locales para eventos
**Fase:** 1 - Evolucion Marketplace
**Estado:** Propuesto - por implementar
**Duracion estimada:** 3-5 dias

---

## 1. Problema actual

### 1.1 Vista de cliente (`frontend/src/components/booking/availability-calendar.tsx`)

Es un `grid grid-cols-7` que simplemente enumera los dias del mes en orden (1, 2, 3...) sin alinearlos a su dia de semana real. El resultado es una cuadricula de numeros, no un calendario reconocible. Ademas:

- Solo muestra el mes actual (`getCurrentMonth()` hardcodeado como default), sin forma de navegar a meses futuros.
- No hay boton de mes anterior/siguiente ni selector de año.
- El cliente no puede planificar un evento a 3, 6 o 12 meses de distancia viendo disponibilidad real.

### 1.2 Vista de owner (`frontend/src/components/dashboard/owner-calendar.tsx`)

El owner elige el mes con un `<input type="month">` nativo (funciona, pero no es una vista de calendario) y el resultado se muestra como **dos listas de texto** ("Reservas del mes" / "Fechas bloqueadas"), no como una cuadricula visual. Para saber si el 15 de octubre esta libre, el owner tiene que leer una lista en vez de mirar una celda.

### 1.3 Lo que ya existe y sirve de base

- El endpoint `GET /venues/:id/calendar?month=YYYY-MM` (tambien acepta `startDate`/`endDate`) ya devuelve bookings y bloqueos de **cualquier rango**, sin limite de fecha en el backend. La navegacion multi-mes es un trabajo de frontend, no requiere endpoints nuevos.
- El owner ya puede crear/eliminar bloqueos de fecha puntuales (`CalendarBlock`) via drawer.
- El modelo `CalendarBlock` ya tiene columnas `isRecurring` y `recurringRule` (JSON) en la base de datos y el DTO las acepta, **pero nunca se leen** — hoy no existe ninguna logica que expanda una regla recurrente ("todos los domingos") a fechas bloqueadas concretas. Es un campo muerto, util para el punto 4.4.

---

## 2. Objetivo

Reemplazar ambas vistas por un **componente de calendario mensual real** (alineado a dias de semana, con navegacion de mes/año), compartido entre cliente (solo lectura) y owner (interactivo), para que:

- El cliente pueda ver disponibilidad de varios meses hacia adelante, incluso años, antes de decidir una fecha.
- El owner pueda ver de un vistazo como esta ocupado cada mes y gestionar bloqueos haciendo clic directamente sobre el dia, en vez de leer listas.

---

## 3. Propuesta de diseño

### 3.1 Componente compartido: `MonthCalendarGrid`

Nuevo componente presentacional en `frontend/src/components/shared/month-calendar-grid.tsx`, sin logica de datos propia (recibe todo por props):

```ts
interface DayCellData {
  date: string; // YYYY-MM-DD
  day: number;
  variant: 'available' | 'booked' | 'blocked' | 'past';
  label?: string; // "Reservado", "Bloqueado: mantenimiento", etc.
}

interface MonthCalendarGridProps {
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  days: DayCellData[];
  minMonth?: string;
  maxMonth?: string;
  onDayClick?: (day: DayCellData) => void;
}
```

Responsabilidades:

- Calcula el offset del primer dia del mes (para que el 1 caiga en su columna real: Lun-Dom) y rellena celdas vacias/grises de los meses adyacentes — esto es lo que hoy falta y hace que se vea "como un calendario".
- Header con nombre de mes + año y flechas prev/next, deshabilitadas en `minMonth`/`maxMonth`.
- Fila de encabezado con los dias de la semana.
- Leyenda de colores (Disponible / Reservado / Bloqueado) reutilizada en ambas vistas.
- Celdas con color por `variant` (reutilizando los tokens `sf-surface` / `sf-warning` ya usados hoy) y `onClick` opcional por celda.

### 3.2 Vista de cliente: `AvailabilityCalendar`

- Usa `MonthCalendarGrid` en modo solo lectura.
- `month` como estado local (`useState(getCurrentMonth())`), `minMonth = getCurrentMonth()` (no tiene sentido navegar a meses pasados), `maxMonth` con un tope razonable (p. ej. +18 meses) para no disparar consultas indefinidas.
- Al hacer clic en un dia ocupado, mostrar el detalle (`label`, ej. "Reservado") en un popover/tooltip en vez de solo texto truncado en la celda.
- Cambiar de mes dispara una nueva query (`['venue-calendar', venueId, month]`), cacheada por TanStack Query — ida y vuelta entre meses ya visitados es instantanea.

### 3.3 Vista de owner: `OwnerCalendar`

- Reemplaza el `<input type="month">` + las dos listas como vista **principal** por el mismo `MonthCalendarGrid`, ahora interactivo:
  - Clic en dia libre → abre el drawer existente "Bloquear fecha" con la fecha precargada.
  - Clic en dia bloqueado (sin reserva) → ofrece "Eliminar bloqueo" (reutiliza `deleteBlockMutation` ya existente).
  - Clic en dia con reserva → popover con resumen de la reserva y link a su detalle.
- `minMonth` sin restriccion (el owner puede querer revisar meses pasados), `maxMonth` con un tope generoso (p. ej. +24 meses).
- Las listas "Reservas del mes" / "Fechas bloqueadas" se mantienen **debajo** de la cuadricula como panel secundario de detalle/accesibilidad — no se pierden, dejan de ser la vista principal.

### 3.4 Backend: sin endpoints nuevos, un endurecimiento menor

- No se requiere ningun endpoint nuevo — la navegacion multi-mes se resuelve enteramente pidiendo un `month` distinto al mismo endpoint que ya existe.
- Endurecimiento recomendado: `GET /venues/:id/calendar` es `@Public()` y hoy no valida el tamaño del rango (`startDate`/`endDate`). Agregar un limite (ej. rechazar rangos mayores a ~120 dias) para evitar que alguien pida un rango de 10 años en una sola consulta.

### 3.5 Fuera de alcance (pero relacionado): bloqueos recurrentes

El usuario menciono que el owner deberia "manejar sus horas, sus calendarios de cada mes, de cada dia" — el calendario visual con navegacion cubre eso. Pero si mas adelante se quiere "cerrado todos los domingos" o "bloqueado el primer lunes de cada mes" sin crear un bloqueo manual por fecha, hace falta implementar de verdad la expansion de `recurringRule` (hoy solo se guarda, nunca se lee):

- Opcion simple: al pedir el calendario de un rango, expandir en memoria las reglas recurrentes activas del venue y fusionarlas con los bloqueos puntuales antes de responder (no requiere job ni tabla nueva).
- Se deja como mejora separada, no bloquea esta propuesta.

---

## 4. Libreria de fechas

Hoy `formatters.ts` hace todo el calculo de fechas a mano con `Date` nativo (`getCurrentMonth`, `formatDateInput`). Para el grid hace falta ademas: primer/ultimo dia del mes, dia de semana del dia 1, sumar/restar meses, formatear "Septiembre 2026". Es una cantidad de logica de calendario suficiente como para justificar agregar **`date-fns`** (liviana, tree-shakeable, sin estado global) en vez de seguir escribiendo esa aritmetica a mano — pero es una decision de gusto, no un bloqueante: tambien se puede resolver con `Date` nativo si se prefiere no agregar una dependencia nueva.

---

## 5. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---:|---|
| Navegar rapido entre muchos meses dispara muchas queries | Bajo | TanStack Query cachea por `month`; usar `placeholderData` para evitar parpadeo de loading |
| Reutilizar un mismo grid para lectura (cliente) e interaccion (owner) los acopla | Medio | `MonthCalendarGrid` puramente presentacional, controlado 100% por props |
| Rango de fechas sin limite en el endpoint publico | Bajo-Medio | Agregar validacion de rango maximo en el controller |
| Confundir "fuera de alcance" (recurrencia) con este trabajo | Bajo | Seccion 3.5 explicita, se implementa aparte si se decide |

---

## 6. Criterios de aceptacion

- El cliente ve un calendario mensual real (alineado a dias de semana) en el detalle del local, con flechas para avanzar a meses futuros (al menos 12 meses adelante) y sin poder retroceder antes del mes actual.
- El owner ve la misma cuadricula en su panel, puede navegar meses hacia adelante y hacia atras, y puede bloquear/desbloquear una fecha haciendo clic directamente en la celda.
- Clic en un dia con reserva (vista owner) muestra el resumen y enlaza al detalle de esa reserva.
- No se agregan endpoints backend nuevos; se agrega validacion de rango maximo al endpoint de calendario existente.
- Responsive en mobile, tablet y desktop (7 columnas legibles incluso en pantallas chicas).
- `tsc`, `eslint`/`next lint` y tests pasan antes de dar la implementacion por terminada.
