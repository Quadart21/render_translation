import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import {
  deviceScaleFactorForEtalon,
  etalonDisplayWidthPx,
  maxRenderDeviceScaleFactor,
  PHONE_LOGICAL_HEIGHT_CSS_PX,
} from '../constants/renderEtalon.js';
import { embedPngExif } from '../lib/embedPngExif.js';
import { resolveTruthMeta } from '../lib/truthMeta.js';
import { embedSceneAssets, resolveImageSrc } from './resolveAssets.js';
import {
  buildIosFontFaceCss,
  resolveSfProTextFontForWeight,
  buildTrayBatteryFontFaceCss,
  trayBatterySvgFontFamily,
} from './iosFontFaces.js';
import { loadChatHtmlWithStyles } from './chatTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const wallpaperRaw = process.env.CHAT_WALLPAPER_PATH;
const chatWallpaperPath = wallpaperRaw
  ? path.isAbsolute(wallpaperRaw)
    ? wallpaperRaw
    : path.join(projectRoot, wallpaperRaw)
  : path.join(projectRoot, 'assets', 'chat-wallpaper.png');
const iosWallpaperRaw = process.env.CHAT_WALLPAPER_IOS_PATH;
const iosChatWallpaperPath = iosWallpaperRaw
  ? path.isAbsolute(iosWallpaperRaw)
    ? iosWallpaperRaw
    : path.join(projectRoot, iosWallpaperRaw)
  : path.join(projectRoot, 'assets', 'ios-chat-wallpaper.png');
const iconPaperclipPath = path.join(projectRoot, 'assets', 'flaticon-paperclip.png');
const iconMicrophonePath = path.join(projectRoot, 'assets', 'flaticon-microphone.png');
const statusCellularPath = path.join(projectRoot, 'assets', 'status-cellular.png');
const statusWifiPath = path.join(projectRoot, 'assets', 'status-wifi.png');
const composerSmileyPath = path.join(projectRoot, 'assets', 'composer-smiley.png');
const iconPhonePath = path.join(projectRoot, 'assets', 'flaticon-phone.png');
const androidBackIconRaw = process.env.ANDROID_BACK_ICON_PATH;
const androidBackIconPath = androidBackIconRaw
  ? (path.isAbsolute(androidBackIconRaw) ? androidBackIconRaw : path.join(projectRoot, androidBackIconRaw))
  : 'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_arrow-up-svgrepo-com-263156d1-382d-4924-933e-097b5789d605.png';
const telegramPlaquePath = path.join(projectRoot, 'assets', 'telegram-plaque.png');
const messageChecksPath = path.join(projectRoot, 'assets', 'message-checks-read.png');
const iosStatusTrayStripPath = path.join(projectRoot, 'assets', 'ios-status-tray-strip.png');

/** Запасные SVG (не 1×1 px): если PNG из assets недоступны, не будет «квадратиков». */
const FALLBACK_ICON_CLIP =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>'
  );
const FALLBACK_ICON_MIC =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm7-3a7 7 0 01-14 0H3a9 9 0 0018 0h-2z"/><path d="M12 19v3"/></svg>'
  );
const FALLBACK_ICON_SIGNAL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 11" fill="white"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="5" y="5" width="3" height="6" rx="0.5"/><rect x="10" y="3" width="3" height="8" rx="0.5"/><rect x="15" y="0" width="3" height="11" rx="0.5"/></svg>'
  );
const FALLBACK_ICON_WIFI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 11" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round"><path d="M7 9.5h.01"/><path d="M3.5 7a4 4 0 017 0"/><path d="M1.5 5a7 7 0 0111 0"/><path d="M0 3a9 9 0 0114 0"/></svg>'
  );
const FALLBACK_ICON_SMILEY =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.3" fill="white" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="white" stroke="none"/><path d="M8.5 14.5c1.3 1.6 3.7 2 5.5 1"/></svg>'
  );
/** Звонок в шапке Android — контур трубки, белый силуэт после Sharp как у остальных иконок */
const FALLBACK_ICON_PHONE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>'
  );
const FALLBACK_ICON_BACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l-8 8 8 8"/><path d="M20 12H4"/></svg>'
  );
/** Плашка TELEGRAM в строке статуса (полноцветный PNG). */
const FALLBACK_TELEGRAM_PLAQUE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="32" viewBox="0 0 140 32"><rect width="140" height="32" rx="16" fill="#3390ec"/></svg>'
  );
