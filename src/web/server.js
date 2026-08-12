import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import express from 'express';
import { renderSceneToPngPages } from '../renderer/render.js';
import { renderDocumentToPdf } from '../renderer/renderDocument.js';
import { applyRandomAvatars } from '../scene/applyRandomAvatars.js';
import { listAvatarImagePaths } from '../lib/rootImages.js';
import { buildRandomScene } from '../scene/buildRandomScene.js';
import {
  parseTelegramIdWhitelist,
  verifyTelegramLogin,
} from './telegramLogin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');

/** .env перекрывает уже заданные в ОС переменные (иначе старый AUTH_ENABLED=1 ломает локальный .env) */
dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

/**
 * Включение Telegram-входа только явно: 1 / true / yes / on.
 * Выключение: 0, false, пусто или переменная отсутствует.
 */
function readAuthEnabled() {
  const v = process.env.AUTH_ENABLED;
  if (v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return ['1', 'true', 'yes', 'on'].includes(s);
}

const PORT = Number(process.env.PORT) || 3000;
const AUTH_ENABLED = readAuthEnabled();
const BOT_TOKEN = process.env.BOT_TOKEN;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
/** Предпочтительный каталог аватарок; при пустом/битом пути есть fallback в projectRoot/avatar */
const AVATAR_IMAGE_ROOT = (() => {
  const raw = process.env.AVATAR_IMAGE_ROOT;
  if (raw == null || String(raw).trim() === '') return projectRoot;
  const trimmed = String(raw).trim();
  return path.isAbsolute(trimmed) ? trimmed : path.join(projectRoot, trimmed);
})();
const ACCESS_STORE_PATH = process.env.AUTH_ACCESS_FILE
  ? (path.isAbsolute(process.env.AUTH_ACCESS_FILE)
    ? process.env.AUTH_ACCESS_FILE
    : path.join(projectRoot, process.env.AUTH_ACCESS_FILE))
  : path.join(projectRoot, 'data', 'telegram-access.json');

function normalizeTelegramId(id) {
  if (id == null) return '';
  const raw = String(id).trim();
  if (!/^\d{5,20}$/.test(raw)) return '';
  return raw;
}

function toArray(set) {
  return [...set.values()].sort((a, b) => Number(a) - Number(b));
}

function loadAccessState() {
  const envIds = parseTelegramIdWhitelist(process.env.ALLOWED_TELEGRAM_IDS);
  /** @type {Set<string>} */
  const allowed = new Set();
  /** @type {Set<string>} */
  const admins = new Set();
  let hasFile = false;

  try {
    if (fs.existsSync(ACCESS_STORE_PATH)) {
      const raw = fs.readFileSync(ACCESS_STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      hasFile = true;
      for (const id of data?.allowedIds || []) {
        const norm = normalizeTelegramId(id);
        if (norm) allowed.add(norm);
      }
      for (const id of data?.adminIds || []) {
        const norm = normalizeTelegramId(id);
        if (norm) admins.add(norm);
      }
    }
  } catch (e) {
    console.error('Не удалось прочитать access store:', e?.message || e);
  }

  for (const id of envIds) {
    const norm = normalizeTelegramId(id);
    if (norm) {
      allowed.add(norm);
      admins.add(norm);
    }
  }

  if (admins.size === 0 && allowed.size > 0) {
    for (const id of allowed) admins.add(id);
  }

  const state = { allowedIds: allowed, adminIds: admins };
  if (!hasFile && (allowed.size > 0 || admins.size > 0)) {
    saveAccessState(state);
  }
  return state;
}

function saveAccessState(state) {
  const payload = {
    allowedIds: toArray(state.allowedIds),
    adminIds: toArray(state.adminIds),
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(ACCESS_STORE_PATH), { recursive: true });
  fs.writeFileSync(ACCESS_STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

const accessState = loadAccessState();

function isAllowedTelegramId(id) {
  const norm = normalizeTelegramId(id);
  if (!norm) return false;
  return accessState.allowedIds.has(norm);
}

function isAccessAdmin(id) {
  const norm = normalizeTelegramId(id);
  if (!norm) return false;
  return accessState.adminIds.has(norm);
}

function grantAccess(id, opts = {}) {
  const norm = normalizeTelegramId(id);
  if (!norm) return false;
  accessState.allowedIds.add(norm);
  if (opts.admin) accessState.adminIds.add(norm);
  if (accessState.adminIds.size === 0) accessState.adminIds.add(norm);
  saveAccessState(accessState);
  return true;
}

const app = express();
app.set('trust proxy', 1);

if (AUTH_ENABLED) {
  app.use(
    cookieSession({
      name: 'sess',
      keys: [SESSION_SECRET],
      maxAge: 14 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.TRUST_SECURE_COOKIES === '1',
    })
  );
}

app.use(express.json({ limit: '25mb' }));

function requireAuth(req, res, next) {
  if (!AUTH_ENABLED) return next();
  const uid = req.session?.user?.id;
  if (uid != null && isAllowedTelegramId(uid)) return next();
  res.status(401).json({ error: 'Требуется вход или нет доступа' });
}

function requireAccessAdmin(req, res, next) {
  if (!AUTH_ENABLED) {
    res.status(404).json({ error: 'Авторизация отключена' });
    return;
  }
  const uid = req.session?.user?.id;
  if (uid == null || !isAllowedTelegramId(uid)) {
    res.status(401).json({ error: 'Требуется вход' });
    return;
  }
  if (!isAccessAdmin(uid)) {
    res.status(403).json({ error: 'Недостаточно прав' });
    return;
  }
  next();
}

function accessPayloadFor(userId) {
  return {
    canManageAccess: isAccessAdmin(userId),
    allowedCount: accessState.allowedIds.size,
    adminCount: accessState.adminIds.size,
    bootstrapPending: accessState.allowedIds.size === 0,
    allowedIds: toArray(accessState.allowedIds),
    adminIds: toArray(accessState.adminIds),
  };
}

function readDeployMeta() {
  let version = '0.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    if (pkg?.version) version = String(pkg.version);
  } catch {
    /* ignore */
  }
  const commit =
    process.env.GIT_COMMIT ||
    process.env.SOURCE_COMMIT ||
    (() => {
      try {
        return fs.readFileSync(path.join(projectRoot, '.git-commit'), 'utf8').trim();
      } catch {
        return '';
      }
    })();
  return { version, commit: commit || undefined };
}

const DEPLOY_META = readDeployMeta();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'render-screen', ...DEPLOY_META });
});

