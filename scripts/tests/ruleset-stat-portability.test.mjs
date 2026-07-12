// @spec:018-project-integrity-hardening#S2
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const controller = await readFile(
  new URL('../github/apply-main-ruleset.sh', import.meta.url),
  'utf8',
);

test('S2 ruleset path facts discard partial output from an incompatible stat dialect', async (t) => {
  const functionSource = controller.match(/read_path_facts\(\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(functionSource, 'read_path_facts must remain a standalone shell function');

  const directory = await mkdtemp(join(tmpdir(), 'kimen-stat-dialect-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fakeStat = join(directory, 'stat');
  await writeFile(
    fakeStat,
    `#!/bin/sh
if [ "$1" = "-f" ]; then
  printf 'partial GNU filesystem output\\n'
  exit 1
fi
if [ "$1" = "-c" ]; then
  printf '1|2|3|700|1|4|5\\n'
  exit 0
fi
exit 2
`,
    { mode: 0o700 },
  );
  await chmod(fakeStat, 0o700);

  const result = spawnSync('/bin/bash', ['-c', `${functionSource}\nread_path_facts /fixture`], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${directory}:/usr/bin:/bin` },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '1|2|3|700|1|4|5\n');
});
