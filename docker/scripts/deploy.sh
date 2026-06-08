#!/usr/bin/env bash
# Установка на чистый Ubuntu/Debian сервер: Docker + деплой screen.norenvpn.com
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DOMAIN="${DOMAIN:-screen.norenvpn.com}"
REPO_URL="${REPO_URL:-https://github.com/Quadart21/render_translation.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/render-screen}"

echo "==> Проверка Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "Устанавливаю Docker..."
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker 2>/dev/null || true

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin не найден. Обновите Docker до актуальной версии."
  exit 1
fi

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  if [[ -f "$ROOT_DIR/.env.docker.example" ]]; then
    cp "$ROOT_DIR/.env.docker.example" "$ROOT_DIR/.env"
    echo "Создан .env из .env.docker.example — отредактируйте BOT_TOKEN, SESSION_SECRET, LETSENCRYPT_EMAIL"
    echo "Файл: $ROOT_DIR/.env"
    exit 1
  else
    echo "Нет .env — скопируйте .env.docker.example в .env и заполните секреты."
    exit 1
  fi
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/.env" 2>/dev/null || true

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "В .env задайте LETSENCRYPT_EMAIL=your@email.com"
  exit 1
fi

if [[ -z "${BOT_TOKEN:-}" ]] || [[ "${BOT_TOKEN}" == *"REPLACE"* ]]; then
  echo "В .env задайте BOT_TOKEN от BotFather"
  exit 1
fi

if [[ -z "${SESSION_SECRET:-}" ]] || [[ "${SESSION_SECRET}" == *"REPLACE"* ]]; then
  echo "В .env задайте SESSION_SECRET (длинная случайная строка)"
  exit 1
fi

echo "==> DNS: убедитесь, что A-запись $DOMAIN указывает на этот сервер"
read -r -p "Продолжить? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  exit 0
fi

bash "$ROOT_DIR/docker/scripts/init-ssl.sh"

echo "==> Автообновление сертификата (certbot renew каждые 12 ч)"
docker compose --profile certbot up -d certbot

echo ""
echo "Панель: https://$DOMAIN"
echo "Логи:   docker compose logs -f app nginx"
echo "Бот (опционально): docker compose --profile bot up -d bot"
