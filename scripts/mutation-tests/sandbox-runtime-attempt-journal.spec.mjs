import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it, onTestFinished } from 'vitest';

import {
  AttemptJournalError,
  dispatchAttemptJournal,
  runAttemptJournalCli,
} from '../../sandbox/attempt-journal.mjs';

const journalUrl = new URL('../../sandbox/attempt-journal.mjs', import.meta.url);
const baseSha = 'a'.repeat(40);
const taskSha256 = 'b'.repeat(64);

// @spec:018-project-integrity-hardening#S5

const outputBuffer = () => ({
  value: '',
  write(chunk) {
    this.value += String(chunk);
    return true;
  },
});

const captureJournalError = (callback) => {
  try {
    callback();
  } catch (error) {
    if (error instanceof AttemptJournalError) return error;
    throw error;
  }
  throw new Error('expected AttemptJournalError');
};

const createFixture = async (attemptId = 'attempt-1') => {
  const parent = await realpath(await mkdtemp(join(tmpdir(), 'kimen-attempt-journal-mutation-')));
  onTestFinished(() => rm(parent, { recursive: true, force: true }));
  await chmod(parent, 0o700);
  const repo = join(parent, 'kimen-loop-fixture');
  const root = join(parent, 'journal');
  await mkdir(repo, { mode: 0o700 });
  const stdout = outputBuffer();
  dispatchAttemptJournal({
    arguments_: ['init', root, repo, attemptId, baseSha, taskSha256],
    stdout,
  });
  const directory = join(root, attemptId);
  return {
    attemptId,
    directory,
    parent,
    repo,
    root,
    statePath: join(directory, 'state.json'),
    stdout,
  };
};

const update = (fixture, operation, values = [], environment = {}) =>
  dispatchAttemptJournal({
    arguments_: ['update', fixture.root, fixture.attemptId, operation, ...values],
    environment,
  });

const readState = async (fixture) => JSON.parse(await readFile(fixture.statePath, 'utf8'));

const writeState = (fixture, state) =>
  writeFile(fixture.statePath, `${JSON.stringify(state, null, 2)}\n`);

const attachEvidence = async (fixture, overrides = {}) => {
  const attempts = join(fixture.repo, '.kimen', 'attempts');
  await mkdir(attempts, { recursive: true, mode: 0o700 });
  await chmod(join(fixture.repo, '.kimen'), 0o700);
  await chmod(attempts, 0o700);
  await writeFile(
    join(attempts, `${fixture.attemptId}.json`),
    `${JSON.stringify({ attemptId: fixture.attemptId, baseSha, taskSha256, ...overrides })}\n`,
    { mode: 0o600 },
  );
};

it('imports the attempt journal without dispatching the CLI and exposes a capturable boundary', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      [
        `const journal = await import(${JSON.stringify(journalUrl.href)});`,
        "if (typeof journal.dispatchAttemptJournal !== 'function') process.exit(70);",
      ].join('\n'),
    ],
    { encoding: 'utf8' },
  );

  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
});

it('keeps CLI diagnostics and exit codes while library failures stay capturable', () => {
  const stdout = outputBuffer();
  const stderr = outputBuffer();

  expect(runAttemptJournalCli({ arguments_: [], stderr, stdout })).toBe(64);
  expect(stderr.value).toBe(
    'attempt-journal: usage: attempt-journal.mjs <init|update|get|scan|validate> ...\n',
  );
  expect(stdout.value).toBe('');

  const error = captureJournalError(() =>
    dispatchAttemptJournal({
      arguments_: ['validate'],
      environment: { KIMEN_JOURNAL_NOW_MS_TEST: '1' },
    }),
  );
  expect(error.exitCode).toBe(64);
  expect(error.message).toBe('journal clock override requires explicit test mode');
});

