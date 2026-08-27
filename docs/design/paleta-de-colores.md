# Paleta de colores: Cobalto Profundo

SalonFacil paso por tres rondas de exploracion antes de asentarse en esta paleta:

1. **Altiplano Dusk** (indigo + cobre, superficie con tinte) — descartada, no convencio.
2. **Ronda de azules** (10 tonos de azul, cada uno con un secundario distinto) — punto de
   partida para elegir familia de color.
3. **Ronda "profesional"** (8 azules serios sobre superficie blanca pura, secundarios
   dorado/plata/bronce/burdeos) — de aca sale la opcion elegida.

**Elegida: Cobalto Profundo** — cobalto rico (mas oscuro que un azul "vivo") con oro viejo
como secundario, superficie blanca pura sin ningun tinte de fondo.

## Tokens (`frontend/src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `216 69% 34%` (`#1B4B91`) | Botones principales, links, logo, focus ring |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primary |
| `--accent` | `43 70% 95%` (tinte dorado claro) | Badges secundarios, hover de campos de busqueda |
| `--accent-foreground` | `43 75% 30%` (dorado, `#B8860B` en su version saturada) | Texto sobre accent |
| `--secondary` / `--muted` | `216 20% 96%` | Fondos neutros, con leve tinte azul en vez de gris puro |
| `--foreground` | `213 65% 17%` | Texto principal |
| `--background` / `--card` | `0 0% 100%` | Blanco puro, a proposito — el criterio de esta ronda fue "sin tinte de fondo" |

**`--success` (verde, `142 71% 45%`), `--warning` (ambar, `38 92% 50%`) y `--destructive`
(rojo, `0 84% 60%`) siguen sin tocarse** — estados semanticos independientes de la marca,
para que un boton de marca nunca se confunda con un estado de exito/error.

## Donde vive esto

- `frontend/src/app/globals.css` — tokens `:root` + gradientes hardcodeados en `.sf-hero`,
  `.sf-gradient-subtle`, `.sf-gradient-warm` (usan `hsl(...)` literal, no leen las
  variables CSS; se actualizan a mano si la paleta vuelve a cambiar).
- `frontend/src/components/admin/charts/chart-colors.ts` — paleta duplicada porque
  Recharts no puede leer variables CSS en tiempo de render; debe mantenerse en sync
  manualmente con `--primary`/`--accent` de `globals.css`.

## Otras opciones evaluadas (ronda "profesional")

Marino Ejecutivo, Zafiro Corporativo, Medianoche y Champan, Azul Prusia, Acero
Institucional, Marino y Plata, **Cobalto Profundo (elegida)**, Azul Tinta. Todas con
superficie blanca pura y secundarios en la familia dorado/plata/bronce/burdeos, pensadas
para transmitir profesionalismo y seriedad en vez del registro festivo de las rondas
anteriores.
