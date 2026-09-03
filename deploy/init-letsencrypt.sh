#!/usr/bin/env bash
# One-time bootstrap for the Let's Encrypt certificate used by docker-compose.prod.yml.
#
# Why this exists: nginx's config (nginx/templates/salonfacil.conf.template) references
# /etc/letsencrypt/live/$APP_DOMAIN/{fullchain,privkey}.pem, so nginx refuses to start at all
# before a real certificate exists there — but certbot needs nginx running (to serve the
# http-01 challenge) to issue that certificate. This script breaks the loop the standard way:
# put a throwaway self-signed cert in place, start nginx, swap in a real certbot-issued one,
# reload. Run it once per server; day-to-day renewal is handled automatically by the `certbot`
# service's renew loop in docker-compose.prod.yml.
#
# Run from the repo root: ./deploy/init-letsencrypt.sh
# Requires: docker, docker compose v2, and a .env file in the repo root (see
# .env.production.example) with APP_DOMAIN / API_DOMAIN / LETSENCRYPT_EMAIL already set, and
# both domains' DNS A records already pointing at this server.

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"

if [ ! -f .env ]; then
  echo "Missing .env in repo root — copy .env.production.example to .env and fill it in first." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

for var in APP_DOMAIN API_DOMAIN LETSENCRYPT_EMAIL; do
  if [ -z "${!var:-}" ]; then
    echo "Missing $var in .env" >&2
    exit 1
  fi
done

echo "==> Domains: $APP_DOMAIN, $API_DOMAIN"

echo "==> Creating a throwaway self-signed cert so nginx can start the first time..."
$COMPOSE run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$APP_DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$APP_DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem \
    -subj '/CN=localhost'
"

echo "==> Starting nginx with the throwaway cert..."
$COMPOSE up -d nginx

echo "==> Removing the throwaway cert so certbot doesn't just renew a self-signed one..."
$COMPOSE run --rm --entrypoint sh certbot -c "rm -rf /etc/letsencrypt/live/$APP_DOMAIN /etc/letsencrypt/archive/$APP_DOMAIN /etc/letsencrypt/renewal/$APP_DOMAIN.conf"

echo "==> Requesting the real certificate from Let's Encrypt..."
$COMPOSE run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$APP_DOMAIN" -d "$API_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos --no-eff-email

echo "==> Reloading nginx with the real certificate..."
$COMPOSE exec nginx nginx -s reload

echo "==> Done. https://$APP_DOMAIN and https://$API_DOMAIN should now serve a valid certificate."
