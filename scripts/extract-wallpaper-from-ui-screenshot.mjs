#!/usr/bin/env node
/**
 * Из скрина чата с «запечённой» шапкой и полем ввода делает фон только из средней
 * полосы (паттерн), затем масштабирует её под исходный размер кадра — для рендера
 * поверх уже без дублей UI с картинки.
 *
 * Использование:
 *   node scripts/extract-wallpaper-from-ui-screenshot.mjs <вход.png> <выход.png> [--top=0.245] [--bottom=0.195]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

function parseArgs(argv) {
  const pos = [];
  const opts = { top: 0.245, bottom: 0.195 };
  for (const a of argv) {
    if (a.startsWith('--top=')) opts.top = Number(a.slice(6));
    else if (a.startsWith('--bottom=')) opts.bottom = Number(a.slice(9));
    else pos.push(a);
  }
  return { input: pos[0], output: pos[1], opts };
}

async function main() {
  const raw = process.argv.slice(2).filter((x) => x !== '--');
  const { input, output, opts } = parseArgs(raw);
  if (!input || !output) {
    console.error(
      'Usage: node scripts/extract-wallpaper-from-ui-screenshot.mjs <input.png> <output.png> [--top=0.245] [--bottom=0.195]'
    );
    process.exit(1);
  }
  if (!(opts.top >= 0 && opts.bottom >= 0 && opts.top + opts.bottom < 0.98)) {
    console.error('Invalid --top/--bottom: sum must be < 0.98');
    process.exit(1);
  }

  const inPath = path.resolve(input);
  const outPath = path.resolve(output);
  const meta = await sharp(inPath).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) {
    console.error('Could not read image dimensions');
    process.exit(1);
  }

  const topPx = Math.round(H * opts.top);
  const botPx = Math.round(H * opts.bottom);
  const midH = H - topPx - botPx;
  if (midH < 80) {
    console.error('Middle strip too small; reduce --top/--bottom');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });

  await sharp(inPath)
    .extract({ left: 0, top: topPx, width: W, height: midH })
    .resize(W, H, {
      fit: 'cover',
      position: 'center',
    })
    .png()
    .toFile(outPath);

  console.error(`OK: ${outPath} (${W}×${H}, strip y=${topPx}…${topPx + midH})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
