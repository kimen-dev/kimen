// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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

async function createWorkflowFixture(t, source, fileName = 'fixture.yml') {
  const root = await mkdtemp(join(tmpdir(), 'kimen-workflow-policy-'));
  const workflowsDirectory = join(root, '.github/workflows');
  await mkdir(workflowsDirectory, { recursive: true });
  await writeFile(join(workflowsDirectory, fileName), source);
  t.after(() => rm(root, { force: true, recursive: true }));
  return workflowsDirectory;
}

function runWorkflowPolicy(workflowsDirectory) {
  const arguments_ = [workflowPolicyPath];
  if (workflowsDirectory !== undefined) {
    arguments_.push('--workflows-dir', workflowsDirectory);
  }
  return spawnSync(process.execPath, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });
}

const diagnostic = (result) => `${result.stdout}\n${result.stderr}`;

test('@spec:018-project-integrity-hardening S6 accepts a full-SHA, explicit-permission, blocked-egress owned job', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(t, safeOwnedWorkflow);
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.equal(result.status, 0, diagnostic(result));
});

test('@spec:018-project-integrity-hardening S6 rejects a mutable action reference', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace(`actions/checkout@${checkoutSha}`, 'actions/checkout@v5'),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /fixture\.yml.*(?:full|40).*(?:commit )?sha|action.*full.*sha/i);
});

test('@spec:018-project-integrity-hardening S6 rejects inherited or implicit job permissions', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace('    permissions:\n      contents: read\n', ''),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /verify.*permissions|permissions.*verify/i);
});

test('@spec:018-project-integrity-hardening S6 rejects write-all authority', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace(
      '    permissions:\n      contents: read',
      '    permissions: write-all',
    ),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /write-all|least[- ]privilege|permissions/i);
});

test('@spec:018-project-integrity-hardening S6 rejects unnecessary repository write authority', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace('      contents: read', '      contents: write'),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /contents.*write|least[- ]privilege|permissions/i);
});

test('@spec:018-project-integrity-hardening S2 rejects checks write on the GitHub Actions review workflow', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow
      .replace('  verify:', '  complete:')
      .replace('      contents: read', '      checks: write'),
    'review-evidence.yml',
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /checks.*write|least[- ]privilege|unnecessary/i);
});

test('@spec:018-project-integrity-hardening S7 rejects OIDC outside an exact publisher or Pages deploy job', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace('      contents: read', '      id-token: write'),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /id-token|OIDC|publish|deploy/i);
});

test('@spec:018-project-integrity-hardening S6 rejects harden-runner audit mode', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace('egress-policy: block', 'egress-policy: audit'),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /egress.*block|block.*egress|audit/i);
});

test('@spec:018-project-integrity-hardening S6 rejects blocked egress without a declared endpoint allowlist', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeOwnedWorkflow.replace(
      '          allowed-endpoints: >-\n            github.com:443\n            api.github.com:443\n',
      '',
    ),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /allowed-endpoints|allowlist|declared.*endpoint/i);
});

test('@spec:018-project-integrity-hardening S6 permits only a full-SHA reusable workflow with a versioned reason', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(t, safeReusableWorkflow);
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.equal(result.status, 0, diagnostic(result));
});

test('@spec:018-project-integrity-hardening S6 rejects an unreasoned reusable-workflow egress exception', async (t) => {
  const workflowsDirectory = await createWorkflowFixture(
    t,
    safeReusableWorkflow.replace(
      '    # kimen-workflow-policy: reusable-workflow-v1\n    # reason: the pinned upstream scanner owns its runner, so in-repo hardening cannot apply\n',
      '',
    ),
  );
  const result = runWorkflowPolicy(workflowsDirectory);

  assert.notEqual(result.status, 0);
  assert.match(
    diagnostic(result),
    /reusable.*(?:exception|reason)|(?:exception|reason).*reusable/i,
  );
});

test('@spec:018-project-integrity-hardening S6 enforces the workflow policy over every repository workflow', () => {
  const result = runWorkflowPolicy();

  assert.equal(result.status, 0, diagnostic(result));
});
