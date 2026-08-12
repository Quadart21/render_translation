import {
  deviceScaleFactorForEtalon,
  maxRenderDeviceScaleFactor,
} from '../constants/renderEtalon.js';

/**
 * Масштаб пикселей: по умолчанию под эталон (iOS — ширина из PPI×мм, Android — Xiaomi 15 Ultra),
 * см. src/constants/renderEtalon.js. Переопределение: RENDER_DPR или opts.deviceScaleFactor.
 */
export function resolveDeviceScaleFactor(scene, opts) {
  const cap = maxRenderDeviceScaleFactor();
  const clamp = (v) => Math.min(cap, Math.max(1, v));

  if (opts.deviceScaleFactor != null && Number.isFinite(Number(opts.deviceScaleFactor))) {
    return clamp(Number(opts.deviceScaleFactor));
  }
  const env = Number(process.env.RENDER_DPR);
  if (Number.isFinite(env) && env >= 1) return clamp(env);

  const platform = scene && scene.platform === 'ios' ? 'ios' : 'android';
  return clamp(deviceScaleFactorForEtalon(platform));
}

/** Доп. множитель DPR только для iOS: снимаем крупнее, затем Sharp даунскейлит к эталону — контур текста заметно резче. */
export function resolveIosSuperSampleMultiplier() {
  const raw = process.env.RENDER_IOS_SUPER_SAMPLE;
  if (raw != null && /^(0|false|off|no)$/i.test(String(raw).trim())) return 1;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
  return 2.35;
}

/** Доп. множитель DPR для Android (делает даунскейл более качественным). */
export function resolveAndroidSuperSampleMultiplier() {
  const raw = process.env.RENDER_ANDROID_SUPER_SAMPLE;
  if (raw != null && /^(0|false|off|no)$/i.test(String(raw).trim())) return 1;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
  return 2.85;
}

/** Перед скрином: webfonts и два кадра раскладки — меньше «плывущего» текста и метрик. */
export async function waitForFontsAndPaintStable(page, platform = 'android') {
  await page.evaluate(async (plat) => {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        if (document.fonts.ready) await document.fonts.ready;
        const loads =
          plat === 'ios'
            ? [
                document.fonts.load('300 14px "SF Pro Text"'),
                document.fonts.load('400 14px "SF Pro Text"'),
                document.fonts.load('500 14px "SF Pro Text"'),
                document.fonts.load('600 14px "SF Pro Text"'),
              ]
            : [
                document.fonts.load('300 16px "SF Pro Text"'),
                document.fonts.load('400 16px "SF Pro Text"'),
                document.fonts.load('500 16px "SF Pro Text"'),
                document.fonts.load('600 16px "SF Pro Text"'),
                document.fonts.load('400 16px Roboto'),
              ];
        await Promise.all(loads.map((p) => p.catch(() => null)));
      }
    } catch {
      /* ignore */
    }
    try {
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return null;
          return new Promise((resolve) => {
            const done = () => resolve(null);
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 2500);
          });
        })
      );
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    try {
      if (typeof window.syncMetaSpacers === 'function') window.syncMetaSpacers();
    } catch {
      /* ignore */
    }
  }, platform);
}

/** Множитель суперсэмпла для оверлея: по умолчанию 1 (без даунскейла — Light иначе мылится). */
export function resolveCompositeSuperSampleMultiplier(_platform) {
  const envKey = 'RENDER_COMPOSITE_SUPER_SAMPLE';
  const raw = process.env[envKey] ?? process.env.RENDER_IOS_COMPOSITE_SUPER_SAMPLE;
  if (raw != null && /^(0|false|off|no)$/i.test(String(raw).trim())) return 1;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
  return 1;
}