app.get('/api/config', (_req, res) => {
  const avatarPoolSize = listAvatarImagePaths(projectRoot, AVATAR_IMAGE_ROOT).length;
  res.json({
    authEnabled: AUTH_ENABLED,
    telegramBotUsername: TELEGRAM_BOT_USERNAME,
    hasBotUsername: Boolean(TELEGRAM_BOT_USERNAME),
    accessManagedInGui: true,
    avatarPoolSize,
  });
});

if (AUTH_ENABLED) {
  app.post('/api/auth/telegram', (req, res) => {
    if (!BOT_TOKEN) {
      res.status(500).json({ error: 'BOT_TOKEN не задан' });
      return;
    }
    const data = req.body;
    if (!verifyTelegramLogin(data, BOT_TOKEN)) {
      res.status(401).json({ error: 'Неверная подпись Telegram' });
      return;
    }
    const id = data.id;
    if (typeof id !== 'number' && typeof id !== 'string') {
      res.status(400).json({ error: 'Нет id' });
      return;
    }
    const normId = normalizeTelegramId(id);
    if (!normId) {
      res.status(400).json({ error: 'Некорректный id Telegram' });
      return;
    }
    if (accessState.allowedIds.size === 0) {
      // Без env-allowlist: первый успешный вход становится владельцем доступа.
      grantAccess(normId, { admin: true });
    }
    if (!isAllowedTelegramId(normId)) {
      res.status(403).json({ error: 'Доступ запрещён для этого аккаунта' });
      return;
    }
    req.session.user = {
      id: Number(normId),
      first_name: typeof data.first_name === 'string' ? data.first_name : '',
      username: typeof data.username === 'string' ? data.username : '',
    };
    res.json({ ok: true, user: req.session.user, access: accessPayloadFor(normId) });
  });

  app.get('/api/me', (req, res) => {
    const uid = req.session?.user?.id;
    if (uid == null || !isAllowedTelegramId(uid)) {
      req.session = null;
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }
    res.json({ user: req.session.user, access: accessPayloadFor(uid) });
  });

  app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
  });

  app.get('/api/access', requireAccessAdmin, (req, res) => {
    const uid = req.session?.user?.id;
    res.json({ ok: true, access: accessPayloadFor(uid) });
  });

  app.post('/api/access/grant', requireAccessAdmin, (req, res) => {
    const id = normalizeTelegramId(req.body?.id);
    if (!id) {
      res.status(400).json({ error: 'Укажите корректный Telegram ID (только цифры).' });
      return;
    }
    const makeAdmin = Boolean(req.body?.admin);
    if (!grantAccess(id, { admin: makeAdmin })) {
      res.status(400).json({ error: 'Не удалось выдать доступ.' });
      return;
    }
    const uid = req.session?.user?.id;
    res.json({ ok: true, access: accessPayloadFor(uid) });
  });

  app.post('/api/access/revoke', requireAccessAdmin, (req, res) => {
    const target = normalizeTelegramId(req.body?.id);
    if (!target) {
      res.status(400).json({ error: 'Укажите корректный Telegram ID.' });
      return;
    }
    if (!accessState.allowedIds.has(target)) {
      res.status(404).json({ error: 'Такого ID нет в списке доступа.' });
      return;
    }
    if (accessState.adminIds.has(target) && accessState.adminIds.size === 1) {
      res.status(400).json({ error: 'Нельзя удалить последнего администратора.' });
      return;
    }
    accessState.allowedIds.delete(target);
    accessState.adminIds.delete(target);
    saveAccessState(accessState);
    const uid = req.session?.user?.id;
    res.json({ ok: true, access: accessPayloadFor(uid) });
  });
}

