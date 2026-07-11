// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

const policy = JSON.parse(
  await readFile(new URL('./fixtures/attempt-evidence-force-add.json', import.meta.url), 'utf8'),
);

test('S5 ordinary outputs stay ignored and force-add names one exact evidence file', async (t) => {
  const fixture = await createFixtureRepo();
  t.after(() => fixture.cleanup());
  await fixture.copyFromRepo('.gitignore');

  const ignoredPaths = [policy.evidencePath, policy.siblingPath, ...policy.ordinaryIgnoredPaths];
  for (const path of ignoredPaths) {
    await fixture.write(path, '{}\n');
    const ignored = await fixture.run('git', ['check-ignore', '--quiet', '--', path]);
    assert.equal(ignored.code, 0, `${path} must be ignored`);
  }

  const ordinaryAdd = await fixture.run('git', ['add', '--', policy.evidencePath]);
  assert.notEqual(ordinaryAdd.code, 0, 'ordinary git add must not retain attempt evidence');

  assert.deepEqual(policy.forceAddArgv, ['add', '-f', '--', policy.evidencePath]);
  const forceAdd = await fixture.run('git', policy.forceAddArgv);
  assert.equal(forceAdd.code, 0, forceAdd.stderr);

  const staged = await fixture.run('git', ['diff', '--cached', '--name-only']);
  assert.equal(staged.code, 0, staged.stderr);
  assert.equal(staged.stdout.trim(), policy.evidencePath);
});
