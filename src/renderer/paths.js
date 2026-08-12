import path from 'node:path';
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
