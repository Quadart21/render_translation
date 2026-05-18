import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const NPD_TEMPLATE_PDF = path.join(projectRoot, 'assets', 'templates', 'npd-template.pdf');
const TNR_REGULAR_CANDIDATES = [
  path.join(projectRoot, 'assets', 'fonts', 'Times New Roman', 'times.ttf'),
  path.join(projectRoot, 'assets', 'fonts', 'times.ttf'),
  'C:\\Windows\\Fonts\\times.ttf',
];
const TNR_BOLD_CANDIDATES = [
  path.join(projectRoot, 'assets', 'fonts', 'Times New Roman', 'timesbd.ttf'),
  path.join(projectRoot, 'assets', 'fonts', 'timesbd.ttf'),
  'C:\\Windows\\Fonts\\timesbd.ttf',
];

function normalize(v, fallback = '') {
  const s = String(v ?? '').trim();
  return s || fallback;
}

function parseMoney(value, fallback = 0) {
  const raw = String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += String(Math.floor(Math.random() * 10));
  return out;
}

function splitIntoMonths(total) {
  const cents = Math.max(0, Math.round(total * 100));
  const base = Math.floor(cents / 12);
  let rest = cents - base * 12;
  const arr = Array.from({ length: 12 }, () => base);
  let i = 11;
  while (rest > 0) {
    arr[i] += 1;
    rest -= 1;
    i -= 1;
    if (i < 0) i = 11;
  }
  return arr.map((c) => c / 100);
}

function yFromTop(pageHeight, top, fontSize = 10) {
  return pageHeight - top - fontSize;
}

