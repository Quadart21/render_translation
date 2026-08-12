/**
 * Extract native composite CSS builders from render.js into nativeCompositeCss.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const renderPath = path.join(process.cwd(), 'src/renderer/render.js');
const lines = (await fs.readFile(renderPath, 'utf8')).split(/\n/);

// 1-based line numbers in current slim render.js (from earlier grep)
// android: dims start ~222, css assign 265-696
// ios: dims 698-714, css 715-871

const androidBlock = lines.slice(221, 696).join('\n'); // from `const chatTopPx = 0` through `</style>`;`
const iosBlock = lines.slice(697, 871).join('\n'); // from chatTopPx ios through `</style>`;`

const androidFn = `import { compositeLightTextCss } from './compositeCss.js';

/**
 * Native Android composite layout + injected CSS.
 * @param {{ nativeW: number, nativeH: number, themeSel: string }} opts
 * @returns {string}
 */
export function buildAndroidNativeCompositeCss({ nativeW, nativeH, themeSel }) {
${androidBlock
  .replace(/^        /gm, '  ')
  .replace(/nativeSizeCss = /, 'return ')
  .replace(/\$\{compositeLightTextCss\(themeSel\)\}/g, '${compositeLightTextCss(themeSel)}')}
}
`;

const iosFn = `
/**
 * Native iOS composite layout + injected CSS.
 * @param {{ nativeW: number, nativeH: number, themeSel: string, iosCompositeScale: number, PHONE_LOGICAL_WIDTH_CSS_PX: number }} opts
 * @returns {string}
 */
export function buildIosNativeCompositeCss({
  nativeW,
  nativeH,
  themeSel,
  iosCompositeScale,
  PHONE_LOGICAL_WIDTH_CSS_PX,
}) {
${iosBlock
  .replace(/^        /gm, '  ')
  .replace(/nativeSizeCss = /, 'return ')
  .replace(/\$\{compositeLightTextCss\(themeSel\)\}/g, '${compositeLightTextCss(themeSel)}')}
}
`;

await fs.writeFile(
  path.join(process.cwd(), 'src/renderer/nativeCompositeCss.js'),
  androidFn + iosFn
);

// Patch render.js: replace the big if/else with calls
const start = 219; // `let nativeSizeCss = '';` is line 219 (1-based) -> index 218
// Find exact markers
let startIdx = lines.findIndex((l) => l.includes("let nativeSizeCss = '';"));
let endIdx = lines.findIndex(
  (l, i) => i > startIdx && l.trim() === 'const html = raw'
);
if (startIdx < 0 || endIdx < 0) {
  throw new Error(`markers not found start=${startIdx} end=${endIdx}`);
}

const replacement = `    let nativeSizeCss = '';
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

`;

const newLines = [...lines.slice(0, startIdx), ...replacement.split(/\n/), ...lines.slice(endIdx)];
let text = newLines.join('\n');
if (!text.includes("from './nativeCompositeCss.js'")) {
  text = text.replace(
    "import { compositeLightTextCss } from './compositeCss.js';\n",
    `import {
  buildAndroidNativeCompositeCss,
  buildIosNativeCompositeCss,
} from './nativeCompositeCss.js';
`
  );
}
// compositeLightTextCss may no longer be needed in render.js
if (!text.includes('compositeLightTextCss(')) {
  text = text.replace(
    /import \{\s*buildAndroidNativeCompositeCss,\s*buildIosNativeCompositeCss,\s*\} from '\.\/nativeCompositeCss\.js';\n/,
    `import {
  buildAndroidNativeCompositeCss,
  buildIosNativeCompositeCss,
} from './nativeCompositeCss.js';
`
  );
}

await fs.writeFile(renderPath, text);
const n = (await fs.readFile(renderPath, 'utf8')).split(/\n/).length;
const cn = (await fs.readFile(path.join(process.cwd(), 'src/renderer/nativeCompositeCss.js'), 'utf8')).split(
  /\n/
).length;
console.log({ renderLines: n, cssLines: cn });
