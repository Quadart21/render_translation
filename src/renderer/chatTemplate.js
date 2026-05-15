import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const templatesDir = path.join(projectRoot, 'templates');
const stylesDir = path.join(templatesDir, 'styles');

/**
 * Загружает только шаблон и CSS выбранной платформы (без общего chat-shared.css).
 * iOS: templates/chat-ios.html + templates/styles/chat-ios.css
 * Android: templates/chat-android.html + templates/styles/chat-android.css
 *
 * @param {object|null|undefined} [scene] — используется только `platform`
 */
export async function loadChatHtmlWithStyles(scene) {
  const platform = scene && scene.platform === 'ios' ? 'ios' : 'android';
  const htmlPath =
    platform === 'ios'
      ? path.join(templatesDir, 'chat-ios.html')
      : path.join(templatesDir, 'chat-android.html');
  const cssPath =
    platform === 'ios'
      ? path.join(stylesDir, 'chat-ios.css')
      : path.join(stylesDir, 'chat-android.css');

  const [raw, css] = await Promise.all([fs.readFile(htmlPath, 'utf8'), fs.readFile(cssPath, 'utf8')]);

  if (!raw.includes('__CHAT_CSS__')) {
    throw new Error(`${path.basename(htmlPath)}: нужен плейсхолдер __CHAT_CSS__`);
  }

  return raw.replace('__CHAT_CSS__', css);
}
