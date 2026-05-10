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

Опционально: авторизация через Telegram (`AUTH_ENABLED`, `BOT_TOKEN`, см. `src/web/server.js`).

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
| `templates/chat.html` | Вёрстка «телефона», темы iOS/Android |
| `assets/chat-wallpaper.png` | Фон чата |
| `assets/flaticon-*.png`, `composer-smiley.png` | Иконки композера (скрепка, микрофон, смайл) |
| `assets/status-*.png` | Сигнал и Wi‑Fi в статус-баре |
| `src/renderer/render.js` | Подстановка плейсхолдеров, Sharp (белые силуэты иконок), Playwright |

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
| `RENDER_ETALON=0` | Отключить приведение ширины PNG к эталону |
| `PORT` | Порт веб-сервера (по умолчанию 3000) |

## Релизы

Актуальные заметки о версиях — в [CHANGELOG.md](./CHANGELOG.md).

---

**Версия 1.0.0** — зафиксированное состояние: хром шапки, мягкий низ размытия, скрим ленты чата, иконки статуса/композера, фиксированный viewport телефона.
