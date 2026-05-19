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
  if (cents === 0) return Array.from({ length: 12 }, () => 0);

  // Разные месяцы: случайные веса, затем нормализация к общей сумме.
  const weights = Array.from({ length: 12 }, () => 0.65 + Math.random() * 0.9);
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const scaled = weights.map((w) => (cents * w) / sumWeights);
  const floors = scaled.map((v) => Math.floor(v));
  let rest = cents - floors.reduce((a, b) => a + b, 0);

  // Добрасываем остаток по убыванию дробной части, чтобы итог совпал копейка в копейку.
  const order = scaled
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);

  let p = 0;
  while (rest > 0) {
    floors[order[p % order.length]] += 1;
    rest -= 1;
    p += 1;
  }

  return floors.map((c) => c / 100);
}

function yFromTop(pageHeight, top, fontSize = 10) {
  return pageHeight - top - fontSize;
}

function drawTextAtTop(page, pageHeight, text, x, top, size, font, color = rgb(0, 0, 0)) {
  page.drawText(String(text), {
    x,
    y: yFromTop(pageHeight, top, size),
    size,
    font,
    color,
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
  taxpayerName: { centerX: 1250, top: 621 },
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

function drawUnderlinedLeft(page, pageWidth, pageHeight, text, x, top, size, font, opts = {}) {
  const px = scaleX(pageWidth, x);
  const pTop = scaleTop(pageHeight, top);
  const pSize = scaleSize(pageHeight, size);
  drawTextAtTop(page, pageHeight, text, px, pTop, pSize, font);
  const fixedUnderlineWidth = Number(opts.fixedUnderlineWidth || 0);
  const underlineOffsetX = Number(opts.underlineOffsetX || 0);
  const underlineOffsetY = Number(opts.underlineOffsetY || 0);
  const textWidth = fixedUnderlineWidth > 0
    ? scaleX(pageWidth, fixedUnderlineWidth)
    : font.widthOfTextAtSize(String(text), pSize);
  const y = yFromTop(pageHeight, pTop, pSize) - Math.max(1, pSize * 0.12) - 0.6 - underlineOffsetY;
  page.drawLine({
    start: { x: px + scaleX(pageWidth, underlineOffsetX), y },
    end: { x: px + scaleX(pageWidth, underlineOffsetX) + textWidth, y },
    thickness: Math.max(0.45, pSize * 0.02),
    color: rgb(0, 0, 0),
  });
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

  // 2) Номер справки
  drawCenter(page, width, height, `${certificateNumber}`, LAYOUT.documentTitle.centerX + 190, LAYOUT.documentTitle.top - 190, 55, fontBold);

  // 3) Год и дата
  drawCenter(page, width, height, `${year}`, LAYOUT.documentTitle.centerX - 190, LAYOUT.documentTitle.top - 57, 55, fontBold);
  drawCenter(page, width, height, `${issueDate}`, LAYOUT.documentTitle.centerX + 185, LAYOUT.documentTitle.top - 57, 55, fontBold);

  // 4) ИНН (только цифры + подчёркивание)
  const innDigits = String(inn).replace(/\D/g, '');
  drawUnderlinedLeft(page, width, height, innDigits, LAYOUT.inn.x + 235, LAYOUT.inn.top - 42, 42, font, {
    fixedUnderlineWidth: 286,
    underlineOffsetX: -26,
    underlineOffsetY: 3,
  });

  // 4.1) ФИО — фиксированная горизонтальная ось центра (все значения центрируются от нее)
  const fioCenterX = LAYOUT.taxpayerName.centerX;
  drawCenter(
    page,
    width,
    height,
    `${taxpayerName}`,
    fioCenterX,
    LAYOUT.taxpayerName.top,
    53.2,
    font
  );

  // 5) Серия и номер документа
  drawLeft(page, width, height, `${idSeriesNumber}`, LAYOUT.passport.x + 1770, LAYOUT.passport.top - 353, 42, font);

  // 6) Доход по месяцам + налог по таблице
  const monthTopStart = LAYOUT.incomeTable.top - 258;
  const monthStep = LAYOUT.incomeTable.rowH;
  // Fixed-start anchors: first digit stays in place, number grows to the right.
  const leftAmountStart = LAYOUT.incomeTable.x + 520;
  const rightAmountStart = LAYOUT.incomeTable.x + 1620;
  for (let i = 0; i < 6; i += 1) {
    const top = monthTopStart + i * monthStep;
    drawLeft(page, width, height, formatMoney(monthly[i]), leftAmountStart, top, 42, font);
  }
  for (let i = 0; i < 6; i += 1) {
    const top = monthTopStart + i * monthStep;
    drawLeft(page, width, height, formatMoney(monthly[i + 6]), rightAmountStart, top, 42, font);
  }
  const totalsTop = LAYOUT.summary.top - 962;
  const totalIncomeStart = LAYOUT.summary.x + 620;
  const totalTaxStart = LAYOUT.summary.x + 1650;
  drawLeft(page, width, height, formatMoney(totalIncome), totalIncomeStart, totalsTop, 42, font);
  drawLeft(page, width, height, formatMoney(totalTax), totalTaxStart, totalsTop, 42, font);

  // 7) Срок действия подписи
  const signatureLeftDate = String(validFrom).trim();
  const signatureRightDate = String(validTo).trim();
  const signatureY = scaleTop(height, 3122);
  const signatureFontSize = scaleSize(height, 34);
  const signatureColor = rgb(0x42 / 255, 0x44 / 255, 0xB5 / 255);
  const signatureLeftX = scaleX(width, LAYOUT.signatureInfo.x + 986);
  const signatureGap = scaleX(width, 150);
  const leftDateWidth = fontBold.widthOfTextAtSize(signatureLeftDate, signatureFontSize);
  const signatureRightX = signatureLeftX + leftDateWidth + signatureGap + scaleX(width, -100);
  drawTextAtTop(
    page,
    height,
    signatureLeftDate,
    signatureLeftX,
    signatureY,
    signatureFontSize,
    fontBold,
    signatureColor
  );
  drawTextAtTop(
    page,
    height,
    signatureRightDate,
    signatureRightX,
    signatureY,
    signatureFontSize,
    fontBold,
    signatureColor
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

