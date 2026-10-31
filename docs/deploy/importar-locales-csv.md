# Importar locales masivamente desde un CSV (produccion)

Guia paso a paso de como cargamos en produccion la lista de locales investigados (CSV) como
locales "placeholder" a nombre del ADMIN, usando `backend/prisma/seed-bolivia-venues.ts`. Es el
mismo estado en que queda un local despues de "Registro por telefono": listo para usar
"Invitar dueno" cuando un dueno real confirme. Todo el contexto del servidor (conectarse,
nombres de contenedores, `-u root`) esta en [`dokploy-runbook.md`](./dokploy-runbook.md).

El archivo viaja en **tres saltos**, y cada uno es un sistema de archivos distinto:

```
tu PC (Windows)  --scp-->  servidor (host, /tmp)  --docker cp-->  contenedor (/tmp)  --> script
```

## 0. Antes de empezar

- El CSV con los datos esta en `research_notes/Locales Bolivia/` (por ejemplo
  `locales_bolivia_todos.csv`, el que junta todos los departamentos). **Nunca se commitea**: son
  datos de contacto de terceros, y `.gitignore` ya excluye `research_notes/Locales Bolivia/*.csv`
  y `*.html`.
- Columnas esperadas: `nombre_local, departamento, ciudad, telefono, facebook, tiktok,
  otra_referencia, fuente, notas`.
- El script **solo necesita el CSV**. El `locales_bolivia.html` es un visor para mirar la lista,
  no hace falta subirlo.
- Los locales que ya tienen sitio web propio (`ledome.com.bo`, `losjardines.com`,
  `emperador.com.bo`, `curichidelcocodrilo`) se omiten a proposito: se contactan aparte.
- Cada local se crea con datos genericos (direccion `calle`, distrito `Zona`, capacidad 20-150,
  precio base Bs 1500, horario 09:00-23:59 todos los dias); el admin o el dueno los edita
  despues.

## 1. Prerrequisitos en produccion

Revisalos antes de importar, asi el script no se corta a la mitad:

1. **Catalogos sembrados** (tipo de espacio `EVENT_HALL`, amenidad `bathrooms` y los 5 tipos
   de evento). Si faltan, el script avisa y sale:

   ```bash
   docker exec -it salonfacil-backend npm run prisma:seed:catalog:prod
   ```

2. **`ADMIN_EMAIL` configurado en el contenedor** y con una cuenta de rol ADMIN creada (los
   locales quedan a nombre de esa cuenta):

   ```bash
   docker exec salonfacil-backend printenv ADMIN_EMAIL
   ```

## 2. Copiar el CSV de tu PC al servidor

Desde PowerShell en tu PC, parado en la raiz del repo (las comillas son necesarias porque la
carpeta tiene un espacio):

```powershell
scp "research_notes/Locales Bolivia/locales_bolivia_todos.csv" <usuario>@<ip-del-vps>:/tmp/locales.csv
```

Despues conectate al servidor (`ssh <usuario>@<ip-del-vps>`) y verifica que llego:

```bash
ls -l /tmp/locales.csv
```

> Si subiste el archivo por otro medio (por ejemplo el administrador de archivos del panel de
> Hostinger) da igual, mientras termine en `/tmp/locales.csv` del servidor.

## 3. Copiar el CSV del servidor al contenedor

Este es el paso que se olvida. `docker exec` ejecuta el comando **dentro** del contenedor, y el
contenedor tiene su propio `/tmp`, distinto del `/tmp` del servidor. Hay que copiarlo adentro:

```bash
docker cp /tmp/locales.csv salonfacil-backend:/tmp/locales.csv
```

Para confirmar que ahora si lo ve el contenedor:

```bash
docker exec -u root salonfacil-backend ls -l /tmp/locales.csv
```

## 4. Probar con un solo local

El ultimo argumento es cuantos locales elegibles crear. Con `1` se crea solo el primero, como
prueba de humo:

```bash
docker exec -u root -it salonfacil-backend node dist/prisma/seed-bolivia-venues.js /tmp/locales.csv 1
```

(Equivalente via npm: `docker exec -u root -it salonfacil-backend npm run
prisma:seed:bolivia-venues:prod -- /tmp/locales.csv 1`.)

Salida esperable:

