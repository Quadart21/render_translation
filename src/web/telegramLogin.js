import crypto from 'node:crypto';

/**
 * Проверка подписи Telegram Login Widget.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 * @param {Record<string, unknown>} data объект пользователя от виджета (с полем hash)
 * @param {string} botToken
 * @returns {boolean}
 */
export function verifyTelegramLogin(data, botToken) {
  if (!data || typeof data !== 'object') return false;
  const hash = data.hash;
  if (typeof hash !== 'string' || hash.length !== 64) return false;
  if (data.auth_date == null) return false;

  const pairs = Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`);
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expectedHex = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return false;

  return true;
}

/**
 * @param {string | undefined} rawEnv ALLOWED_TELEGRAM_IDS=123,456
 * @returns {Set<string>}
 */
export function parseTelegramIdWhitelist(rawEnv) {
  const raw = rawEnv ?? '';
  const set = new Set();
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (id) set.add(id);
  }
  return set;
}

/**
 * @param {number | string} telegramUserId
 * @param {Set<string>} whitelist
 */
export function isTelegramIdAllowed(telegramUserId, whitelist) {
  if (whitelist.size === 0) return false;
  return whitelist.has(String(telegramUserId));
}
