import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const chatHtmlPath = path.join(projectRoot, 'templates', 'chat.html');
const stylesDir = path.join(projectRoot, 'templates', 'styles');

/**
 * Читает chat.html и подставляет CSS только выбранной платформы (iOS или Android),
 * плюс общий chat-shared.css. Правки iOS/Android не смешиваются в одном файле.
 * @param {object|null|undefined} [scene] сцена (используется только `platform`)
 */
export async function loadChatHtmlWithStyles(scene) {
  const raw = await fs.readFile(chatHtmlPath, 'utf8');
  if (!raw.includes('__CHAT_CSS_SHARED__') || !raw.includes('__CHAT_CSS_PLATFORM__')) {
    throw new Error(
      'templates/chat.html: нужны плейсхолдеры __CHAT_CSS_SHARED__ и __CHAT_CSS_PLATFORM__'
    );
  }
  const platform = scene && scene.platform === 'ios' ? 'ios' : 'android';
  const [shared, iosCss, androidCss] = await Promise.all([
    fs.readFile(path.join(stylesDir, 'chat-shared.css'), 'utf8'),
    fs.readFile(path.join(stylesDir, 'chat-ios.css'), 'utf8'),
    fs.readFile(path.join(stylesDir, 'chat-android.css'), 'utf8'),
  ]);
  const platformCss = platform === 'ios' ? iosCss : androidCss;
  return raw
    .replace('__CHAT_CSS_SHARED__', shared)
    .replace('__CHAT_CSS_PLATFORM__', platformCss);
}