```
Leidas N filas del CSV.
  [creado] <nombre> (<id>) -- <ciudad>, <departamento>

Resumen:
  Creados:              1
  ...
```

El warning `Credenciales de Twilio no configuradas` es normal y no afecta: el script no manda
WhatsApp. Entra al panel de admin y revisa que el local se haya creado bien antes de seguir.

## 5. Importar todos

Cuando la prueba salio bien, cambia el `1` por `--all` (o por un numero, ej. `10`, para ir de a
tandas):

```bash
docker exec -u root -it salonfacil-backend node dist/prisma/seed-bolivia-venues.js /tmp/locales.csv --all
```

Es **seguro volver a correrlo**: salta cualquier fila cuyo nombre ya exista (sin distinguir
mayusculas) y nunca toca nada que no haya creado el mismo. Al final imprime un resumen: creados,
ya existian, omitidos por tener web propia y con error/datos malos.

## 6. Limpiar

El CSV tiene datos de contacto de terceros; no lo dejes tirado en el servidor. `-u root` hace
falta porque el archivo copiado queda a nombre de root:

```bash
docker exec -u root salonfacil-backend rm /tmp/locales.csv
```

```bash
rm /tmp/locales.csv
```

(El del contenedor se pierde solo en el proximo redeploy, pero el del servidor no.)

## Deshacer la importacion (borrado definitivo)

`backend/prisma/delete-imported-venues.ts` borra **de verdad** los locales que creo este script,
con todo lo que dependa de ellos (fotos en la base, precios, catalogo, tokens). Por defecto solo
muestra lo que haria.

Un local cuenta como importado si es de la cuenta de `ADMIN_EMAIL` y, ademas, su nombre esta en
el CSV o sigue con la direccion `calle` y el distrito `Zona` que puso el script.

**Nunca borra** un local de otro dueno, ni uno con reservas o resenas. Un local publicado o en
revision tampoco, salvo con `--include-published`. Con `--keep-edited` conserva tambien los que
ya tienen datos agregados.

1. **Copia el CSV al contenedor** (pasos 2 y 3).

2. **Respalda la base.** Esta accion no se puede deshacer de otra forma:

   ```bash
   docker compose -f docker-compose.prod.yml exec postgres pg_dump -U salonfacil salonfacil > backup-antes-de-borrar-$(date +%F).sql
   ```

3. **Revisa la simulacion.** No borra nada y muestra la base de datos a la que apunta, que se
   borraria, que se conserva y por que:

   ```bash
   docker exec -u root -it salonfacil-backend node dist/prisma/delete-imported-venues.js /tmp/locales.csv
   ```

4. **Borra**, indicando la cantidad que mostro la simulacion. Si no coincide, no borra nada:

   ```bash
   docker exec -u root -it salonfacil-backend node dist/prisma/delete-imported-venues.js /tmp/locales.csv --execute --expected=<cantidad>
   ```

5. **Limpia el CSV** (paso 6).

Las imagenes que ya se hayan subido a Cloudinary no se borran: el script informa cuantas son.

## Problemas ya encontrados

| Sintoma | Causa | Solucion |
|---------|-------|----------|
| `Error: ENOENT: no such file or directory, open '/tmp/locales.csv'` | El archivo esta en el `/tmp` del servidor, pero el script corre dentro del contenedor | Paso 3 (`docker cp`) |
| `ADMIN_EMAIL no esta configurado` | Falta la variable en el contenedor | Configurala en el panel de Dokploy y haz **Deploy** (un restart no relee variables, ver runbook §0) |
| `No se encontro una cuenta ADMIN con el email ...` | La cuenta admin no existe o no tiene rol ADMIN | `docker exec -it salonfacil-backend npm run prisma:seed:admin:prod` |
| `Faltan filas del catalogo ...` | Catalogos sin sembrar | Prerrequisito 1 |
| `[departamento desconocido "..."]` en una fila | El departamento del CSV no coincide con los 9 conocidos (se compara sin mayusculas, sin tildes: `Potosi`, no `Potosí`) | Corregir esa fila del CSV; se omite y sigue con las demas |
| `Uso: seed-bolivia-venues.ts <csv-path> <N \| --all>` | Falta el ultimo argumento (`1`, `10` o `--all`) | Agregarlo al comando |
