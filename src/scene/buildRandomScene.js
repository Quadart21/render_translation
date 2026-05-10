import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRootImagePaths, pickRandomImages } from '../lib/rootImages.js';
import { twoUniqueNicknames } from '../lib/russianNicknames.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const sampleScenePath = path.join(root, 'data', 'sample-scene.json');

/**
 * Берёт sample-сцену, подставляет случайные русские ники и аватарки из картинок в корне проекта.
 * @param {{ platform?: 'android'|'ios', projectRoot?: string }} [opts]
 * @returns {Promise<object>}
 */
export async function buildRandomScene(opts = {}) {
  const projectRoot = opts.projectRoot ?? root;
  const raw = await fs.readFile(sampleScenePath, 'utf8');
  /** @type {object} */
  const scene = JSON.parse(raw);
  if (opts.platform) scene.platform = opts.platform;

  const images = listRootImagePaths(projectRoot);
  const [imgLeft, imgRight] = pickRandomImages(images, 2);
  const [nameLeft, nameRight] = twoUniqueNicknames();

  const participants = scene.participants;
  const left = participants.find((p) => p.side === 'left');
  const right = participants.find((p) => p.side === 'right');

  if (left) {
    left.name = nameLeft;
    left.avatar = imgLeft ?? null;
  }
  if (right) {
    right.name = nameRight;
    right.avatar =
      imgRight ?? imgLeft ?? null;
  }

  return scene;
}
