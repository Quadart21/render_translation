import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
const FALLBACK_DIRS = ['avatar', 'avatars', 'images', 'photos', 'uploads'];

/**
 * Рекурсивно собирает картинки из каталога (и подпапок).
 * @param {string} dir
 * @returns {string[]}
 */
function collectImagePathsRecursive(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...collectImagePathsRecursive(abs));
      continue;
    }
    if (e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase())) {
      out.push(abs);
    }
  }
  return out;
}

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
  const rootFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(projectRoot, e.name));
  if (rootFiles.length > 0) return rootFiles;

  // Fallback for server setups: allow common avatar/image folders.
  for (const dirName of FALLBACK_DIRS) {
    const dirPath = path.join(projectRoot, dirName);
    let st;
    try {
      st = fs.statSync(dirPath);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const nested = collectImagePathsRecursive(dirPath);
    if (nested.length > 0) return nested;
  }
  return [];
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