/** Две галочки «прочитано» у исходящих (если нет PNG — упрощённый SVG). */
const FALLBACK_MESSAGE_CHECKS =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 26 12"><path fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" d="M1 6l3.5 3.5L12 2m4 4l3.5 3.5L25 2"/></svg>'
  );
/** iOS: справа в статус-баре одним PNG (сигнал + Wi‑Fi + батарея). */
const FALLBACK_IOS_STATUS_TRAY =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="18" viewBox="0 0 78 18"><rect width="78" height="18" rx="4" fill="rgba(255,255,255,0.14)"/></svg>'
  );
/**
 * Белые силуэты на тёмной панели без CSS filter (иначе в Chromium часто «пустые» img).
 * Сохраняем альфу исходной иконки.
 */
async function pngToWhiteSilhouetteDataUrl(buf) {
  try {
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4 || !info.width || !info.height) {
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    const out = Buffer.from(data);
    for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3];
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = a;
    }
    const pngOut = await sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
    return `data:image/png;base64,${pngOut.toString('base64')}`;
  } catch {
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
}

async function readComposerIconDataUrl(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    return await pngToWhiteSilhouetteDataUrl(buf);
  } catch {
    return fallbackDataUrl;
  }
}

/** Back icon: предварительно апскейлим/центрируем для более гладкого контура. */
async function readBackIconDataUrl(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    const upscaled = await sharp(buf)
      .ensureAlpha()
      .resize(144, 144, {
        fit: 'contain',
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    return await pngToWhiteSilhouetteDataUrl(upscaled);
  } catch {
    return fallbackDataUrl;
  }
}

async function readPngDataUrlRaw(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return fallbackDataUrl;
  }
}

function escapeSvgText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlTextPlain(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** Общая геометрия текста заряда на PNG-трее (Sharp или Chromium). */
function computeIosTrayBatteryLayout(trayW, trayH, scene) {
  const label = extractIosBatteryDigits(scene);
  const xFrac = Number(process.env.IOS_TRAY_BATTERY_TEXT_X_FRAC);
  const yFrac = Number(process.env.IOS_TRAY_BATTERY_TEXT_Y_FRAC);
  const fontFrac = Number(process.env.IOS_TRAY_BATTERY_FONT_FRAC);
  const trimPxRaw = Number(process.env.IOS_TRAY_BATTERY_FONT_TRIM_PX);
  const trimPx = Number.isFinite(trimPxRaw) ? trimPxRaw : 3;
  const scaleRaw = Number(process.env.IOS_TRAY_BATTERY_FONT_SCALE);
  const fsScale = Number.isFinite(scaleRaw) ? scaleRaw : 0.93;
  const xf = Number.isFinite(xFrac) ? xFrac : 0.81;
  const yf = Number.isFinite(yFrac) ? yFrac : 0.48;
  const w = trayW;
  const h = trayH;
  let fs = Number.isFinite(fontFrac)
    ? Math.max(8, Math.round(h * fontFrac))
    : Math.max(8, Math.round(h - trimPx));
  fs = Math.max(8, Math.round(fs * fsScale));
  const cx = Math.round(w * xf);
  const cy = Math.round(h * yf);
  return { label, w, h, fs, cx, cy };
}

/**
 * Растеризация цифр через Chromium: Sharp/librsvg часто не применяют @font-face в SVG.
 * Синтетическое семейство TrayIosBat + data: URL к шрифту — как в основном HTML-моке.
 */
async function renderIosTrayBatteryTextPng(browser, layout, fontWeight) {
  const { label, w, h, fs, cx, cy, embed } = layout;
  if (!embed) throw new Error('renderIosTrayBatteryTextPng: embed required');
  const src = `url('${embed.dataUrl}') format('${embed.format}')`;
  const page = await browser.newPage({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  try {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @font-face{font-family:'TrayIosBat';src:${src};font-weight:100 900;font-style:normal;font-display:block;}
      html,body{margin:0;padding:0;width:${w}px;height:${h}px;background:transparent!important;overflow:hidden;}
      #t{position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);
        font-family:'TrayIosBat',sans-serif;font-size:${fs}px;font-weight:${fontWeight};color:#ffffff;
        line-height:1;white-space:nowrap;-webkit-font-smoothing:antialiased;}
    </style></head><body><div id="t">${escapeHtmlTextPlain(label)}</div></body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    return await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width: w, height: h },
    });
  } finally {
    await page.close();
  }
}

/** Цифры заряда на PNG-трее iOS: случайно [3..15] без суффикса %. Поле scene.statusBar.battery на оверлей трея не влияет. */
function extractIosBatteryDigits(_scene) {
  return String(Math.floor(Math.random() * 13) + 3);
}