it.each([
  [],
  ['/journal'],
  ['/journal', '/repo'],
  ['/journal', '/repo', 'attempt'],
  ['/journal', '/repo', 'attempt', baseSha],
])('rejects incomplete init arguments %# before touching the filesystem', (...arguments_) => {
  const error = captureJournalError(() =>
    dispatchAttemptJournal({ arguments_: ['init', ...arguments_] }),
  );

  expect(error.exitCode).toBe(64);
  expect(error.message).toBe('init requires root repo attempt base taskSha256');
});

it.each([
  [],
  ['/journal'],
  ['/journal', 'attempt'],
])('rejects incomplete update arguments %# before loading a journal', (...arguments_) => {
  const error = captureJournalError(() =>
    dispatchAttemptJournal({ arguments_: ['update', ...arguments_] }),
  );

  expect(error.exitCode).toBe(64);
  expect(error.message).toBe('update requires root attempt operation');
});

it.each([
  [],
  ['/journal'],
  ['/journal', 'attempt'],
])('rejects incomplete get arguments %# before loading a journal', (...arguments_) => {
  const error = captureJournalError(() =>
    dispatchAttemptJournal({ arguments_: ['get', ...arguments_], stdout: outputBuffer() }),
  );

  expect(error.exitCode).toBe(64);
  expect(error.message).toBe('get requires root attempt field');
});

it('initializes one private immutable binding and permits only an idempotent replay', async () => {
  const fixture = await createFixture();
  const anchor = JSON.parse(await readFile(join(fixture.directory, 'anchor.json'), 'utf8'));
  const state = await readState(fixture);

  expect(fixture.stdout.value).toBe(`${fixture.directory}\n`);
  expect(anchor).toEqual({
    schemaVersion: 1,
    attemptId: fixture.attemptId,
    repoPath: fixture.repo,
    baseSha,
    taskSha256,
  });
  expect(state).toMatchObject({
    ...anchor,
    imageId: null,
    finalization: 'pending',
    lease: { state: 'none', secretState: 'absent' },
  });
  expect(state.containers).toEqual({
    bootstrap: { state: 'none', id: null, cidFile: null, name: null },
    agent: { state: 'none', id: null, cidFile: null, name: null },
    gates: { state: 'none', id: null, cidFile: null, name: null },
  });

  const replayOutput = outputBuffer();
  dispatchAttemptJournal({
    arguments_: ['init', fixture.root, fixture.repo, fixture.attemptId, baseSha, taskSha256],
    stdout: replayOutput,
  });
  expect(replayOutput.value).toBe(`${fixture.directory}\n`);

  const rebound = captureJournalError(() =>
    dispatchAttemptJournal({
      arguments_: [
        'init',
        fixture.root,
        fixture.repo,
        fixture.attemptId,
        'c'.repeat(40),
        taskSha256,
      ],
    }),
  );
  expect(rebound.message).toBe('attempt id is already bound to different immutable inputs');
});

