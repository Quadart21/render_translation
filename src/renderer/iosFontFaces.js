import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * San Francisco Pro Text — категория Apple на AZFonts:
 * https://ru.azfonts.net/fonts/categories/apple
 *
 * По умолчанию: assets/fonts/sf-pro-text/
 * Другая папка (если перенесли файлы): IOS_FONT_DIR=относительный/или/абсолютный/путь
 */
const WEIGHT_CANDIDATES = [
  {
    weight: 400,
    patterns: [/regular|book\b/i],
    files: [
      /* явный файл из репозитория: assets/fonts/sf-pro-text/SFProText-Regular.ttf */
      'SFProText-Regular.ttf',
      'SFProText-Regular.woff2',
      'SF-Pro-Text-Regular.otf',
      'SFProText-Regular.otf',
      'SFProText-Regular.woff',
      'SF Pro Text Regular.ttf',
      'SF Pro Text Regular.otf',
    ],
  },
  {
    weight: 500,
    patterns: [/medium/i],
    files: [
      'SFProText-Medium.woff2',
      'SFProText-Medium.ttf',
      'SF-Pro-Text-Medium.otf',
      'SFProText-Medium.otf',
      'SFProText-Medium.woff',
      'SF Pro Text Medium.ttf',
      'SF Pro Text Medium.otf',
    ],
  },
  {
    weight: 600,
    patterns: [/semibold|semi[\s_-]?bold|demibold/i],
    files: [
      'SFProText-Semibold.woff2',
      'SFProText-Semibold.ttf',
      'SF-Pro-Text-Semibold.otf',
      'SFProText-Semibold.otf',
      'SFProText-Semibold.woff',
      'SF Pro Text Semibold.ttf',
      'SF Pro Text Semibold.otf',
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
  return { dataUrl, format };
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
