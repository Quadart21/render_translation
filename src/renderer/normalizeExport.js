import sharp from 'sharp';
import {
  ANDROID_EXPORT_DPI,
  etalonDisplayWidthPx,
} from '../constants/renderEtalon.js';

/**
 * Итоговая ширина файла приводится к эталону дисплея (Sharp): Playwright на части окружений
 * даёт скрин в CSS-пикселях без учёта DPR — поэтому нормализация по ширине обязательна.
 */
export async function normalizePngToEtalonDisplay(buf, platform, opts = {}) {
  /* Подложка: не трогаем разрешение/резкость — пиксели исходника как есть. */
  if (opts.preserveNative) return buf;

  const skip = /^(0|false)$/i.test(String(process.env.RENDER_ETALON ?? ''));
  if (skip) return buf;

  const targetW = etalonDisplayWidthPx(platform);
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) return buf;

  /* Высота только из aspect исходника — никогда не тянуть оси независимо. */
  const resolvedH = Math.round((meta.height * targetW) / meta.width);

  const applyAndroidDpi = (pipe) =>
    platform === 'android'
      ? pipe.withMetadata({ density: ANDROID_EXPORT_DPI })
      : pipe;

  /* Один шаг Lanczos без численного шума: Playwright часто даёт ±1–2 px */
  if (
    Math.abs(meta.width - targetW) <= 2 &&
    Math.abs(meta.height - resolvedH) <= 2
  ) {
    return applyAndroidDpi(sharp(buf)).png({ compressionLevel: 6, effort: 8 }).toBuffer();
  }

  const upscaled = meta.width < targetW - 2 || meta.height < resolvedH - 2;
  let pipe = sharp(buf).resize(targetW, resolvedH, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  });
  // Усиленную резкость применяем только для Android.
  if (platform === 'android') {
    pipe = upscaled
      ? pipe
          .sharpen({ sigma: 1.05, m1: 0.85, m2: 3.2, x1: 2.5, y2: 14, y3: 16 })
          .modulate({ brightness: 1.02, saturation: 1.06 })
      : pipe
          .sharpen({ sigma: 0.85, m1: 0.75, m2: 2.4, x1: 2, y2: 12, y3: 14 })
          .modulate({ brightness: 1.01, saturation: 1.04 });
  }
  return applyAndroidDpi(pipe).png({ compressionLevel: 6, effort: 8 }).toBuffer();
}