it('persists the container and lease lifecycle with a deterministic durable expiry bound', async () => {
  const fixture = await createFixture();
  const cidFile = join(fixture.directory, 'bootstrap.cid');
  const secretPath = join(fixture.directory, 'model-lease.json');
  const idFile = join(fixture.directory, 'model-lease.id');
  const clock = { KIMEN_LOOP_TEST_MODE: '1', KIMEN_JOURNAL_NOW_MS_TEST: '1000' };

  update(fixture, 'image', ['sha256:image']);
  update(fixture, 'container-intent', ['bootstrap', cidFile, 'kimen-bootstrap-attempt-1']);
  update(fixture, 'container-id', ['bootstrap', 'container-id-123']);
  update(fixture, 'container-running', ['bootstrap']);
  update(fixture, 'container-destroyed', ['bootstrap']);
  update(fixture, 'lease-intent', [secretPath, idFile]);
  update(fixture, 'lease-acquiring', ['10'], clock);
  update(fixture, 'lease-id', ['lease:id-1']);
  update(fixture, 'secret-destroyed');
  update(fixture, 'lease-revoking');
  update(fixture, 'lease-revoked');
  update(fixture, 'finalized');
  dispatchAttemptJournal({ arguments_: ['validate', fixture.root, fixture.attemptId] });

  const state = await readState(fixture);
  expect(state.imageId).toBe('sha256:image');
  expect(state.containers.bootstrap).toEqual({
    state: 'destroyed',
    id: 'container-id-123',
    cidFile,
    name: 'kimen-bootstrap-attempt-1',
  });
  expect(state.lease).toEqual({
    state: 'revoked',
    leaseId: 'lease:id-1',
    idFile,
    secretPath,
    secretState: 'absent',
    acquireStartedAt: 1000,
    leaseNotAfter: 101_000,
  });
  expect(state.finalization).toBe('complete');

  const stdout = outputBuffer();
  dispatchAttemptJournal({
    arguments_: ['get', fixture.root, fixture.attemptId, 'containers.bootstrap.id'],
    stdout,
  });
  expect(stdout.value).toBe('container-id-123');
});

it('records expiration only at the durable bound and supports cancelling an unstarted intent', async () => {
  const expiring = await createFixture('expiring');
  const expiringSecret = join(expiring.directory, 'model-lease.json');
  const expiringId = join(expiring.directory, 'model-lease.id');
  update(expiring, 'lease-intent', [expiringSecret, expiringId]);
  update(expiring, 'lease-acquiring', ['1'], {
    KIMEN_LOOP_TEST_MODE: '1',
    KIMEN_JOURNAL_NOW_MS_TEST: '2000',
  });

  const early = captureJournalError(() =>
    update(expiring, 'lease-expired', [], {
      KIMEN_LOOP_TEST_MODE: '1',
      KIMEN_JOURNAL_NOW_MS_TEST: '92999',
    }),
  );
  expect(early.message).toBe('cannot assert lease expiry before the durable upper bound');

  update(expiring, 'lease-expired', [], {
    KIMEN_LOOP_TEST_MODE: '1',
    KIMEN_JOURNAL_NOW_MS_TEST: '93000',
  });
  expect((await readState(expiring)).lease).toMatchObject({
    state: 'expired',
    secretState: 'absent',
    acquireStartedAt: 2000,
    leaseNotAfter: 93_000,
  });

  const cancelled = await createFixture('cancelled');
  update(cancelled, 'lease-intent', [
    join(cancelled.directory, 'model-lease.json'),
    join(cancelled.directory, 'model-lease.id'),
  ]);
  update(cancelled, 'lease-cancelled');
  expect((await readState(cancelled)).lease).toMatchObject({
    state: 'cancelled',
    secretState: 'absent',
  });
});

it('rejects invalid lifecycle transitions and paths before rewriting journal state', async () => {
  const fixture = await createFixture();

  expect(captureJournalError(() => update(fixture, 'container-running', ['agent'])).message).toBe(
    'container-running requires a persisted container id',
  );
  expect(
    captureJournalError(() =>
      update(fixture, 'container-intent', [
        'agent',
        join(fixture.parent, 'escaped.cid'),
        'kimen-agent-attempt-1',
      ]),
    ).message,
  ).toContain('journal file escapes attempt directory');
  expect(captureJournalError(() => update(fixture, 'lease-acquiring')).message).toBe(
    'lease-acquiring requires prepared intent',
  );
  expect(captureJournalError(() => update(fixture, 'lease-revoking')).message).toBe(
    'cannot revoke an unidentified lease',
  );
  expect(captureJournalError(() => update(fixture, 'unknown-operation')).exitCode).toBe(64);
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['get', fixture.root, fixture.attemptId, 'missing.field'],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toBe('unknown journal field: missing.field');

  expect((await readState(fixture)).finalization).toBe('pending');
});

