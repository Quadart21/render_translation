/**
 * Эталонные физические разрешения экранов (пиксели) для масштаба экспорта PNG.
 * Логическая ширина макета `.phone` в templates/chat-ios.html / chat-android.html должна совпадать с
 * {@link PHONE_LOGICAL_WIDTH_CSS_PX}.
 */

/** Ширина блока `.phone` в CSS px — менять только вместе с шаблоном */
export const PHONE_LOGICAL_WIDTH_CSS_PX = 393;

/** Высота блока `.phone` в CSS px (фиксированный «экран», список чата скроллится внутри) */
export const PHONE_LOGICAL_HEIGHT_CSS_PX = 852;

/**
 * Целевая плотность PNG для iOS (ppi по ширине активной области).
 * Переопределение: переменная окружения RENDER_IOS_PPI (число ≥ 72).
 */
export const IPHONE_EXPORT_PPI = 460;

/**
 * Ширина активной области дисплея по корпусу (мм), для перевода ppi → ширина в px.
 * Переопределение: RENDER_IOS_WIDTH_MM (например 71.5).
 */
export const IPHONE_DISPLAY_WIDTH_MM = 71.5;

/**
 * Ширина итогового PNG для platform: ios (px): (ppi / 25.4) * мм.
 */
export function iphoneEtalonExportWidthPx() {
  const envPpi = Number(process.env.RENDER_IOS_PPI);
  const ppi =
    Number.isFinite(envPpi) && envPpi >= 72 ? envPpi : IPHONE_EXPORT_PPI;
  const envMm = Number(process.env.RENDER_IOS_WIDTH_MM);
  const mm =
    Number.isFinite(envMm) && envMm > 40 && envMm < 120 ? envMm : IPHONE_DISPLAY_WIDTH_MM;
  return Math.round((ppi / 25.4) * mm);
}

/** Справочно: типичные полные размеры панели (не используются для расчёта DPR). */
export const ETALON_IPHONE_16_PRO = Object.freeze({
  width: 1179,
  height: 2556,
});

/** Xiaomi 15 Ultra — эталон для platform: android */
export const ETALON_XIAOMI_15_ULTRA = Object.freeze({
  width: 3200,
  height: 1440,
});

/**
 * DPR Chromium так, чтобы ширина скриншота ≈ эталонной ширине дисплея при заданной логической ширине макета.
 * @param {'ios'|'android'} platform
 */
export function deviceScaleFactorForEtalon(platform) {
  const etalonW =
    platform === 'ios'
      ? iphoneEtalonExportWidthPx()
      : ETALON_XIAOMI_15_ULTRA.width;
  return etalonW / PHONE_LOGICAL_WIDTH_CSS_PX;
}

/** Верхняя граница clamp для RENDER_DPR / opts (не ниже Android-эталона ≈ 8.14) */
export function maxRenderDeviceScaleFactor() {
  const ios = iphoneEtalonExportWidthPx() / PHONE_LOGICAL_WIDTH_CSS_PX;
  const android = ETALON_XIAOMI_15_ULTRA.width / PHONE_LOGICAL_WIDTH_CSS_PX;
  return Math.min(16, Math.max(ios, android));
}

/**
 * Целевая ширина PNG в пикселях (эталон дисплея).
 * @param {'ios'|'android'} platform
 */
export function etalonDisplayWidthPx(platform) {
  return platform === 'ios'
    ? iphoneEtalonExportWidthPx()
    : ETALON_XIAOMI_15_ULTRA.width;
}
