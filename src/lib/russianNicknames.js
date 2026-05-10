const DIMINUTIVES = [
  'Сашенька',
  'Машенька',
  'Петенька',
  'Димочка',
  'Олечка',
  'Катюша',
  'Настенька',
  'Танюша',
  'Серёжа',
  'Витёк',
  'Игорёк',
  'Лёнчик',
  'Мишутка',
  'Алёночка',
  'Андрюша',
  'Кирюша',
  'Максик',
  'Ромчик',
  'Владик',
  'Женька',
  'Лизочка',
  'Светик',
  'Натулька',
  'Яночка',
  'Пашенька',
  'Костян',
  'Гриша',
  'Ксюша',
  'Дашенька',
  'Полиночка',
  'Варенька',
  'Кариночка',
  'Ариночка',
  'Маркизик',
  'Снежинка',
];

const ADJECTIVES = [
  'Тихий',
  'Быстрый',
  'Золотой',
  'Серебряный',
  'Чёрный',
  'Белый',
  'Синий',
  'Огненный',
  'Ледяной',
  'Ночной',
  'Утренний',
  'Весёлый',
  'Грустный',
  'Странный',
  'Простой',
  'Сложный',
  'Тайный',
  'Дикий',
  'Домашний',
  'Уличный',
];

const NOUNS = [
  'Тигр',
  'Волк',
  'Лиса',
  'Кот',
  'Пёс',
  'Медведь',
  'Орёл',
  'Сокол',
  'Сова',
  'Заяц',
  'Океан',
  'Ветер',
  'Гром',
  'Дождь',
  'Снег',
  'Огонь',
  'Лёд',
  'Камень',
  'Меч',
  'Щит',
  'Путь',
  'Мост',
  'Город',
  'Лес',
  'Река',
  'Гора',
  'Звезда',
  'Луна',
  'Солнце',
];

const PREFIXES = ['я_', 'это_', 'просто_', 'настоящий_', 'ещё_', ''];
const SUFFIXES = ['', '_ру', '_мск', '_спб', '_онлайн', '_тг'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDigits(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/**
 * Случайный русский ник: ласкательные имена, составные ники, цифры.
 * @returns {string}
 */
export function randomRussianNickname() {
  const r = Math.random();

  if (r < 0.38) {
    return pick(DIMINUTIVES);
  }

  if (r < 0.58) {
    const sep = Math.random() < 0.5 ? '_' : '';
    return `${pick(ADJECTIVES)}${sep}${pick(NOUNS)}`;
  }

  if (r < 0.72) {
    const n = pick(NOUNS);
    const digits = randDigits(Math.random() < 0.5 ? 2 : 3);
    return `${n}${digits}`;
  }

  if (r < 0.86) {
    const base = Math.random() < 0.45 ? pick(DIMINUTIVES) : `${pick(ADJECTIVES)}_${pick(NOUNS)}`;
    return `${pick(PREFIXES)}${base}${pick(SUFFIXES)}`.replace(/^_+|_+$/g, '') || base;
  }

  const soft = pick(DIMINUTIVES);
  const tail = randDigits(2);
  return `${soft}${tail}`;
}

/**
 * Два разных ника подряд (редкие коллизии перебираются).
 * @param {number} [maxAttempts=80]
 * @returns {[string, string]}
 */
export function twoUniqueNicknames(maxAttempts = 80) {
  for (let i = 0; i < maxAttempts; i++) {
    const a = randomRussianNickname();
    const b = randomRussianNickname();
    if (a !== b) return [a, b];
  }
  return ['Участник_1', 'Участник_2'];
}
