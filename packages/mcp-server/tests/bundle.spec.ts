// @spec:038-mcp-server
// The binary is reproducible and budgeted (spec 038 D8, Constitutional
// Surface): a fresh build is byte-identical to the shipped file, and the file
// stays within its size budget — set about 5% above the size measured on
// 2026-11-16 (2,295,989 bytes raw, 433,018 gzip, 327,929 brotli), most of it
// the MCP Apps surface document, the SDK and the catalog's validator.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { BUNDLE } from './harness.js';

const BUDGET = { brotli: 345_000, gzip: 455_000, raw: 2_410_000 };

describe('Kimen MCP server: the shipped binary (038 S16)', () => {
  it('S16: a fresh build is byte-identical to the shipped binary', () => {
    const script = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('stays within its size budget', () => {
    const binary = readFileSync(BUNDLE);
    expect(binary.length).toBeLessThanOrEqual(BUDGET.raw);
    expect(gzipSync(binary, { level: 9 }).length).toBeLessThanOrEqual(BUDGET.gzip);
    expect(brotliCompressSync(binary).length).toBeLessThanOrEqual(BUDGET.brotli);
  });
});