/**
 * Fallback: цифры через Sharp SVG (librsvg может игнорировать встроенный шрифт — см. buildIosStatusTrayDataUrl + Chromium).
 */
async function composeIosStatusTrayWithBattery(trayPngBuf, scene, projectRoot) {
  const meta = await sharp(trayPngBuf).metadata();
  const w = meta.width || 197;
  const h = meta.height || 33;
  const { label, fs, cx, cy } = computeIosTrayBatteryLayout(w, h, scene);

  let fontFaceBlock = '';
  let fontFamily = trayBatterySvgFontFamily(null);
  let fontWeight = 600;
  if (projectRoot) {
    let embed = null;
    for (const wgt of [600, 500, 400]) {
      embed = await resolveSfProTextFontForWeight(projectRoot, wgt);
      if (embed) {
        fontWeight = wgt;
        break;
      }
    }
    if (embed) {
      fontFamily = trayBatterySvgFontFamily(embed);
      fontFaceBlock = `<defs><style type="text/css"><![CDATA[${buildTrayBatteryFontFaceCss(embed)}]]></style></defs>`;
    } else {
      console.warn(
        '[render] Цифры заряда на PNG-трее: нет файлов SF Pro / SF UI Text в assets/fonts/sf-pro-text/ — Sharp рисует SVG системным sans-serif (на Windows это не San Francisco). Положите .ttf/.otf/.woff2 из developer.apple.com/fonts/ или задайте IOS_FONT_DIR.'
      );
    }
  }

  const svg = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  ${fontFaceBlock}
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
    font-family="${fontFamily}"
    font-size="${fs}" font-weight="${fontWeight}" fill="#ffffff">${escapeSvgText(label)}</text>
</svg>`
  );
  return sharp(trayPngBuf).composite([{ input: svg, left: 0, top: 0 }]).png().toBuffer();
}

/** @param {import('playwright').Browser} browser — уже запущенный Chromium (те же аргументы, что и у основного рендера). */
async function buildIosStatusTrayDataUrl(scene, browser) {
  try {
    const buf = await fs.readFile(iosStatusTrayStripPath);
    const meta = await sharp(buf).metadata();
    const w = meta.width || 197;
    const h = meta.height || 33;
    const layoutBase = computeIosTrayBatteryLayout(w, h, scene);

    let embed = null;
    let fontWeight = 600;
    for (const wgt of [600, 500, 400]) {
      embed = await resolveSfProTextFontForWeight(projectRoot, wgt);
      if (embed) {
        fontWeight = wgt;
        break;
      }
    }

    const layout = { ...layoutBase, embed };

    if (embed && browser) {
      try {
        const overlay = await renderIosTrayBatteryTextPng(browser, layout, fontWeight);
        const composed = await sharp(buf).composite([{ input: overlay, left: 0, top: 0 }]).png().toBuffer();
        return `data:image/png;base64,${composed.toString('base64')}`;
      } catch (e) {
        console.warn('[render] Цифры трея через Chromium не удались, fallback Sharp SVG:', e?.message || e);
      }
    }

    const composed = await composeIosStatusTrayWithBattery(buf, scene, projectRoot);
    return `data:image/png;base64,${composed.toString('base64')}`;
  } catch {
    return FALLBACK_IOS_STATUS_TRAY;
  }
}

/**
 * Масштаб пикселей: по умолчанию под эталон (iOS — ширина из PPI×мм, Android — Xiaomi 15 Ultra),
 * см. src/constants/renderEtalon.js. Переопределение: RENDER_DPR или opts.deviceScaleFactor.
 */
function resolveDeviceScaleFactor(scene, opts) {
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
function resolveIosSuperSampleMultiplier() {
  const raw = process.env.RENDER_IOS_SUPER_SAMPLE;
  if (raw != null && /^(0|false|off|no)$/i.test(String(raw).trim())) return 1;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
  return 2.35;
}

/** Доп. множитель DPR для Android (делает даунскейл более качественным). */
function resolveAndroidSuperSampleMultiplier() {
  const raw = process.env.RENDER_ANDROID_SUPER_SAMPLE;
  if (raw != null && /^(0|false|off|no)$/i.test(String(raw).trim())) return 1;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
  return 2.4;
}

/** Перед скрином: webfonts и два кадра раскладки — меньше «плывущего» текста и метрик. */
async function waitForFontsAndPaintStable(page) {
  await page.evaluate(async () => {
    try {
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
}

/**
 * Итоговая ширина файла приводится к эталону дисплея (Sharp): Playwright на части окружений
 * даёт скрин в CSS-пикселях без учёта DPR — поэтому нормализация по ширине обязательна.
 */
async function normalizePngToEtalonDisplay(buf, platform) {
  const skip = /^(0|false)$/i.test(String(process.env.RENDER_ETALON ?? ''));
  if (skip) return buf;

  const targetW = etalonDisplayWidthPx(platform);
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) return buf;

  /* Один шаг Lanczos без численного шума: Playwright часто даёт 1294/1296 вместо 1295 */
  if (Math.abs(meta.width - targetW) <= 2) return buf;

  const targetH = Math.round((meta.height * targetW) / meta.width);
  const upscaled = meta.width < targetW - 2;
  let pipe = sharp(buf).resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 });
  // Усиленную резкость применяем только для Android.
  if (platform === 'android') {
    pipe = upscaled
      ? pipe.sharpen({ sigma: 0.72, m1: 0.5, m2: 2.6, x1: 3, y2: 12, y3: 14 })
      : pipe.sharpen({ sigma: 0.38, m1: 0.45, m2: 1.45, x1: 2, y2: 9, y3: 13 });
  }
  return pipe.png().toBuffer();
}

/**
 * Рендер сцены в один или несколько PNG-скринов (страницы истории чата).
 * @param {object} scene — см. data/sample-scene.json
 * @param {{
 *   embedExif?: boolean,
 *   viewportWidth?: number,
 *   viewportHeight?: number,
 *   deviceScaleFactor?: number,
 * }} [opts]
 * @returns {Promise<Buffer[]>}
 */
export async function renderSceneToPngPages(scene, opts = {}) {
  const embedExif = opts.embedExif !== false;
  let dpr = resolveDeviceScaleFactor(scene, opts);
  const viewportWidth = opts.viewportWidth ?? 640;
  const viewportHeight = opts.viewportHeight ?? PHONE_LOGICAL_HEIGHT_CSS_PX + 120;
  const withAssets = embedSceneAssets(scene);
  const platformKey = withAssets.platform === 'ios' ? 'ios' : 'android';
  const raw = await loadChatHtmlWithStyles(withAssets);
  const json = JSON.stringify(withAssets);
  const wallpaperPathForPlatform =
    platformKey === 'ios' ? iosChatWallpaperPath : chatWallpaperPath;
  let wallpaperInject =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  try {
    const wBuf = await fs.readFile(wallpaperPathForPlatform);
    wallpaperInject = `data:image/png;base64,${wBuf.toString('base64')}`;
  } catch {
    if (wallpaperPathForPlatform !== chatWallpaperPath) {
      try {
        const fallbackBuf = await fs.readFile(chatWallpaperPath);
        wallpaperInject = `data:image/png;base64,${fallbackBuf.toString('base64')}`;
      } catch {
        /* 1×1 px fallback если файла нет */
      }
    }
  }
  const [
    iconAttachInject,
    iconMicInject,
    iconSignalInject,
    iconWifiInject,
    iconSmileyInject,
    iconPhoneInject,
    iconBackInject,
    telegramPlaqueInject,
    messageChecksInject,
    iosFontFaces,
  ] = await Promise.all([
    readComposerIconDataUrl(iconPaperclipPath, FALLBACK_ICON_CLIP),
    readComposerIconDataUrl(iconMicrophonePath, FALLBACK_ICON_MIC),
    readComposerIconDataUrl(statusCellularPath, FALLBACK_ICON_SIGNAL),
    readComposerIconDataUrl(statusWifiPath, FALLBACK_ICON_WIFI),
    readComposerIconDataUrl(composerSmileyPath, FALLBACK_ICON_SMILEY),
    readComposerIconDataUrl(iconPhonePath, FALLBACK_ICON_PHONE),
    readBackIconDataUrl(androidBackIconPath, FALLBACK_ICON_BACK),
    readPngDataUrlRaw(telegramPlaquePath, FALLBACK_TELEGRAM_PLAQUE),
    readComposerIconDataUrl(messageChecksPath, FALLBACK_MESSAGE_CHECKS),
    buildIosFontFaceCss(projectRoot),
  ]);
  const resolvedComposite = resolveImageSrc(withAssets.compositeScreenshot);
  if (
    withAssets.compositeScreenshot &&
    String(withAssets.compositeScreenshot).trim() &&
    !resolvedComposite
  ) {
    console.warn(
      '[render] compositeScreenshot не загрузился (проверьте путь к файлу или data URL):',
      String(withAssets.compositeScreenshot).slice(0, 120)
    );
  }
  const compositeInject =
    resolvedComposite ||
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--force-color-profile=srgb',
      /* iOS PNG: slight тоньше, чем medium/full, для Light (300) */
      `--font-render-hinting=${platformKey === 'ios' ? 'slight' : 'full'}`,
    ],
  });
  try {
    let iosStatusTrayInject = FALLBACK_IOS_STATUS_TRAY;
    if (platformKey === 'ios') {
      iosStatusTrayInject = await buildIosStatusTrayDataUrl(withAssets, browser);
    }

    const html = raw
    .replace('__IOS_FONT_FACES__', platformKey === 'ios' ? iosFontFaces : '')
    .replace('__SCENE_JSON__', json)
    .replace(/__COMPOSITE_SCREENSHOT_SRC__/g, compositeInject)
    .replace(/__CHAT_WALLPAPER__/g, wallpaperInject)
    .replace(/__ICON_ATTACH__/g, iconAttachInject)
    .replace(/__ICON_MIC__/g, iconMicInject)
    .replace(/__ICON_SIGNAL__/g, iconSignalInject)
    .replace(/__ICON_WIFI__/g, iconWifiInject)
    .replace(/__ICON_SMILEY__/g, iconSmileyInject)
    .replace(/__ICON_PHONE__/g, iconPhoneInject)
    .replace(/__ICON_BACK__/g, iconBackInject)
    .replace(/__TELEGRAM_PLAQUE__/g, telegramPlaqueInject)
    .replace(/__MESSAGE_CHECKS_SRC__/g, messageChecksInject)
    .replace(/__IOS_STATUS_TRAY__/g, iosStatusTrayInject);

    {
      const cap = maxRenderDeviceScaleFactor();
      const mul =
        platformKey === 'ios'
          ? resolveIosSuperSampleMultiplier()
          : resolveAndroidSuperSampleMultiplier();
      dpr = Math.min(cap, dpr * mul);
    }

    const page = await browser.newPage({
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: dpr,
      },
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setContent(html, { waitUntil: 'load' });
    const scrollPositions = await page.evaluate(() => {
      var chat = document.getElementById('chat');
      if (!chat) return [0];
      var maxScroll = Math.max(0, chat.scrollHeight - chat.clientHeight);
      if (maxScroll <= 0) return [0];
      var overlap = 72;
      var step = Math.max(1, chat.clientHeight - overlap);
      var out = [0];
      var pos = 0;
      while (pos < maxScroll) {
        pos = Math.min(maxScroll, pos + step);
        if (pos !== out[out.length - 1]) out.push(pos);
      }
      return out;
    });
    await waitForFontsAndPaintStable(page);
    const phone = await page.$('.phone');
    if (!phone) throw new Error('.phone not found in template');
    /** @type {Buffer[]} */
    const pages = [];
    for (let i = 0; i < scrollPositions.length; i += 1) {
      const top = scrollPositions[i];
      await page.evaluate((scrollTop) => {
        var chat = document.getElementById('chat');
        if (chat) chat.scrollTop = scrollTop;
        if (typeof window.applyOutgoingBubbleVerticalGradient === 'function') {
          window.applyOutgoingBubbleVerticalGradient();
        }
        if (typeof window.applyLightImageOverlayMeta === 'function') {
          window.applyLightImageOverlayMeta();
        }
        if (typeof window.fixIosMetaOverlap === 'function') {
          window.fixIosMetaOverlap();
        }
      }, top);
      await waitForFontsAndPaintStable(page);
      let buf = await phone.screenshot({
        type: 'png',
        scale: 'device',
        animations: 'disabled',
        caret: 'hide',
      });
      buf = await normalizePngToEtalonDisplay(buf, platformKey);
      if (embedExif) {
        const truth = resolveTruthMeta(withAssets);
        buf = await embedPngExif(buf, truth);
      }
      pages.push(buf);
    }
    return pages;
  } finally {
    await browser.close();
  }
}

/**
 * Рендер сцены в один PNG (совместимость: последний экран как раньше).
 * @param {object} scene
 * @param {{
 *   embedExif?: boolean,
 *   viewportWidth?: number,
 *   viewportHeight?: number,
 *   deviceScaleFactor?: number,
 * }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function renderSceneToPng(scene, opts = {}) {
  const pages = await renderSceneToPngPages(scene, opts);
  return pages[pages.length - 1];
}
