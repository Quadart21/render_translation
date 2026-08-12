/**
 * Scene → PNG orchestrator (Playwright + pagination).
 *
 * Split modules (maintainability):
 * - paths.js / fallbackIcons.js / uiAssets.js — asset paths & icon data-URLs
 * - iosStatusTray.js — iOS status tray + battery digits
 * - renderScale.js — DPR / paint-stable waits
 * - androidComposite.js — Sharp frost / chrome strip / densify
 * - nativeCompositeCss.js — injected native composite CSS
 * - normalizeExport.js — etalon display resize
 * - compositeCss.js — Light text CSS snippet
 */
import fs from 'node:fs/promises';
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
  readMessageChecksDataUrl,
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
  paintWallpaperWhereMask,
  stripOverlayMessagesInHeaderBand,
  densifyOverlayGlyphs,
} from './androidComposite.js';
import {
  buildAndroidNativeCompositeCss,
  buildIosNativeCompositeCss,
} from './nativeCompositeCss.js';
import { normalizePngToEtalonDisplay } from './normalizeExport.js';

/**
 * Рендер сцены в один или несколько PNG-скринов (страницы истории чата).
 * @param {object} scene — см. data/sample-scene.json
 * @param {{
 *   embedExif?: boolean,
 *   viewportWidth?: number,
 *   viewportHeight?: number,
 *   deviceScaleFactor?: number,
 * }} [opts]
 * @returns {Promise<Buffer[]>}
 */
