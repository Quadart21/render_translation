/**
 * One-shot: split src/renderer/render.js into focused modules.
 * Run from project root: node scripts/split-render.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcPath = path.join(root, 'src/renderer/render.js');
const text = await fs.readFile(srcPath, 'utf8');
const lines = text.split(/\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');
const outDir = path.join(root, 'src/renderer');

const pathsBody = `import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.join(__dirname, '..', '..');

const wallpaperRaw = process.env.CHAT_WALLPAPER_PATH;
export const chatWallpaperPath = wallpaperRaw
  ? path.isAbsolute(wallpaperRaw)
    ? wallpaperRaw
    : path.join(projectRoot, wallpaperRaw)
  : path.join(projectRoot, 'assets', 'chat-wallpaper.png');

const iosWallpaperRaw = process.env.CHAT_WALLPAPER_IOS_PATH;
export const iosChatWallpaperPath = iosWallpaperRaw
  ? path.isAbsolute(iosWallpaperRaw)
    ? iosWallpaperRaw
    : path.join(projectRoot, iosWallpaperRaw)
  : path.join(projectRoot, 'assets', 'ios-chat-wallpaper.png');

export const uiChromeDir = path.join(projectRoot, 'assets', 'ui-chrome');
export const iconPaperclipPath = path.join(uiChromeDir, 'attach.png');
export const iconMicrophonePath = path.join(uiChromeDir, 'mic.png');
export const statusCellularPath = path.join(projectRoot, 'assets', 'status-cellular.png');
export const statusWifiPath = path.join(projectRoot, 'assets', 'status-wifi.png');
export const composerSmileyPath = path.join(uiChromeDir, 'smile.png');
export const iconPhonePath = path.join(uiChromeDir, 'actions-pill.png');
export const androidBackIconPath = path.join(uiChromeDir, 'back-circle.png');
export const androidTitlePillPath = path.join(uiChromeDir, 'title-pill.png');
export const androidInputPillPath = path.join(uiChromeDir, 'input-pill.png');
export const telegramPlaquePath = path.join(projectRoot, 'assets', 'telegram-plaque.png');
export const messageChecksPath = path.join(projectRoot, 'assets', 'message-checks-read.png');
export const iosStatusTrayStripPath = path.join(projectRoot, 'assets', 'ios-status-tray-strip.png');
`;

const exportFns = (body) =>
  body
    .replace(/^async function /gm, 'export async function ')
    .replace(/^function /gm, 'export function ');

await fs.writeFile(path.join(outDir, 'paths.js'), pathsBody);
await fs.writeFile(
  path.join(outDir, 'fallbackIcons.js'),
  '/** Fallback data-URL icons when PNG assets are missing. */\n' +
    slice(54, 108).replace(/^const FALLBACK_/gm, 'export const FALLBACK_') +
    '\n'
);
await fs.writeFile(
  path.join(outDir, 'uiAssets.js'),
  `import fs from 'node:fs/promises';
import sharp from 'sharp';

${exportFns(slice(109, 207))}
`
);
await fs.writeFile(
  path.join(outDir, 'iosStatusTray.js'),
  `import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildTrayBatteryFontFaceCss,
  resolveSfProTextFontForWeight,
  trayBatterySvgFontFamily,
} from './iosFontFaces.js';
import { iosStatusTrayStripPath } from './paths.js';
import { FALLBACK_IOS_STATUS_TRAY } from './fallbackIcons.js';

${exportFns(slice(208, 370))}
`
);
await fs.writeFile(
  path.join(outDir, 'renderScale.js'),
  `import {
  deviceScaleFactorForEtalon,
  maxRenderDeviceScaleFactor,
} from '../constants/renderEtalon.js';

${exportFns(slice(371, 463))}
`
);
await fs.writeFile(
  path.join(outDir, 'androidComposite.js'),
  `import sharp from 'sharp';

${exportFns(slice(465, 1146))}
`
);
await fs.writeFile(path.join(outDir, 'compositeCss.js'), exportFns(slice(1148, 1167)) + '\n');
await fs.writeFile(
  path.join(outDir, 'normalizeExport.js'),
  `import sharp from 'sharp';
import {
  ANDROID_EXPORT_DPI,
  etalonDisplayWidthPx,
} from '../constants/renderEtalon.js';

${exportFns(slice(1169, 1216))}
`
);

/* Slim orchestrator: keep renderSceneToPngPages body (from line 1218) with new imports */
const orchestratorTail = slice(1218, lines.length);
const orchestrator = `import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import {
  maxRenderDeviceScaleFactor,
  PHONE_LOGICAL_HEIGHT_CSS_PX,
  PHONE_LOGICAL_WIDTH_CSS_PX,
} from '../constants/renderEtalon.js';
import { embedPngExif } from '../lib/embedPngExif.js';
import { resolveTruthMeta } from '../lib/truthMeta.js';
import { embedSceneAssets, resolveLocalAssetPath, resolveImageSrc } from './resolveAssets.js';
import { buildIosFontFaceCss } from './iosFontFaces.js';
import { loadChatHtmlWithStyles } from './chatTemplate.js';
import {
  projectRoot,
  chatWallpaperPath,
  iosChatWallpaperPath,
  iconPaperclipPath,
  iconMicrophonePath,
  statusCellularPath,
  statusWifiPath,
  composerSmileyPath,
  iconPhonePath,
  androidBackIconPath,
  androidTitlePillPath,
  androidInputPillPath,
  telegramPlaquePath,
  messageChecksPath,
} from './paths.js';
import {
  FALLBACK_ICON_CLIP,
  FALLBACK_ICON_MIC,
  FALLBACK_ICON_SIGNAL,
  FALLBACK_ICON_WIFI,
  FALLBACK_ICON_SMILEY,
  FALLBACK_ICON_PHONE,
  FALLBACK_ICON_BACK,
  FALLBACK_TELEGRAM_PLAQUE,
  FALLBACK_MESSAGE_CHECKS,
  FALLBACK_IOS_STATUS_TRAY,
} from './fallbackIcons.js';
import {
  readComposerIconDataUrl,
  readStatusTrayIconDataUrl,
  readPngDataUrlRaw,
  readUiChromeDataUrl,
} from './uiAssets.js';
import { buildIosStatusTrayDataUrl } from './iosStatusTray.js';
import {
  resolveDeviceScaleFactor,
  resolveIosSuperSampleMultiplier,
  resolveAndroidSuperSampleMultiplier,
  waitForFontsAndPaintStable,
} from './renderScale.js';
import {
  maskAndroidSubstrateChrome,
  applyAndroidHeaderBlurZone,
  clearOverlayBand,
  stripOverlayMessagesInHeaderBand,
  densifyOverlayGlyphs,
} from './androidComposite.js';
import { compositeLightTextCss } from './compositeCss.js';
import { normalizePngToEtalonDisplay } from './normalizeExport.js';

${orchestratorTail}
`;

await fs.writeFile(srcPath, orchestrator);
console.log('split ok');
for (const f of [
  'paths.js',
  'fallbackIcons.js',
  'uiAssets.js',
  'iosStatusTray.js',
  'renderScale.js',
  'androidComposite.js',
  'compositeCss.js',
  'normalizeExport.js',
  'render.js',
]) {
  const n = (await fs.readFile(path.join(outDir, f), 'utf8')).split(/\n/).length;
  console.log(f, n);
}
