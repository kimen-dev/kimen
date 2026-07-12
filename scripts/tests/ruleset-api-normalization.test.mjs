// @spec:018-project-integrity-hardening#S2
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const controller = await readFile(
  new URL('../github/apply-main-ruleset.sh', import.meta.url),
  'utf8',
);
const normalizeFunction = controller.match(/normalize_ruleset\(\) \{[\s\S]*?^\}/m)?.[0];
assert.ok(normalizeFunction, 'normalize_ruleset must remain a standalone shell function');

const baseRuleset = {
  bypass_actors: [],
  conditions: { ref_name: { exclude: [], include: ['refs/heads/main'] } },
  enforcement: 'disabled',
  name: 'kimen-protected-main',
  rules: [
    {
      parameters: {
        allowed_merge_methods: ['squash'],
        dismiss_stale_reviews_on_push: true,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_approving_review_count: 0,
        required_review_thread_resolution: true,
      },
      type: 'pull_request',
    },
  ],
  target: 'branch',
};
const cloneRuleset = () => JSON.parse(JSON.stringify(baseRuleset));

async function normalizeFixture(t, value) {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-ruleset-normalize-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fixture = join(directory, 'ruleset.json');
  await writeFile(fixture, `${JSON.stringify(value)}\n`);
  const result = spawnSync(
    '/bin/bash',
    ['-c', `${normalizeFunction}\nnormalize_ruleset "$1"`, 'normalize-ruleset', fixture],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('S2 ruleset comparison removes only exact empty GitHub pull-request defaults', async (t) => {
  const observed = cloneRuleset();
  observed.rules[0].parameters.dismissal_restriction = {
    allowed_actors: [],
    enabled: false,
  };
  observed.rules[0].parameters.required_reviewers = [];

  assert.deepEqual(await normalizeFixture(t, observed), await normalizeFixture(t, baseRuleset));
});

test('S2 ruleset comparison preserves non-empty GitHub pull-request authority', async (t) => {
  const observed = cloneRuleset();
  observed.rules[0].parameters.dismissal_restriction = {
    allowed_actors: [{ actor_id: 7, actor_type: 'User' }],
    enabled: true,
  };
  observed.rules[0].parameters.required_reviewers = [{ file_patterns: ['*'] }];

  assert.notDeepEqual(await normalizeFixture(t, observed), await normalizeFixture(t, baseRuleset));
});
