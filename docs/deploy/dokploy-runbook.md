# Runbook de operaciones — Dokploy

Guia de referencia para operar Mi Evento en produccion tal como esta desplegado hoy: un VPS de
Hostinger administrado con [Dokploy](https://dokploy.com), usando `docker-compose.dokploy.yml`
(Postgres, Redis, backend y frontend) — Dokploy corre su propio Traefik como reverse proxy y
emite/renueva los certificados TLS automaticamente via su panel de **Domains**, asi que este
stack **no incluye nginx ni certbot** (a diferencia de `docs/deploy/hostinger-vps.md`, que
documenta un camino alternativo con `docker-compose.prod.yml` que no es el que terminamos usando).

Dominios reales: `mievento.com.bo` (frontend, dominio raiz) y `api.mievento.com.bo` (backend).

## 0. Lo mas importante: Dokploy deploya automatico en cada push a `main`

No hay un paso manual de "subir a produccion" — en cuanto se pushea a `main` en GitHub, Dokploy
detecta el cambio, reconstruye las imagenes desde ese commit y las levanta. Esto significa:

- **Nunca pushees a `main` algo que no probaste antes** (tests, lint, y si es posible el flujo a
  mano en local). Un push roto en `main` se deploya solo, sin que nadie lo apruebe.
- Preferi trabajar en una rama y mergear a `main` solo cuando el cambio ya este probado (tests +
  prueba manual si aplica), en vez de pushear directo a `main`.
- Un **redeploy** en Dokploy (boton "Deploy" en el servicio) reconstruye la imagen desde el
  ultimo commit de `main` — es lo que hay que usar despues de cambiar una variable de entorno o
  cuando se pusheo un cambio y por algun motivo no se disparo solo.
- Un **restart** ("Restart" en vez de "Deploy") solo reinicia el contenedor que ya esta corriendo
  con la imagen que ya tenia — **no** vuelve a bajar codigo nuevo de git ni relee variables de
  entorno nuevas. Si cambiaste algo y no ves el efecto, seguramente reiniciaste en vez de
  redeployar.

## 1. Conectarse al servidor

```bash
ssh <usuario>@<ip-del-vps>
```

Reemplaza `<usuario>` y `<ip-del-vps>` por los datos reales de tu VPS de Hostinger (los mismos
que usaste para la configuracion inicial). Una vez adentro, Docker ya esta instalado y corriendo
(Dokploy lo instala solo la primera vez que se conecta el servidor al panel).

## 2. Ver que esta corriendo

```bash
docker ps
```

Contenedores esperables (nombres fijos, definidos en `docker-compose.dokploy.yml` via
`container_name`):

| Contenedor            | Servicio   | Notas                                                  |
|------------------------|------------|---------------------------------------------------------|
| `salonfacil-postgres`  | PostgreSQL | Puerto `5434` expuesto en `127.0.0.1` del VPS (ver §6)  |
| `salonfacil-redis`     | Redis      | Cache / colas de BullMQ                                 |
| `salonfacil-backend`   | NestJS API | Es el que usamos para migraciones, seeds y debug         |
| `salonfacil-frontend`  | Next.js    | Sirve el sitio                                           |

Si alguno no aparece en `docker ps`, revisa `docker ps -a` (para ver si crasheo y quedo
detenido) y despues `docker logs <nombre>` para el motivo.

## 3. Entrar a un contenedor (shell interactiva)

Para explorar, correr un comando puntual, o debuggear algo en vivo:

```bash
docker exec -it salonfacil-backend sh
```

Si necesitas permisos de root dentro del contenedor (por ejemplo para instalar una herramienta
de diagnostico con `apk add`, algo que normalmente no hace falta pero puede servir en una
emergencia):

```bash
docker exec -u root -it salonfacil-backend sh
```

(`salonfacil-backend` es el nombre del contenedor, no un ID — `docker exec` acepta ambos
indistintamente. Si preferis usar el ID, sacalo de la primera columna de `docker ps`.)

Para salir de la shell sin matar el contenedor: `exit` o `Ctrl+D`.

## 4. Ver logs

```bash
# Logs en vivo del backend
docker logs -f salonfacil-backend

# Ultimas 100 lineas, sin seguir
docker logs --tail 100 salonfacil-backend

# Lo mismo para cualquier otro servicio
docker logs -f salonfacil-frontend
docker logs -f salonfacil-postgres
```

## 5. Ver las variables de entorno de un contenedor

Util para confirmar que Dokploy realmente aplico un valor que cambiaste en su panel (por
ejemplo, asi diagnosticamos el bug de CORS del `APP_DOMAIN` mal configurado):

```bash
docker exec -it salonfacil-backend env
```

Esto imprime **todo**, incluidas credenciales (contrasena de Postgres, `JWT_SECRET`, claves de
AWS/Cloudinary, etc.) en texto plano — nunca pegues el output completo en un chat o ticket sin
tapar los valores sensibles primero. Para revisar una sola variable sin exponer el resto:

```bash
docker exec -it salonfacil-backend env | grep APP_DOMAIN
```

## 6. Migraciones de base de datos

### 6.1 Por que esto no es automatico

El `Dockerfile` del backend (`backend/docker/Dockerfile`) solo hace `node dist/src/main.js` al
arrancar — **no corre migraciones por si solo**. Cada vez que un cambio incluye una migracion
nueva de Prisma (un archivo nuevo en `backend/prisma/migrations/`), hay que aplicarla a mano
despues del deploy:

```bash
docker exec -it salonfacil-backend npx prisma migrate deploy
```

Este comando es **seguro de correr siempre**, tenga o no migraciones pendientes — si no hay
nada nuevo que aplicar, simplemente dice `No pending migrations to apply.` y no hace nada. Por
eso conviene correrlo como parte de la rutina despues de cada deploy que toque el backend,
sin tener que acordarse si esta vez tocaba o no.

Para confirmar el estado sin aplicar nada:

```bash
docker exec -it salonfacil-backend npx prisma migrate status
```

### 6.2 Como creamos una migracion nueva (flujo local, antes de pushear)

Este proyecto **no puede usar `prisma migrate dev`** en este entorno porque esa shell no tiene
una terminal interactiva (TTY) y ese comando la necesita para pedir confirmaciones. El flujo que
usamos en su lugar, desde `backend/` en local:

**a) Si el cambio es de schema** (agregar una columna, una tabla, un indice, etc. — es decir,
cambiaste `backend/prisma/schema.prisma`):

