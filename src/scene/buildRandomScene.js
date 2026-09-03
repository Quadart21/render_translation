import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAvatarImagePaths, listChatPhotoPaths, pickRandomImages } from '../lib/rootImages.js';
import { twoUniqueNicknames } from '../lib/russianNicknames.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const sampleScenePath = path.join(root, 'data', 'sample-scene.json');
const DATE_LABELS = ['9 мая', '10 мая', '11 мая', '12 мая', '13 мая', '14 мая', '15 мая'];
const DEFAULT_TEXTS = [
  'Добрый день! Пишу по поводу рекламы в вашем паблике с фильмами.',
  'Подскажите, пожалуйста, сколько будет стоить размещение одного поста?',
  'Могу отправить пример креатива и ТЗ сразу в этом чате.',
  'Если есть свободное окно на сегодня, готовы запуститься оперативно.',
  'Нужен формат с нативной подачей, без явной маркировки в начале текста.',
  'Оплата сразу после согласования, можно по реквизитам или переводом.',
  'По статистике важны охваты и переходы, скрин отчета тоже подойдет.',
  'Если удобно, скиньте прайс и условия по времени публикации.',
];

function pad2(v) {
  return String(v).padStart(2, '0');
}

function addMinutes(hhmm, mins) {
  const [hRaw, mRaw] = String(hhmm || '14:00').split(':');
  const h = Number(hRaw) || 14;
  const m = Number(mRaw) || 0;
  const total = h * 60 + m + mins;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${pad2(nh)}:${pad2(nm)}`;
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function buildMultiPageItems(baseItems, targetPages, photoPool = []) {
  const baseTexts = (baseItems || [])
    .filter((it) => it?.type === 'text' && it?.text)
    .map((it) => String(it.text).trim())
    .filter(Boolean);
  const textPool = baseTexts.length ? [...baseTexts, ...DEFAULT_TEXTS] : DEFAULT_TEXTS;
  const msgCountByPages = { 2: [26, 38], 3: [40, 56], 4: [58, 76] };
  const [minMsg, maxMsg] = msgCountByPages[targetPages] || msgCountByPages[2];
  const totalMessages = randomInt(minMsg, maxMsg);
  const items = [{ type: 'date', label: DATE_LABELS[randomInt(0, DATE_LABELS.length - 1)] }];
  let time = '14:08';
  const photos = Array.isArray(photoPool) ? photoPool.filter(Boolean) : [];

  for (let i = 0; i < totalMessages; i += 1) {
    if (i > 0 && i % 14 === 0) {
      items.push({ type: 'date', label: DATE_LABELS[randomInt(0, DATE_LABELS.length - 1)] });
      time = addMinutes(time, randomInt(8, 18));
    }
    const from = i % 2 === 0 ? 'bank' : 'me';
    const isImage = photos.length > 0 && Math.random() < 0.14;
    if (isImage) {
      const src = photos[randomInt(0, photos.length - 1)];
      items.push({ type: 'image', from, time, src });
    } else {
      const text = textPool[randomInt(0, textPool.length - 1)];
      items.push({ type: 'text', from, time, text });
    }
    time = addMinutes(time, randomInt(1, 4));
  }
  return items;
}

/**
 * Берёт sample-сцену, подставляет случайные русские ники и аватарки из картинок в корне проекта.
 * @param {{
 *   platform?: 'android'|'ios',
 *   projectRoot?: string,
 *   multiPage?: boolean,
 *   pages?: number,
 * }} [opts]
 * @returns {Promise<object>}
 */
export async function buildRandomScene(opts = {}) {
  const projectRoot = opts.projectRoot ?? root;
  const raw = await fs.readFile(sampleScenePath, 'utf8');
  /** @type {object} */
  const scene = JSON.parse(raw);
  if (opts.platform) scene.platform = opts.platform;

  const images = listAvatarImagePaths(projectRoot, opts.preferredAvatarRoot ?? null);
  const chatPhotos = listChatPhotoPaths(projectRoot);
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

  const multiPage = opts.multiPage !== false;
  const targetPages = multiPage
    ? Math.min(4, Math.max(2, Number(opts.pages) || randomInt(2, 4)))
    : 1;
  const chatPhotoPool = pickRandomImages(
    chatPhotos,
    Math.min(12, Math.max(1, chatPhotos.length))
  );

  if (multiPage) {
    // Длинная история на 2–4 экрана (скролл в рендерере).
    scene.items = buildMultiPageItems(scene.items, targetPages, chatPhotoPool);
  } else if (Array.isArray(scene.items) && scene.items.length > 12) {
    scene.items = scene.items.slice(0, 12);
  }

  // Страховка: даже если в seed есть старые поля медиа, убираем их.
  scene.items = scene.items.map((item) => {
    if (item?.type !== 'image') return item;
    const { caption, action, ...rest } = item;
    if (!rest.src && chatPhotoPool.length) {
      rest.src = chatPhotoPool[randomInt(0, chatPhotoPool.length - 1)];
    }
    return rest;
  });

  // Подложка 1:1: Android = substrate. iPhone = обои (ocean), не старый doodle-substrate.
  if (scene.platform === 'android') {
    scene.compositeScreenshot = 'assets/android-substrate.jpg';
    delete scene.pinned;
  } else if (scene.platform === 'ios') {
    scene.compositeScreenshot = 'assets/ios-composite-base.jpg';
    delete scene.pinned;
  }

  if (multiPage) {
    scene.meta = { ...(scene.meta || {}), multiPage: true, targetPages };
  }

  return scene;
}