export async function renderSceneToPngPages(scene, opts = {}) {
  const embedExif = opts.embedExif !== false;
  let dpr = resolveDeviceScaleFactor(scene, opts);
  const viewportWidth = opts.viewportWidth ?? 640;
  const viewportHeight = opts.viewportHeight ?? PHONE_LOGICAL_HEIGHT_CSS_PX + 120;
  const withAssets = embedSceneAssets(scene);
  const platformKey = withAssets.platform === 'ios' ? 'ios' : 'android';
  const raw = await loadChatHtmlWithStyles(withAssets);
  const json = JSON.stringify(withAssets);
  const wallpaperPathForPlatform =
    platformKey === 'ios' ? iosChatWallpaperPath : chatWallpaperPath;
  let wallpaperInject =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const wallpaperToDataUrl = (filePath, buf) => {
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  };
  try {
    const wBuf = await fs.readFile(wallpaperPathForPlatform);
    wallpaperInject = wallpaperToDataUrl(wallpaperPathForPlatform, wBuf);
  } catch {
    if (wallpaperPathForPlatform !== chatWallpaperPath) {
      try {
        const fallbackBuf = await fs.readFile(chatWallpaperPath);
        wallpaperInject = wallpaperToDataUrl(chatWallpaperPath, fallbackBuf);
      } catch {
        /* 1×1 px fallback если файла нет */
      }
    }
  }
  const useAndroidChromeIcons = platformKey === 'android';
  const [
    iconAttachInject,
    iconMicInject,
    iconSignalInject,
    iconWifiInject,
    iconSmileyInject,
    iconPhoneInject,
    iconBackInject,
    androidTitlePillInject,
    androidInputPillInject,
    telegramPlaqueInject,
    messageChecksInject,
    iosFontFaces,
  ] = await Promise.all([
    useAndroidChromeIcons
      ? readPngDataUrlRaw(iconPaperclipPath, FALLBACK_ICON_CLIP)
      : readComposerIconDataUrl(iconPaperclipPath, FALLBACK_ICON_CLIP),
    useAndroidChromeIcons
      ? readPngDataUrlRaw(iconMicrophonePath, FALLBACK_ICON_MIC)
      : Promise.resolve(FALLBACK_ICON_MIC),
    readStatusTrayIconDataUrl(statusCellularPath, FALLBACK_ICON_SIGNAL),
    readStatusTrayIconDataUrl(statusWifiPath, FALLBACK_ICON_WIFI),
    useAndroidChromeIcons
      ? readPngDataUrlRaw(composerSmileyPath, FALLBACK_ICON_SMILEY)
      : readComposerIconDataUrl(composerSmileyPath, FALLBACK_ICON_SMILEY),
    useAndroidChromeIcons
      ? readPngDataUrlRaw(iconPhonePath, FALLBACK_ICON_PHONE)
      : readComposerIconDataUrl(iconPhonePath, FALLBACK_ICON_PHONE),
    useAndroidChromeIcons
      ? readPngDataUrlRaw(androidBackIconPath, FALLBACK_ICON_BACK)
      :     readPngDataUrlRaw(androidBackIconPath, FALLBACK_ICON_BACK),
    readUiChromeDataUrl(androidTitlePillPath, ''),
    readUiChromeDataUrl(androidInputPillPath, ''),
    readPngDataUrlRaw(telegramPlaquePath, FALLBACK_TELEGRAM_PLAQUE),
    readMessageChecksDataUrl(messageChecksPath, FALLBACK_MESSAGE_CHECKS),
    buildIosFontFaceCss(projectRoot),
  ]);
  const compositeLocalPath = resolveLocalAssetPath(withAssets.compositeScreenshot);
  const useNativeComposite = Boolean(compositeLocalPath);
  let compositeMeta = null;
  let compositeSourceBuf = null;
  /** Сырая подложка до маски хрома — для frosted-blur с текстурой обоев */
  let blurWallpaperBuf = null;
  if (useNativeComposite) {
    compositeSourceBuf = await fs.readFile(compositeLocalPath);
    compositeMeta = await sharp(compositeSourceBuf).metadata();
    if (platformKey === 'android') {
      blurWallpaperBuf = compositeSourceBuf;
      compositeSourceBuf = await maskAndroidSubstrateChrome(compositeSourceBuf);
      compositeMeta = await sharp(compositeSourceBuf).metadata();
    } else {
      blurWallpaperBuf = compositeSourceBuf;
    }
  }
  const resolvedComposite = useNativeComposite
    ? null
    : resolveImageSrc(withAssets.compositeScreenshot);
  if (
    withAssets.compositeScreenshot &&
    String(withAssets.compositeScreenshot).trim() &&
    !useNativeComposite &&
    !resolvedComposite
  ) {
    console.warn(
      '[render] compositeScreenshot не загрузился (проверьте путь к файлу или data URL):',
      String(withAssets.compositeScreenshot).slice(0, 120)
    );
  }
  /* Нативный композит: в браузере только прозрачный оверлей (пузыри), фон не переснимаем. */
  const compositeInject = useNativeComposite
    ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    : resolvedComposite ||
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--force-color-profile=srgb',
      /* none: чётче контур Light в headless, без «ваты» slight */
      '--font-render-hinting=none',
      '--disable-lcd-text',
      '--disable-font-subpixel-positioning',
    ],
  });
  try {
    let iosStatusTrayInject = FALLBACK_IOS_STATUS_TRAY;
    if (platformKey === 'ios' && !useNativeComposite) {
      iosStatusTrayInject = await buildIosStatusTrayDataUrl(withAssets, browser);
    }

    const nativeW = compositeMeta?.width || 0;
    const nativeH = compositeMeta?.height || 0;
    const themeSel =
      platformKey === 'ios' ? '.theme-ios.phone.composite-screen-on' : '.theme-android.phone.composite-screen-on';
    /*
     * Android: phone = px подложки, dpr=1, --and-ref-*.
     * iOS: логический 393×852 + dpr=nativeW/393 (без zoom — zoom ломал max-width пузырей).
     */
    const iosCompositeScale =
      useNativeComposite && platformKey === 'ios' && nativeW > 0
        ? nativeW / PHONE_LOGICAL_WIDTH_CSS_PX
        : 0;
    const androidNativeLayout =
      useNativeComposite && platformKey === 'android' && nativeW > 0 && nativeH > 0;

    let nativeSizeCss = '';
    if (useNativeComposite && nativeW > 0 && nativeH > 0) {
      if (androidNativeLayout) {
        nativeSizeCss = buildAndroidNativeCompositeCss({ nativeW, nativeH, themeSel });
      } else {
        nativeSizeCss = buildIosNativeCompositeCss({
          nativeW,
          nativeH,
          themeSel,
          iosCompositeScale,
          PHONE_LOGICAL_WIDTH_CSS_PX,
        });
      }
    }


    const html = raw
    .replace('__IOS_FONT_FACES__', platformKey === 'ios' ? iosFontFaces : '')
    .replace('__ANDROID_FONT_FACES__', platformKey === 'android' ? iosFontFaces : '')
    .replace('__SCENE_JSON__', json)
    .replace(/__COMPOSITE_SCREENSHOT_SRC__/g, compositeInject)
    .replace(/__CHAT_WALLPAPER__/g, wallpaperInject)
    .replace(/__ICON_ATTACH__/g, iconAttachInject)
    .replace(/__ICON_MIC__/g, iconMicInject)
    .replace(/__ICON_SIGNAL__/g, iconSignalInject)
    .replace(/__ICON_WIFI__/g, iconWifiInject)
    .replace(/__ICON_SMILEY__/g, iconSmileyInject)
    .replace(/__ICON_PHONE__/g, iconPhoneInject)
    .replace(/__ICON_BACK__/g, iconBackInject)
    .replace(/__ANDROID_TITLE_PILL__/g, androidTitlePillInject || '')
    .replace(/__ANDROID_INPUT_PILL__/g, androidInputPillInject || '')
    .replace(/__TELEGRAM_PLAQUE__/g, telegramPlaqueInject)
    .replace(/__MESSAGE_CHECKS_SRC__/g, messageChecksInject)
    .replace(/__IOS_STATUS_TRAY__/g, iosStatusTrayInject)
    .replace('</head>', `${nativeSizeCss}</head>`);

    if (useNativeComposite) {
      /* Оба: dpr=1, текст в целевых CSS-px — без даунскейла */
      dpr = 1;
    } else {
      const cap = maxRenderDeviceScaleFactor();
      const mul =
        platformKey === 'ios'
          ? resolveIosSuperSampleMultiplier()
          : resolveAndroidSuperSampleMultiplier();
      dpr = Math.min(cap, dpr * mul);
    }

    const pageViewportW = useNativeComposite
      ? Math.max(viewportWidth, nativeW + 40)
      : viewportWidth;
    const pageViewportH = useNativeComposite
      ? Math.max(viewportHeight, nativeH + 40)
      : viewportHeight;

    const page = await browser.newPage({
      viewport: {
        width: pageViewportW,
        height: pageViewportH,
        deviceScaleFactor: dpr,
      },
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setContent(html, { waitUntil: 'load' });
    await waitForFontsAndPaintStable(page, platformKey);
    if (useNativeComposite) {
      await page.evaluate(() => {
        if (typeof window.syncMetaSpacers === 'function') window.syncMetaSpacers();
      });
    }
    const headerOverlapPx = useNativeComposite
      ? Math.max(
          120,
          Math.round(nativeH * 0.0395) + Math.round(nativeW * (88 / 1374) * 1.8) + 24
        )
      : 72;
    const scrollPositions = await page.evaluate((overlap) => {
      var chat = document.getElementById('chat');
      if (!chat) return [0];
      /* принудительно пересчитать layout после flex/margin-top:auto */
      void chat.offsetHeight;
      var maxScroll = Math.max(0, chat.scrollHeight - chat.clientHeight);
      if (maxScroll <= 0) return [0];
      var step = Math.max(1, chat.clientHeight - Math.max(48, overlap | 0));
      var out = [0];
      var pos = 0;
      while (pos < maxScroll) {
        pos = Math.min(maxScroll, pos + step);
        if (pos !== out[out.length - 1]) out.push(pos);
      }
      return out;
    }, headerOverlapPx);
    const phone = await page.$('.phone');
    if (!phone) throw new Error('.phone not found in template');
    const statusKeepRects =
      platformKey === 'android' && useNativeComposite
        ? await page.evaluate(() => {
            var phoneEl = document.querySelector('.phone');
            if (!phoneEl) return [];
            var pr = phoneEl.getBoundingClientRect();
            var pad = 2;
            var els = [];
            var timeEl = document.querySelector('#androidTime');
            if (timeEl) els.push(timeEl);
            var tray = document.querySelector('.android-status-tray');
            if (tray) {
              var kids = tray.querySelectorAll(
                '.status-tray-signal, .status-tray-wifi, .status-battery, .status-tray-icon, img, svg'
              );
              if (kids.length) {
                for (var k = 0; k < kids.length; k += 1) els.push(kids[k]);
              } else {
                els.push(tray);
              }
            }
            var extras = document.querySelectorAll(
              '.status-extra-icons .status-extra-icon, .status-extra-icons > *'
            );
            for (var e = 0; e < extras.length; e += 1) els.push(extras[e]);
            var out = [];
            for (var i = 0; i < els.length; i += 1) {
              var r = els[i].getBoundingClientRect();
              if (r.width < 1 || r.height < 1) continue;
              out.push({
                left: Math.floor(r.left - pr.left) - pad,
                top: Math.floor(r.top - pr.top) - pad,
                right: Math.ceil(r.right - pr.left) + pad,
                bottom: Math.ceil(r.bottom - pr.top) + pad,
              });
            }
            return out;
          })
        : [];
    /** @type {Buffer[]} */
    const pages = [];
    for (let i = 0; i < scrollPositions.length; i += 1) {
      const top = scrollPositions[i];
      await page.evaluate((scrollTop) => {
        var chat = document.getElementById('chat');
        if (chat) chat.scrollTop = scrollTop;
        if (typeof window.applyOutgoingBubbleVerticalGradient === 'function') {
          window.applyOutgoingBubbleVerticalGradient();
        }
        if (typeof window.applyLightImageOverlayMeta === 'function') {
          window.applyLightImageOverlayMeta();
        }
        if (typeof window.syncMetaSpacers === 'function') {
          window.syncMetaSpacers();
        }
        if (typeof window.fixIosMetaOverlap === 'function') {
          window.fixIosMetaOverlap();
        }
      }, top);
      await waitForFontsAndPaintStable(page, platformKey);
      let buf = await phone.screenshot({
        type: 'png',
        scale: 'device',
        animations: 'disabled',
        caret: 'hide',
        omitBackground: useNativeComposite,
      });
      /** Чистый chrome без ленты — для restore status/пилюль без обломков текста */
      let chromeShotBuf = null;
      if (useNativeComposite && platformKey === 'android') {
        await page.evaluate(() => {
          var chat = document.getElementById('chat');
          if (chat) chat.style.visibility = 'hidden';
        });
        chromeShotBuf = await phone.screenshot({
          type: 'png',
          scale: 'device',
          animations: 'disabled',
          caret: 'hide',
          omitBackground: true,
        });
        await page.evaluate(() => {
          var chat = document.getElementById('chat');
          if (chat) chat.style.visibility = '';
        });
      }
      if (useNativeComposite && compositeSourceBuf) {
        const ovMeta = await sharp(buf).metadata();
        let overlayBuf = buf;
        if (
          ovMeta.width &&
          ovMeta.height &&
          (ovMeta.width !== nativeW || ovMeta.height !== nativeH)
        ) {
          /* Только если Chromium дал ±N px — nearest, без Lanczos-мыла */
          overlayBuf = await sharp(buf)
            .resize(nativeW, nativeH, {
              fit: 'fill',
              kernel: sharp.kernel.nearest,
            })
            .ensureAlpha()
            .png()
            .toBuffer();
        } else {
          overlayBuf = await sharp(buf).ensureAlpha().png().toBuffer();
        }
        if (chromeShotBuf) {
          const cm = await sharp(chromeShotBuf).metadata();
          if (
            cm.width &&
            cm.height &&
            (cm.width !== nativeW || cm.height !== nativeH)
          ) {
            chromeShotBuf = await sharp(chromeShotBuf)
              .resize(nativeW, nativeH, {
                fit: 'fill',
                kernel: sharp.kernel.nearest,
              })
              .ensureAlpha()
              .png()
              .toBuffer();
          } else {
            chromeShotBuf = await sharp(chromeShotBuf).ensureAlpha().png().toBuffer();
          }
        }
        const chromeTop = Math.round(nativeH * 0.0395);
        const chromeH = Math.round(nativeW * (88 / 1374));
        const pillH = Math.round(chromeH * 1.8);
        const headerBottom = chromeTop + pillH;
        /* chrome (status+пилюли) не densify — иначе ореолы у иконок/ника */
        overlayBuf = await densifyOverlayGlyphs(overlayBuf, {
          skipTop: platformKey === 'android' ? headerBottom : 0,
        });
        const chromeSide = Math.round(nativeW * (18 / 1374));
        const chromeGap = Math.round(nativeW * (10 / 1374));
        const titleAvatarGap = 2;
        const titleAvatar = Math.max(1, pillH - titleAvatarGap * 2);
        const titlePadStart = titleAvatarGap;
        const avatarCircle = {
          cx: chromeSide + pillH + chromeGap + titlePadStart + titleAvatar / 2,
          cy: pillH / 2,
          r: titleAvatar / 2 + 3,
        };
        const chromeKeepOpts = { avatarCircle, statusKeepRects };
        const blurSigma = Math.max(30, Math.min(50, pillH / 2.6));
        /** @type {Buffer | null} */
        let chromeOnlyOverlay = null;
        /** @type {Buffer | null} */
        let statusRestoreBuf = null;
        if (platformKey === 'android' && nativeW > 0 && nativeH > 0) {
          /* status/пилюли с кадра без ленты — никаких обломков «для» в трее */
          const chromeSrc = chromeShotBuf || overlayBuf;
          if (chromeTop > 4) {
            statusRestoreBuf = await sharp(chromeSrc)
              .extract({ left: 0, top: 0, width: nativeW, height: chromeTop })
              .png()
              .toBuffer();
          }
          chromeOnlyOverlay = await stripOverlayMessagesInHeaderBand(
            chromeSrc,
            0,
            headerBottom,
            chromeTop,
            chromeKeepOpts
          );
          /* в status — только обои+frost; сообщения оставляем под пилюлями для blur */
          overlayBuf = await clearOverlayBand(overlayBuf, 0, chromeTop);
        }
        let pipe = sharp(compositeSourceBuf).composite([
          { input: overlayBuf, left: 0, top: 0, blend: 'over' },
        ]);
        if (compositeMeta?.density) {
          pipe = pipe.withMetadata({ density: compositeMeta.density });
        }
        buf = await pipe.png().toBuffer();
        if (platformKey === 'android' && nativeW > 0 && nativeH > 0) {
          /*
           * Frost-glass поверх сообщений под хедером (как Telegram),
           * с запасом ниже пилюль — плавный сход. Затем острые status+пилюли.
           */
          const frostEnd = Math.min(nativeH, headerBottom + Math.round(pillH * 0.9));
          /* убрать хром из кадра до frost — иначе blur даёт «обводку» у ника/иконок */
          let frostBase = buf;
          if (chromeOnlyOverlay && compositeSourceBuf) {
            frostBase = await paintWallpaperWhereMask(
              buf,
              chromeOnlyOverlay,
              compositeSourceBuf,
              { y0: 0, y1: headerBottom, alphaMin: 10 }
            );
          }
          buf = await applyAndroidHeaderBlurZone(frostBase, {
            y0: 0,
            y1: frostEnd,
            solidUntil: Math.max(chromeTop, headerBottom - Math.round(pillH * 0.35)),
            statusH: chromeTop,
            solidH: Math.max(chromeTop, headerBottom - Math.round(pillH * 0.35)),
            sigma: Math.max(56, Math.min(90, blurSigma * 1.75)),
            mode: 'under-chrome',
            blurSource: frostBase,
          });
          if (chromeOnlyOverlay || statusRestoreBuf) {
            const restore = [];
            if (statusRestoreBuf) {
              restore.push({
                input: statusRestoreBuf,
                left: 0,
                top: 0,
                blend: 'over',
              });
            } else if (chromeOnlyOverlay && chromeTop > 4) {
              restore.push({
                input: await sharp(chromeOnlyOverlay)
                  .extract({ left: 0, top: 0, width: nativeW, height: chromeTop })
                  .png()
                  .toBuffer(),
                left: 0,
                top: 0,
                blend: 'over',
              });
            }
            const chromeStripH = Math.min(nativeH - chromeTop, pillH);
            if (chromeOnlyOverlay && chromeStripH > 4) {
              restore.push({
                input: await sharp(chromeOnlyOverlay)
                  .extract({ left: 0, top: chromeTop, width: nativeW, height: chromeStripH })
                  .png()
                  .toBuffer(),
                left: 0,
                top: chromeTop,
                blend: 'over',
              });
            }
            if (restore.length) {
              buf = await sharp(buf).composite(restore).png().toBuffer();
            }
          }
        }
      } else {
        buf = await normalizePngToEtalonDisplay(buf, platformKey, {
          preserveNative: false,
        });
      }
      if (embedExif) {
        const truth = resolveTruthMeta(withAssets);
        buf = await embedPngExif(buf, truth);
      }
      pages.push(buf);
    }
    return pages;
  } finally {
    await browser.close();
  }
}

/**
 * Рендер сцены в один PNG (совместимость: последний экран как раньше).
 * @param {object} scene
 * @param {{
 *   embedExif?: boolean,
 *   viewportWidth?: number,
 *   viewportHeight?: number,
 *   deviceScaleFactor?: number,
 * }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function renderSceneToPng(scene, opts = {}) {
  const pages = await renderSceneToPngPages(scene, opts);
  return pages[pages.length - 1];
}

