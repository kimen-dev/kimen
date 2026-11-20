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
// latest main with the part of the suite everything it lands can affect
// (scripts/gates/classify-ci-scope.mjs). That replaces the strict up-to-date policy,
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

// Scoping CI to what a change affects (2026-11-20) changed which gates run,
// not what main requires: the ruleset is pinned whole, so narrowing the
// required result, the queue or its timeout is a deliberate edit here too.
test('the main ruleset is exactly the one the affected CI scope was built against', async () => {
  const ruleset = JSON.parse(await read('.github/rulesets/main.json'));

  assert.deepEqual(ruleset, {
    name: 'kimen-protected-main',
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      { type: 'required_linear_history' },
      {
        type: 'pull_request',
        parameters: {
          allowed_merge_methods: ['squash'],
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: 0,
          required_review_thread_resolution: false,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: 'quality', integration_id: 15368 }],
          strict_required_status_checks_policy: false,
        },
      },
      {
        type: 'merge_queue',
        parameters: {
          check_response_timeout_minutes: 60,
          grouping_strategy: 'HEADGREEN',
          max_entries_to_build: 5,
          max_entries_to_merge: 5,
          merge_method: 'SQUASH',
          min_entries_to_merge: 1,
          min_entries_to_merge_wait_minutes: 5,
        },
      },
    ],
  });
});

test('ruleset applicator is dry-run by default and has no temporary bypass mode', async () => {
  const script = await read('scripts/github/apply-main-ruleset.sh');

  assert.match(script, /MODE="\$\{1:---dry-run\}"/u);
  assert.match(script, /KIMEN_CONFIRM_MAIN_RULESET/u);
  assert.doesNotMatch(script, /break-glass|review evidence|attestation/iu);
});
