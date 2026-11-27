import { readFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';

// Stryker omits dist. Supply the packed form of the committed build inventory.
const inventory = new URL(
  '../../../packages/tokens/generated/theme-checker-data.json',
  import.meta.url,
);
export default brotliCompressSync(readFileSync(inventory)).toString('base64');