1. Sincroniza el schema directo a tu base de dev local:
   ```bash
   npx prisma db push --accept-data-loss
   ```
2. Escribi a mano el DDL equivalente en una carpeta nueva, con el mismo formato de timestamp que
   las migraciones existentes (`YYYYMMDDHHMMSS_nombre_descriptivo`):
   ```
   backend/prisma/migrations/<timestamp>_<nombre>/migration.sql
   ```
3. Marcala como ya aplicada (porque `db push` ya hizo el trabajo, no hace falta re-ejecutarla):
   ```bash
   npx prisma migrate resolve --applied <timestamp>_<nombre>
   ```
4. Confirma que quedo prolijo:
   ```bash
   npx prisma migrate status   # deberia decir "Database schema is up to date!"
   ```

**b) Si el cambio es solo de datos** (un `UPDATE`/backfill, como el que usamos para corregir el
texto de notificaciones viejas de "SalonFacil" a "Mi Evento" — ver
`backend/prisma/migrations/20260912204931_rebrand_notification_text_to_mi_evento/`): no hace
falta `db push` ni `migrate resolve`, porque no hay ningun cambio de schema que sincronizar.
Directamente:

1. Crea la carpeta y el `migration.sql` a mano, mismo formato de timestamp.
2. Corre `npx prisma migrate deploy` localmente para aplicarla y probarla contra tu base de dev
   (este comando si es no-interactivo, a diferencia de `migrate dev`).
3. Commitea la carpeta nueva junto con el resto del cambio.

### 6.3 Aplicar la migracion en produccion

Una vez que el commit con la migracion nueva ya esta en `main` y Dokploy termino de deployar
(o justo despues de un redeploy manual):

```bash
docker exec -it salonfacil-backend npx prisma migrate deploy
```

Prisma lleva registro de que migraciones ya se aplicaron en la tabla `_prisma_migrations` de la
propia base de datos, asi que corre solo las que faltan, en orden, y nunca repite una ya
aplicada — es seguro correrlo mas de una vez.

## 7. Sembrar datos (catalogos y cuenta admin)

**Nunca corras el seed completo (`prisma/seed.ts` / `npm run prisma:seed`) en produccion** — borra
y recrea todos los usuarios, incluidas cuentas reales. El script se niega a correr si
`NODE_ENV=production` como salvaguarda extra, pero igual: no lo intentes.

Para una base de produccion nueva (o si agregaste catalogos nuevos en
`backend/prisma/seed-data/catalogs.ts`), usa los scripts separados, pensados para produccion —
nunca borran nada y son seguros de correr mas de una vez:

```bash
# Catalogos (tipos de espacio, tipos de uso, amenidades)
docker exec -it salonfacil-backend npm run prisma:seed:catalog:prod

# Cuenta admin (lee ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_PHONE de las variables de entorno
# del contenedor -- configuralas en el panel de Dokploy antes de correr esto)
docker exec -it salonfacil-backend npm run prisma:seed:admin:prod
```

