# Changelog

## [1.10.1] — 2026-05-17

### Android status bar

- Добавлена кастомная батарея в статус-баре Android: цифры внутри, заполнение по проценту, low-state с красным акцентом.
- Значение процента батареи генерируется случайно при каждом рендере Android.
- Добавлены рандомные дополнительные иконки рядом с сетью (ключ / гео / будильник) с равномерными отступами.
- Подправлены интервалы и ширины в status tray для более плотного и ровного расположения иконок.

[1.10.1]: https://github.com/Quadart21/render_translation/releases/tag/v1.10.1

## [1.10.0] — 2026-05-16

### Web / безопасность

- Веб-панель: при `AUTH_ENABLED=1` сервер теперь работает в fail-closed режиме и не запускается без `ALLOWED_TELEGRAM_IDS`.
- Обновлены инструкции в `README.md` и `.env.example` для строгой авторизации Telegram по allowlist user id.

### Android / интерфейс

- Обновлена геометрия Android-мока под HD+ эталон (`720×1600`), включая шапку, ленту, pinned-блок и нижний composer.
- Нижняя панель Android переработана на точную координатную раскладку (капсула поля, emoji/текст/gift/attach, отдельная mic-кнопка), выровнены иконки по одной горизонтали.
- Иконка подарка заменена на SVG-вариант и усилена по толщине линии (`stroke-width: 4`).

