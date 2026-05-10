/**
 * Эталонные физические разрешения экранов (пиксели) для масштаба экспорта PNG.
 * Логическая ширина макета `.phone` в templates/chat.html должна совпадать с
 * {@link PHONE_LOGICAL_WIDTH_CSS_PX}.
 */

/** Ширина блока `.phone` в CSS px — менять только вместе с шаблоном */
export const PHONE_LOGICAL_WIDTH_CSS_PX = 393;

/** Высота блока `.phone` в CSS px (фиксированный «экран», список чата скроллится внутри) */
export const PHONE_LOGICAL_HEIGHT_CSS_PX = 852;

/** Apple iPhone 16 Pro — эталон для platform: ios */
export const ETALON_IPHONE_16_PRO = Object.freeze({
  width: 2622,
  height: 1206,
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
      ? ETALON_IPHONE_16_PRO.width
      : ETALON_XIAOMI_15_ULTRA.width;
  return etalonW / PHONE_LOGICAL_WIDTH_CSS_PX;
}

/** Верхняя граница clamp для RENDER_DPR / opts (не ниже Android-эталона ≈ 8.14) */
export function maxRenderDeviceScaleFactor() {
  const ios = ETALON_IPHONE_16_PRO.width / PHONE_LOGICAL_WIDTH_CSS_PX;
  const android = ETALON_XIAOMI_15_ULTRA.width / PHONE_LOGICAL_WIDTH_CSS_PX;
  return Math.min(16, Math.max(ios, android));
}

/**
 * Целевая ширина PNG в пикселях (эталон дисплея).
 * @param {'ios'|'android'} platform
 */
export function etalonDisplayWidthPx(platform) {
  return platform === 'ios'
    ? ETALON_IPHONE_16_PRO.width
    : ETALON_XIAOMI_15_ULTRA.width;
}
