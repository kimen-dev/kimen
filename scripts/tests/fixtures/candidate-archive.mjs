// Writes a release candidate archive the way scripts/release/build-candidate.mjs
// does (canonical USTAR, canonical manifest JSON, SHA256SUMS), so a test can
// put bytes the builder would never produce inside a well-formed candidate and
// check that independent verification still refuses them.
import { createHash } from 'node:crypto';

import { canonicalJson } from '../../lib/canonical-json.mjs';

const BLOCK = 512;

const digest = (algorithm, bytes, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);

const octal = (value, length) => `${value.toString(8).padStart(length - 1, '0')}\0`;

function header(name, size) {
  const block = Buffer.alloc(BLOCK);
  block.write(name, 0, 100, 'utf8');
  block.write(octal(0o644, 8), 100);
  block.write(octal(0, 8), 108);
  block.write(octal(0, 8), 116);
  block.write(octal(size, 12), 124);
  block.write(octal(0, 12), 136);
  block.fill(32, 148, 156);
  block.write('0', 156);
  block.write('ustar\0', 257);
  block.write('00', 263);
  block.write('root', 265);
  block.write('root', 297);
  const checksum = block.reduce((sum, byte) => sum + byte, 0);
  block.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
  return block;
}

/** The manifest record of one package file, as the builder records it. */
export function packageRecord(name, file, bytes) {
  return {
    name,
    file,
    sha256: digest('sha256', bytes),
    integrity: `sha512-${digest('sha512', bytes, 'base64')}`,
    size: bytes.length,
  };
}

/** A canonical candidate archive for `manifest` and its package files (name → bytes). */
export function candidateArchive(manifest, packageFiles) {
  const manifestBytes = Buffer.from(canonicalJson(manifest), 'utf8');
  const summed = new Map([['manifest.json', manifestBytes], ...packageFiles]);
  const checksums = `${[...summed.keys()]
    .sort()
    .map((name) => `${digest('sha256', summed.get(name))}  ${name}`)
    .join('\n')}\n`;
  const entries = new Map([
    ['SHA256SUMS', Buffer.from(checksums, 'utf8')],
    ...packageFiles,
    ['manifest.json', manifestBytes],
  ]);
  const blocks = [];
  for (const name of [...entries.keys()].sort()) {
    const bytes = entries.get(name);
    blocks.push(header(name, bytes.length), bytes);
    const padding = (BLOCK - (bytes.length % BLOCK)) % BLOCK;
    if (padding > 0) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(BLOCK * 2));
  const archive = Buffer.concat(blocks);
  return { archive, sha256: digest('sha256', archive) };
}
