#!/usr/bin/env bash
# Полная установка на новый сервер (Ubuntu/Debian)
# Запуск: curl -fsSL ... | bash   или   bash docker/scripts/install-fresh-server.sh
set -euo pipefail

DOMAIN="${DOMAIN:-screen.norenvpn.com}"
REPO_URL="${REPO_URL:-https://github.com/Quadart21/render_translation.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/render-screen}"

echo "==> Установка Docker (если нет)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo "==> Клонирование репозитория в $INSTALL_DIR"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
git pull --ff-only || true

if [[ ! -f .env ]]; then
  cp .env.docker.example .env
  echo ""
  echo "Отредактируйте $INSTALL_DIR/.env:"
  echo "  BOT_TOKEN, TELEGRAM_BOT_USERNAME, SESSION_SECRET, LETSENCRYPT_EMAIL"
  echo "Затем снова: bash docker/scripts/deploy.sh"
  exit 1
fi

chmod +x docker/scripts/*.sh
bash docker/scripts/deploy.sh
