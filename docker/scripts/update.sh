#!/usr/bin/env bash
# Быстрое обновление уже развёрнутого стека: git pull + rebuild
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -d .git ]]; then
  echo "==> git fetch/pull"
  git fetch --prune origin
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$BRANCH" == "HEAD" ]]; then
    echo "Detached HEAD — переключаюсь на main"
    git checkout main
    BRANCH=main
  fi
  git pull --ff-only origin "$BRANCH"
  git rev-parse HEAD > .git-commit
  echo "Код: $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"
else
  echo "Предупреждение: нет .git — собираю то, что лежит в $ROOT_DIR"
fi

echo "==> docker compose build/up"
docker compose build --pull app
docker compose up -d --force-recreate app nginx

if docker compose --profile bot ps bot 2>/dev/null | grep -q Up; then
  docker compose --profile bot up -d --force-recreate bot
fi

echo "Обновление завершено."
echo "Проверка: curl -s https://screen.norenvpn.com/api/health"
