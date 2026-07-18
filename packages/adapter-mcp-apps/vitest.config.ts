import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/adapter-mcp-apps') : undefined;

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'adapter-mcp-apps',
    // happy-dom gives the guarded renderer (spec 028) a real DOM for the
    // guardrail scenarios; the resource and protocol suites use only Node
    // built-ins and are unaffected by the ambient window.
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
});