it('rejects every invalid timeout class while retaining the prepared lease intent', async () => {
  const fixture = await createFixture();
  update(fixture, 'lease-intent', [
    join(fixture.directory, 'model-lease.json'),
    join(fixture.directory, 'model-lease.id'),
  ]);

  for (const timeout of ['0', '3601', '-1', '1.5', 'not-a-number']) {
    const error = captureJournalError(() => update(fixture, 'lease-acquiring', [timeout]));
    expect(error.exitCode).toBe(64);
    expect(error.message).toBe('invalid agent timeout');
  }
  const environmentError = captureJournalError(() =>
    update(fixture, 'lease-acquiring', [], { KIMEN_AGENT_TIMEOUT_SECONDS: '0' }),
  );
  expect(environmentError.message).toBe('invalid agent timeout');
  expect((await readState(fixture)).lease.state).toBe('prepared');
});

it('rejects malformed operation payloads with their stable CLI usage codes', async () => {
  const fixture = await createFixture();

  expect(captureJournalError(() => update(fixture, 'image')).exitCode).toBe(64);
  expect(captureJournalError(() => update(fixture, 'container-intent', ['agent'])).message).toBe(
    'container-intent requires phase, cid file and name',
  );
  expect(
    captureJournalError(() =>
      update(fixture, 'container-intent', [
        'agent',
        join(fixture.directory, 'agent.cid'),
        'invalid/name',
      ]),
    ).message,
  ).toBe('invalid deterministic container name');
  expect(
    captureJournalError(() => update(fixture, 'container-id', ['agent', 'short'])).message,
  ).toBe('invalid container identity');
  expect(
    captureJournalError(() => update(fixture, 'container-destroyed', ['invalid-phase'])).message,
  ).toBe('invalid container phase');
  expect(captureJournalError(() => update(fixture, 'lease-intent', ['only-secret'])).message).toBe(
    'lease-intent requires secret and id paths',
  );
  expect(captureJournalError(() => update(fixture, 'lease-id', ['bad/id'])).exitCode).toBe(64);
  expect(captureJournalError(() => update(fixture, 'lease-cancelled')).message).toBe(
    'only an unstarted lease intent can be cancelled',
  );
});

it.each([
  [
    'schema',
    (state) => {
      state.schemaVersion = 2;
    },
    'unsupported journal schema',
  ],
  [
    'missing containers',
    (state) => {
      state.containers = null;
    },
    'incomplete journal state',
  ],
  [
    'missing phase',
    (state) => {
      delete state.containers.agent;
    },
    'missing agent container state',
  ],
  [
    'invalid phase state',
    (state) => {
      state.containers.agent.state = 'unknown';
    },
    'invalid agent container state',
  ],
  [
    'invalid container name',
    (state) => {
      state.containers.agent.name = 'invalid/name';
    },
    'invalid agent container name',
  ],
  [
    'missing creating name',
    (state) => {
      state.containers.agent.state = 'creating';
    },
    'missing agent deterministic container name',
  ],
  [
    'missing created id',
    (state) => {
      state.containers.agent.state = 'created';
      state.containers.agent.name = 'kimen-agent-attempt-1';
    },
    'missing agent container id',
  ],
  [
    'missing lease expiry',
    (state) => {
      state.lease.state = 'acquiring';
    },
    'missing durable lease expiry bound',
  ],
  [
    'short lease ttl',
    (state) => {
      state.lease.state = 'acquiring';
      state.lease.acquireStartedAt = 1000;
      state.lease.leaseNotAfter = 91_000;
    },
    'invalid durable lease expiry bound',
  ],
  [
    'long lease ttl',
    (state) => {
      state.lease.state = 'acquiring';
      state.lease.acquireStartedAt = 0;
      state.lease.leaseNotAfter = 3_690_001;
    },
    'invalid durable lease expiry bound',
  ],
])('fails closed on tampered state invariant: %s', async (_label, mutate, expected) => {
  const fixture = await createFixture(`tamper-${_label.replaceAll(' ', '-')}`);
  const state = await readState(fixture);
  mutate(state);
  await writeState(fixture, state);

  const error = captureJournalError(() =>
    dispatchAttemptJournal({ arguments_: ['validate', fixture.root, fixture.attemptId] }),
  );
  expect(error.message).toContain(expected);
});

