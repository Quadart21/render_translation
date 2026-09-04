import sharp from 'sharp';
import { PHONE_LOGICAL_WIDTH_CSS_PX } from '../constants/renderEtalon.js';

/** Базовый 1em шапки в логических CSS px (эталон font-size: 16px). */
export const IOS_CHROME_BASE_EM_PX = 16;

/**
 * Стирает старый хром на iOS-подложке (status/island/nav + composer),
 * как maskAndroidSubstrateChrome — кладём блок обоев с пером по краям.
 * @param {Buffer} imgBuf
 * @returns {Promise<Buffer>}
 */
export async function maskIosSubstrateChrome(imgBuf) {
  const meta = await sharp(imgBuf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return imgBuf;

  const coverBand = async (pipeBuf, y0, y1, srcY) => {
    const top = Math.max(0, Math.min(h - 1, Math.round(y0)));
    const bottom = Math.max(top + 1, Math.min(h, Math.round(y1)));
    const bandH = bottom - top;
    const feather = Math.min(18, Math.floor(bandH / 5));
    const srcTop = Math.max(0, Math.min(h - bandH, Math.round(srcY)));
    const patchRgb = await sharp(pipeBuf)
      .extract({ left: 0, top: srcTop, width: w, height: bandH })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data, info } = patchRgb;
    const out = Buffer.from(data);
    const featherTop = top > 0;
    for (let y = 0; y < bandH; y += 1) {
      let a = 255;
      if (feather > 0) {
        if (featherTop && y < feather) a = Math.round((255 * (y + 1)) / feather);
        else if (y >= bandH - feather) a = Math.round((255 * (bandH - y)) / feather);
      }
      for (let x = 0; x < w; x += 1) {
        out[(y * w + x) * 4 + 3] = a;
      }
    }
    const patch = await sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
    return sharp(pipeBuf)
      .composite([{ input: patch, left: 0, top }])
      .toBuffer();
  };

  /* status + Dynamic Island + nav pills */
  let out = await coverBand(imgBuf, 0, h * 0.135, h * 0.2);
  /* composer; home indicator оставляем */
  out = await coverBand(out, h * 0.905, h * 0.975, h * 0.84);
  return sharp(out).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
}

/**
 * Геометрия iOS-шапки — только em от базового шрифта (не % экрана).
 * Эталон: status 2.4em; nav ≈ 3.6em (pad 0.6 + content 2.4); gap 0.7em; avatar 2.4em; nick 1.1em / sub 0.6em.
 * Синхронно с buildIosNativeCompositeCss и theme-ios CSS.
 * @param {number} nativeW
 * @param {number} [_nativeH]
 */
export function iosHeaderGeometry(nativeW, _nativeH) {
  const s = nativeW / PHONE_LOGICAL_WIDTH_CSS_PX;
  const u = IOS_CHROME_BASE_EM_PX * s;
  const statusH = Math.round(2.4 * u);
  const pillH = Math.round(2.4 * u);
  const navPadY = Math.round(0.6 * u);
  const navPadX = Math.round(0.8 * u);
  const chromeGap = Math.round(0.7 * u);
  const statusPillGap = Math.round(0.15 * u);
  const navH = Math.round(3.6 * u);
  const chromeSide = Math.round(0.8 * u);
  const titleFont = Math.round(1.1 * u);
  const titleStatusFont = Math.round(0.6 * u);
  const statusFont = Math.round(0.9 * u);
  const statusIcon = Math.round(0.72 * u);
  const avatar = Math.max(1, pillH - Math.max(2, Math.round(0.15 * u)));
  const headerBottom = statusH + statusPillGap + navH;
  return {
    u,
    s,
    statusH,
    pillH,
    navH,
    navPadY,
    navPadX,
    chromeGap,
    statusPillGap,
    chromeSide,
    titleFont,
    titleStatusFont,
    statusFont,
    statusIcon,
    avatar,
    headerBottom,
  };
}

