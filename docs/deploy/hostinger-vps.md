# Deploy en un VPS de Hostinger

Guia para levantar SalonFacil en produccion en un VPS (Ubuntu 22.04+), usando
`docker-compose.prod.yml`: Postgres, Redis, backend y frontend en contenedores propios, mas
nginx como reverse proxy con TLS de Let's Encrypt.

Topologia: dos subdominios sobre el mismo dominio registrable (`app.tudominio.bo` para el
frontend, `api.tudominio.bo` para el backend) — el backend ya esta escrito asumiendo esto (ver
`backend/src/modules/auth/interface/auth-cookies.util.ts`), asi que las cookies de sesion
funcionan sin configuracion extra siempre que ambos subdominios compartan el dominio registrable.

## 1. Prerrequisitos

- Un VPS de Hostinger con Ubuntu 22.04 o superior, con acceso SSH.
- Un dominio propio, con dos registros DNS tipo A apuntando a la IP del VPS:
  - `app.tudominio.bo` → IP del VPS
  - `api.tudominio.bo` → IP del VPS
- Puertos 80 y 443 abiertos en el firewall del VPS.

## 2. Preparar el servidor

Conectate por SSH y instala Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Cerra sesion y volve a entrar para que el cambio de grupo tome efecto (o corre `newgrp docker`).

## 3. Clonar el repositorio

```bash
git clone <url-de-tu-repositorio> salon-facil
cd salon-facil
```

## 4. Configurar variables de entorno

```bash
cp .env.production.example .env
nano .env
```

Completa cada valor:

- `APP_DOMAIN` / `API_DOMAIN` — los dos subdominios del paso 1.
- `LETSENCRYPT_EMAIL` — correo real, Let's Encrypt lo usa para avisos de expiracion.
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` — generalos con:
  ```bash
  openssl rand -base64 32   # POSTGRES_PASSWORD
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -base64 48   # JWT_REFRESH_SECRET
  ```
- `CLOUDINARY_*`, `TWILIO_*`, `RESEND_*`, `GOOGLE_MAPS_API_KEY` — credenciales reales de cada
  servicio (ver `backend/.env.example` para donde conseguir cada una).
- `SENTRY_DSN` — opcional pero recomendado; dejalo vacio si todavia no configuraste Sentry.

Este archivo `.env` nunca se commitea (ya esta en `.gitignore`).

## 5. Emitir el certificado TLS (una sola vez)

```bash
./deploy/init-letsencrypt.sh
```

Este script arranca nginx con un certificado temporal, pide el certificado real a Let's Encrypt
via el desafio HTTP, y recarga nginx con el certificado definitivo. Si algo falla, revisa que los
dos registros DNS ya esten propagados (`dig app.tudominio.bo` y `dig api.tudominio.bo` deben
devolver la IP del VPS) antes de reintentar.

## 6. Levantar el resto del stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. Correr las migraciones y el seed inicial

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

El seed (`prisma/seed.ts`) borra y recrea datos de ejemplo — **no lo corras en produccion**. Si
necesitas una cuenta admin inicial, crea el usuario directamente contra la base de datos o agrega
un script de seed separado pensado para produccion.

## 8. Verificar

- `https://app.tudominio.bo` — debe cargar el sitio.
- `https://api.tudominio.bo/api/v1` — debe responder (Swagger esta deshabilitado en produccion a
  proposito, ver `backend/src/main.ts`).
- `docker compose -f docker-compose.prod.yml logs -f backend` — revisa que no haya errores de
  arranque (variables de entorno faltantes, conexion a la base de datos, etc.).

## Operacion diaria

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f [servicio]

# Actualizar a la ultima version
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Backup manual de la base de datos
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U salonfacil salonfacil > backup-$(date +%F).sql
```

La renovacion del certificado TLS es automatica (el servicio `certbot` en
`docker-compose.prod.yml` corre `certbot renew` cada 24h); no requiere accion manual salvo que
falle repetidamente, en cuyo caso revisa `docker compose -f docker-compose.prod.yml logs certbot`.

## Notas de seguridad

- Postgres y Redis solo escuchan en `127.0.0.1` del VPS (ver `docker-compose.prod.yml`) — no son
  alcanzables desde internet. Para administrarlos remotamente, usa un tunel SSH:
  ```bash
  ssh -L 5432:localhost:5432 usuario@tu-vps
  ```
- Considera configurar backups automaticos de `postgres_data` (cron + `pg_dump`, o snapshots del
  volumen a nivel de Hostinger) — este documento cubre el backup manual, no uno programado.
- El seed de datos de ejemplo (`prisma/seed.ts`) asume una base de datos vacia y **elimina todos
  los usuarios existentes** — nunca lo corras contra la base de produccion una vez que haya
  usuarios reales.
