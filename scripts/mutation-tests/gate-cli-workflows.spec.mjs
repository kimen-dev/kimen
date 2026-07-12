// @spec:018-project-integrity-hardening#S6
import { expect, it } from 'vitest';

import {
  checkWorkflows,
  parseWorkflowArguments,
  runWorkflowCli,
  validateWorkflowSource,
} from '../gates/check-workflows.mjs';

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
`;

const safeReusableWorkflow = `
name: reusable-policy-fixture
on: workflow_dispatch
permissions: {}
jobs:
  scan:
    # kimen-workflow-policy: reusable-workflow-v1
    # reason: the pinned upstream scanner owns its runner
    permissions:
      actions: read
      contents: read
      security-events: write
    uses: example/security/.github/workflows/scan.yml@${checkoutSha}
`;

const aFile = (name, file = true) => ({ name, isFile: () => file });

it('accepts an owned job whose first executable step hardens and blocks the runner', () => {
  expect(() => validateWorkflowSource(safeOwnedWorkflow, 'fixture.yml')).not.toThrow();
});

it('accepts local and docker uses without treating them as mutable marketplace actions', () => {
  const source = safeOwnedWorkflow.replace(
    `      - name: Check out source\n        uses: actions/checkout@${checkoutSha}`,
    '      - uses: ./local-action\n      - uses: docker://alpine:3.21',
  );

  expect(() => validateWorkflowSource(source, 'fixture.yml')).not.toThrow();
});

it('accepts a scalar allowlist and quoted block policy', () => {
  const source = safeOwnedWorkflow.replace(
    '          egress-policy: block\n          allowed-endpoints: >-\n            github.com:443\n            api.github.com:443',
    '          egress-policy: "block"\n          allowed-endpoints: "github.com:443 api.github.com:443"',
  );

  expect(() => validateWorkflowSource(source, 'fixture.yml')).not.toThrow();
});

it('accepts a reasoned full-SHA reusable workflow and its scoped security write', () => {
  expect(() => validateWorkflowSource(safeReusableWorkflow, 'security.yml')).not.toThrow();
});

it('accepts the exact release publisher OIDC write', () => {
  const source = safeOwnedWorkflow
    .replace('  verify:', '  publish:')
    .replace('      contents: read', '      id-token: write');

  expect(() => validateWorkflowSource(source, 'release.yml')).not.toThrow();
});

it.each([
  ['tab indentation', safeOwnedWorkflow.replace('    runs-on:', '\truns-on:'), /tab indentation/u],
  [
    'missing top permissions',
    safeOwnedWorkflow.replace('permissions: {}\n', ''),
    /permissions to \{\}/u,
  ],
  [
    'mapped top permissions',
    safeOwnedWorkflow.replace('permissions: {}', 'permissions:\n  contents: read'),
    /permissions to \{\}/u,
  ],
  ['missing jobs', safeOwnedWorkflow.replace('jobs:', 'tasks:'), /must declare jobs/u],
  ['empty jobs', 'name: empty\npermissions: {}\njobs:\n', /at least one job/u],
  [
    'mutable action',
    safeOwnedWorkflow.replace(`actions/checkout@${checkoutSha}`, 'actions/checkout@v5'),
    /full 40-character commit SHA/u,
  ],
  [
    'missing job permissions',
    safeOwnedWorkflow.replace('    permissions:\n      contents: read\n', ''),
    /explicit permissions/u,
  ],
  [
    'write-all',
    safeOwnedWorkflow.replace(
      '    permissions:\n      contents: read',
      '    permissions: write-all',
    ),
    /least privilege/u,
  ],
  [
    'inline permission',
    safeOwnedWorkflow.replace(
      '    permissions:\n      contents: read',
      '    permissions: contents-read',
    ),
    /explicit map/u,
  ],
  [
    'empty permission map body',
    safeOwnedWorkflow.replace('      contents: read\n', ''),
    /explicit permissions or \{\}/u,
  ],
  [
    'invalid permission entry',
    safeOwnedWorkflow.replace('      contents: read', '      contents: admin'),
    /invalid explicit permission entry/u,
  ],
  [
    'unscoped write',
    safeOwnedWorkflow.replace('      contents: read', '      contents: write'),
    /unnecessary contents: write/u,
  ],
  [
    'missing runs-on',
    safeOwnedWorkflow.replace('    runs-on: ubuntu-latest\n', ''),
    /must declare runs-on/u,
  ],
  [
    'missing timeout',
    safeOwnedWorkflow.replace('    timeout-minutes: 5\n', ''),
    /finite timeout-minutes/u,
  ],
  [
    'zero timeout',
    safeOwnedWorkflow.replace('timeout-minutes: 5', 'timeout-minutes: 0'),
    /finite timeout-minutes/u,
  ],
  [
    'missing hardening',
    safeOwnedWorkflow.replace(
      `step-security/harden-runner@${hardenRunnerSha}`,
      `actions/checkout@${checkoutSha}`,
    ),
    /must start with full-SHA step-security/u,
  ],
  [
    'early executable',
    safeOwnedWorkflow.replace(
      '    steps:\n',
      '    steps:\n      - name: Unsafe early step\n        run: echo unsafe\n',
    ),
    /harden the runner before executable/u,
  ],
  [
    'audit egress',
    safeOwnedWorkflow.replace('egress-policy: block', 'egress-policy: audit'),
    /must block egress/u,
  ],
  [
    'missing endpoint key',
    safeOwnedWorkflow.replace('          allowed-endpoints: >-', '          endpoints: >-'),
    /declared allowed-endpoints/u,
  ],
  [
    'empty endpoints',
    safeOwnedWorkflow.replace(
      '          allowed-endpoints: >-\n            github.com:443\n            api.github.com:443',
      '          allowed-endpoints: >-',
    ),
    /concrete host:port/u,
  ],
  [
    'invalid endpoint',
    safeOwnedWorkflow.replace('github.com:443', 'https://github.com'),
    /concrete host:port/u,
  ],
  [
    'mutable reusable',
    safeReusableWorkflow.replace(`@${checkoutSha}`, '@main'),
    /full 40-character commit SHA/u,
  ],
  [
    'unreasoned reusable',
    safeReusableWorkflow.replace('    # reason: the pinned upstream scanner owns its runner\n', ''),
    /versioned reusable-workflow exception and reason/u,
  ],
])('rejects %s', (_name, source, diagnostic) => {
  expect(() => validateWorkflowSource(source, 'fixture.yml')).toThrowError(diagnostic);
});

it('parses the default repository workflow directory', () => {
  expect(parseWorkflowArguments([])).toMatch(/\.github\/workflows$/u);
});

it('resolves an explicit workflow directory', () => {
  expect(parseWorkflowArguments(['--workflows-dir', 'fixtures'])).toMatch(/\/fixtures$/u);
});

it.each([
  [['--workflows-dir'], /usage/u],
  [['--unknown', 'fixtures'], /usage/u],
  [['--workflows-dir', 'a', '--workflows-dir', 'b'], /usage/u],
])('rejects invalid CLI arguments %#', (arguments_, diagnostic) => {
  expect(() => parseWorkflowArguments(arguments_)).toThrowError(diagnostic);
});

it('discovers only sorted YAML files and validates every one', async () => {
  const reads = [];
  const files = await checkWorkflows({
    workflowsDirectory: '/fixture',
    listDirectory: async () => [
      aFile('z.yaml'),
      aFile('ignored.txt'),
      aFile('directory.yml', false),
      aFile('a.yml'),
    ],
    readText: async (path, encoding) => {
      reads.push([path, encoding]);
      return safeOwnedWorkflow;
    },
  });

  expect(files).toEqual(['a.yml', 'z.yaml']);
  expect(reads).toEqual([
    ['/fixture/a.yml', 'utf8'],
    ['/fixture/z.yaml', 'utf8'],
  ]);
});

it('fails closed when a workflow directory contains no YAML file', async () => {
  await expect(
    checkWorkflows({
      workflowsDirectory: '/fixture',
      listDirectory: async () => [aFile('README.md')],
      readText: async () => safeOwnedWorkflow,
    }),
  ).rejects.toThrowError('no workflow files found in /fixture');
});

it('writes one deterministic CLI success record', async () => {
  const writes = [];
  const files = await runWorkflowCli({
    arguments_: ['--workflows-dir', '/fixture'],
    stdout: { write: (value) => writes.push(value) },
    listDirectory: async () => [aFile('fixture.yml')],
    readText: async () => safeOwnedWorkflow,
  });

  expect(files).toEqual(['fixture.yml']);
  expect(writes).toEqual(['GATE workflows: PASS (1 workflow files)\n']);
});