> Los scripts `prisma:seed:catalog` y `prisma:seed:admin` (sin el sufijo `:prod`) usan `ts-node`
> para correr el `.ts` directo — funcionan en local, pero `ts-node` es una `devDependency` y la
> imagen de produccion se instala con `npm ci --omit=dev`, asi que ahi no existe. Los scripts
> `:prod` corren en cambio el JS ya compilado por el build (`dist/prisma/seed-catalog.js` /
> `dist/prisma/seed-admin.js`), que no depende de nada de `devDependencies`. Si alguna vez ves
> el error `sh: ts-node: not found` en produccion, es por usar el script sin `:prod`.

Si `ADMIN_EMAIL` ya tiene una cuenta creada, `prisma:seed:admin:prod` no la toca (nunca resetea
una contrasena existente) — asi que tambien es seguro de correr de mas, por ejemplo despues de
cada redeploy, sin pensar si hacia falta o no.

## 8. Checklist despues de cada deploy que toque el backend

1. Verifica que el deploy termino sin errores en el panel de Dokploy (o `docker logs -f
   salonfacil-backend` y busca que haya arrancado bien, sin excepciones de arranque).
2. `docker exec -it salonfacil-backend npx prisma migrate deploy` — aplica cualquier migracion
   nueva. Es inofensivo si no habia ninguna.
3. Si el cambio agrego catalogos nuevos: `docker exec -it salonfacil-backend npm run
   prisma:seed:catalog:prod`.
4. Si cambiaste alguna variable de entorno en el panel de Dokploy (dominio, credenciales, etc.):
   hace falta un **redeploy** (no alcanza con restart) para que el contenedor las relea — ver §0.
5. Entra al sitio real (`https://mievento.com.bo`) y probá el flujo que cambiaste a mano.

## 9. Problemas ya encontrados en este proyecto (y como se diagnosticaron)

- **CORS bloqueando todo, sin error en los logs del backend** — `CORS_ORIGINS` y `FRONTEND_URL`
  se arman a partir de una sola variable, `APP_DOMAIN` (ver `docker-compose.dokploy.yml`). Si
  `APP_DOMAIN` no coincide exactamente con el dominio real donde sirve el frontend (por ejemplo
  quedo en `app.mievento.com.bo` pero el sitio real es `mievento.com.bo`), el navegador bloquea
  toda llamada a la API con "falta la cabecera CORS Access-Control-Allow-Origin" — y como NestJS
  simplemente omite el header en vez de tirar un error, **no aparece nada en los logs**. Se
  diagnostica asi, comparando el origen real contra el permitido:
  ```bash
  curl -s -D - -o /dev/null -X OPTIONS "https://api.mievento.com.bo/api/v1/auth/login" \
    -H "Origin: https://mievento.com.bo" \
    -H "Access-Control-Request-Method: POST" | grep -i "access-control"
  ```
  Si no aparece `Access-Control-Allow-Origin` en la respuesta, ese origen no esta permitido.
  Arreglo: corregir `APP_DOMAIN` en el panel de Dokploy y **redeploy** (no restart).

- **`sh: ts-node: not found` al correr un script de seed** — ver la nota en §7. Usa el script
  `:prod` correspondiente en vez del original.

- **`Missing script` al correr `npm run <algo>:prod` recien agregado** — probablemente hiciste
  "Restart" en vez de "Deploy" en Dokploy despues de pushear el cambio que agrega el script
  (restart reusa la imagen vieja, que todavia no tiene el `package.json` actualizado — ver §0).
  Confirma que package.json realmente tiene el script antes de asumir que Dokploy no bajo el
  commit:
  ```bash
  docker exec -it salonfacil-backend grep "nombre-del-script" package.json
  ```

- **La pagina carga pero sale "no seguro" con certificado invalido despues de cambiar el
  dominio en Dokploy** — Dokploy no recarga la configuracion de dominios de Traefik en caliente
  cuando cambia un `docker-compose`; hace falta un redeploy fresco despues de tocar el dominio
  en su panel de **Domains** para que emita el certificado nuevo.

## 10. Notas de seguridad

- Postgres esta expuesto en `127.0.0.1:5434` del VPS (no en la IP publica) — para conectarte con
  DBeaver u otro cliente desde tu maquina, usa un tunel SSH:
  ```bash
  ssh -L 5434:localhost:5434 <usuario>@<ip-del-vps>
  ```
  y conectate a `localhost:5434` desde tu cliente local.
- Nunca pegues el output completo de `docker exec ... env` en un chat, ticket o log compartido
  sin tapar antes las credenciales (contrasena de Postgres, `JWT_SECRET`/`JWT_REFRESH_SECRET`,
  claves de AWS, Cloudinary, Google OAuth).
- El seed completo (`prisma/seed.ts`) borra usuarios reales si se corre por error contra
  produccion — usa siempre los scripts `:prod` / `catalog` / `admin` descritos en §7 para
  cualquier cosa que tenga que tocar la base de produccion.
