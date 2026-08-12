import fs from 'node:fs/promises';
import sharp from 'sharp';

/**
 * Белые силуэты на тёмной панели без CSS filter (иначе в Chromium часто «пустые» img).
 * Сохраняем альфу исходной иконки.
 */
export async function pngToWhiteSilhouetteDataUrl(buf) {
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

export async function readComposerIconDataUrl(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    return await pngToWhiteSilhouetteDataUrl(buf);
  } catch {
    return fallbackDataUrl;
  }
}

/**
 * Галочки у времени (SVG от пользователя, без лишних SVGRepo-групп).
 * viewBox обрезан по глифу, чтобы height:1.15cap совпал с цифрами времени.
 * @returns {string}
 */
export function messageChecksSvgDataUrl() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="3.25 6.75 17.5 10.5" fill="none">' +
    '<path d="M4 12.9L7.14286 16.5L15 7.5" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M20 7.5625L11.4283 16.5625L11 16" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Галочки у времени: предпочтительно SVG; PNG — запасной путь.
 * @param {string} absPath
 * @param {string} fallbackDataUrl
 * @returns {Promise<string>}
 */
export async function readMessageChecksDataUrl(absPath, fallbackDataUrl) {
  try {
    return messageChecksSvgDataUrl();
  } catch {
    try {
      const buf = await fs.readFile(absPath);
      return await pngToWhiteSilhouetteDataUrl(buf);
    } catch {
      return fallbackDataUrl;
    }
  }
}

/** Иконки статус-бара: trim padding, чтобы высота глифа = высоте батареи. */
export async function readStatusTrayIconDataUrl(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    const trimmed = await sharp(buf)
      .ensureAlpha()
      .trim({ threshold: 12 })
      .png()
      .toBuffer();
    return await pngToWhiteSilhouetteDataUrl(trimmed);
  } catch {
    return fallbackDataUrl;
  }
}

/** Back icon: предварительно апскейлим/центрируем для более гладкого контура. */
export async function readBackIconDataUrl(absPath, fallbackDataUrl) {
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

export async function readPngDataUrlRaw(absPath, fallbackDataUrl) {
  try {
    const buf = await fs.readFile(absPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return fallbackDataUrl;
  }
}

/** UI-хром: даунскейл огромных Figma-PNG, иначе CSS url(data:) часто не рисуется. */
export async function readUiChromeDataUrl(absPath, fallbackDataUrl, maxH = 160) {
  try {
    const meta = await sharp(absPath).metadata();
    let pipe = sharp(absPath).ensureAlpha();
    if (meta.height && meta.height > maxH) {
      pipe = pipe.resize({
        height: maxH,
        fit: 'inside',
        kernel: sharp.kernel.lanczos3,
      });
    }
    const buf = await pipe.png().toBuffer();
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return fallbackDataUrl;
  }
}
