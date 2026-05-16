# render_translation — мок переписки (Telegram) → PNG

Рендер JSON-сцены в **скриншот чата** (iOS / Android, тёмная тема) с фиксированным «экраном» телефона, обоями, иконками в композере и статус-баре, размытием верхней «стеклянной» шапки и записью **EXIF** (модель устройства, дата/время, при необходимости GPS).

Репозиторий: [github.com/Quadart21/render_translation](https://github.com/Quadart21/render_translation)

## Требования

- **Node.js** ≥ 18  
- После `npm install` для Playwright при необходимости: `npx playwright install chromium`

## Установка

```bash
git clone https://github.com/Quadart21/render_translation.git
cd render_translation
npm install
npx playwright install chromium
```

## Быстрый рендер PNG

Из файла сцены (по умолчанию `data/sample-scene.json`):

```bash
npm run render
# или
node src/cli-render.js [путь-к-scene.json] [выход.png]
```

Случайная сцена (ники, аватары из **картинок в корне проекта** — положите свои `jpg`/`png`/`webp` рядом с `package.json`; папка `avatar/` в репозитории не используется и в `.gitignore`):

```bash
npm run render:random
node src/cli-render.js random [выход.png]
```

iOS-оформление:

```bash
node src/cli-render.js --ios random out/ios.png
```

## Веб-интерфейс

```bash
npm start
# http://localhost:3000 — статика из public/
# POST /api/render/scene — тело: JSON сцены → PNG
# POST /api/render/random — случайная сцена → PNG
```

Авторизация панели через Telegram поддерживается из коробки и может работать строго по allowlist Telegram ID.

### Строгий доступ по Telegram ID

1. Создайте `.env` на базе `.env.example`.
2. Укажите:
   - `AUTH_ENABLED=1`
   - `BOT_TOKEN=<токен бота>`
   - `TELEGRAM_BOT_USERNAME=<username бота без @>`
   - `ALLOWED_TELEGRAM_IDS=<id1,id2,...>`
   - `SESSION_SECRET=<длинный случайный ключ>`
3. Добавьте домен/URL панели в BotFather для Telegram Login Widget.

Важно:
- при `AUTH_ENABLED=1` сервер не запустится без `ALLOWED_TELEGRAM_IDS`;
- доступ к `/api/render/*` есть только после входа Telegram и только для ID из allowlist;
- если ID не в списке, возвращается `403`.

## Telegram-бот

```bash
npm run bot
# команды /render, /render_ios, /render_static — см. src/bot.js
```

## Формат сцены

Ориентир: `data/sample-scene.json` — платформа, `statusBar`, участники, `items` (текст, дата, изображение), закреп, метаданные для EXIF.

Локальные пути к картинкам в JSON при рендере **встраиваются** как `data:` URL (аватары, вложения в сообщениях).

## Ассеты и шаблон

| Путь | Назначение |
|------|------------|
| `templates/chat.html` | Каркас «телефона» + плейсхолдеры стилей (`__CHAT_CSS_SHARED__`, `__CHAT_CSS_PLATFORM__`) |
| `templates/styles/chat-shared.css` | Общие стили (без привязки к платформе) |
| `templates/styles/chat-ios.css` | Только iOS (селекторы `.theme-ios` / `.theme-ios-only`) |
| `templates/styles/chat-android.css` | Только Android (`.theme-android` / `.theme-android-only`) |
| `src/renderer/chatTemplate.js` | Сборка HTML: подмешивает в шаблон только CSS активной платформы |
| `assets/chat-wallpaper.png` | Фон чата |
| `assets/flaticon-*.png`, `composer-smiley.png` | Иконки композера (скрепка, микрофон, смайл) |
| `assets/status-*.png` | Сигнал и Wi‑Fi в статус-баре |
| `assets/telegram-plaque.png` | Плашка TELEGRAM в статус-строке |
| `assets/message-checks-read.png` | Две галочки «прочитано» у исходящих |
| `assets/ios-status-tray-strip.png` | iOS: справа в статусе (сигнал, Wi‑Fi, батарея); цифры заряда рисует Sharp поверх PNG |
| `src/renderer/render.js` | Подстановка плейсхолдеров, Sharp (белые силуэты иконок, оверлей заряда на трее), Playwright |

Регенерация трёх CSS из монолитного `<style>` (редко): `node scripts/extract-chat-css.mjs`.

**Лицензия Flaticon (free):** при публикации иконок с Flaticon нужна [атрибуция](https://support.flaticon.com/s/article/Attribution-How-when-and-where-FI?language=en_US).

## Ключевые особенности рендера

- **Фиксированная высота экрана** (`PHONE_LOGICAL_HEIGHT_CSS_PX` в `src/constants/renderEtalon.js`, по умолчанию 852px при ширине 393px) — длинный чат **не растягивает** PNG; прокрутка внутри `#chat`.
- **Единое «стекло» шапки** — блок `.chrome-header-stack` (статус + строка Telegram): один слой `backdrop-filter`, без шва между статусом и навбаром; нижний край **смягчён** маской.
- **Иконки** в шаблоне через плейсхолдеры `__ICON_*__`, в PNG — `data:` после обработки Sharp (без CSS `filter` на `<img>` с data URL в headless Chromium).
- **Нормализация ширины** итогового PNG под эталон дисплея (Sharp), см. `renderEtalon.js`.

## Переменные окружения (фрагмент)

| Переменная | Назначение |
|------------|------------|
| `RENDER_DPR` | Масштаб устройства для скриншота (ограничен сверху) |
| `RENDER_IOS_SUPER_SAMPLE` | Доп. множитель DPR только для iOS (1–3; по умолчанию **1.72**; `0`/`off` — как 1) |
| `RENDER_ETALON=0` | Отключить приведение ширины PNG к эталону |
| `PORT` | Порт веб-сервера (по умолчанию 3000) |

## Релизы

Актуальные заметки о версиях — в [CHANGELOG.md](./CHANGELOG.md).

---

**Версия 1.9.1** — единый стек San Francisco для PNG-мока (shared/iOS/Android CSS); **`@font-face`** с весом **700**; см. [CHANGELOG.md](./CHANGELOG.md).

**Версия 1.9.0** — iOS: цифры заряда на PNG-трее через Playwright + SF как Data URL, случайный процент **3–15** на рендер, дефолты позиции текста; см. [CHANGELOG.md](./CHANGELOG.md).

**Версия 1.8.0** — суперсэмплинг iOS и `fonts.ready` перед скрином; смягчение blur/градиентов шапки и ленты для PNG; см. [CHANGELOG.md](./CHANGELOG.md).

**Версия 1.7.0** — навбар ниже по высоте пилюль, подгонка ника/«в сети» и трея статуса iOS; см. [CHANGELOG.md](./CHANGELOG.md).

**Версия 1.6.0** — в числе прочего: iOS-трей статуса одним PNG с наложением заряда Sharp, галочки прочитанности PNG, актуальная таблица ассетов в этом README.
