import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('main requires one consolidated quality result with no bypass actors', async () => {
  const ruleset = JSON.parse(await read('.github/rulesets/main.json'));
  const statusRule = ruleset.rules.find(({ type }) => type === 'required_status_checks');

  assert.equal(ruleset.enforcement, 'active');
  assert.deepEqual(ruleset.bypass_actors, []);
  assert.deepEqual(statusRule.parameters.required_status_checks, [
    { context: 'quality', integration_id: 15368 },
  ]);
});

test('ruleset applicator is dry-run by default and has no temporary bypass mode', async () => {
  const script = await read('scripts/github/apply-main-ruleset.sh');

  assert.match(script, /MODE="\$\{1:---dry-run\}"/u);
  assert.match(script, /KIMEN_CONFIRM_MAIN_RULESET/u);
  assert.doesNotMatch(script, /break-glass|review evidence|attestation/iu);
});
