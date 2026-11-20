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

// Every merge goes through the queue, which tests each group against the
// latest main with the full suite. That replaces the strict up-to-date policy,
// which made each merge restart CI on every other open PR. The queue only works
// if the required check also runs on merge_group events, or entries time out.
test('main merges through a squash merge queue that the required check runs in', async () => {
  const [ruleset, workflow] = await Promise.all([
    read('.github/rulesets/main.json').then(JSON.parse),
    read('.github/workflows/ci.yml'),
  ]);
  const queue = ruleset.rules.find(({ type }) => type === 'merge_queue');
  const statusRule = ruleset.rules.find(({ type }) => type === 'required_status_checks');

  assert.ok(queue, 'main must declare a merge_queue rule');
  assert.equal(queue.parameters.merge_method, 'SQUASH');
  assert.equal(queue.parameters.grouping_strategy, 'HEADGREEN');
  assert.ok(queue.parameters.check_response_timeout_minutes >= 35 + 10);
  assert.equal(statusRule.parameters.strict_required_status_checks_policy, false);
  assert.match(workflow, /^ {2}merge_group:\n {4}types: \[checks_requested\]$/mu);
  assert.match(workflow, /^ {2}quality:$/mu);
});

test('ruleset applicator is dry-run by default and has no temporary bypass mode', async () => {
  const script = await read('scripts/github/apply-main-ruleset.sh');

  assert.match(script, /MODE="\$\{1:---dry-run\}"/u);
  assert.match(script, /KIMEN_CONFIRM_MAIN_RULESET/u);
  assert.doesNotMatch(script, /break-glass|review evidence|attestation/iu);
});