[1.10.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.10.0

## [1.9.1] — 2026-05-10

### Шрифты (PNG-рендер iOS и Android)

- Базовый стек в **`chat-shared.css`**: **San Francisco** (**SF Pro Text**, **SF UI Text**) и системные `-apple-system` / **`BlinkMacSystemFont`** — без **Segoe UI**, **Roboto**, **Arial** в середине цепочки (меньше ухода на не-SF при скрине в Chromium).
- **`chat-ios.css`** / **`chat-android.css`**: тот же порядок **`'SF Pro Text', 'SF UI Text', …`** в переменных и там, где задано семейство явно.
- **`iosFontFaces.js`**: в **`buildIosFontFaceCss`** добавлен вес **700 (Bold)**; для `.ios-nav-title` и прочих **`font-weight: 700`** нужен файл вроде **`SFProText-Bold.otf`** в **`assets/fonts/sf-pro-text/`** (или **`IOS_FONT_DIR`**).

[1.9.1]: https://github.com/Quadart21/render_translation/releases/tag/v1.9.1

## [1.9.0] — 2026-05-10

### iOS / рендер

- Цифры заряда на PNG-трее статуса (`__IOS_STATUS_TRAY__`): отрисовка через Playwright (минимальный HTML + `@font-face` **TrayIosBat** из Data URL, `document.fonts.ready` и кадр), композит Sharp поверх полосы **`assets/ios-status-tray-strip.png`**.
- Для оверлея трея значение заряда — **случайное целое от 3 до 15** на каждый рендер (поле `scene.statusBar.battery` на эти цифры не влияет).
- Позиция текста по умолчанию: **`IOS_TRAY_BATTERY_TEXT_X_FRAC`** ≈ **0.81**, **`IOS_TRAY_BATTERY_TEXT_Y_FRAC`** ≈ **0.48**.
- Fallback Sharp/SVG: то же семейство **TrayIosBat** через `buildTrayBatteryFontFaceCss` / `trayBatterySvgFontFamily` в `iosFontFaces.js`.

### Стили

- Правки **`chat-ios.css`** и **`chat-android.css`**.

[1.9.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.9.0

## [1.8.0] — 2026-05-11

### Рендер

- iOS: множитель суперсэмплинга по умолчанию **1.72** (было 1.4); по-прежнему **`RENDER_IOS_SUPER_SAMPLE`** и один даунскейл Sharp к эталону в `normalizePngToEtalonDisplay`.
- Перед скрином: **`document.fonts.ready`** и два **`requestAnimationFrame`** для стабилизации шрифтов и кадра.

### Стили (iOS / Android)

- Шапка «стекла»: чуть мягче **`backdrop-filter`** (8px → 6px), градиенты затемнения с дополнительными ступенями (**меньше бэндинга** на скрине после даунскейла).
- Лента: плавнее градиенты **`chat-wrap::before`** и **`phone-main::after`**.
- iOS: **`font-smoothing: antialiased`** для телефонного мока (ровнее текст в PNG при высоком DPR).

[1.8.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.8.0

## [1.7.0] — 2026-05-11

### Шапка (iOS / Android)

- iOS: капсулы навбара и кольцо аватара **−3px** по высоте (`--ios-nav-row-height` **45px** вместо 48).
- Android: кнопка «назад» и аватар в заголовке **45px** по высоте/ширине.
- Капсула с ником и подписью: вертикаль блока, кегль заголовка **16px**, строка «в сети» приподнята (**`translateY(-2px)`**) без отдельного смещения ника.
- PNG статус-трея (сигнал / Wi‑Fi / батарея): компактнее отображение (**`0.84em`**, **`max-width`** уменьшен) в `chat-ios.css`.

### Сообщения (iOS)

- Входящие многострочные (**bubble--ios-c/d/e**): время справа с тем же **`right: 10px`**, что и у однострочных (убран лишний inset).

[1.7.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.7.0

## [1.6.0] — 2026-05-10

### iOS

- Справа в статус-баре один PNG-трей **`assets/ios-status-tray-strip.png`** (`__IOS_STATUS_TRAY__`): перед подстановкой в HTML Sharp накладывает **цифры заряда** из `scene.statusBar.battery` (без `%`).
- Позиция и размер текста: по умолчанию кегль ≈ **высота PNG минус 3px** (trim **3**), координаты через доли ширины/высоты; переопределение переменными окружения `IOS_TRAY_BATTERY_TEXT_X_FRAC`, `IOS_TRAY_BATTERY_TEXT_Y_FRAC`, `IOS_TRAY_BATTERY_FONT_TRIM_PX`, опционально `IOS_TRAY_BATTERY_FONT_FRAC`.

### Рендер и шаблон

- Галочки прочитанности исходящих: PNG **`assets/message-checks-read.png`** (`__MESSAGE_CHECKS_SRC__`).
- Прочие правки вёрстки iOS/Android и общих стилей (шапка, композер, классы трея).

[1.6.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.6.0

## [1.2.0] — 2026-05-10

### Рендер и шаблон

- Стили чата разнесены по файлам: `templates/styles/chat-shared.css`, `chat-ios.css`, `chat-android.css`; в HTML подставляется только CSS активной платформы (`src/renderer/chatTemplate.js`).
- Время на **изображении без подписи** накладывается на превью (класс `message__image-wrap--overlay`, правки в `templates/chat.html` и общих стилях).

### iOS

- Многострочные пузыри (**bubble--ios-c/d/e**): текст через **`inline-block`**, ширина по самой длинной строке; без общего «столбца» справа и без JS-подгонки ширины.
- У **входящих**, только для **двух и более строк** (те же **c/d/e**): время смещено **чуть левее** (`right: 19px` вместо `10px`); однострочные **ios-a/ios-b** без этого сдвига.
- Типографика: **SF Pro Text Light (300)** и смягчение перегруженных `font-weight` в интерфейсе; `@font-face` для Light добавлен в `iosFontFaces.js`.

### Android

- Узкие пузыри текста (не растягивание под самую длинную строку в flex): блок + float времени, колонка `fit-content`.

[1.2.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.2.0

## [1.0.0] — 2026-05-10

Первый зафиксированный релиз для репозитория [render_translation](https://github.com/Quadart21/render_translation).

### Рендер и вёрстка

- Фиксированные логические размеры «экрана» (ширина 393px, высота 852px): чат прокручивается внутри `#chat`, итоговый PNG не раздувается по вертикали; после загрузки — прокрутка к низу переписки.
- Лента чата на весь `phone-main` под слоем chrome; сообщения уходят под полупрозрачную шапку.
- **Один слой размытия** для пары «статус-бар + строка Telegram» (`.chrome-header-stack::before`): без видимой границы между ними; общие правила для режима `chat-under-header`.
- **Смягчённый нижний край** размытия шапки: продление `::before` ниже блока + градиентная `mask-image`.
- Мягкий градиентный скрим у верхнего края прокручиваемой ленты (`.chat-wrap::before`).
- Тонкая нижняя граница шапки: `rgba(255, 255, 255, 0.06)` вместо жёсткого `var(--tg-border)` у стыка с закрепом/чатом.

### Иконки

- Композер: скрепка, микрофон, смайл — PNG из `assets/`, в рендере встраиваются как `data:` + нормализация в белый силуэт (Sharp), SVG-запасные варианты при отсутствии файлов.
- Статус-бар: сигнал и Wi‑Fi из `assets/status-*.png`, укрупнены под размер времени/процентов.
- Плашка «Telegram» на iOS: симметричная сетка колонок для центрирования.
- Исправлено: `display: grid` у `.ios-nav.telegram-topbar`; выравнивание аватара в шапке.

### Прочее

- Подстановка обоев `__CHAT_WALLPAPER__`, EXIF через `embedPngExif`, эталон ширины дисплея в `renderEtalon.js`.

[1.0.0]: https://github.com/Quadart21/render_translation/releases/tag/v1.0.0