/**
 * Геометрия нижнего композера — синхронно с buildIosNativeCompositeCss.
 * @param {number} nativeW
 * @param {number} nativeH
 */
export function iosFooterGeometry(nativeW, nativeH) {
  const composerH = Math.round(nativeW * (96 / 1391) * 1.3);
  const composerBottom = Math.round(nativeH * 0.02);
  const homeH = Math.round(nativeH * 0.01);
  const composerTop = nativeH - (composerBottom + homeH + composerH);
  return { composerH, composerBottom, homeH, composerTop, footerTop: composerTop };
}

/**
 * Frost под пилюлями: «запотевшее стекло».
 * По умолчанию: верх зоны — сильный blur; низ зоны — 0%.
 * invert: низ зоны — сильный blur; верх зоны — 0% (для композера).
 * @param {Buffer} imgBuf
 * @param {{ y0?: number, y1: number, sigma?: number, blurMax?: number, invert?: boolean }} opts
 * @returns {Promise<Buffer>}
 */
export async function applyIosHeaderBlurZone(imgBuf, opts) {
  const meta = await sharp(imgBuf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return imgBuf;

  const y0 = Math.max(0, Math.min(h - 2, Math.round(opts.y0 ?? 0)));
  const y1 = Math.max(y0 + 2, Math.min(h, Math.round(opts.y1)));
  const bandH = y1 - y0;
  const blurMax = Number.isFinite(opts.blurMax) ? opts.blurMax : 0.92;
  const invert = Boolean(opts.invert);
  const sigma = Number.isFinite(opts.sigma)
    ? opts.sigma
    : Math.max(70, Math.min(180, bandH / 2.2));

  const pad = Math.min(120, Math.max(40, Math.round(sigma * 1.8)));
  const srcTop = Math.max(0, y0 - pad);
  const srcBot = Math.min(h, y1 + pad);
  const srcH = srcBot - srcTop;

  const band = await sharp(imgBuf)
    .extract({ left: 0, top: srcTop, width: w, height: srcH })
    .ensureAlpha()
    .toBuffer();

  /* Многопроходный blur + лёгкое «молоко» стекла */
  const blurredPad = await sharp(band)
    .blur(Math.min(1000, Math.max(28, sigma * 1.15)))
    .blur(Math.min(1000, Math.max(22, sigma * 0.85)))
    .blur(Math.min(1000, Math.max(16, sigma * 0.55)))
    .modulate({ brightness: 1.06, saturation: 0.55 })
    .linear(0.92, 18)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cropTop = y0 - srcTop;
  const { data: blurred, info } = await sharp(blurredPad.data, {
    raw: {
      width: blurredPad.info.width,
      height: blurredPad.info.height,
      channels: 4,
    },
  })
    .extract({ left: 0, top: cropTop, width: w, height: bandH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: orig } = await sharp(imgBuf)
    .extract({ left: 0, top: y0, width: w, height: bandH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(bandH * w * 4);
  /*
   * invert=false: y=0 → blurMax, y=bandH-1 → 0 (шапка)
   * invert=true:  y=0 → 0, y=bandH-1 → blurMax (композер)
   * ease-out по сильной стороне зоны
   */
  for (let y = 0; y < bandH; y += 1) {
    const t = bandH <= 1 ? 0 : y / (bandH - 1);
    const along = invert ? 1 - t : t;
    const eased = 1 - Math.pow(along, 1.65);
    const strength = blurMax * eased;
    const s = Math.max(0, Math.min(1, strength));
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      out[i] = Math.round(blurred[i] * s + orig[i] * (1 - s));
      out[i + 1] = Math.round(blurred[i + 1] * s + orig[i + 1] * (1 - s));
      out[i + 2] = Math.round(blurred[i + 2] * s + orig[i + 2] * (1 - s));
      out[i + 3] = 255;
    }
  }

  const patch = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return sharp(imgBuf)
    .composite([{ input: patch, left: 0, top: y0, blend: 'over' }])
    .png()
    .toBuffer();
}
