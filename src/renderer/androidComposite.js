import sharp from 'sharp';

/**
 * Стирает старый хром на Android-подложке (шапка + композер).
 * Кладём целый блок обоев + лёгкое перо по краям, чтобы не было шва.
 * @param {Buffer} imgBuf
 * @returns {Promise<Buffer>}
 */
export async function maskAndroidSubstrateChrome(imgBuf) {
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
    /* у самого верха экрана (top===0) не перим — иначе просвечивает чёрный status substrate */
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

  /* шапка целиком (включая status) + тени старых пилюль — иначе blur «обрывается» чёрной полосой */
  let out = await coverBand(imgBuf, 0, h * 0.125, h * 0.18);
  /* композер; home indicator оставляем */
  out = await coverBand(out, h * 0.915, h * 0.98, h * 0.85);
  return sharp(out).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
}

/**
 * Blur пузырей на прозрачном оверлее в зоне хедера.
 * Chrome-пилюли (#212B35 + иконки) не трогаем. Обои не затемняются.
 * @param {Buffer} overlayPng
 * @param {{ y0: number, y1: number, solidUntil?: number, sigma?: number }} opts
 * @returns {Promise<Buffer>}
 */
export async function blurAndroidOverlayUnderHeader(overlayPng, opts) {
  const meta = await sharp(overlayPng).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return overlayPng;
  const y0 = Math.max(0, Math.min(h - 2, Math.round(opts.y0)));
  const y1 = Math.max(y0 + 2, Math.min(h, Math.round(opts.y1)));
  const bandH = y1 - y0;
  const sigma = Number.isFinite(opts.sigma) ? opts.sigma : 32;
  const solidUntil = Number.isFinite(opts.solidUntil)
    ? Math.max(y0, Math.min(y1, Math.round(opts.solidUntil)))
    : y1;

  const { data: src, info } = await sharp(overlayPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const isPillDark = (r, g, b) =>
    r >= 18 && r <= 60 && g >= 28 && g <= 75 && b >= 38 && b <= 95 && Math.abs(r - g) <= 20;
  const pillNear = (x, y) => {
    for (let dy = -5; dy <= 5; dy += 1) {
      for (let dx = -5; dx <= 5; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = (yy * w + xx) * 4;
        if (src[j + 3] < 12) continue;
        if (isPillDark(src[j], src[j + 1], src[j + 2])) return true;
      }
    }
    return false;
  };
  const isChromePixel = (x, y, r, g, b, a) => {
    if (a < 12) return false;
    if (isPillDark(r, g, b)) return true;
    /* белые иконки/ник только рядом с пилюлей */
    if (r > 175 && g > 175 && b > 175 && pillNear(x, y)) return true;
    return false;
  };

  /* маска: что можно блюрить (пузыри), chrome оставляем */
  const band = Buffer.alloc(bandH * w * 4);
  for (let y = 0; y < bandH; y += 1) {
    const sy = y0 + y;
    for (let x = 0; x < w; x += 1) {
      const si = (sy * w + x) * 4;
      const di = (y * w + x) * 4;
      const r = src[si];
      const g = src[si + 1];
      const b = src[si + 2];
      const a = src[si + 3];
      band[di] = r;
      band[di + 1] = g;
      band[di + 2] = b;
      if (a < 12 || isChromePixel(x, sy, r, g, b, a)) {
        band[di + 3] = 0;
      } else {
        band[di + 3] = a;
      }
    }
  }

  const blurred = await sharp(band, { raw: { width: w, height: bandH, channels: 4 } })
    .blur(Math.min(1000, sigma))
    .blur(Math.min(1000, Math.max(14, sigma * 0.8)))
    .ensureAlpha()
    .raw()
    .toBuffer();

  const out = Buffer.from(src);
  const solidLocal = Math.max(0, solidUntil - y0);
  const feather = Math.max(1, bandH - solidLocal);
  for (let y = 0; y < bandH; y += 1) {
    let mix = 1;
    if (y >= solidLocal) {
      mix = 1 - (y - solidLocal + 1) / (feather + 1);
      mix = Math.max(0, Math.min(1, Math.pow(mix, 1.3)));
    }
    const sy = y0 + y;
    for (let x = 0; x < w; x += 1) {
      const si = (sy * w + x) * 4;
      const bi = (y * w + x) * 4;
      const ba = blurred[bi + 3];
      if (ba < 8 || mix <= 0.01) continue;
      const r = src[si];
      const g = src[si + 1];
      const b = src[si + 2];
      const a = src[si + 3];
      if (a < 12 || isChromePixel(x, sy, r, g, b, a)) continue;
      const t = mix * Math.min(1, ba / 255);
      out[si] = Math.round(blurred[bi] * t + r * (1 - t));
      out[si + 1] = Math.round(blurred[bi + 1] * t + g * (1 - t));
      out[si + 2] = Math.round(blurred[bi + 2] * t + b * (1 - t));
      out[si + 3] = Math.round(Math.min(255, ba * t + a * (1 - t)));
    }
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Замыливание зоны хедера.
 * mode 'under-chrome': плавный frost от верхнего края экрана до низа пилюль.
 * @param {Buffer} imgBuf
 * @param {{ y0: number, y1: number, sigma?: number, mode?: string, solidUntil?: number, blurSource?: Buffer }} opts
 * @returns {Promise<Buffer>}
 */
/**
 * Замыливание зоны хедера.
 * mode 'under-chrome': плавный frost от верхнего края экрана до низа пилюль.
 * @param {Buffer} imgBuf
 * @param {{ y0: number, y1: number, sigma?: number, mode?: string, solidUntil?: number, blurSource?: Buffer, statusH?: number, solidH?: number }} opts
 * @returns {Promise<Buffer>}
 */
export async function applyAndroidHeaderBlurZone(imgBuf, opts) {
  const meta = await sharp(imgBuf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return imgBuf;
  const y0 = Math.max(0, Math.min(h - 2, Math.round(opts.y0)));
  const y1 = Math.max(y0 + 2, Math.min(h, Math.round(opts.y1)));
  const bandH = y1 - y0;
  const sigma = Number.isFinite(opts.sigma)
    ? opts.sigma
    : Math.max(18, Math.min(36, bandH / 10));
  const underChrome = opts.mode === 'under-chrome';
  const statusH = Math.max(0, Math.min(bandH, Math.round(opts.statusH || 0)));
  const solidH = Math.max(
    statusH,
    Math.min(bandH, Math.round(opts.solidH || opts.solidUntil || statusH))
  );

  /*
   * Источник blur — обои/substrate, не композит с сообщениями.
   * Берём полосу с запасом сверху/снизу, чтобы Gaussian не тянул чёрный край.
   */
  const blurFrom = opts.blurSource || imgBuf;
  const pad = Math.min(64, Math.max(24, Math.round(sigma * 1.5)));
  const srcTop = Math.max(0, y0 - pad);
  const srcBot = Math.min(h, y1 + pad);
  const srcH = srcBot - srcTop;
  const band = await sharp(blurFrom)
    .extract({ left: 0, top: srcTop, width: w, height: srcH })
    .ensureAlpha()
    .toBuffer();

  let pipe = sharp(band)
    .blur(Math.min(1000, Math.max(18, sigma * 0.9)))
    .blur(Math.min(1000, Math.max(12, sigma * 0.55)));
  if (underChrome) {
    /* glass: сильный blur, цвет пузыря сохраняем — видно «уход» сообщения вверх */
    pipe = pipe
      .blur(Math.min(1000, Math.max(14, sigma * 0.75)))
      .modulate({ brightness: 0.96, saturation: 0.78 });
  } else {
    pipe = pipe
      .blur(Math.min(1000, Math.max(10, sigma * 0.6)))
      .modulate({ brightness: 0.9, saturation: 0.45 })
      .linear(0.65, 20);
  }
  const blurredPad = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  /* вырезаем целевую полосу из blurred pad */
  const cropTop = y0 - srcTop;
  const cropped = await sharp(blurredPad.data, {
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

  const { data, info } = cropped;
  const out = Buffer.from(data);
  /*
   * under-chrome: плотное стекло до низа пилюль (текст в зазорах не читается),
   * ниже — плавное перо в резкие сообщения.
   */
  for (let y = 0; y < bandH; y += 1) {
    let fade = 1;
    let maxA = 1;
    if (underChrome) {
      if (y < statusH) {
        maxA = 0.98;
      } else if (y < solidH) {
        maxA = 0.97;
      } else {
        const span = Math.max(1, bandH - solidH);
        const t = (y - solidH + 0.5) / span;
        const s = Math.max(0, Math.min(1, t));
        fade = Math.pow(1 - s, 1.15);
        maxA = 0.97;
      }
    } else {
      const featherH = Math.max(8, Math.round(bandH * 0.12));
      if (y >= bandH - featherH) {
        const u = (y - (bandH - featherH) + 0.5) / featherH;
        fade = 1 - Math.max(0, Math.min(1, u));
        fade = fade * fade * (3 - 2 * fade);
      } else {
        const t = y / Math.max(1, bandH - 1);
        const topFeather = Math.max(6, Math.round(bandH * 0.08));
        if (y < topFeather) fade = (y + 1) / topFeather;
        else if (t > 0.78) fade = Math.pow(1 - (t - 0.78) / 0.22, 1.6);
      }
    }
    const a = Math.round(255 * fade * maxA);
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      out[i + 3] = a;
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

/**
 * Полоса статус-бара: оставляем ТОЛЬКО глифы часов (слева) и трей (справа).
 * Любой текст пузырей, просвечивающий сквозь прозрачный status-bar, вырезаем.
 * @param {Buffer} stripPng
 * @returns {Promise<Buffer>}
 */
/**
 * Делает полосу y0..y1 полностью прозрачной (сообщения не лезут в status).
 * @param {Buffer} pngBuf
 * @param {number} y0
 * @param {number} y1
 * @returns {Promise<Buffer>}
 */
export async function clearOverlayBand(pngBuf, y0, y1) {
  const meta = await sharp(pngBuf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return pngBuf;
  const top = Math.max(0, Math.min(h - 1, Math.round(y0)));
  const bot = Math.max(top + 1, Math.min(h, Math.round(y1)));
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let y = top; y < bot; y += 1) {
    for (let x = 0; x < w; x += 1) {
      out[(y * w + x) * 4 + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Прозрачная полоса: непрозрачны только пиксели внутри keepRects (часы, island, tray).
 * @param {Buffer} stripPng
 * @param {{ left: number, top: number, right: number, bottom: number }[]} keepRects
 * @param {number} [stripTop]
 * @returns {Promise<Buffer>}
 */
export async function keepRectsFromStrip(stripPng, keepRects, stripTop = 0) {
  const { data, info } = await sharp(stripPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const out = Buffer.alloc(data.length);
  const rects = Array.isArray(keepRects) ? keepRects : [];
  const inKeep = (x, y) => {
    const absY = y + stripTop;
    for (const r of rects) {
      if (x >= r.left && x < r.right && absY >= r.top && absY < r.bottom) return true;
    }
    return false;
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (inKeep(x, y) && data[i + 3] >= 8) {
        out[i] = data[i];
        out[i + 1] = data[i + 1];
        out[i + 2] = data[i + 2];
        out[i + 3] = data[i + 3];
      }
    }
  }
  return sharp(out, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Где mask непрозрачен — подставить пиксели wallpaper (чтобы frost не «жёг» обводку хрома).
 * @param {Buffer} dstPng
 * @param {Buffer} maskPng
 * @param {Buffer} wallpaperPng
 * @param {{ y0?: number, y1?: number, alphaMin?: number }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function paintWallpaperWhereMask(dstPng, maskPng, wallpaperPng, opts = null) {
  const [{ data: dst, info }, { data: mask }, { data: wall }] = await Promise.all([
    sharp(dstPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(maskPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(wallpaperPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const w = info.width;
  const h = info.height;
  if (!w || !h || mask.length !== dst.length || wall.length !== dst.length) return dstPng;
  const y0 = Math.max(0, Math.round(opts?.y0 || 0));
  const y1 = Math.min(h, Math.round(opts?.y1 != null ? opts.y1 : h));
  const alphaMin = Math.max(1, Math.round(opts?.alphaMin || 12));
  const out = Buffer.from(dst);
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (mask[i + 3] < alphaMin) continue;
      out[i] = wall[i];
      out[i + 1] = wall[i + 1];
      out[i + 2] = wall[i + 2];
      out[i + 3] = 255;
    }
  }
  return sharp(out, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Полоса статус-бара: оставляем ТОЛЬКО глифы часов (слева) и трей (справа).
 * Любой текст пузырей, просвечивающий сквозь прозрачный status-bar, вырезаем.
 * @param {Buffer} stripPng
 * @param {{ keepRects?: { left: number, top: number, right: number, bottom: number }[] } | null} [opts]
 * @returns {Promise<Buffer>}
 */
export async function stripBubblesKeepStatusChrome(stripPng, opts = null) {
  const { data, info } = await sharp(stripPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const w = info.width;
  const h = info.height;
  const keepRects = Array.isArray(opts?.keepRects) ? opts.keepRects : null;
  const isBubble = (r, g, b) => {
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    if (lum > 0.55) return false;
    return (
      (b > 150 && b > r + 40 && b > g + 25) ||
      (r > 110 && b > 140 && r > g + 25 && b > g + 30)
    );
  };

  if (keepRects && keepRects.length) {
    /*
     * DOM-bbox отдельных иконок/часов: снаружи прозрачно.
     * Внутри — только почти-белые глифы и заливка батареи (не текст сообщений).
     */
    const inKeep = (x, y) => {
      for (const r of keepRects) {
        if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return true;
      }
      return false;
    };
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (out[i + 3] < 8) {
          out[i + 3] = 0;
          continue;
        }
        if (!inKeep(x, y) || isBubble(out[i], out[i + 1], out[i + 2])) {
          out[i + 3] = 0;
          continue;
        }
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        const L = (r + g + b) / 3;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const nearWhite = L >= 175 && chroma <= 55;
        /* серая заливка или красная low-battery — не вычищать */
        const batteryFill =
          (L >= 22 && L <= 165 && chroma <= 40) ||
          (r > 160 && g < 110 && b < 110 && r > g + 40 && r > b + 40);
        if (!nearWhite && !batteryFill) out[i + 3] = 0;
      }
    }
    /*
     * Связные компоненты в трее/часах: слишком широкие = обломки текста сообщений.
     * Иконки и «14:32» компактные.
     */
    const maxCompW = Math.max(90, Math.round(w * 0.09));
    const seen = new Uint8Array(w * h);
    const qx = new Int32Array(w * h);
    const qy = new Int32Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const p = y * w + x;
        if (seen[p] || out[p * 4 + 3] < 8) continue;
        let qh = 0;
        let qt = 0;
        qx[qt] = x;
        qy[qt] = y;
        qt += 1;
        seen[p] = 1;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let count = 0;
        const members = [];
        while (qh < qt) {
          const cx = qx[qh];
          const cy = qy[qh];
          qh += 1;
          members.push(cy * w + cx);
          count += 1;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const np = ny * w + nx;
              if (seen[np] || out[np * 4 + 3] < 8) continue;
              seen[np] = 1;
              qx[qt] = nx;
              qy[qt] = ny;
              qt += 1;
            }
          }
        }
        const compW = maxX - minX + 1;
        const compH = maxY - minY + 1;
        /* длинное слово / обломок строки — не иконка */
        if (compW > maxCompW || (compW > 55 && compH < Math.max(10, h * 0.35) && count > 120)) {
          for (const mp of members) out[mp * 4 + 3] = 0;
        }
      }
    }
    return sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  /* fallback без DOM-bbox: края status, без maxRun по глифам */
  const timeRight = Math.round(w * 0.2);
  const trayLeft = Math.round(w * 0.58);
  const yTop = Math.max(0, Math.round(h * 0.02));
  const yBot = Math.min(h, Math.round(h * 0.98));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (out[i + 3] < 8) continue;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      if (y < yTop || y >= yBot || (x > timeRight && x < trayLeft) || isBubble(r, g, b)) {
        out[i + 3] = 0;
        continue;
      }
      /* оставляем и белые глифы, и тёмную заливку батареи */
      const L = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const nearWhite = L >= 165 && chroma <= 55;
      const batteryFill =
        (L >= 25 && L <= 170 && chroma <= 35) ||
        (r > 160 && g < 110 && b < 110 && r > g + 40 && r > b + 40);
      if (!nearWhite && !batteryFill) out[i + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * В полосе хедера: статус-бар чистим от пузырей; в зоне пилюль — только chrome.
 * @param {Buffer} overlayPng
 * @param {number} y0
 * @param {number} y1
 * @param {number} [statusBottom]
 * @returns {Promise<Buffer>}
 */
export async function stripOverlayMessagesInHeaderBand(overlayPng, y0, y1, statusBottom = 0, chromeKeepOpts = null) {
  const meta = await sharp(overlayPng).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return overlayPng;
  const top = Math.max(0, Math.min(h - 1, Math.round(y0)));
  const bot = Math.max(top + 1, Math.min(h, Math.round(y1)));
  const statusEnd = Math.max(top, Math.min(bot, Math.round(statusBottom || 0)));
  const statusKeepRects = Array.isArray(chromeKeepOpts?.statusKeepRects)
    ? chromeKeepOpts.statusKeepRects.map((r) => ({
        left: r.left,
        top: Math.max(0, r.top - top),
        right: r.right,
        bottom: Math.max(0, r.bottom - top),
      }))
    : null;

  /** @type {{ input: Buffer, left: number, top: number }[]} */
  const parts = [];
  if (top > 0) {
    parts.push({
      input: await sharp(overlayPng).extract({ left: 0, top: 0, width: w, height: top }).png().toBuffer(),
      left: 0,
      top: 0,
    });
  }
  if (statusEnd > top) {
    const statusRaw = await sharp(overlayPng)
      .extract({ left: 0, top, width: w, height: statusEnd - top })
      .png()
      .toBuffer();
    parts.push({
      input: await stripBubblesKeepStatusChrome(statusRaw, { keepRects: statusKeepRects }),
      left: 0,
      top,
    });
  }
  if (bot > statusEnd) {
    const pillRaw = await sharp(overlayPng)
      .extract({ left: 0, top: statusEnd, width: w, height: bot - statusEnd })
      .png()
      .toBuffer();
    parts.push({
      input: await keepAndroidChromeOnly(pillRaw, chromeKeepOpts),
      left: 0,
      top: statusEnd,
    });
  }
  if (bot < h) {
    parts.push({
      input: await sharp(overlayPng)
        .extract({ left: 0, top: bot, width: w, height: h - bot })
        .png()
        .toBuffer(),
      left: 0,
      top: bot,
    });
  }
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(parts)
    .png()
    .toBuffer();
}

/**
 * Из оверлея хрома оставляем ТОЛЬКО пиксели внутри пилюль (геометрия по тёмной заливке).
 * Яркий текст сообщений над/между пилюлями больше не сохраняется как «chrome».
 * Важно: заливка ника/иконок — белая поверх тёмной пилюли; одна dilate по тёмным
 * пикселям «съедает» середину глифов (остаётся обводка). Поэтому после dilate
 * flood-fill'им светлые пиксели хрома, касающиеся маски.
 * @param {Buffer} stripPng
 * @param {{ avatarCircle?: { cx: number, cy: number, r: number } } | null} [opts]
 * @returns {Promise<Buffer>}
 */
export async function keepAndroidChromeOnly(stripPng, opts = null) {
  const { data, info } = await sharp(stripPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const w = info.width;
  const h = info.height;
  const n = w * h;
  const idx = (x, y) => (y * w + x) * 4;
  const avatar = opts?.avatarCircle || null;
  const avatarR2 = avatar ? avatar.r * avatar.r : 0;
  const inAvatar = (x, y) => {
    if (!avatar) return false;
    const dx = x - avatar.cx;
    const dy = y - avatar.cy;
    return dx * dx + dy * dy <= avatarR2;
  };
  const isPillDark = (r, g, b, a) =>
    a > 20 &&
    r >= 18 &&
    r <= 60 &&
    g >= 28 &&
    g <= 75 &&
    b >= 38 &&
    b <= 95 &&
    Math.abs(r - g) <= 20 &&
    Math.abs(g - b) <= 28;
  const isBubbleLike = (r, g, b) => {
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    /* светлый синий — статус «в сети», не исходящий пузырь */
    if (lum > 0.55) return false;
    return (
      (b > 140 && b > r + 35 && b > g + 20) ||
      (r > 100 && b > 130 && r > g + 20 && b > g + 25)
    );
  };
  /* ник, статус, иконки внутри пилюли (не аватар/пузырь) */
  const isChromeInk = (r, g, b, a) => {
    if (a < 12) return false;
    if (isPillDark(r, g, b, a)) return true;
    if (isBubbleLike(r, g, b)) return false;
    const maxc = Math.max(r, g, b);
    const minc = Math.min(r, g, b);
    const chroma = maxc - minc;
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    /* тёмный синий (аватар и т.п.) — не раздувать маску */
    if (chroma > 36 && b > r + 15 && b > g + 10 && lum < 0.55) return false;
    return lum >= 0.32;
  };

  /* маска пилюль по связным тёмным компонентам + лёгкая дилатация под AA */
  const pillMask = new Uint8Array(n);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = idx(x, y);
      if (isPillDark(out[i], out[i + 1], out[i + 2], out[i + 3])) {
        pillMask[y * w + x] = 1;
      }
    }
  }
  const dilate = 3;
  const dilated = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!pillMask[y * w + x]) continue;
      for (let dy = -dilate; dy <= dilate; dy += 1) {
        for (let dx = -dilate; dx <= dilate; dx += 1) {
          if (dx * dx + dy * dy > dilate * dilate) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const p = yy * w + xx;
          if (dilated[p]) continue;
          dilated[p] = 1;
          queue[qt++] = p;
        }
      }
    }
  }
  /* flood-fill: белая заливка ника/стрелки/трубки/точек целиком в маске */
  while (qh < qt) {
    const p = queue[qh++];
    const x = p % w;
    const y = (p / w) | 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const np = yy * w + xx;
        if (dilated[np]) continue;
        const i = np * 4;
        if (!isChromeInk(out[i], out[i + 1], out[i + 2], out[i + 3])) continue;
        dilated[np] = 1;
        queue[qt++] = np;
      }
    }
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = idx(x, y);
      if (out[i + 3] < 12) continue;
      if (inAvatar(x, y)) continue;
      if (dilated[y * w + x]) {
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        if (isBubbleLike(r, g, b)) out[i + 3] = 0;
        continue;
      }
      out[i + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * @param {{ left: number, top: number, right: number, bottom: number }[]} rects
 * @param {number} x
 * @param {number} y
 */
function pointInRects(rects, x, y) {
  for (let ri = 0; ri < rects.length; ri += 1) {
    const r = rects[ri];
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return true;
  }
  return false;
}

/**
 * Light 300 + grayscale-AA даёт серую «кашу» на краях глифов.
 * Уплотняем светлые пиксели оверлея (ближе к белому / плотнее альфа), цвет пузырей не трогаем.
 * @param {Buffer} pngBuf
 * @param {{ skipTop?: number, skipRects?: { left: number, top: number, right: number, bottom: number }[] }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function densifyOverlayGlyphs(pngBuf, opts = null) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const w = info.width;
  const skipTop = Math.max(0, Math.round(opts?.skipTop || 0));
  const skipRects = Array.isArray(opts?.skipRects) ? opts.skipRects : [];
  for (let i = 0; i < out.length; i += 4) {
    const px = (i / 4) | 0;
    const x = px % w;
    const y = (px / w) | 0;
    if (y < skipTop) continue;
    if (skipRects.length && pointInRects(skipRects, x, y)) continue;
    const a = out[i + 3];
    if (a < 10) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    /* только светлая кайма текста; тёмные/цветные заливки пузырей пропускаем */
    if (lum < 0.52) continue;
    const maxc = Math.max(r, g, b);
    const minc = Math.min(r, g, b);
    const chroma = maxc - minc;
    /* цветные пиксели фото не выбеливать */
    if (chroma > 42 && lum < 0.93) continue;
    if (chroma > 28 && lum < 0.75) continue;
    const boost = Math.min(0.85, (lum - 0.52) * 1.85 + 0.28);
    out[i] = Math.min(255, Math.round(r + (255 - r) * boost));
    out[i + 1] = Math.min(255, Math.round(g + (255 - g) * boost));
    out[i + 2] = Math.min(255, Math.round(b + (255 - b) * boost));
    if (a < 255) {
      const an = a / 255;
      out[i + 3] = Math.min(255, Math.round(Math.pow(an, 0.58) * 255));
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