function drawTextAtTop(page, pageHeight, text, x, top, size, font) {
  page.drawText(String(text), {
    x,
    y: yFromTop(pageHeight, top, size),
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

const DESIGN_W = 2480;
const DESIGN_H = 3508;

const LAYOUT = Object.freeze({
  taxHeader: { x: 150, top: 110 },
  signatureInfo: { x: 150, top: 290 },
  knd: { x: 150, top: 520 },
  documentTitle: { centerX: 1240, top: 610 },
  inn: { x: 150, top: 880 },
  taxOffice: { x: 650, top: 297 },
  person: { x: 150, top: 1260 },
  passport: { x: 150, top: 1410 },
  incomeTable: { x: 150, top: 1660, width: 2150, rowH: 78 },
  summary: { x: 150, top: 3028, width: 2150 },
  debt: { x: 150, top: 3338 },
});

function scaleX(pageWidth, x) {
  return (x / DESIGN_W) * pageWidth;
}

function scaleTop(pageHeight, top) {
  return (top / DESIGN_H) * pageHeight;
}

function scaleSize(pageHeight, size) {
  return (size / DESIGN_H) * pageHeight;
}

function drawLeft(page, pageWidth, pageHeight, text, x, top, size, font) {
  drawTextAtTop(
    page,
    pageHeight,
    text,
    scaleX(pageWidth, x),
    scaleTop(pageHeight, top),
    scaleSize(pageHeight, size),
    font
  );
}

function drawCenter(page, pageWidth, pageHeight, text, centerX, top, size, font) {
  const px = scaleX(pageWidth, centerX);
  const ps = scaleSize(pageHeight, size);
  const w = font.widthOfTextAtSize(String(text), ps);
  drawTextAtTop(page, pageHeight, text, px - w / 2, scaleTop(pageHeight, top), ps, font);
}

function drawRight(page, pageWidth, pageHeight, text, rightX, top, size, font) {
  const px = scaleX(pageWidth, rightX);
  const ps = scaleSize(pageHeight, size);
  const w = font.widthOfTextAtSize(String(text), ps);
  drawTextAtTop(page, pageHeight, text, px - w, scaleTop(pageHeight, top), ps, font);
}

async function readFirstExisting(paths) {
  for (const p of paths) {
    try {
      return await fs.readFile(p);
    } catch {
      // try next path
    }
  }
  return null;
}

/**
 * ÐŸÑ€Ð°Ð²Ð¸Ñ‚ Ð¸ÑÑ…Ð¾Ð´Ð½Ñ‹Ð¹ PDF-ÑˆÐ°Ð±Ð»Ð¾Ð½ Ð¸ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ Ð³Ð¾Ñ‚Ð¾Ð²Ñ‹Ð¹ PDF.
 * @param {object} payload
 * @returns {Promise<Buffer>}
 */
export async function renderDocumentToPdf(payload = {}) {
  const template = normalize(payload.template, 'npd-certificate');
  if (template !== 'npd-certificate') {
    throw new Error('Ð¡ÐµÐ¹Ñ‡Ð°Ñ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶Ð°Ð½ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ ÑˆÐ°Ð±Ð»Ð¾Ð½ "Ð¡Ð¿Ñ€Ð°Ð²ÐºÐ° ÐÐŸÐ”".');
  }

  const issueDate = normalize(payload.date, new Date().toLocaleDateString('ru-RU'));
  const year = normalize(payload.year, String(new Date().getFullYear() - 1));
  const inspection = normalize(
    payload.inspection,
    'Ð˜Ð½ÑÐ¿ÐµÐºÑ†Ð¸Ñ Ð¤ÐµÐ´ÐµÑ€Ð°Ð»ÑŒÐ½Ð¾Ð¹ Ð½Ð°Ð»Ð¾Ð³Ð¾Ð²Ð¾Ð¹ ÑÐ»ÑƒÐ¶Ð±Ñ‹ Ð¿Ð¾ Ð³. Ð¡Ð°Ð½ÐºÑ‚-ÐŸÐµÑ‚ÐµÑ€Ð±ÑƒÑ€Ð³Ñƒ'
  );
  const inn = normalize(payload.inn, '000000000000');
  const idSeriesNumber = normalize(payload.idSeriesNumber, '00 00 000000');
  const taxpayerName = normalize(payload.taxpayerName, 'Ð˜Ð’ÐÐÐžÐ’ Ð˜Ð’ÐÐ Ð˜Ð’ÐÐÐžÐ’Ð˜Ð§');
  const validFrom = normalize(payload.validFrom, '05.03.2025');
  const validTo = normalize(payload.validTo, '29.05.2026');
  const certificateNumber = payload.randomizeCertificateNumber
    ? randomDigits(8)
    : normalize(payload.certificateNumber, randomDigits(8));
  const totalIncome = Math.max(0, parseMoney(payload.amount, 0));
  const taxRatePct = Math.max(0, parseMoney(payload.taxRate, 6));
  const totalTax = totalIncome * (taxRatePct / 100);
  const monthly = splitIntoMonths(totalIncome);

  const src = await fs.readFile(NPD_TEMPLATE_PDF);
  const pdf = await PDFDocument.load(src);
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  if (!page) throw new Error('Ð¨Ð°Ð±Ð»Ð¾Ð½ PDF Ð¿ÑƒÑÑ‚Ð¾Ð¹.');
  let font;
  let fontBold;
  try {
    const [regularTtf, boldTtf] = await Promise.all([
      readFirstExisting(TNR_REGULAR_CANDIDATES),
      readFirstExisting(TNR_BOLD_CANDIDATES),
    ]);
    if (regularTtf && boldTtf) {
      font = await pdf.embedFont(regularTtf, { subset: true });
      fontBold = await pdf.embedFont(boldTtf, { subset: true });
    } else {
      throw new Error('Times New Roman TTF not found');
    }
  } catch {
    // Fallback if Times New Roman TTF files are missing.
    font = await pdf.embedFont(StandardFonts.TimesRoman);
    fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  }
  const { width, height } = page.getSize();

  // 1) Ð˜Ð½ÑÐ¿ÐµÐºÑ†Ð¸Ñ Ð¤ÐÐ¡ (Ð¾ÑÑ‚Ð°Ð²Ð»ÐµÐ½Ð¾ Ð´Ð»Ñ Ñ‚ÐµÐºÑƒÑ‰ÐµÐ¹ Ð½Ð°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸)
  drawCenter(page, width, height, inspection, DESIGN_W / 2, LAYOUT.taxOffice.top, 37, font);

  /*
  // 2) ÐÐ¾Ð¼ÐµÑ€ ÑÐ¿Ñ€Ð°Ð²ÐºÐ¸
  drawCenter(page, width, height, `Ð¡Ð¿Ñ€Ð°Ð²ÐºÐ° No ${certificateNumber}`, LAYOUT.documentTitle.centerX, LAYOUT.documentTitle.top, 40, fontBold);

  // 3) Ð“Ð¾Ð´ Ð¸ Ð´Ð°Ñ‚Ð°
  drawCenter(page, width, height, `Ð·Ð° ${year} Ð³Ð¾Ð´ Ð¾Ñ‚ ${issueDate} Ð³.`, LAYOUT.documentTitle.centerX, LAYOUT.documentTitle.top + 116, 34, font);

  // 4) Ð˜ÐÐ
  drawLeft(page, width, height, `Ð˜ÐÐ ${inn}`, LAYOUT.inn.x, LAYOUT.inn.top, 34, fontBold);

  // 5) Ð¡ÐµÑ€Ð¸Ñ Ð¸ Ð½Ð¾Ð¼ÐµÑ€ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð°
  drawLeft(page, width, height, `Ð¡ÐµÑ€Ð¸Ñ Ð¸ Ð½Ð¾Ð¼ÐµÑ€ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð° ${idSeriesNumber}`, LAYOUT.passport.x, LAYOUT.passport.top + 62, 34, font);

  // 6) Ð”Ð¾Ñ…Ð¾Ð´ Ð¿Ð¾ Ð¼ÐµÑÑÑ†Ð°Ð¼ + Ð½Ð°Ð»Ð¾Ð³ Ð¿Ð¾ Ñ‚Ð°Ð±Ð»Ð¸Ñ†Ðµ
  const monthTopStart = LAYOUT.incomeTable.top + 142;
  const monthStep = LAYOUT.incomeTable.rowH;
  const leftAmountRight = LAYOUT.incomeTable.x + 1010;
  const rightAmountRight = LAYOUT.incomeTable.x + 2110;
  for (let i = 0; i < 6; i += 1) {
    const top = monthTopStart + i * monthStep;
    drawRight(page, width, height, formatMoney(monthly[i]), leftAmountRight, top, 30, font);
  }
  for (let i = 0; i < 6; i += 1) {
    const top = monthTopStart + i * monthStep;
    drawRight(page, width, height, formatMoney(monthly[i + 6]), rightAmountRight, top, 30, font);
  }
  drawRight(page, width, height, formatMoney(totalIncome), LAYOUT.summary.x + 980, LAYOUT.summary.top + 58, 40, fontBold);
  drawRight(page, width, height, formatMoney(totalTax), LAYOUT.summary.x + LAYOUT.summary.width, LAYOUT.summary.top + 58, 40, fontBold);

  // 7) Ð¡Ñ€Ð¾Ðº Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ñ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ¸
  drawLeft(page, width, height, `${validFrom} Ð¿Ð¾ ${validTo}`, LAYOUT.signatureInfo.x, LAYOUT.signatureInfo.top + 52, 28, font);
  */

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

