#!/usr/bin/env bash
# Перевыпуск Let's Encrypt, если остался самоподписанный dummy-сертификат
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
source "$ROOT_DIR/docker/scripts/load-env.sh"
# shellcheck disable=SC1091
source "$ROOT_DIR/docker/scripts/ssl-common.sh"

DOMAIN="${DOMAIN:-screen.norenvpn.com}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
CONF_DIR="$ROOT_DIR/docker/certbot/conf"
CERT_FILE="$CONF_DIR/live/$DOMAIN/fullchain.pem"

if [[ -z "$EMAIL" ]]; then
  echo "Задайте LETSENCRYPT_EMAIL в .env"
  exit 1
fi

if is_letsencrypt_cert "$CERT_FILE"; then
  echo "Let's Encrypt уже установлен: $CERT_FILE"
  openssl x509 -in "$CERT_FILE" -noout -issuer -dates
  exit 0
fi

echo "==> Найден не Let's Encrypt сертификат (или его нет) — перевыпуск"
remove_domain_cert "$DOMAIN" "$CONF_DIR"

docker compose up -d app nginx

echo "==> Запрос сертификата Let's Encrypt"
docker compose --profile certbot run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

if ! is_letsencrypt_cert "$CERT_FILE"; then
  echo "Ошибка: после certbot сертификат Let's Encrypt не найден."
  exit 1
fi

echo "==> Перезапуск nginx с новым сертификатом"
docker compose restart nginx
docker compose --profile certbot up -d certbot

echo "Готово: https://$DOMAIN"
openssl x509 -in "$CERT_FILE" -noout -issuer -dates
