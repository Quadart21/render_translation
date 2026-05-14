import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @font-face для мока чата (iOS/Android PNG): веса 300 / 400 / 500 / 600 / 700 (San Francisco — SF Pro Text / SF UI Text).
 * Семейство в CSS: --ios-font-family (templates/styles/chat-ios.css); здесь всегда объявляется как 'SF Pro Text'.
 *
 * Папка по умолчанию: assets/fonts/sf-pro-text/ (или IOS_FONT_DIR).
 * Подойдут SF Pro Text / **SF UI Text** (.ttf из старых SDK) или fallback — SF Pro Display.
 */
const WEIGHT_CANDIDATES = [
  {
    weight: 300,
    patterns: [/SF-UI-Text-Light/i, /Display-Light\.otf$/i, /Text-Light/i, /(^|-)Light\.otf$/i],
    files: [
      'SFProText-Light.ttf',
      'SFProText-Light.woff2',
      'SF-Pro-Text-Light.otf',
      'SFProText-Light.otf',
      'SFProText-Light.woff',
      'SF Pro Text Light.ttf',
      'SF Pro Text Light.otf',
      'SF-UI-Text-Light.ttf',
      'SF-Pro-Display-Light.otf',
    ],
  },
  {
    weight: 400,
    patterns: [/SF-UI-Text-Regular/i, /Display-Regular\.otf$/i, /Text-Regular/i, /regular/i],
    files: [
      'SFProText-Regular.ttf',
      'SFProText-Regular.woff2',
      'SF-Pro-Text-Regular.otf',
      'SFProText-Regular.otf',
      'SFProText-Regular.woff',
      'SF Pro Text Regular.ttf',
      'SF Pro Text Regular.otf',
      'SF-UI-Text-Regular.ttf',
      'SF-Pro-Display-Regular.otf',
    ],
  },
  {
    weight: 500,
    patterns: [/SF-UI-Text-Medium/i, /Display-Medium\.otf$/i, /Text-Medium/i, /medium/i],
    files: [
      'SFProText-Medium.woff2',
      'SFProText-Medium.ttf',
      'SF-Pro-Text-Medium.otf',
      'SFProText-Medium.otf',
      'SFProText-Medium.woff',
      'SF Pro Text Medium.ttf',
      'SF Pro Text Medium.otf',
      'SF-UI-Text-Medium.ttf',
      'SF-Pro-Display-Medium.otf',
    ],
  },
  {
    weight: 600,
    patterns: [/SF-UI-Text-Semibold/i, /Display-Semibold\.otf$/i, /Text-Semibold/i, /semibold/i],
    files: [
      'SFProText-Semibold.woff2',
      'SFProText-Semibold.ttf',
      'SF-Pro-Text-Semibold.otf',
      'SFProText-Semibold.otf',
      'SFProText-Semibold.woff',
      'SF Pro Text Semibold.ttf',
      'SF Pro Text Semibold.otf',
      'SF-UI-Text-Semibold.ttf',
      'SF-Pro-Display-Semibold.otf',
    ],
  },
  {
    weight: 700,
    patterns: [/SF-UI-Text-Bold/i, /Display-Bold\.otf$/i, /Text-Bold/i, /(^|-)Bold\.otf$/i],
    files: [
      'SFProText-Bold.woff2',
      'SFProText-Bold.ttf',
      'SF-Pro-Text-Bold.otf',
      'SFProText-Bold.otf',
      'SFProText-Bold.woff',
      'SF Pro Text Bold.ttf',
      'SF Pro Text Bold.otf',
      'SF-UI-Text-Bold.ttf',
      'SF-Pro-Display-Bold.otf',
    ],
  },
];

function extToMimeAndFormat(ext) {
  const e = ext.toLowerCase();
  if (e === '.woff2') return { mime: 'font/woff2', format: 'woff2' };
  if (e === '.woff') return { mime: 'font/woff', format: 'woff' };
  if (e === '.otf') return { mime: 'font/otf', format: 'opentype' };
  return { mime: 'font/ttf', format: 'truetype' };
}

function resolveFontDir(projectRoot) {
  const env = process.env.IOS_FONT_DIR;
  if (env && String(env).trim()) {
    const raw = String(env).trim();
    return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
  }
  return path.join(projectRoot, 'assets', 'fonts', 'sf-pro-text');
}

async function readFontFile(abs, basename) {
  const buf = await fs.readFile(abs);
  const { mime, format } = extToMimeAndFormat(path.extname(basename));
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
  return { dataUrl, format, basename, absolutePath: abs };
}

async function tryExactNames(dir, filenames) {
  for (const name of filenames) {
    const abs = path.join(dir, name);
    try {
      return await readFontFile(abs, name);
    } catch {
      /* next */
    }
  }
  return null;
}

async function tryFuzzyDir(dir, patterns) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const fontNames = names.filter((n) => /\.(woff2|woff|ttf|otf)$/i.test(n));
  for (const pat of patterns) {
    const hit = fontNames.find((n) => pat.test(n));
    if (!hit) continue;
    const abs = path.join(dir, hit);
    try {
      return await readFontFile(abs, hit);
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * @param {string} projectRoot
 * @returns {Promise<string>} фрагмент CSS (@font-face), может быть пустым
 */
export async function buildIosFontFaceCss(projectRoot) {
  const dir = resolveFontDir(projectRoot);
  const rules = [];

  for (const { weight, patterns, files } of WEIGHT_CANDIDATES) {
    let found = await tryExactNames(dir, files);
    if (!found) found = await tryFuzzyDir(dir, patterns);
    if (!found) continue;
    rules.push(
      `@font-face{font-family:'SF Pro Text';src:url('${found.dataUrl}') format('${found.format}');font-weight:${weight};font-style:normal;font-display:swap;}`
    );
  }

  return rules.join('');
}

/**
 * Один файл SF Pro Text для указанного веса (Sharp/SVG, напр. цифры на трее).
 * @param {string} projectRoot
 * @param {number} weight — 300 | 400 | 500 | 600 | 700
 * @returns {Promise<{ dataUrl: string, format: string, basename: string, absolutePath: string } | null>}
 */
export async function resolveSfProTextFontForWeight(projectRoot, weight) {
  const dir = resolveFontDir(projectRoot);
  const entry = WEIGHT_CANDIDATES.find((w) => w.weight === weight);
  if (!entry) return null;
  let found = await tryExactNames(dir, entry.files);
  if (!found) found = await tryFuzzyDir(dir, entry.patterns);
  return found;
}

/**
 * Синтетическое семейство + встроенный файл: Sharp/librsvg часто не подхватывают «родное» имя SF из TTF.
 * В Chromium (Playwright) с data: URL это работает надёжно.
 */
export function buildTrayBatteryFontFaceCss(embed) {
  const src = `url('${embed.dataUrl}') format('${embed.format}')`;
  return `@font-face{font-family:'TrayIosBat';src:${src};font-weight:100 900;font-style:normal;font-display:block;}`;
}

/** Для SVG fallback (Sharp): синтетическое имя при встроенном шрифте; иначе системный стек. */
export function trayBatterySvgFontFamily(embed) {
  if (!embed) {
    return "'SF Pro Text', 'SF UI Text', -apple-system, BlinkMacSystemFont, sans-serif";
  }
  return "'TrayIosBat', sans-serif";
}
