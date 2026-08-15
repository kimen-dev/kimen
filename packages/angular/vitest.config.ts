import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const cacheRoot = process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, 'vite/angular-wrapper') : undefined;

// The Angular value-accessor scenario exercises the generated accessor
// CLASS against a real FormControl and a real DOM element (happy-dom
// suffices: no shadow DOM is involved — the accessor reads and writes host
// element properties and listens to the re-dispatched native events).
// Full-TestBed integration stays a documented follow-up (research D8).
export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  test: {
    name: 'angular-wrapper',
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
});