it('scans only journals with matching evidence and adjacent immutable anchors', async () => {
  const fixture = await createFixture();
  await attachEvidence(fixture);
  const stdout = outputBuffer();

  dispatchAttemptJournal({
    arguments_: ['scan', fixture.root, fixture.parent],
    stdout,
  });

  expect(stdout.value).toBe(`${fixture.directory}\0`);
});

it('rejects mismatched evidence and non-canonical lifecycle sidecar paths during recovery', async () => {
  const evidence = await createFixture('bad-evidence');
  await attachEvidence(evidence, { baseSha: 'c'.repeat(40) });
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['scan', evidence.root, evidence.parent],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toContain('evidence/journal immutable binding mismatch');

  const cid = await createFixture('bad-cid');
  update(cid, 'container-intent', [
    'agent',
    join(cid.directory, 'bootstrap.cid'),
    'kimen-agent-bad-cid',
  ]);
  await attachEvidence(cid);
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['scan', cid.root, cid.parent],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toContain('unexpected agent cid path');

  const lease = await createFixture('bad-lease-sidecars');
  update(lease, 'lease-intent', [
    join(lease.directory, 'wrong-secret.json'),
    join(lease.directory, 'wrong-id'),
  ]);
  await attachEvidence(lease);
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['scan', lease.root, lease.parent],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toContain('unexpected lease id path');
});

it('requires the exact adjacent anchor before recovery can return a journal', async () => {
  const fixture = await createFixture('missing-anchor');
  await attachEvidence(fixture);
  await rm(join(fixture.parent, '.kimen-loop-fixture.attempt-missing-anchor.anchor'));

  const error = captureJournalError(() =>
    dispatchAttemptJournal({
      arguments_: ['scan', fixture.root, fixture.parent],
      stdout: outputBuffer(),
    }),
  );
  expect(error.message).toContain('lifecycle journal has no adjacent anchor');
});

it('fails closed on an orphan journal file or missing attempt evidence', async () => {
  const orphan = await createFixture('orphan');
  await writeFile(join(orphan.directory, 'unexpected.txt'), 'unexpected\n', { mode: 0o600 });
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['scan', orphan.root, orphan.parent],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toContain('orphan or unsafe lifecycle-journal file');

  const missingEvidence = await createFixture('missing-evidence');
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['scan', missingEvidence.root, missingEvidence.parent],
        stdout: outputBuffer(),
      }),
    ).message,
  ).toContain('lifecycle journal has no evidence');
});

it('rejects tampered bindings, invalid JSON, and unsafe journal permissions', async () => {
  const binding = await createFixture('binding');
  const bindingState = await readState(binding);
  bindingState.baseSha = 'c'.repeat(40);
  await writeFile(binding.statePath, `${JSON.stringify(bindingState)}\n`);
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({ arguments_: ['validate', binding.root, binding.attemptId] }),
    ).message,
  ).toContain('anchor/state mismatch for baseSha');

  const invalidJson = await createFixture('invalid-json');
  await writeFile(invalidJson.statePath, '{broken\n');
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['validate', invalidJson.root, invalidJson.attemptId],
      }),
    ).message,
  ).toContain('invalid JSON');

  const unsafeMode = await createFixture('unsafe-mode');
  await chmod(unsafeMode.statePath, 0o644);
  expect(
    captureJournalError(() =>
      dispatchAttemptJournal({
        arguments_: ['validate', unsafeMode.root, unsafeMode.attemptId],
      }),
    ).message,
  ).toContain('unsafe permissions');
});
