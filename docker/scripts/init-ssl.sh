#!/usr/bin/env bash
# Первичное получение Let's Encrypt сертификата для screen.norenvpn.com
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
source "$ROOT_DIR/docker/scripts/load-env.sh"
# shellcheck disable=SC1091
source "$ROOT_DIR/docker/scripts/ssl-common.sh"

DOMAIN="${DOMAIN:-screen.norenvpn.com}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Задайте LETSENCRYPT_EMAIL (например: admin@norenvpn.com)"
  exit 1
fi

CONF_DIR="$ROOT_DIR/docker/certbot/conf"
WWW_DIR="$ROOT_DIR/docker/certbot/www"
CERT_FILE="$CONF_DIR/live/$DOMAIN/fullchain.pem"

mkdir -p "$CONF_DIR" "$WWW_DIR"

if is_letsencrypt_cert "$CERT_FILE"; then
  echo "Сертификат Let's Encrypt уже есть: $DOMAIN"
  exit 0
fi

if [[ ! -f "$CERT_FILE" ]]; then
  echo "==> Временный самоподписанный сертификат (чтобы nginx мог стартовать)"
  docker compose --profile certbot run --rm --entrypoint /bin/sh certbot -c "
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
      -subj '/CN=$DOMAIN'
  "
fi

echo "==> Сборка и запуск приложения"
docker compose up -d --build app

echo "==> Запуск nginx"
docker compose up -d nginx

echo "==> Удаление временного сертификата перед Let's Encrypt"
remove_domain_cert "$DOMAIN" "$CONF_DIR"

echo "==> Запрос сертификата Let's Encrypt"
docker compose --profile certbot run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

if ! is_letsencrypt_cert "$CERT_FILE"; then
  echo "Ошибка: certbot не выдал Let's Encrypt сертификат."
  exit 1
fi

echo "==> Перезапуск nginx с реальным сертификатом"
docker compose restart nginx

echo "Готово. HTTPS: https://$DOMAIN"
