/**
 * Golden / snapshot render tests.
 *
 * Usage:
 *   node scripts/golden-render.mjs           # compare against fixtures
 *   node scripts/golden-render.mjs --update  # rewrite fixtures
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderSceneToPng } from '../src/renderer/render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fixturesDir = path.join(root, 'tests', 'golden', 'fixtures');
const update = process.argv.includes('--update');

/** Max mean absolute RGB difference (0–255) allowed vs fixture. */
const MAX_MAE = Number(process.env.GOLDEN_MAX_MAE || 2.5);

const cases = [
  {
    id: 'android-composite',
    scene: 'data/sample-android-composite.json',
    fixture: 'android-composite.png',
  },
  {
    id: 'ios-composite',
    scene: 'data/sample-ios-composite.json',
    fixture: 'ios-composite.png',
  },
];

async function meanAbsDiff(aBuf, bBuf) {
  const a = await sharp(aBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(bBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return {
      mae: Infinity,
      detail: `size ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}`,
    };
  }
  const n = a.data.length;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]);
    sum += Math.abs(a.data[i + 1] - b.data[i + 1]);
    sum += Math.abs(a.data[i + 2] - b.data[i + 2]);
    count += 3;
  }
  return { mae: sum / count, detail: `${a.info.width}x${a.info.height}` };
}

await fs.mkdir(fixturesDir, { recursive: true });

let failed = 0;
for (const c of cases) {
  const scenePath = path.join(root, c.scene);
  const scene = JSON.parse(await fs.readFile(scenePath, 'utf8'));
  const png = await renderSceneToPng(scene, { embedExif: false });
  const fixturePath = path.join(fixturesDir, c.fixture);

  if (update) {
    await fs.writeFile(fixturePath, png);
    console.log(`[update] ${c.id} -> ${path.relative(root, fixturePath)} (${png.length} bytes)`);
    continue;
  }

  let fixture;
  try {
    fixture = await fs.readFile(fixturePath);
  } catch {
    console.error(`[fail] ${c.id}: missing fixture ${path.relative(root, fixturePath)} (run with --update)`);
    failed += 1;
    continue;
  }

  const { mae, detail } = await meanAbsDiff(png, fixture);
  if (!Number.isFinite(mae) || mae > MAX_MAE) {
    const outPath = path.join(fixturesDir, `${c.id}.got.png`);
    await fs.writeFile(outPath, png);
    console.error(
      `[fail] ${c.id}: mae=${mae.toFixed(3)} > ${MAX_MAE} (${detail}); wrote ${path.relative(root, outPath)}`
    );
    failed += 1;
  } else {
    console.log(`[ok] ${c.id}: mae=${mae.toFixed(3)} (${detail})`);
  }
}

if (update) {
  console.log('Fixtures updated.');
  process.exit(0);
}

if (failed) {
  console.error(`\n${failed} golden case(s) failed.`);
  process.exit(1);
}
console.log('\nAll golden cases passed.');
