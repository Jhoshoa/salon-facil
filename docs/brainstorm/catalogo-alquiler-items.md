# Catalogo de alquiler de items por local (idea de plan pago)

Estado: Fases 1 y 2 construidas (catalogo con categorias propias de cada local, y seleccion de
items con total en la solicitud de reserva). La Fase 3 sigue siendo solo una idea, sin decidir. Las
secciones de abajo son el analisis original: donde la implementacion se aparto de el, se aclara
ahi mismo.

## 1. De donde sale la idea

Revisando los locales recopilados para la campana de invitacion (`research_notes/Locales
Bolivia/`), encontramos que [Le Dome](https://ledome.com.bo/) (La Paz) construyo su propia web
con un catalogo de alquiler de 56 items en 8 categorias (vajilla, cristaleria, manteleria,
mobiliario, decoracion, equipamiento, cuberteria, otros), cada uno con:

- Precio fijo por unidad (ej. "Vaso largo -- Bs 0,50 por unidad")
- Stock disponible en tiempo real (ej. "325 disponibles", "Sin stock por ahora")
- El alquiler del salon en si **no** tiene precio publicado -- es solo por cotizacion

Ningun otro local de los 200 recopilados tiene algo parecido (Los Jardines y Emperador tienen
web propia pero sin esto; el resto no tiene web propia). Que un dueno independiente haya
invertido en programar esto a mano, sin que ninguna plataforma se lo ofreciera, es una senal de
demanda real -- no es solo una idea linda, es algo que al menos un dueno boliviano ya necesitaba
lo suficiente como para construirlo el mismo.

## 2. Que tenemos hoy en SalonFacil

Dos piezas existentes, ninguna resuelve esto:

**`Amenity` + `VenueAmenity`** (`backend/prisma/schema.prisma`): catalogo de comodidades
*curado por el admin* (parqueo, piscina, etc. -- se usa tambien para filtrar busquedas de
locales). Por local, `VenueAmenity` marca `isIncluded` (si/no) y opcionalmente un `extraCost`
fijo. No hay cantidad, no hay stock, no hay foto propia del item, y el dueno no puede agregar
una comodidad nueva que no este en el catalogo global.

**`VenuePrice`**: variaciones de precio del *local mismo* segun dia/fecha/temporada (precio de
fin de semana vs. entre semana, descuentos por temporada baja). No tiene relacion con items
sueltos.

Conclusion: tenemos la semilla (la idea de "costo extra opcional" ya existe en `VenueAmenity`),
pero la forma de dato es demasiado simple para lo que hace Le Dome -- ahi no hay cantidad, ni
stock, ni items propios del dueno, ni fotos por item.

## 3. El problema de UX que hay que resolver antes de construir nada

Si un local carga 56 items como Le Dome, mostrarlos todos en un formulario plano (ya sea en la
pantalla de edicion del dueno o en la pantalla de reserva del cliente) se vuelve enorme y rompe
la experiencia -- exactamente lo que se menciono como riesgo. Esto aplica en dos lugares
distintos y conviene pensarlos por separado:

**Lado dueno (cargar/editar items):** necesita su propio tab en `VenueForm` (igual patron que
ya tiene "Horarios", "Comodidades", etc. -- ver `frontend/src/components/dashboard/venue-form.tsx`),
no meterlo dentro de "Comodidades" existente. Dentro de ese tab, lista con categorias como
filtro (no todo junto), buscador por nombre, y "agregar item" abre un formulario corto (nombre,
categoria, foto, precio, unidad, stock) en vez de una fila mas en una tabla gigante.

**Lado cliente (ver/cotizar items):** el patron que ya probamos y sabemos que funciona bien es
el mismo que armamos para `locales_bolivia.html` esta semana -- categorias como pildoras/tabs
arriba (Todo / Mobiliario / Vajilla / ...), buscador por nombre, grilla de tarjetas con foto +
precio, click abre detalle. Le Dome ya valido este patron en produccion real; no hace falta
inventar uno nuevo.

## 4. Fases propuestas (para no intentar construir todo de una)

La parte que mas se puede "extender demasiado" no es la UI de catalogo en si (esa es un
patron conocido, ver arriba) -- es la logica de **disponibilidad de stock por fecha de evento**,
que es un problema distinto y mas dificil que la disponibilidad del local mismo. El local se
reserva como bloque exclusivo (una fecha = un evento, nadie mas la usa). Los items fisicos
(vasos, sillas) se prestan y se devuelven -- el mismo lote de 325 vasos puede prestarse para un
evento del sabado y otro del domingo siguiente sin problema, pero no para dos eventos *el mismo
dia*. Esa cuenta (cuanto stock esta comprometido para una fecha especifica, sumando todas las
reservas de esa fecha) es la pieza realmente compleja, no el catalogo en si.

Por eso conviene separar en fases:

**Fase 1 -- catalogo informativo (bajo costo de construccion, valida demanda):**
Dueno carga items con foto/precio/categoria/stock como dato informativo (no se descuenta solo).
Cliente ve el catalogo filtrable igual que en Le Dome, pero no hay "carrito" ni se suma al
total de la reserva -- para pedir items, usa el mismo `contactPhone`/WhatsApp que ya existe en
`Venue` hoy. Esto prueba si los duenos realmente cargan sus catalogos y si a los clientes les
sirve, sin construir carrito ni logica de stock-por-fecha.

**Fase 2 -- seleccion con total, sin reserva de stock real:**
El cliente arma una seleccion (cantidad por item) desde el catalogo, ve un total estimado, y esa
seleccion se adjunta a la solicitud de reserva del local (como un campo mas del booking, no como
un segundo pago separado). El stock sigue siendo informativo, no se bloquea por fecha todavia --
el dueno confirma manualmente si tiene todo disponible para esa fecha, igual que hace hoy por
WhatsApp, solo que ahora la lista ya le llega armada.

> **Decisiones al construir la Fase 2:** el stock es obligatorio en los items que se cobran aparte,
> porque es el limite contra el que se valida la cantidad; un item anterior sin stock no se puede
> agregar hasta que el dueno lo complete. La seleccion se guarda como foto en
> `Booking.selectedRentalItems`, con el precio de la base de datos (nunca el que envia el cliente).
> Los items entran en el total y en el calculo del anticipo. En reservas de varios dias, el dueno
> elige por item si se cobra por dia (por defecto) o una sola vez por evento completo. La cantidad no puede superar `stockQty`: es el total del local, y como el
> dueno no puede editar el monto de una solicitud, pedir mas dejaria un total imposible de cumplir.
> Una solicitud con items nunca se confirma sola, aunque el local tenga reserva inmediata: el stock
> no se controla por fecha, asi que el dueno tiene que confirmarlo antes de que el cliente pague.

**Fase 3 -- stock real reservado por fecha (recien aca, paridad completa con Le Dome):**
El stock se descuenta/reserva por rango de fechas, igual de estricto que la disponibilidad del
local (`CalendarBlock`/`BookingDate`), pero con la diferencia de que es un conteo por cantidad
comprometida ese dia, no un bloqueo exclusivo. Esto es lo que de verdad justifica llamarlo
"sofisticado" frente a lo que ya existe en `VenueAmenity` -- pero tambien es la parte mas cara
de construir bien (condiciones de carrera entre reservas simultaneas del mismo item, que pasa si
se cancela una reserva que tenia stock comprometido, etc.), asi que no es la fase por la que
empezar.

## 5. Modelo de datos propuesto (boceto, no final)

> **Actualizacion:** `category` ya no es texto libre. Se reemplazo por `VenueRentalItemCategory`
> (`backend/prisma/schema.prisma`), una tabla propia de cada local que el dueno crea, renombra,
> ordena y borra desde la pestana "Catalogo". Sigue sin depender del admin -- que era el objetivo
> del texto libre -- pero evita variantes como "Vajilla" y "vajilla", y permite que el orden
> elegido por el dueno se respete en la ficha publica. No se puede borrar una categoria con items.

Nuevo modelo, no reemplaza a `Amenity`/`VenueAmenity` (esos siguen sirviendo para filtros de
busqueda globales -- "locales con parqueo" sigue siendo util y es un concepto distinto). Boceto:

```
model VenueRentalItem {
  id          String   @id @default(uuid())
  venueId     String   @map("venue_id")
  name        String
  category    String   // texto libre elegido/sugerido por el propio dueno, no un catalogo
                        // global curado por el admin -- a diferencia de Amenity, el punto es
                        // que cada dueno define sus propias categorias e items
  description String?  @db.Text
  photoUrl    String?
  pricePerUnit Decimal @db.Decimal(12, 2)
  unitLabel   String   @default("unidad") // "unidad", "por modulo", etc.
  stockQty    Int?     // null = no se rastrea stock (fase 1), numero = cantidad total (fase 3)
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId])
  @@index([venueId, category])
}
```

Por que `category` es texto libre y no un enum: el pedido explicito es que cada propietario
pueda agregar "cosas personalizadas" -- un enum fijo (tipo el `AmenityCategory` que ya existe)
volveria a depender de que el admin agregue categorias nuevas a mano cada vez que un dueno
necesite una que no esta. Texto libre con autocompletado (sugerir las categorias que ese mismo
dueno ya uso antes) da la flexibilidad pedida sin perder el filtro por categoria en la UI.

## 6. Monetizacion (para pensar mas adelante, no ahora)

Dos formas de gatear esto como plan pago, no excluyentes:

- **Gate por cantidad de items**: plan gratis permite cargar pocos items (ej. 5), plan pago
  desbloquea catalogo completo.
- **Comision adicional sobre lo reservado via items**: ademas de la comision normal sobre el
  alquiler del local (ver `docs/research/competidores-salones-eventos.md`, rango 10-20% es el
  estandar de la industria), cobrar un porcentaje separado solo sobre el monto de items
  reservados a traves de la plataforma -- ingreso incremental real, no solo un feature mas.

Esto se decide cuando haya mas claridad de que fase se va a construir primero; no hace falta
resolverlo ahora.

## 7. Preguntas abiertas (para la proxima vuelta de pulido)

- Fase 1 ya resuelve el "componente gigante"? o conviene paginar/limitar cuantos items se
  muestran de entrada aunque sea solo informativo?
- Las fotos de items van por el mismo `CloudinaryService` que ya se usa para fotos de local
  (`backend/src/modules/upload/cloudinary.service.ts`), en una carpeta/preset separado?
- `unitLabel` libre (como "por modulo" en el ejemplo de Le Dome) o una lista cerrada de
  unidades comunes (unidad, modulo, hora, dia)?
- ~~Conviene permitir que el dueno marque un item como "incluido sin costo"?~~ Resuelto: si, con
  `VenueRentalItem.isIncluded`. Un item incluido no tiene precio (`pricePerUnit` queda en null, no
  en 0) y en la Fase 2 no se podra seleccionar ni sumara al total. Si un cliente pide mas de lo
  incluido, por ahora el dueno crea dos items ("Sillas (incluidas)" y "Sillas adicionales").
- ~~En fase 2/3, la seleccion de items entra al mismo flujo de pago (`Payment`) que la reserva del
  local, o se liquida aparte directo entre dueno y cliente (como hoy via WhatsApp)?~~ Resuelto: entra
  al mismo flujo, sumada al total y al anticipo, igual que las comodidades con costo extra.
- El dueno solo puede aprobar o rechazar la solicitud completa. Hace falta que pueda quitar un item
  sin rechazar todo, o ajustar el monto? Hoy tiene que rechazarla y el cliente volver a enviarla.
