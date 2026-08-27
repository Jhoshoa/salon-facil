# Paleta de colores: Altiplano Dusk

SalonFacil usaba el azul por defecto de Tailwind/shadcn (`hsl(217 91% 50%)`). Se reemplazo
por una paleta propia, **Altiplano Dusk**, para dejar de verse como cualquier dashboard SaaS
generico.

## Tokens (`frontend/src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `250 35% 30%` (indigo, `#3B3269`) | Botones principales, links, logo, focus ring |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primary |
| `--accent` | `23 70% 95%` (tinte cobre claro) | Badges secundarios, hover de campos de busqueda |
| `--accent-foreground` | `23 55% 32%` (cobre, `#D97B3F` en su version saturada) | Texto sobre accent |
| `--secondary` / `--muted` | `250 14% 95%` | Fondos neutros, con leve tinte indigo en vez de gris puro |
| `--foreground` | `250 25% 14%` | Texto principal, con el mismo tinte |
| `--background` | `250 30% 98%` | Fondo de pagina (casi blanco, sutilmente frio) |

**`--success` (verde, `142 71% 45%`), `--warning` (ambar, `38 92% 50%`) y `--destructive`
(rojo, `0 84% 60%`) NO cambiaron** — son estados semanticos independientes de la marca, y
mantenerlos evita que un boton "Reservar" en tono calido se confunda con un estado de exito o
error en la interfaz. Esa fue la razon principal para descartar paletas con primario en la
zona naranja/roja/verde durante la eleccion.

## Donde vive esto

- `frontend/src/app/globals.css` — tokens `:root` + gradientes hardcodeados en `.sf-hero`,
  `.sf-gradient-subtle`, `.sf-gradient-warm` (estos usan `hsl(...)` literal, no pueden leer
  las variables CSS, asi que se actualizan a mano si la paleta vuelve a cambiar).
- `frontend/src/components/admin/charts/chart-colors.ts` — paleta duplicada porque Recharts
  no puede leer variables CSS en tiempo de render; debe mantenerse en sync manualmente con
  `--primary`/`--accent` de `globals.css`.

## Otras opciones evaluadas

Se generaron 10 combinaciones (Terracota de Fiesta, Aguayo, Altiplano Dusk, Salar Turquesa,
Vino y Oro, Verde Yungas, Cielo Alteno, Ladrillo Alteno, Amatista, Cobre y Turquesa) pensadas
para un marketplace de eventos en Bolivia. Altiplano Dusk se eligio por no chocar con los
colores semanticos y funcionar igual de bien para bodas, quinceaneras y eventos corporativos
sin quedar atado a un solo tipo de evento.
