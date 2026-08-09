import sharp from 'sharp';
import { decimalToExifCoord } from './truthMeta.js';

/**
 * Встраивает EXIF в PNG (устройство, дата/время, GPS).
 * Формат GPS — строки рациональных дробей, как ожидает Sharp/libvips.
 * @param {Buffer} pngBuffer
 * @param {import('./truthMeta.js').TruthMeta} meta
 * @returns {Promise<Buffer>}
 */
export async function embedPngExif(pngBuffer, meta) {
  const lat = meta.latitude;
  const lon = meta.longitude;
  const latRef = lat >= 0 ? 'N' : 'S';
  const lonRef = lon >= 0 ? 'E' : 'W';

  const exif = {
    IFD0: {
      Make: meta.make,
      Model: meta.model,
      Software: meta.software,
      DateTime: meta.dateTimeExif,
      HostComputer: meta.city,
    },
    IFD1: {
      DateTimeOriginal: meta.dateTimeExif,
      DateTimeDigitized: meta.dateTimeExif,
    },
    IFD3: {
      GPSVersionID: '2.2.0.0',
      GPSLatitudeRef: latRef,
      GPSLatitude: decimalToExifCoord(lat),
      GPSLongitudeRef: lonRef,
      GPSLongitude: decimalToExifCoord(lon),
    },
  };

  const inputMeta = await sharp(pngBuffer).metadata();
  let pipe = sharp(pngBuffer).withExif(exif);
  if (inputMeta.density) {
    pipe = pipe.withMetadata({ density: inputMeta.density });
  }
  return pipe.png().toBuffer();
}
