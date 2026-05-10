import { listRootImagePaths, pickRandomImages } from '../lib/rootImages.js';

/**
 * Подставляет пути к случайным файлам из корня в avatar участников (left / right).
 * @param {object} scene
 * @param {string} projectRoot
 */
export function applyRandomAvatars(scene, projectRoot) {
  const paths = pickRandomImages(listRootImagePaths(projectRoot), 2);
  const [a, b] = paths;
  for (const p of scene.participants || []) {
    if (p.side === 'left') p.avatar = a ?? null;
    if (p.side === 'right') p.avatar = b ?? a ?? null;
  }
}
