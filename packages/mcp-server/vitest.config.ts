import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/mcp-server') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'mcp-server',
    // Every suite drives the BUILT binary (dist/kimen-mcp.js) over stdio with
    // the reference MCP client: the shipped artifact is what is tested.
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30_000,
  },
});
