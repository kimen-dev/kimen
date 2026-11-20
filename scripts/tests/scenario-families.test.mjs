import assert from 'node:assert/strict';
import test from 'node:test';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

const familyTable = (ids) =>
  [
    '# Fixture spec',
    '',
    '| Family | Scenario IDs | N/A justification |',
    '| --- | --- | --- |',
    ...[
      'Core behavior',
      'Keyboard path',
      'Assistive-tech outcome',
      'Form participation',
      'Theming',
    ].map((family) => `| ${family} | ${ids} | |`),
    '',
  ].join('\n');

async function runFamilies(fixture) {
  await fixture.copyFromRepo('scripts/gates/check-scenario-families.sh');
  return fixture.run('bash', ['scripts/gates/check-scenario-families.sh', fixture.featureDir]);
}

// The ID lookup used to pipe every feature ID into `grep -q`. Under
// `set -o pipefail`, grep exits on the first match and the writer dies of
// SIGPIPE, so a present ID read as missing whenever the writer had not finished
// (it failed `core` on PR #535 for specs/098 S5). Enough IDs to exceed a pipe
// buffer make that race certain instead of timing-dependent.
test('a referenced scenario ID is found however many IDs the feature declares', async (t) => {
  const scenarioIds = Array.from({ length: 20_000 }, (_, index) => `S${index + 1}`);
  const fixture = await createFixtureRepo({ scenarioIds });
  t.after(() => fixture.cleanup());
  await fixture.write(`${fixture.featureDir}/spec.md`, familyTable('S1'));

  const result = await runFamilies(fixture);

  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /GATE scenario-families: PASS/u);
});

test('a referenced scenario ID that the feature lacks still fails', async (t) => {
  const fixture = await createFixtureRepo({ scenarioIds: ['S1', 'S2'] });
  t.after(() => fixture.cleanup());
  await fixture.write(`${fixture.featureDir}/spec.md`, familyTable('S1, S9'));

  const result = await runFamilies(fixture);

  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /references S9, which is not a scenario ID/u);
});
