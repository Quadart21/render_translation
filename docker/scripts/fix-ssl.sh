#!/usr/bin/env bash
# Довыпуск Let's Encrypt, если deploy остановился на dummy-сертификате
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
source "$ROOT_DIR/docker/scripts/load-env.sh"

DOMAIN="${DOMAIN:-screen.norenvpn.com}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Задайте LETSENCRYPT_EMAIL в .env"
  exit 1
fi

CONF_DIR="$ROOT_DIR/docker/certbot/conf"

if [[ -f "$CONF_DIR/renewal/${DOMAIN}.conf" ]]; then
  echo "Сертификат Let's Encrypt уже есть."
  exit 0
fi

rm -rf \
  "$CONF_DIR/live/$DOMAIN" \
  "$CONF_DIR/archive/$DOMAIN" \
  "$CONF_DIR/renewal/${DOMAIN}.conf"

docker compose --profile certbot run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

docker compose exec nginx nginx -s reload
docker compose --profile certbot up -d certbot

echo "Готово: https://$DOMAIN"
