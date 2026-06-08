# Деплой на screen.norenvpn.com (Docker)

Production-стек: **Node.js + Playwright** (рендер PNG), **nginx** (HTTPS), **certbot** (Let's Encrypt).

Домен по умолчанию: **https://screen.norenvpn.com**

## Требования к серверу

- Ubuntu 22.04 / 24.04 или Debian 12 (рекомендуется)
- Минимум **2 GB RAM** (Playwright/Chromium)
- Открыты порты **80** и **443**
- A-запись DNS: `screen.norenvpn.com` → IP сервера

## Быстрая установка на чистый сервер

```bash
git clone https://github.com/Quadart21/render_translation.git /opt/render-screen && cd /opt/render-screen && cp .env.docker.example .env && nano .env
```

В `.env` заполните: `BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `SESSION_SECRET`, `LETSENCRYPT_EMAIL`.

**Docker уже установлен** (как на вашем сервере):

```bash
cd /opt/render-screen && chmod +x docker/scripts/*.sh && bash docker/scripts/deploy.sh
```

**Docker ещё нет** — сначала установка, потом деплой:

```bash
curl -fsSL https://get.docker.com | sh && systemctl enable --now docker && cd /opt/render-screen && chmod +x docker/scripts/*.sh && bash docker/scripts/deploy.sh
```

## Перед первым входом

1. В **BotFather** для бота добавьте домен: `screen.norenvpn.com` (Telegram Login Widget).
2. В `.env` включена авторизация (`AUTH_ENABLED=1`). Первый вошедший Telegram-пользователь станет администратором.
3. Картинки для случайных аватаров кладите в volume `app-avatars` (в контейнере `/app/avatar`):

```bash
docker compose exec app ls -la /app/avatar
# или смонтируйте каталог на хосте через override (см. ниже)
```

## Команды

| Действие | Команда |
|----------|---------|
| Статус | `docker compose ps` |
| Логи приложения | `docker compose logs -f app` |
| Логи nginx | `docker compose logs -f nginx` |
| Обновление после `git pull` | `bash docker/scripts/update.sh` |
| Перезапуск | `docker compose restart app nginx` |
| Telegram-бот (опционально) | `docker compose --profile bot up -d bot` |
| Автообновление SSL | `docker compose --profile certbot up -d certbot` |

## Структура Docker

```
Dockerfile              # образ на базе mcr.microsoft.com/playwright
docker-compose.yml      # app, nginx, certbot (profile), bot (profile)
docker/nginx/conf.d/    # HTTP + HTTPS для screen.norenvpn.com
docker/scripts/         # init-ssl, deploy, update, install-fresh-server
.env.docker.example     # шаблон production .env
```

### Сервисы

- **app** — веб-панель и API рендера (`node src/web/server.js`), порт 3000 внутри сети Docker
- **nginx** — TLS termination, прокси на `app:3000`
- **certbot** (profile) — фоновое обновление сертификата
- **bot** (profile) — Telegram-бот (`node src/index.js`), если нужен отдельно от панели

### Volumes

- `app-data` — `data/telegram-access.json` (список доступов)
- `app-avatars` — изображения для случайных аватаров

## Проверка здоровья

```bash
curl -s https://screen.norenvpn.com/api/health
# {"ok":true,"service":"render-screen"}
```

## Переменные окружения (.env)

См. `.env.docker.example`. Обязательные для production:

- `BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `SESSION_SECRET`
- `LETSENCRYPT_EMAIL`
- `TRUST_SECURE_COOKIES=1` (уже в шаблоне)

## SSL вручную

Если `deploy.sh` не получил сертификат:

```bash
bash docker/scripts/init-ssl.sh && docker compose --profile certbot up -d certbot
```

## Локальная разработка без Docker

Как раньше: `npm install`, `npx playwright install chromium`, `npm start` — см. [README.md](./README.md).

## Troubleshooting

**nginx не стартует** — нет сертификата. Запустите `bash docker/scripts/init-ssl.sh`.

**502 Bad Gateway** — приложение ещё поднимается или упало. Смотрите `docker compose logs app`.

**Рендер падает по памяти** — увеличьте RAM или `shm_size` в `docker-compose.yml` (уже 1 GB).

**Telegram Login не работает** — проверьте домен в BotFather и `TELEGRAM_BOT_USERNAME` в `.env`.
