/**
 * Согласованные «правдоподобные» метаданные под платформу скриншота и гео в РФ.
 */

const IOS_DEVICES = [
  { make: 'Apple', model: 'iPhone 14 Pro' },
  { make: 'Apple', model: 'iPhone 14 Pro Max' },
  { make: 'Apple', model: 'iPhone 15' },
  { make: 'Apple', model: 'iPhone 15 Pro' },
  { make: 'Apple', model: 'iPhone 15 Pro Max' },
  { make: 'Apple', model: 'iPhone 16' },
  { make: 'Apple', model: 'iPhone 16 Pro' },
];

const ANDROID_DEVICES = [
  { make: 'Samsung', model: 'SM-S918B' },
  { make: 'Samsung', model: 'SM-S926B' },
  { make: 'Samsung', model: 'SM-A546B' },
  { make: 'Xiaomi', model: '15 Ultra' },
  { make: 'Xiaomi', model: '2210132G' },
  { make: 'Xiaomi', model: '23078PND5G' },
  { make: 'Google', model: 'Pixel 8' },
  { make: 'Google', model: 'Pixel 8 Pro' },
  { make: 'Nothing', model: 'A065' },
];

/** Города РФ: центр + разумный разброс для правдоподобной точки съёмки */
const RU_GEO = [
  { city: 'Москва', lat: 55.7558, lon: 37.6173 },
  { city: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351 },
  { city: 'Новосибирск', lat: 55.0084, lon: 82.9357 },
  { city: 'Екатеринбург', lat: 56.8389, lon: 60.6057 },
  { city: 'Казань', lat: 55.7963, lon: 49.1088 },
  { city: 'Нижний Новгород', lat: 56.2965, lon: 43.9361 },
  { city: 'Челябинск', lat: 55.1644, lon: 61.4368 },
  { city: 'Самара', lat: 53.1959, lon: 50.1002 },
  { city: 'Омск', lat: 54.9885, lon: 73.3242 },
  { city: 'Ростов-на-Дону', lat: 47.2357, lon: 39.7015 },
  { city: 'Уфа', lat: 54.7348, lon: 55.9578 },
  { city: 'Красноярск', lat: 56.0153, lon: 92.8932 },
  { city: 'Воронеж', lat: 51.672, lon: 39.1843 },
  { city: 'Пермь', lat: 58.0105, lon: 56.2502 },
  { city: 'Волгоград', lat: 48.7194, lon: 44.5018 },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Небольшой разброс координат (~сотни метров) */
function jitter(lat, lon) {
  const dLat = (Math.random() - 0.5) * 0.006;
  const dLon = (Math.random() - 0.5) * 0.008;
  return { lat: lat + dLat, lon: lon + dLon };
}

/**
 * Широта/долгота в строку EXIF для Sharp: "deg/1 min/1 secNumerator/secDenominator"
 * @param {number} decimal градусы, может быть отрицательной (полушарие задаётся Ref)
 */
export function decimalToExifCoord(decimal) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  let rest = (abs - deg) * 60;
  const min = Math.floor(rest);
  rest = (rest - min) * 60;
  const sec = rest;
  const secNum = Math.round(sec * 10000);
  return `${deg}/1 ${min}/1 ${secNum}/10000`;
}

function telegramSoftware(platform) {
  const major = 10 + Math.floor(Math.random() * 2);
  const minor = Math.floor(Math.random() * 15);
  const patch = Math.floor(Math.random() * 10);
  if (platform === 'ios') {
    return `Telegram iOS ${major}.${minor}.${patch}`;
  }
  return `Telegram Android ${major}.${minor}.${patch}`;
}

/**
 * Формат EXIF DateTime: YYYY:MM:DD HH:mm:ss
 * @param {Date} d
 */
export function formatExifDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Разбор времени вида "14:32" или "14:32:05"
 */
export function parseClockToToday(clock, baseDate = new Date()) {
  if (!clock || typeof clock !== 'string') return baseDate;
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return baseDate;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] != null ? Number(m[3]) : 0;
  const d = new Date(baseDate);
  d.setHours(h, min, s, 0);
  return d;
}

/**
 * @typedef {Object} TruthMeta
 * @property {string} make
 * @property {string} model
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} city
 * @property {string} dateTimeExif
 * @property {string} software
 */

/**
 * Итоговые метаданные для EXIF: из scene.meta при наличии, иначе случайные согласованные с platform.
 * @param {object} scene
 * @returns {TruthMeta}
 */
export function resolveTruthMeta(scene) {
  const platform = scene.platform === 'ios' ? 'ios' : 'android';
  const meta = scene.meta && typeof scene.meta === 'object' ? scene.meta : {};

  const device =
    meta.make && meta.model
      ? { make: String(meta.make), model: String(meta.model) }
      : platform === 'ios'
        ? pick(IOS_DEVICES)
        : pick(ANDROID_DEVICES);

  let lat = typeof meta.latitude === 'number' ? meta.latitude : null;
  let lon = typeof meta.longitude === 'number' ? meta.longitude : null;
  let city = typeof meta.city === 'string' ? meta.city : null;

  if (lat == null || lon == null) {
    const g = pick(RU_GEO);
    const j = jitter(g.lat, g.lon);
    lat = j.lat;
    lon = j.lon;
    city = city ?? g.city;
  } else if (!city) {
    city = 'Россия';
  }

  const clock = scene.statusBar?.time;
  const calendar =
    typeof meta.calendarDate === 'string'
      ? meta.calendarDate
      : typeof scene.statusBar?.date === 'string'
        ? scene.statusBar.date
        : null;

  let shotDate;
  if (typeof meta.dateTimeOriginal === 'string') {
    shotDate = new Date(meta.dateTimeOriginal);
    if (Number.isNaN(shotDate.getTime())) shotDate = new Date();
  } else if (calendar) {
    const dm = calendar.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dm) {
      const base = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
      shotDate = parseClockToToday(clock, base);
    } else {
      shotDate = parseClockToToday(clock);
    }
  } else {
    shotDate = parseClockToToday(clock);
  }

  const dateTimeExif = formatExifDateTime(shotDate);
  const software =
    typeof meta.software === 'string' ? meta.software : telegramSoftware(platform);

  return {
    make: device.make,
    model: device.model,
    latitude: lat,
    longitude: lon,
    city,
    dateTimeExif,
    software,
  };
}
