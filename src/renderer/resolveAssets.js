import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

/**
 * Строка для img src: data URL, http(s), или чтение локального файла в base64.
 * @param {string|null|undefined} src
 * @returns {string|null}
 */
export function resolveImageSrc(src) {
  if (src == null || src === '') return null;
  if (src.startsWith('data:') || /^https?:\/\//i.test(src)) return src;
  const abs = path.isAbsolute(src) ? src : path.join(rootDir, src);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Абсолютный путь к локальному файлу ассета (data:/http — null).
 * @param {string|null|undefined} src
 * @returns {string|null}
 */
export function resolveLocalAssetPath(src) {
  if (src == null || src === '') return null;
  if (src.startsWith('data:') || /^https?:\/\//i.test(src)) return null;
  const abs = path.isAbsolute(src) ? src : path.join(rootDir, src);
  return fs.existsSync(abs) ? abs : null;
}

/**
 * Подставляет в сцену data URL для всех avatar и image src.
 * @param {object} scene
 * @returns {object}
 */
export function embedSceneAssets(scene) {
  const participants = scene.participants.map((p) => ({
    ...p,
    avatar: resolveImageSrc(p.avatar),
  }));

  const items = scene.items.map((item) => {
    if (item.type === 'image') {
      return {
        ...item,
        src: resolveImageSrc(item.src),
      };
    }
    return item;
  });

  return {
    ...scene,
    participants,
    items,
  };
}
