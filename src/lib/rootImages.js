import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
const AVATAR_DIRS = ['avatar', 'avatars'];
const CHAT_PHOTO_DIRS = ['photos', 'images', 'uploads', 'assets/chat-photos'];

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
 * Картинки из первого непустого каталога.
 * @param {string} projectRoot
 * @param {string[]} dirNames
 * @returns {string[]}
 */
function listFromDirs(projectRoot, dirNames) {
  for (const dirName of dirNames) {
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
 * Аватарки: корень каталога, иначе avatar/avatars внутри него.
 * @param {string} searchRoot
 * @returns {string[]} абсолютные пути
 */
export function listRootImagePaths(searchRoot) {
  let entries;
  try {
    entries = fs.readdirSync(searchRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const rootFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(searchRoot, e.name));
  if (rootFiles.length > 0) return rootFiles;
  return listFromDirs(searchRoot, AVATAR_DIRS);
}

/**
 * Ищет аватарки по нескольким корням (configured → avatar/ → projectRoot).
 * Нужен, когда AVATAR_IMAGE_ROOT указывает на чужой/пустой путь (Docker volume, Linux path на Windows).
 * @param {string} projectRoot
 * @param {string | null | undefined} preferredRoot
 * @returns {string[]}
 */
export function listAvatarImagePaths(projectRoot, preferredRoot) {
  const candidates = [];
  const push = (p) => {
    if (p == null || p === '') return;
    const abs = path.resolve(String(p));
    if (!candidates.includes(abs)) candidates.push(abs);
  };

  if (preferredRoot) {
    const raw = String(preferredRoot).trim();
    if (raw) {
      push(path.isAbsolute(raw) ? raw : path.join(projectRoot, raw));
    }
  }
  push(path.join(projectRoot, 'avatar'));
  push(path.join(projectRoot, 'avatars'));
  push(projectRoot);

  for (const root of candidates) {
    let st;
    try {
      st = fs.statSync(root);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const found = listRootImagePaths(root);
    if (found.length > 0) return found;
  }
  return [];
}

/**
 * Фото для тела переписки: photos/images/uploads/assets/chat-photos.
 * Не берём avatar/ — там часто лица/чужой контент не для сообщений.
 * @param {string} projectRoot
 * @returns {string[]}
 */
export function listChatPhotoPaths(projectRoot) {
  const fromDirs = listFromDirs(projectRoot, CHAT_PHOTO_DIRS);
  if (fromDirs.length > 0) return fromDirs;
  const fallback = path.join(projectRoot, 'out', 'test-chat-photo.jpg');
  try {
    if (fs.statSync(fallback).isFile()) return [fallback];
  } catch {
    /* no fallback */
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
