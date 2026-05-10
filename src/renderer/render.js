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
import { embedSceneAssets } from './resolveAssets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const templatePath = path.join(projectRoot, 'templates', 'chat.html');
const chatWallpaperPath = path.join(projectRoot, 'assets', 'chat-wallpaper.png');
const iconPaperclipPath = path.join(projectRoot, 'assets', 'flaticon-paperclip.png');
const iconMicrophonePath = path.join(projectRoot, 'assets', 'flaticon-microphone.png');
const statusCellularPath = path.join(projectRoot, 'assets', 'status-cellular.png');
const statusWifiPath = path.join(projectRoot, 'assets', 'status-wifi.png');
const composerSmileyPath = path.join(projectRoot, 'assets', 'composer-smiley.png');

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

/**
 * Масштаб пикселей: по умолчанию под эталон экрана (iPhone 16 Pro / Xiaomi 15 Ultra),
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

/**
 * Итоговая ширина файла приводится к эталону дисплея (Sharp): Playwright на части окружений
 * даёт скрин в CSS-пикселях без учёта DPR — поэтому нормализация по ширине обязательна.
 */
async function normalizePngToEtalonDisplay(buf, platform) {
  const skip = /^(0|false)$/i.test(String(process.env.RENDER_ETALON ?? ''));
  if (skip) return buf;

  const targetW = etalonDisplayWidthPx(platform);
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height || meta.width === targetW) return buf;

  const targetH = Math.round((meta.height * targetW) / meta.width);
  return sharp(buf)
    .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

/**
 * Рендер сцены в PNG (буфер).
 * @param {object} scene — см. data/sample-scene.json
 * @param {{
 *   embedExif?: boolean,
 *   viewportWidth?: number,
 *   viewportHeight?: number,
 *   deviceScaleFactor?: number,
 * }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function renderSceneToPng(scene, opts = {}) {
  const embedExif = opts.embedExif !== false;
  const dpr = resolveDeviceScaleFactor(scene, opts);
  const viewportWidth = opts.viewportWidth ?? 640;
  const viewportHeight = opts.viewportHeight ?? PHONE_LOGICAL_HEIGHT_CSS_PX + 120;
  const withAssets = embedSceneAssets(scene);
  const raw = await fs.readFile(templatePath, 'utf8');
  const json = JSON.stringify(withAssets);
  let wallpaperInject =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  try {
    const wBuf = await fs.readFile(chatWallpaperPath);
    wallpaperInject = `data:image/png;base64,${wBuf.toString('base64')}`;
  } catch {
    /* 1×1 px fallback если файла нет */
  }
  const [iconAttachInject, iconMicInject, iconSignalInject, iconWifiInject, iconSmileyInject] =
    await Promise.all([
      readComposerIconDataUrl(iconPaperclipPath, FALLBACK_ICON_CLIP),
      readComposerIconDataUrl(iconMicrophonePath, FALLBACK_ICON_MIC),
      readComposerIconDataUrl(statusCellularPath, FALLBACK_ICON_SIGNAL),
      readComposerIconDataUrl(statusWifiPath, FALLBACK_ICON_WIFI),
      readComposerIconDataUrl(composerSmileyPath, FALLBACK_ICON_SMILEY),
    ]);
  const html = raw
    .replace('__SCENE_JSON__', json)
    .replace(/__CHAT_WALLPAPER__/g, wallpaperInject)
    .replace(/__ICON_ATTACH__/g, iconAttachInject)
    .replace(/__ICON_MIC__/g, iconMicInject)
    .replace(/__ICON_SIGNAL__/g, iconSignalInject)
    .replace(/__ICON_WIFI__/g, iconWifiInject)
    .replace(/__ICON_SMILEY__/g, iconSmileyInject);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: dpr,
      },
    });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => {
      var chat = document.getElementById('chat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    });
    const phone = await page.$('.phone');
    if (!phone) throw new Error('.phone not found in template');
    let buf = await phone.screenshot({ type: 'png', scale: 'device' });

    const platform = withAssets.platform === 'ios' ? 'ios' : 'android';
    buf = await normalizePngToEtalonDisplay(buf, platform);

    if (embedExif) {
      const truth = resolveTruthMeta(withAssets);
      buf = await embedPngExif(buf, truth);
    }
    return buf;
  } finally {
    await browser.close();
  }
}
