/**
 * Режет первый <style> из templates/chat.html на top-level блоки по { } вне строк и комментариев.
 * Запуск: node scripts/extract-chat-css.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'templates', 'chat.html');
const outDir = path.join(root, 'templates', 'styles');

/** Индексы { } только вне ', ", /* */
function splitTopLevel(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  let inS = false;
  let inD = false;
  let esc = false;

  while (i < css.length) {
    const c = css[i];
    const n = css[i + 1];

    if (!inS && !inD && c === '/' && n === '*') {
      i += 2;
      while (i < css.length - 1 && !(css[i] === '*' && css[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (!inS && !inD && c === '/' && n === '/') {
      i += 2;
      while (i < css.length && css[i] !== '\n') i++;
      continue;
    }

    if (!inD && c === "'" && !esc) {
      inS = !inS;
      i++;
      continue;
    }
    if (!inS && c === '"' && !esc) {
      inD = !inD;
      i++;
      continue;
    }
    esc = !esc && c === '\\' && (inS || inD);
    if (inS || inD) {
      i++;
      continue;
    }

    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        blocks.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
    i++;
  }
  const tail = css.slice(start).trim();
  if (tail) blocks.push(tail);
  return blocks.filter(Boolean);
}

function classifyBlock(block) {
  const head = block.slice(0, Math.min(block.length, 1200));
  const hasIos = /\btheme-ios\b/.test(head) || /\btheme-ios-only\b/.test(head);
  const hasAnd = /\btheme-android\b/.test(head) || /\btheme-android-only\b/.test(head);
  if (hasIos && hasAnd) return 'both';
  if (hasIos) return 'ios';
  if (hasAnd) return 'android';
  return 'shared';
}

function main() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('__CHAT_CSS_SHARED__')) {
    console.error(
      'chat.html уже на плейсхолдерах — экстрактор нужен только для разовой миграции из монолитного <style>.'
    );
    process.exit(1);
  }
  const m = html.match(/<style>\s*([\s\S]*?)<\/style>/);
  if (!m) throw new Error('Не найден <style> в chat.html');
  const css = m[1].trimEnd();
  const blocks = splitTopLevel(css);
  const shared = [];
  const ios = [];
  const android = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c === 'both') {
      ios.push('/* ios+android в одном блоке — дубликат для изоляции */\n' + b);
      android.push(b);
    } else if (c === 'ios') ios.push(b);
    else if (c === 'android') android.push(b);
    else shared.push(b);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const banner =
    '/* Сгенерировано: node scripts/extract-chat-css.mjs из templates/chat.html */\n\n';

  fs.writeFileSync(path.join(outDir, 'chat-shared.css'), banner + shared.join('\n\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'chat-ios.css'), banner + ios.join('\n\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'chat-android.css'), banner + android.join('\n\n') + '\n');

  console.log('Blocks:', blocks.length, 'shared:', shared.length, 'ios:', ios.length, 'android:', android.length);
}

main();
