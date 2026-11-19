// @spec:038-mcp-server
// The binary is reproducible and budgeted (spec 038 D8, Constitutional
// Surface): a fresh build is byte-identical to the shipped file and stays
// within the whole-binary limits for raw, gzip and brotli bytes.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { BUNDLE, PACKAGE } from './harness.js';

const budgetScript = fileURLToPath(
  new URL('../../../scripts/lib/bundle-size-budget.mjs', import.meta.url),
);
const { mcpServer: BUDGET } = JSON.parse(
  execFileSync(process.execPath, [budgetScript], { encoding: 'utf8' }),
) as { mcpServer: Record<'raw' | 'gzip' | 'brotli', number> };

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
