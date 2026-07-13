import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('fast core keeps high-signal integrity checks and excludes release or scheduled work', async () => {
  const core = await read('scripts/gates/gates-core.sh');
  const required = [
    'run_core_gate workflows pnpm run check:workflows',
    'run_core_gate agent-skills agent_skills',
    'run_core_gate format pnpm run format:check',
    'run_core_gate build pnpm exec nx run-many -t build',
    'run_core_gate public-api pnpm run check:api',
    'run_core_gate token-contract pnpm run check:tokens',
    'run_core_gate lint pnpm run lint',
    'run_core_gate typecheck pnpm run typecheck',
    'run_core_gate budgets pnpm exec nx run-many -t size',
    'run_core_gate test pnpm exec nx run-many -t test',
  ];
  for (const marker of required) assert.match(core, new RegExp(marker.replaceAll('/', '\\/')));
  assert.doesNotMatch(core, /test:mutation|test:sandbox|packaging|test:consumer-contract/u);
});

test('consolidated suite adds Chromium exactly once', async () => {
  const suite = await read('scripts/gates/gates-suite.sh');
  assert.match(suite, /run_gate core bash scripts\/gates\/gates-core\.sh/u);
  assert.match(suite, /run_gate test-browser bash scripts\/gates\/gates-browser\.sh chromium/u);
  assert.match(suite, /QUALITY GATES GREEN/u);
  assert.doesNotMatch(suite, /mutation|containment|review-evidence|capabilities-current-run/iu);
});
