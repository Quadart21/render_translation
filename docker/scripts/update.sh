#!/usr/bin/env bash
# Быстрое обновление уже развёрнутого стека
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

docker compose build app
docker compose up -d app nginx

if docker compose --profile bot ps bot 2>/dev/null | grep -q Up; then
  docker compose --profile bot up -d bot
fi

echo "Обновление завершено."
