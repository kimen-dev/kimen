// Usage: node concat-brotli.mjs <results.json> <page/bundler> <consumer dir>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const [results, page, root] = process.argv.slice(2);
const r = JSON.parse(readFileSync(results, 'utf8'))[page];
const [name, bundler] = page.split('/');
const dir = join(root, `app-${name}`, 'dist', bundler);
const files = Object.keys(r.sizes);
const all = Buffer.concat(files.map((f) => readFileSync(join(dir, f))));
const br = brotliCompressSync(all, {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_SIZE_HINT]: all.length,
  },
}).length;
let defines = 0;
for (const f of files) {
  defines += (readFileSync(join(dir, f), 'utf8').match(/customElements\.define/g) ?? []).length;
}
console.log(
  page,
  'files',
  r.files,
  'separate br',
  r.totalBrotli,
  'one-file br',
  br,
  'raw',
  all.length,
  'customElements.define',
  defines,
);
