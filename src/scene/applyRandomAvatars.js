import { listRootImagePaths, pickRandomImages } from '../lib/rootImages.js';

/**
 * Подставляет пути к случайным файлам из корня в avatar участников (left / right).
 * @param {object} scene
 * @param {string} projectRoot
 */
export function applyRandomAvatars(scene, projectRoot) {
  const all = listRootImagePaths(projectRoot);
  const paths = pickRandomImages(all, 2);
  if (!all.length) {
    console.warn(
      `[randomAvatars] Не найдены изображения для аватаров в ${projectRoot} (корень или avatar/avatars/images/photos/uploads).`
    );
  }
  const [a, b] = paths;
  for (const p of scene.participants || []) {
    if (p.side === 'left') p.avatar = a ?? null;
    if (p.side === 'right') p.avatar = b ?? a ?? null;
  }
}
