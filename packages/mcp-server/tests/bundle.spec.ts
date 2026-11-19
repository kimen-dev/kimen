// @spec:038-mcp-server
// The binary is reproducible and budgeted (spec 038 D8, Constitutional
// Surface): a fresh build is byte-identical to the shipped file, and the file
// stays within its size budget — set about 5% above the size measured on
// 2026-11-16 (2,295,989 bytes raw, 433,018 gzip, 327,929 brotli), most of it
// the MCP Apps surface document, the SDK and the catalog's validator.
// Raw and gzip re-based for issues #317-#321 (button loading, field label
// hint, touch density, touch-size field text, all carried by the surface
// document and the manifest), when the binary measured 2,421,589 raw, 458,775
// gzip and 341,942 brotli: 11,589 and 3,775 bytes over the old raw and gzip
// lines. Both move to about 5% above; brotli is still inside its line.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { BUNDLE, PACKAGE } from './harness.js';

const BUDGET = { brotli: 345_000, gzip: 482_000, raw: 2_543_000 };

describe('Kimen MCP server: the shipped binary (038 S16)', () => {
  it('S16: a fresh build is byte-identical to the shipped binary', () => {
    const script = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('S16: the declared binary is the built file, and the package ships it', () => {
    expect(PACKAGE.bin['kimen-mcp']).toBe('./dist/kimen-mcp.mjs');
    expect(BUNDLE.endsWith('/dist/kimen-mcp.mjs')).toBe(true);
    expect(PACKAGE.files).toContain('dist/kimen-mcp.mjs');
  });

  it('stays within its size budget', () => {
    const binary = readFileSync(BUNDLE);
    expect(binary.length).toBeLessThanOrEqual(BUDGET.raw);
    expect(gzipSync(binary, { level: 9 }).length).toBeLessThanOrEqual(BUDGET.gzip);
    expect(brotliCompressSync(binary).length).toBeLessThanOrEqual(BUDGET.brotli);
  });
});
