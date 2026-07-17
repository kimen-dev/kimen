import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

interface DistSourceMap {
  sources: string[];
  sourceRoot?: string;
  [key: string]: unknown;
}

/**
 * Both suites execute the BUILT dist output (what ships is what is asserted,
 * Art. III), so V8 coverage observes dist chunks, never src. Stencil emits
 * sourcemaps whose `sources` are package-relative (`src/...`); served as-is
 * they resolve underneath dist/ and can never match the src-only coverage
 * scope, leaving every component at a false 0%. This load plugin serves each
 * dist chunk together with its sibling sourcemap re-anchored to the absolute
 * src files, so executed built code is attributed to its production sources.
 */
export const distSourceCoveragePlugin = {
  name: 'kimen:dist-source-coverage',
  async load(id: string): Promise<{ code: string; map: DistSourceMap } | null> {
    const cleanId = id.split('?')[0] ?? id;
    // Only this package's own dist output: a foreign /dist/ module (another
    // workspace package, node_modules) would re-anchor onto the wrong src.
    if (!cleanId.endsWith('.js') || !cleanId.startsWith(join(packageRoot, 'dist/'))) {
      return null;
    }
    let map: DistSourceMap;
    try {
      map = JSON.parse(await readFile(`${cleanId}.map`, 'utf8')) as DistSourceMap;
    } catch {
      return null;
    }
    const code = await readFile(cleanId, 'utf8');
    delete map.sourceRoot;
    map.sources = map.sources.map((source) => resolve(packageRoot, source.split('?')[0] ?? source));
    return { code, map };
  },
};

/**
 * Coverage stays inactive unless --coverage is passed: the ordinary `test`
 * and `test-browser` targets remain coverage-free (Art. III: coverage is
 * diagnostic, never a PR gate). Scope is production src only: specs, stories
 * and the Stencil-generated components.d.ts are not product code. Reports
 * are outputs, not caches, so they land in the gitignored repo-root reports/
 * tree, a sibling of the KIMEN_CACHE_ROOT default (reports/cache).
 *
 * Baseline (2026-07-16, `pnpm --filter @kimen/elements run test:coverage`):
 * - elements-unit: 69.95% lines / 63.27% branches / 72.23% functions
 * - elements-browser-chromium: 90.53% lines / 77.97% branches / 97.41% functions
 */
interface CoverageThresholds {
  lines: number;
  branches: number;
  functions: number;
}

/**
 * Regression floors, set 2 points below each recorded baseline so ordinary
 * noise passes but a real coverage regression fails `test:coverage`. They
 * enforce only where --coverage runs — the weekly mutation.yml cadence and
 * explicit local runs — never in the PR gate (Art. III).
 *
 * Ratchet is MANUAL and upward-only: when a new baseline is recorded above
 * the current one, update the baseline comment above and raise these floors
 * to the new baseline minus 2 in the same change. Floors never go down
 * without founder judgment. The chromium browser suite is the only browser
 * suite with V8 coverage, so it is the only browser key here.
 */
const coverageThresholds: Record<string, CoverageThresholds> = {
  'elements-unit': { lines: 68, branches: 61, functions: 70 },
  'elements-browser-chromium': { lines: 88, branches: 75, functions: 95 },
};

export function coverageOptions(
  suite: string,
  executedDistInclude: string[],
): {
  provider: 'v8';
  reporter: string[];
  reportsDirectory: string;
  include: string[];
  exclude: string[];
  excludeAfterRemap: boolean;
  thresholds?: CoverageThresholds;
} {
  const thresholds = coverageThresholds[suite];
  return {
    provider: 'v8',
    reporter: ['text', 'json-summary', 'html'],
    reportsDirectory: join(repositoryRoot, 'reports/coverage', suite),
    // The executed-dist patterns exist because @vitest/coverage-v8 filters
    // executed scripts against coverage.include BEFORE sourcemap remapping:
    // without them every dist chunk is dropped and src attribution is
    // impossible. After remapping, excludeAfterRemap re-applies this filter,
    // so only real src production files survive into the report (css sources,
    // Stencil runtime and spec/story files all fall out).
    include: ['src/**/*.{ts,tsx}', ...executedDistInclude],
    exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.stories.{ts,tsx}', 'src/components.d.ts'],
    excludeAfterRemap: true,
    ...(thresholds === undefined ? {} : { thresholds }),
  };
}
