import { listAvatarImagePaths, pickRandomImages } from '../lib/rootImages.js';

/**
 * Подставляет пути к случайным файлам в avatar участников (left / right).
 * При force=true (галочка в GUI) перезаписывает уже заданные avatar.
 * @param {object} scene
 * @param {string} projectRoot
 * @param {{ preferredRoot?: string | null, force?: boolean }} [opts]
 * @returns {{ applied: number, poolSize: number }}
 */
export function applyRandomAvatars(scene, projectRoot, opts = {}) {
  const preferredRoot = opts.preferredRoot ?? null;
  const force = opts.force !== false;
  const all = listAvatarImagePaths(projectRoot, preferredRoot);
  const paths = pickRandomImages(all, 2);
  if (!all.length) {
    console.warn(
      `[randomAvatars] Не найдены изображения для аватаров` +
        ` (preferred=${preferredRoot || '—'}, project=${projectRoot}).` +
        ` Проверьте AVATAR_IMAGE_ROOT или каталог avatar/.`
    );
    return { applied: 0, poolSize: 0 };
  }
  const [a, b] = paths;
  let applied = 0;
  for (const p of scene.participants || []) {
    if (p.side === 'left') {
      if (force || !p.avatar) {
        p.avatar = a ?? null;
        if (p.avatar) applied += 1;
      }
    }
    if (p.side === 'right') {
      if (force || !p.avatar) {
        p.avatar = b ?? a ?? null;
        if (p.avatar) applied += 1;
      }
    }
  }
  return { applied, poolSize: all.length };
}
