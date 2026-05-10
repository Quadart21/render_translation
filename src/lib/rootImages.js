import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

/**
 * Только файлы в корне projectRoot (без подпапок).
 * @param {string} projectRoot
 * @returns {string[]} абсолютные пути
 */
export function listRootImagePaths(projectRoot) {
  let entries;
  try {
    entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(projectRoot, e.name));
}

/**
 * Без повторов; если файлов меньше count — вернёт сколько есть.
 * @param {string[]} paths
 * @param {number} count
 * @returns {string[]}
 */
export function pickRandomImages(paths, count) {
  if (paths.length === 0 || count <= 0) return [];
  const copy = [...paths];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
