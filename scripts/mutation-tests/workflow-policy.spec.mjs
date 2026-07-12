// @spec:018-project-integrity-hardening#S6
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it, onTestFinished } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const workflowPolicyPath = join(repositoryRoot, 'scripts/gates/check-workflows.mjs');
const hardenRunnerSha = '9af89fc71515a100421586dfdb3dc9c984fbf411';
const checkoutSha = '93cb6efe18208431cddfb8368fd83d5badbf9bfd';

const safeOwnedWorkflow = `
name: policy-fixture
on: workflow_dispatch
permissions: {}
jobs:
  verify:
    permissions:
      contents: read
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Harden runner
        uses: step-security/harden-runner@${hardenRunnerSha}
        with:
          egress-policy: block
          allowed-endpoints: >-
            github.com:443
            api.github.com:443
      - name: Check out source
        uses: actions/checkout@${checkoutSha}
        with:
          persist-credentials: false
`;

const safeReusableWorkflow = `
name: reusable-policy-fixture
on: workflow_dispatch
permissions: {}
jobs:
  scan:
    # kimen-workflow-policy: reusable-workflow-v1
    # reason: the pinned upstream scanner owns its runner, so in-repo hardening cannot apply
    permissions:
      actions: read
      contents: read
      security-events: write
    uses: example/security/.github/workflows/scan.yml@${checkoutSha}
`;

async function createWorkflowFixture(source) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-workflow-mutation-'));
  const workflowsDirectory = join(root, '.github/workflows');
  await mkdir(workflowsDirectory, { recursive: true });
  await writeFile(join(workflowsDirectory, 'fixture.yml'), source);
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return workflowsDirectory;
}

function runWorkflowPolicy(workflowsDirectory) {
  return spawnSync(process.execPath, [workflowPolicyPath, '--workflows-dir', workflowsDirectory], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });
}

const diagnostic = (result) => `${result.stdout}\n${result.stderr}`;

it('S6 accepts a full-SHA, explicit-permission, blocked-egress owned job', async () => {
  const result = runWorkflowPolicy(await createWorkflowFixture(safeOwnedWorkflow));
  expect(result.status, diagnostic(result)).toBe(0);
  expect(result.stdout).toMatch(/PASS.*1 workflow/u);
});

it.each([
  [
    'mutable action',
    safeOwnedWorkflow.replace(`actions/checkout@${checkoutSha}`, 'actions/checkout@v5'),
    /full.*sha/iu,
  ],
  [
    'implicit permissions',
    safeOwnedWorkflow.replace('    permissions:\n      contents: read\n', ''),
    /permissions/iu,
  ],
  [
    'write-all permissions',
    safeOwnedWorkflow.replace(
      '    permissions:\n      contents: read',
      '    permissions: write-all',
    ),
    /least privilege|write-all/iu,
  ],
  [
    'unnecessary repository write',
    safeOwnedWorkflow.replace('      contents: read', '      contents: write'),
    /contents.*write|least privilege/iu,
  ],
  [
    'OIDC outside a publisher',
    safeOwnedWorkflow.replace('      contents: read', '      id-token: write'),
    /id-token|OIDC|publisher/iu,
  ],
  [
    'audit egress',
    safeOwnedWorkflow.replace('egress-policy: block', 'egress-policy: audit'),
    /block egress|audit mode/iu,
  ],
  [
    'missing allowlist',
    safeOwnedWorkflow.replace(
      '          allowed-endpoints: >-\n            github.com:443\n            api.github.com:443\n',
      '',
    ),
    /allowed-endpoints|allowlist/iu,
  ],
  [
    'missing timeout',
    safeOwnedWorkflow.replace('    timeout-minutes: 5\n', ''),
    /timeout-minutes/iu,
  ],
  [
    'executable before hardening',
    safeOwnedWorkflow.replace(
      '    steps:\n',
      '    steps:\n      - name: Unsafe early step\n        run: echo unsafe\n',
    ),
    /before executable|harden.*before/iu,
  ],
  [
    'invalid endpoint',
    safeOwnedWorkflow.replace('github.com:443', 'https://github.com'),
    /host:port|allowed-endpoints/iu,
  ],
])('S6 rejects %s', async (_name, source, expected) => {
  const result = runWorkflowPolicy(await createWorkflowFixture(source));
  expect(result.status).not.toBe(0);
  expect(diagnostic(result)).toMatch(expected);
});

it('S6 accepts only a pinned reusable workflow with a versioned reason', async () => {
  const result = runWorkflowPolicy(await createWorkflowFixture(safeReusableWorkflow));
  expect(result.status, diagnostic(result)).toBe(0);
});

it.each([
  [
    'missing exception',
    safeReusableWorkflow.replace(
      '    # kimen-workflow-policy: reusable-workflow-v1\n    # reason: the pinned upstream scanner owns its runner, so in-repo hardening cannot apply\n',
      '',
    ),
  ],
  ['mutable reusable reference', safeReusableWorkflow.replace(`@${checkoutSha}`, '@main')],
])('S6 rejects reusable workflow with %s', async (_name, source) => {
  const result = runWorkflowPolicy(await createWorkflowFixture(source));
  expect(result.status).not.toBe(0);
  expect(diagnostic(result)).toMatch(/reusable.*(?:exception|reason|full|sha)|action.*full.*sha/iu);
});
