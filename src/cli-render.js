import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSceneToPng, renderSceneToPngPages } from './renderer/render.js';
import { buildRandomScene } from './scene/buildRandomScene.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const argv = process.argv.slice(2);
const ios = argv.includes('--ios');
const multiPage = argv.includes('--multipage') || argv.includes('--multi-page');
const args = argv.filter((a) => a !== '--ios' && a !== '--multipage' && a !== '--multi-page');

/** @type {object} */
let scene;
/** @type {string} */
let outPath;

if (args[0] === 'random') {
  scene = await buildRandomScene({
    projectRoot: root,
    platform: ios ? 'ios' : undefined,
    multiPage,
  });
  outPath =
    args[1] && args[1] !== 'random'
      ? path.resolve(args[1])
      : path.join(root, 'out', multiPage ? 'preview-page-1.png' : 'preview.png');
} else {
  const scenePath = args[0] || path.join(root, 'data', 'sample-scene.json');
  outPath = args[1]
    ? path.resolve(args[1])
    : path.join(root, 'out', 'preview.png');
  const text = await fs.readFile(scenePath, 'utf8');
  scene = JSON.parse(text);
}

await fs.mkdir(path.dirname(outPath), { recursive: true });

if (multiPage || (scene.meta && scene.meta.multiPage)) {
  const pages = await renderSceneToPngPages(scene);
  const base =
    path.extname(outPath) ? outPath.replace(/(\.[^.]+)$/, '') : outPath;
  const ext = path.extname(outPath) || '.png';
  for (let i = 0; i < pages.length; i += 1) {
    const p = `${base}${pages.length > 1 ? `-${i + 1}` : ''}${ext}`;
    await fs.writeFile(p, pages[i]);
    console.log('Written:', p);
  }
  console.log(`Pages: ${pages.length}`);
} else {
  const png = await renderSceneToPng(scene);
  await fs.writeFile(outPath, png);
  console.log('Written:', outPath);
}
