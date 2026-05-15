import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @font-face для рендера Android: локальные файлы из assets/fonts/Roboto (или ANDROID_FONT_DIR).
 * Семейство в CSS: 'Roboto' (см. templates/styles/chat-android.css — --tg-font).
 */
const FAMILY = 'Roboto';

function extToMimeAndFormat(ext) {
  const e = ext.toLowerCase();
  if (e === '.woff2') return { mime: 'font/woff2', format: 'woff2' };
  if (e === '.woff') return { mime: 'font/woff', format: 'woff' };
  if (e === '.otf') return { mime: 'font/otf', format: 'opentype' };
  return { mime: 'font/ttf', format: 'truetype' };
}

function resolveRobotoRoot(projectRoot) {
  const env = process.env.ANDROID_FONT_DIR;
  if (env && String(env).trim()) {
    const raw = String(env).trim();
    return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
  }
  return path.join(projectRoot, 'assets', 'fonts', 'Roboto');
}

/**
 * @param {string} root — каталог Roboto (…/Roboto)
 * @param {string} subdir — например RobotoMedium
 * @param {string[]} basenames — без пути, с расширением
 */
async function readFirstFont(root, subdir, basenames) {
  for (const name of basenames) {
    const abs = path.join(root, subdir, name);
    try {
      const buf = await fs.readFile(abs);
      const { mime, format } = extToMimeAndFormat(path.extname(name));
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      return { dataUrl, format };
    } catch {
      /* next */
    }
  }
  return null;
}

/** Несколько правил на один файл — под разные numeric weight (напр. 500 и 600 → Medium). */
const ROBOTO_RULES = [
  {
    weight: 300,
    style: 'normal',
    subdir: 'RobotoLight',
    files: ['RobotoLight.woff', 'RobotoLight.ttf'],
  },
  {
    weight: 400,
    style: 'normal',
    subdir: 'RobotoRegular',
    files: ['RobotoRegular.woff', 'RobotoRegular.ttf'],
  },
  {
    weight: 400,
    style: 'italic',
    subdir: 'RobotoItalic',
    files: ['RobotoItalic.woff', 'RobotoItalic.ttf'],
  },
  {
    weight: 500,
    style: 'normal',
    subdir: 'RobotoMedium',
    files: ['RobotoMedium.woff', 'RobotoMedium.ttf'],
  },
  {
    weight: 600,
    style: 'normal',
    subdir: 'RobotoMedium',
    files: ['RobotoMedium.woff', 'RobotoMedium.ttf'],
  },
  {
    weight: 700,
    style: 'normal',
    subdir: 'RobotoBold',
    files: ['RobotoBold.woff', 'RobotoBold.ttf'],
  },
];

/**
 * @param {string} projectRoot
 * @returns {Promise<string>}
 */
export async function buildAndroidFontFaceCss(projectRoot) {
  const root = resolveRobotoRoot(projectRoot);
  const rules = [];

  for (const { weight, style, subdir, files } of ROBOTO_RULES) {
    const found = await readFirstFont(root, subdir, files);
    if (!found) continue;
    rules.push(
      `@font-face{font-family:'${FAMILY}';src:url('${found.dataUrl}') format('${found.format}');font-weight:${weight};font-style:${style};font-display:swap;}`
    );
  }

  return rules.join('');
}
