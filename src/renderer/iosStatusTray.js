import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildTrayBatteryFontFaceCss,
  resolveSfProTextFontForWeight,
  trayBatterySvgFontFamily,
} from './iosFontFaces.js';
import { iosStatusTrayStripPath } from './paths.js';
import { FALLBACK_IOS_STATUS_TRAY } from './fallbackIcons.js';


export function escapeSvgText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeHtmlTextPlain(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** Общая геометрия текста заряда на PNG-трее (Sharp или Chromium). */
export function computeIosTrayBatteryLayout(trayW, trayH, scene) {
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
export async function renderIosTrayBatteryTextPng(browser, layout, fontWeight) {
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

/**
 * Цифры заряда на PNG-трее iOS (без суффикса %).
 * Если задан scene.statusBar.battery — берём его (0–100), иначе случайно [3..15].
 */
export function extractIosBatteryDigits(scene) {
  const raw = scene && scene.statusBar && scene.statusBar.battery != null
    ? String(scene.statusBar.battery).replace('%', '').trim()
    : '';
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return String(Math.max(0, Math.min(100, Math.round(n))));
  }
  return String(Math.floor(Math.random() * 13) + 3);
}

/**
 * Fallback: цифры через Sharp SVG (librsvg может игнорировать встроенный шрифт — см. buildIosStatusTrayDataUrl + Chromium).
 */
export async function composeIosStatusTrayWithBattery(trayPngBuf, scene, projectRoot) {
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
export async function buildIosStatusTrayDataUrl(scene, browser) {
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

