import { Telegraf, Input } from 'telegraf';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSceneToPng } from './renderer/render.js';
import { buildRandomScene } from './scene/buildRandomScene.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sampleScenePath = path.join(root, 'data', 'sample-scene.json');

export function createBot(token) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply(
      [
        'Мок переписки: команды',
        '/render — PNG: случайные русские ники + аватарки из картинок в корне проекта',
        '/render_ios — то же, оформление как на iPhone',
        '/render_static — без рандома, как в data/sample-scene.json',
        '',
        'Картинки положите в корень папки проекта (jpg, png, webp, gif…).',
        'В PNG пишутся EXIF: модель телефона под iOS/Android, дата/время и GPS (см. meta и statusBar.date в JSON).',
      ].join('\n')
    );
  });

  async function sendRenderedScene(ctx, scene) {
    const png = await renderSceneToPng(scene);
    await ctx.replyWithPhoto(Input.fromBuffer(png, 'chat.png'));
  }

  bot.command('render', async (ctx) => {
    const scene = await buildRandomScene({ projectRoot: root });
    await sendRenderedScene(ctx, scene);
  });

  bot.command('render_ios', async (ctx) => {
    const scene = await buildRandomScene({ projectRoot: root, platform: 'ios' });
    await sendRenderedScene(ctx, scene);
  });

  bot.command('render_static', async (ctx) => {
    const text = await fs.readFile(sampleScenePath, 'utf8');
    const scene = JSON.parse(text);
    await sendRenderedScene(ctx, scene);
  });

  return bot;
}