app.post('/api/render/random', requireAuth, async (req, res) => {
  try {
    const platform = req.body?.platform === 'ios' ? 'ios' : undefined;
    const multiPage = req.body?.multiPage !== false;
    const pagesRaw = Number(req.body?.pages);
    const pages = Number.isFinite(pagesRaw) ? pagesRaw : undefined;
    const scene = await buildRandomScene({
      projectRoot,
      preferredAvatarRoot: AVATAR_IMAGE_ROOT,
      platform,
      multiPage,
      pages,
    });
    const pngPages = await renderSceneToPngPages(scene);
    const images = pngPages.map((buf, i) => ({
      name: `chat-${i + 1}.png`,
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
    }));
    res.json({ ok: true, images, pages: images.length, multiPage });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка рендера', detail: String(e?.message || e) });
  }
});

function cloneJsonBody(body) {
  if (typeof structuredClone === 'function') return structuredClone(body);
  return JSON.parse(JSON.stringify(body));
}

app.post('/api/render/scene', requireAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Ожидался JSON сцены' });
      return;
    }
    const scene = cloneJsonBody(req.body);
    const randomAvatars = Boolean(scene.randomAvatars);
    delete scene.randomAvatars;

    if (!Array.isArray(scene.participants) || scene.participants.length < 2) {
      res.status(400).json({ error: 'Нужны два участника в participants' });
      return;
    }
    if (!Array.isArray(scene.items)) {
      res.status(400).json({ error: 'Нужен массив items' });
      return;
    }

    if (randomAvatars) {
      const avatarResult = applyRandomAvatars(scene, projectRoot, {
        preferredRoot: AVATAR_IMAGE_ROOT,
        force: true,
      });
      if (!avatarResult.poolSize) {
        res.status(400).json({
          error:
            'Нет картинок для случайных аватарок. Положите JPG/PNG в каталог avatar/ (локально) или в volume /app/avatar (Docker).',
        });
        return;
      }
    }

    const pages = await renderSceneToPngPages(scene);
    const images = pages.map((buf, i) => ({
      name: `chat-${i + 1}.png`,
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
    }));
    res.json({ ok: true, images });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка рендера', detail: String(e?.message || e) });
  }
});

app.post('/api/render/document', requireAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Ожидался JSON документа' });
      return;
    }
    const pdf = await renderDocumentToPdf(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка генерации PDF документа', detail: String(e?.message || e) });
  }
});

const publicDir = path.join(projectRoot, 'public');
app.use(express.static(publicDir));
app.use('/assets', express.static(path.join(projectRoot, 'assets')));

process.on('uncaughtException', (err) => {
  console.error('Необработанная ошибка:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Необработанный reject:', reason);
});

function main() {
  if (AUTH_ENABLED) {
    if (!BOT_TOKEN) {
      console.error('При AUTH_ENABLED=1 укажите BOT_TOKEN в .env');
      process.exit(1);
    }
    if (!TELEGRAM_BOT_USERNAME) {
      console.warn('Предупреждение: TELEGRAM_BOT_USERNAME пуст — виджет входа не заработает.');
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Веб-интерфейс: http://0.0.0.0:${PORT}`);
    console.log(
      AUTH_ENABLED
        ? 'Авторизация Telegram: включена (управление доступом через GUI)'
        : 'Авторизация Telegram: выключена — рендер PNG без входа'
    );
    if (AUTH_ENABLED) {
      console.log(
        accessState.allowedIds.size === 0
          ? 'Access bootstrap: первый вошедший Telegram-пользователь станет администратором.'
          : `Доступ разрешён для ${accessState.allowedIds.size} Telegram ID.`
      );
    }
    console.log('Оставьте это окно открытым — при закрытии сервер остановится.');
  });

  server.on('error', (err) => {
    const code = /** @type {NodeJS.ErrnoException} */ (err).code;
    if (code === 'EADDRINUSE') {
      console.error(
        `Порт ${PORT} уже занят. Закройте другой процесс на этом порту или задайте в .env другой PORT=...`
      );
    } else {
      console.error('Ошибка HTTP-сервера:', err.message || err);
    }
    process.exit(1);
  });
}

main();
