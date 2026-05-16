import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import express from 'express';
import { renderSceneToPng } from '../renderer/render.js';
import { applyRandomAvatars } from '../scene/applyRandomAvatars.js';
import { buildRandomScene } from '../scene/buildRandomScene.js';
import {
  isTelegramIdAllowed,
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
const AVATAR_IMAGE_ROOT = process.env.AVATAR_IMAGE_ROOT || projectRoot;
const ALLOWED_IDS = parseTelegramIdWhitelist(process.env.ALLOWED_TELEGRAM_IDS);

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
  if (uid != null && isTelegramIdAllowed(uid, ALLOWED_IDS)) return next();
  res.status(401).json({ error: 'Требуется вход или нет доступа' });
}

app.get('/api/config', (_req, res) => {
  res.json({
    authEnabled: AUTH_ENABLED,
    telegramBotUsername: TELEGRAM_BOT_USERNAME,
    hasBotUsername: Boolean(TELEGRAM_BOT_USERNAME),
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
    if (!isTelegramIdAllowed(id, ALLOWED_IDS)) {
      res.status(403).json({ error: 'Доступ запрещён для этого аккаунта' });
      return;
    }
    req.session.user = {
      id: Number(id),
      first_name: typeof data.first_name === 'string' ? data.first_name : '',
      username: typeof data.username === 'string' ? data.username : '',
    };
    res.json({ ok: true, user: req.session.user });
  });

  app.get('/api/me', (req, res) => {
    const uid = req.session?.user?.id;
    if (uid == null || !isTelegramIdAllowed(uid, ALLOWED_IDS)) {
      req.session = null;
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }
    res.json({ user: req.session.user });
  });

  app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
  });
}

app.post('/api/render/random', requireAuth, async (req, res) => {
  try {
    const platform = req.body?.platform === 'ios' ? 'ios' : undefined;
    const scene = await buildRandomScene({
      projectRoot: AVATAR_IMAGE_ROOT,
      platform,
    });
    const png = await renderSceneToPng(scene);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="chat.png"');
    res.send(png);
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
      applyRandomAvatars(scene, AVATAR_IMAGE_ROOT);
    }

    const png = await renderSceneToPng(scene);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="chat.png"');
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка рендера', detail: String(e?.message || e) });
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
    if (ALLOWED_IDS.size === 0) {
      console.error(
        'При AUTH_ENABLED=1 обязательно задайте ALLOWED_TELEGRAM_IDS (через запятую), иначе доступ запрещён всем.'
      );
      process.exit(1);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`Веб-интерфейс: http://localhost:${PORT}`);
    console.log(
      AUTH_ENABLED
        ? 'Авторизация Telegram: включена (AUTH_ENABLED)'
        : 'Авторизация Telegram: выключена — рендер PNG без входа'
    );
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
