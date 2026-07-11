// @spec:018-project-integrity-hardening
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');

const currentHeadSha = '1111111111111111111111111111111111111111';
const currentBaseSha = '2222222222222222222222222222222222222222';
const staleHeadSha = '3333333333333333333333333333333333333333';
const digestA = 'a'.repeat(64);
const digestB = 'b'.repeat(64);
const subjectPath = path.join(__dirname, 'review-evidence.cjs');
const workflowPath = path.join(__dirname, '..', 'workflows', 'review-evidence.yml');
const requiredPacketPaths = [
  'MANIFEST.md',
  'constitutional-surface.md',
  'diff.patch',
  'diff.stat',
  'feature.feature',
  'gates-output.txt',
  'review-metadata.json',
  'scenario-ids.txt',
  'spec.md',
];

function loadSubject() {
  return require(subjectPath);
}

function aPassingAttestation(overrides = {}) {
  return {
    schemaVersion: 1,
    repository: 'kimen-dev/kimen',
    pullRequest: 42,
    headSha: currentHeadSha,
    baseSha: currentBaseSha,
    packetSha256: digestA,
    reportSha256: digestB,
    reviewer: 'trusted-clean-context-reviewer',
    round: 1,
    verdict: 'pass',
    openCritical: 0,
    openImportant: 0,
    ...overrides,
  };
}

function aPacketManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    baseSha: currentBaseSha,
    headSha: currentHeadSha,
    files: requiredPacketPaths.map((packetPath, index) => ({
      path: packetPath,
      size: index + 1,
      sha256: ((index % 6) + 4).toString(16).repeat(64),
    })),
    ...overrides,
  };
}

function aPacketHandoff(manifest = aPacketManifest(), sourceOverride) {
  const source = sourceOverride ?? Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8');
  return {
    attestation: aPassingAttestation({
      packetSha256: createHash('sha256').update(source).digest('hex'),
    }),
    manifest,
    manifestBase64: source.toString('base64'),
  };
}

function currentRequiredChecks(overrides = {}) {
  return [
    {
      context: 'gates',
      headSha: currentHeadSha,
      integrationId: 15368,
      status: 'success',
      ...overrides,
    },
    {
      context: 'semgrep',
      headSha: currentHeadSha,
      integrationId: 15368,
      status: 'success',
    },
  ];
}

function anEvaluation(overrides = {}) {
  return {
    currentRevision: {
      repository: 'kimen-dev/kimen',
      pullRequest: 42,
      headSha: currentHeadSha,
      baseSha: currentBaseSha,
    },
    attestation: aPassingAttestation(),
    requiredChecks: currentRequiredChecks(),
    trustedReviewers: ['trusted-clean-context-reviewer'],
    ...overrides,
  };
}

function aCurrentPullRequest() {
  return {
    number: 42,
    state: 'open',
    head: { sha: currentHeadSha },
    base: {
      sha: currentBaseSha,
      ref: 'main',
      repo: { full_name: 'kimen-dev/kimen' },
    },
  };
}

function aWorkflowEnvironment(overrides = {}) {
  return {
    GITHUB_ACTOR: 'MarsGotta',
    GITHUB_API_URL: 'https://api.github.test',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'kimen-dev/kimen',
    GITHUB_TOKEN: 'test-token',
    KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify({
      'clean-context-review': 15368,
      gates: 15368,
      semgrep: 44001,
    }),
    KIMEN_FOUNDER_LOGIN: 'MarsGotta',
    KIMEN_TRUSTED_REVIEWERS_JSON: JSON.stringify(['trusted-clean-context-reviewer']),
    ...overrides,
  };
}

function aDispatchEvent(overrides = {}) {
  const packet = aPacketHandoff();
  return {
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(packet.attestation),
      packet_manifest_base64: packet.manifestBase64,
    },
    repository: { full_name: 'kimen-dev/kimen' },
    ...overrides,
  };
}

function aPendingReviewCheck() {
  return {
    id: 99,
    name: 'clean-context-review',
    head_sha: currentHeadSha,
    status: 'in_progress',
    conclusion: null,
    external_id: `clean-context-review:pr:42:${currentHeadSha}`,
    app: { id: 15368 },
  };
}

function evaluate(payload) {
  const result = spawnSync(process.execPath, [subjectPath, 'evaluate'], {
    encoding: 'utf8',
    input: `${JSON.stringify(payload)}\n`,
  });
  const stdout = result.stdout.trim();

  assert.notEqual(
    stdout,
    '',
    `review evidence must emit one JSON decision; stderr:\n${result.stderr}`,
  );

  return {
    decision: JSON.parse(stdout),
    exitCode: result.status,
  };
}

test('S2 @spec:018-project-integrity-hardening accepts a passing attestation for the current SHA', () => {
  const result = evaluate(anEvaluation());

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.decision, {
    status: 'success',
    headSha: currentHeadSha,
    reasons: [],
  });
});

test('S2 @spec:018-project-integrity-hardening keeps missing review evidence pending', () => {
  const result = evaluate(anEvaluation({ attestation: null }));

  assert.equal(result.exitCode, 2);
  assert.equal(result.decision.status, 'pending');
  assert.equal(result.decision.headSha, currentHeadSha);
  assert.match(result.decision.reasons.join('\n'), /missing review attestation/i);
});

test('S2 @spec:018-project-integrity-hardening rejects an attestation for an older SHA', () => {
  const result = evaluate(
    anEvaluation({
      attestation: aPassingAttestation({ headSha: staleHeadSha }),
    }),
  );

  assert.equal(result.exitCode, 2);
  assert.equal(result.decision.status, 'pending');
  assert.equal(result.decision.headSha, currentHeadSha);
  assert.match(result.decision.reasons.join('\n'), /head SHA.*current/i);
});

test('S2 @spec:018-project-integrity-hardening rejects a failing required check on the current SHA', () => {
  const result = evaluate(
    anEvaluation({
      requiredChecks: currentRequiredChecks({ status: 'failure' }),
    }),
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'failure');
  assert.equal(result.decision.headSha, currentHeadSha);
  assert.match(result.decision.reasons.join('\n'), /gates.*failure/i);
});

test('S2 @spec:018-project-integrity-hardening rejects pass attestations with open critical findings', () => {
  const result = evaluate(
    anEvaluation({
      attestation: aPassingAttestation({ openCritical: 1 }),
    }),
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'failure');
  assert.match(result.decision.reasons.join('\n'), /openCritical.*zero/i);
});

test('S2 @spec:018-project-integrity-hardening rejects pass attestations with open important findings', () => {
  const result = evaluate(
    anEvaluation({
      attestation: aPassingAttestation({ openImportant: 1 }),
    }),
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'failure');
  assert.match(result.decision.reasons.join('\n'), /openImportant.*zero/i);
});

test('S2 @spec:018-project-integrity-hardening rejects unknown attestation fields', () => {
  const result = evaluate(
    anEvaluation({
      attestation: aPassingAttestation({ unsignedExtension: true }),
    }),
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'failure');
  assert.match(result.decision.reasons.join('\n'), /unknown.*unsignedExtension/i);
});

test('S2 @spec:018-project-integrity-hardening binds repository, PR and base SHA', () => {
  for (const [field, value] of [
    ['repository', 'attacker/example'],
    ['pullRequest', 43],
    ['baseSha', staleHeadSha],
  ]) {
    const result = evaluate(
      anEvaluation({
        attestation: aPassingAttestation({ [field]: value }),
      }),
    );

    assert.notEqual(result.exitCode, 0, `${field} mismatch must not pass`);
    assert.notEqual(result.decision.status, 'success');
    assert.match(result.decision.reasons.join('\n'), new RegExp(field, 'i'));
  }
});

test('S2 @spec:018-project-integrity-hardening validates digests, reviewer and round', () => {
  const mutations = [
    ['packetSha256', 'not-a-digest'],
    ['reportSha256', 'c'.repeat(63)],
    ['reviewer', 'untrusted-reviewer'],
    ['round', 3],
  ];

  for (const [field, value] of mutations) {
    const result = evaluate(
      anEvaluation({
        attestation: aPassingAttestation({ [field]: value }),
      }),
    );

    assert.equal(result.exitCode, 1, `${field} must fail closed`);
    assert.equal(result.decision.status, 'failure');
    assert.match(result.decision.reasons.join('\n'), new RegExp(field, 'i'));
  }
});

test('S2 @spec:018-project-integrity-hardening keeps a current queued check pending', () => {
  const result = evaluate(
    anEvaluation({
      requiredChecks: currentRequiredChecks({ status: 'pending' }),
    }),
  );

  assert.equal(result.exitCode, 2);
  assert.equal(result.decision.status, 'pending');
  assert.match(result.decision.reasons.join('\n'), /gates.*pending/i);
});

test('S2 @spec:018-project-integrity-hardening keeps a stale required check pending', () => {
  const result = evaluate(
    anEvaluation({
      requiredChecks: currentRequiredChecks({ headSha: staleHeadSha }),
    }),
  );

  assert.equal(result.exitCode, 2);
  assert.equal(result.decision.status, 'pending');
  assert.match(result.decision.reasons.join('\n'), /gates.*head SHA.*current/i);
});

function mockResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

test('S2 @spec:018-project-integrity-hardening creates a pending Check Run on the exact head', async () => {
  const calls = [];
  const { createCheckRunController } = loadSubject();
  const controller = createCheckRunController({
    token: 'test-token',
    apiBaseUrl: 'https://api.github.test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return mockResponse(201, {
        id: 99,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'in_progress',
        conclusion: null,
      });
    },
  });

  const result = await controller.pending({
    repository: 'kimen-dev/kimen',
    pullRequest: 42,
    headSha: currentHeadSha,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.test/repos/kimen-dev/kimen/check-runs');
  assert.equal(calls[0].options.method, 'POST');
  assert.match(calls[0].options.headers.Authorization, /^Bearer /);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: 'clean-context-review',
    head_sha: currentHeadSha,
    status: 'in_progress',
    external_id: `clean-context-review:pr:42:${currentHeadSha}`,
    output: {
      title: 'Clean-context review pending',
      summary: `Waiting for founder-controlled review evidence for PR #42 at ${currentHeadSha}.`,
    },
  });
  assert.deepEqual(result, {
    id: 99,
    name: 'clean-context-review',
    headSha: currentHeadSha,
    status: 'in_progress',
    conclusion: null,
  });
});

test('S2 @spec:018-project-integrity-hardening completes only the Check Run bound to the current head', async () => {
  const calls = [];
  const { createCheckRunController } = loadSubject();
  const controller = createCheckRunController({
    token: 'test-token',
    apiBaseUrl: 'https://api.github.test',
    now: () => new Date('2026-07-09T12:00:00.000Z'),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === 'GET') {
        return mockResponse(200, {
          id: 99,
          name: 'clean-context-review',
          head_sha: currentHeadSha,
          status: 'in_progress',
          conclusion: null,
        });
      }
      return mockResponse(200, {
        id: 99,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
      });
    },
  });

  const result = await controller.complete({
    repository: 'kimen-dev/kimen',
    checkRunId: 99,
    evaluation: anEvaluation(),
  });

  assert.deepEqual(
    calls.map(({ options }) => options.method),
    ['GET', 'PATCH'],
  );
  const completion = JSON.parse(calls[1].options.body);
  assert.equal(completion.status, 'completed');
  assert.equal(completion.conclusion, 'success');
  assert.equal(completion.completed_at, '2026-07-09T12:00:00.000Z');
  assert.equal(result.decision.status, 'success');
  assert.equal(result.checkRun.headSha, currentHeadSha);
});

test('S2 @spec:018-project-integrity-hardening never updates a stale Check Run', async () => {
  const calls = [];
  const { createCheckRunController } = loadSubject();
  const controller = createCheckRunController({
    token: 'test-token',
    apiBaseUrl: 'https://api.github.test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return mockResponse(200, {
        id: 99,
        name: 'clean-context-review',
        head_sha: staleHeadSha,
        status: 'in_progress',
        conclusion: null,
      });
    },
  });

  await assert.rejects(
    controller.complete({
      repository: 'kimen-dev/kimen',
      checkRunId: 99,
      evaluation: anEvaluation(),
    }),
    /Check Run head SHA.*current/i,
  );
  assert.deepEqual(
    calls.map(({ options }) => options.method),
    ['GET'],
  );
});

test('S2 @spec:018-project-integrity-hardening reads break-glass markers as data', (t) => {
  const fixtureDirectory = mkdtempSync(path.join(tmpdir(), 'kimen-break-glass-'));
  t.after(() => rmSync(fixtureDirectory, { force: true, recursive: true }));
  const eventPath = path.join(fixtureDirectory, 'event.json');
  const shellSentinel = path.join(fixtureDirectory, 'must-not-exist');
  writeFileSync(
    eventPath,
    JSON.stringify({
      repository: { full_name: 'kimen-dev/kimen' },
      pull_request: {
        number: 42,
        user: { login: 'marsgotta' },
        head: { sha: currentHeadSha },
        labels: [{ name: 'break-glass' }],
        body: [
          '<!-- break-glass-justification -->',
          `Scanner outage; $(touch ${shellSentinel}) must remain inert text.`,
          '<!-- break-glass-restoration-issue -->',
          'https://github.com/kimen-dev/kimen/issues/123',
        ].join('\n'),
      },
    }),
  );

  const result = spawnSync(process.execPath, [subjectPath, 'validate-break-glass-event'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTOR: 'marsgotta',
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REPOSITORY: 'kimen-dev/kimen',
      KIMEN_FOUNDER_LOGIN: 'marsgotta',
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { status: 'valid', reasons: [] });
  assert.equal(existsSync(shellSentinel), false, 'PR body text must never execute');
});

test('S2 @spec:018-project-integrity-hardening parses the checked-in break-glass template exactly', () => {
  const { breakGlassPayloadFromEvent, validateBreakGlass } = loadSubject();
  const template = readFileSync(path.join(__dirname, '..', 'PULL_REQUEST_TEMPLATE.md'), 'utf8');
  const body = template
    .replace(
      '<!-- break-glass-justification -->\n\n',
      '<!-- break-glass-justification -->\nScanner outage blocks an urgent security patch.\n',
    )
    .replace(
      '<!-- break-glass-restoration-issue -->\n\n',
      '<!-- break-glass-restoration-issue -->\nhttps://github.com/kimen-dev/kimen/issues/123\n',
    );
  const payload = breakGlassPayloadFromEvent(
    {
      repository: { full_name: 'kimen-dev/kimen' },
      pull_request: {
        number: 42,
        user: { login: 'marsgotta' },
        head: { sha: currentHeadSha },
        labels: [{ name: 'break-glass' }],
        body,
      },
    },
    {
      GITHUB_ACTOR: 'marsgotta',
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_REPOSITORY: 'kimen-dev/kimen',
      KIMEN_FOUNDER_LOGIN: 'marsgotta',
    },
  );

  assert.equal(payload.request.justification, 'Scanner outage blocks an urgent security patch.');
  assert.equal(payload.request.restorationIssue, 'https://github.com/kimen-dev/kimen/issues/123');
  assert.deepEqual(validateBreakGlass(payload), { status: 'valid', reasons: [] });
});

test('S2 @spec:018-project-integrity-hardening keeps repository policy outside the event body', () => {
  const { breakGlassPayloadFromEvent, validateBreakGlass } = loadSubject();
  const payload = breakGlassPayloadFromEvent(
    {
      repository: { full_name: 'attacker/example' },
      pull_request: {
        number: 42,
        user: { login: 'marsgotta' },
        head: { sha: currentHeadSha },
        labels: [{ name: 'break-glass' }],
        body: [
          '<!-- break-glass-justification -->',
          'An event cannot replace the trusted repository policy.',
          '<!-- break-glass-restoration-issue -->',
          'https://github.com/kimen-dev/kimen/issues/123',
        ].join('\n'),
      },
    },
    {
      GITHUB_ACTOR: 'marsgotta',
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_REPOSITORY: 'kimen-dev/kimen',
      KIMEN_FOUNDER_LOGIN: 'marsgotta',
    },
  );

  const result = validateBreakGlass(payload);
  assert.equal(result.status, 'invalid');
  assert.match(result.reasons.join('\n'), /repository.*trusted policy/i);
});

test('S2 @spec:018-project-integrity-hardening creates pending evidence for the API-current PR head', async () => {
  const apiCalls = [];
  const pendingCalls = [];
  const { runReviewEvidenceWorkflow } = loadSubject();
  const event = {
    action: 'opened',
    repository: { full_name: 'kimen-dev/kimen' },
    pull_request: {
      number: 42,
      head: { sha: staleHeadSha },
      base: { sha: staleHeadSha },
    },
  };
  const controller = {
    async pending(input) {
      pendingCalls.push(input);
      return { id: 99, ...input };
    },
  };

  const result = await runReviewEvidenceWorkflow({
    controller,
    env: aWorkflowEnvironment({
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_REF: 'refs/pull/42/merge',
      KIMEN_REVIEW_MODE: 'pending',
    }),
    eventPayload: event,
    fetchImpl: async (url, options) => {
      apiCalls.push({ url, options });
      return mockResponse(200, aCurrentPullRequest());
    },
  });

  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].url, 'https://api.github.test/repos/kimen-dev/kimen/pulls/42');
  assert.equal(apiCalls[0].options.method, 'GET');
  assert.deepEqual(pendingCalls, [
    {
      repository: 'kimen-dev/kimen',
      pullRequest: 42,
      headSha: currentHeadSha,
    },
  ]);
  assert.equal(result.headSha, currentHeadSha);
});

test('S2 @spec:018-project-integrity-hardening completes from current GitHub state and trusted policy only', async () => {
  const apiCalls = [];
  const completionCalls = [];
  const responses = [
    aCurrentPullRequest(),
    {
      total_count: 4,
      check_runs: [
        {
          id: 10,
          name: 'gates',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 666 },
        },
        {
          id: 11,
          name: 'gates',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 15368 },
        },
        {
          id: 12,
          name: 'semgrep',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 44001 },
        },
        aPendingReviewCheck(),
      ],
    },
  ];
  const controller = {
    async complete(input) {
      completionCalls.push(input);
      return { checkRun: { id: input.checkRunId }, decision: { status: 'success' } };
    },
  };
  const { runReviewEvidenceWorkflow } = loadSubject();

  const result = await runReviewEvidenceWorkflow({
    controller,
    env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
    eventPayload: aDispatchEvent(),
    fetchImpl: async (url, options) => {
      apiCalls.push({ url, options });
      return mockResponse(200, responses.shift());
    },
  });

  assert.equal(apiCalls.length, 2);
  assert.equal(apiCalls[0].url, 'https://api.github.test/repos/kimen-dev/kimen/pulls/42');
  assert.match(apiCalls[1].url, /\/commits\/1111111111111111111111111111111111111111\/check-runs/);
  assert.equal(completionCalls.length, 1);
  assert.equal(completionCalls[0].repository, 'kimen-dev/kimen');
  assert.equal(completionCalls[0].checkRunId, 99);
  assert.deepEqual(completionCalls[0].evaluation.currentRevision, {
    repository: 'kimen-dev/kimen',
    pullRequest: 42,
    headSha: currentHeadSha,
    baseSha: currentBaseSha,
  });
  assert.deepEqual(completionCalls[0].evaluation.requiredChecks, [
    {
      context: 'gates',
      headSha: currentHeadSha,
      integrationId: 15368,
      status: 'success',
    },
    {
      context: 'semgrep',
      headSha: currentHeadSha,
      integrationId: 44001,
      status: 'success',
    },
  ]);
  assert.deepEqual(completionCalls[0].evaluation.trustedReviewers, [
    'trusted-clean-context-reviewer',
  ]);
  assert.deepEqual(completionCalls[0].evaluation.attestation, aPacketHandoff().attestation);
  assert.equal(result.checkRun.id, 99);
});

test('S2 @spec:018-project-integrity-hardening refuses an attested packet digest without the packet manifest bytes', async () => {
  const responses = [
    aCurrentPullRequest(),
    {
      total_count: 3,
      check_runs: [
        {
          id: 11,
          name: 'gates',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 15368 },
        },
        {
          id: 12,
          name: 'semgrep',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 44001 },
        },
        aPendingReviewCheck(),
      ],
    },
  ];
  let completionAttempted = false;
  const controller = {
    async complete() {
      completionAttempted = true;
      return { checkRun: { id: 99 }, decision: { status: 'success' } };
    },
  };
  const { runReviewEvidenceWorkflow } = loadSubject();
  const event = aDispatchEvent();
  delete event.inputs.packet_manifest_base64;

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller,
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => mockResponse(200, responses.shift()),
    }),
    /packet manifest.*required/i,
  );
  assert.equal(
    completionAttempted,
    false,
    'an unverified packet digest must never complete the check',
  );
});

test('S2 @spec:018-project-integrity-hardening rejects a packet manifest whose bytes do not match the attested digest', async () => {
  const packet = aPacketHandoff();
  const event = aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(aPassingAttestation({ packetSha256: digestA })),
      packet_manifest_base64: packet.manifestBase64,
    },
  });
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {
        async complete() {
          throw new Error('completion must remain unreachable');
        },
      },
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
    }),
    /packet manifest.*digest.*attestation/i,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects non-canonical packet manifest bytes even when their digest matches', async () => {
  const manifest = aPacketManifest();
  const nonCanonicalSource = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const packet = aPacketHandoff(manifest, nonCanonicalSource);
  const event = aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(packet.attestation),
      packet_manifest_base64: packet.manifestBase64,
    },
  });
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {},
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
    }),
    /packet manifest.*canonical/i,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects a packet manifest not bound to the live review range', async () => {
  const packet = aPacketHandoff(aPacketManifest({ headSha: staleHeadSha }));
  const event = aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(packet.attestation),
      packet_manifest_base64: packet.manifestBase64,
    },
  });
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {},
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
    }),
    /packet manifest.*headSha.*current/i,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects malformed packet file entries through the controlled validator boundary', async () => {
  const validManifest = aPacketManifest();
  const packet = aPacketHandoff(aPacketManifest({ files: [null, ...validManifest.files] }));
  const event = aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(packet.attestation),
      packet_manifest_base64: packet.manifestBase64,
    },
  });
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {},
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
    }),
    /packet manifest files\[0\].*object/i,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects same-name checks from the wrong GitHub App', async () => {
  const responses = [
    aCurrentPullRequest(),
    {
      total_count: 3,
      check_runs: [
        {
          id: 10,
          name: 'gates',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 666 },
        },
        {
          id: 12,
          name: 'semgrep',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 44001 },
        },
        aPendingReviewCheck(),
      ],
    },
  ];
  const controller = {
    async complete() {
      throw new Error('completion must not run for an untrusted App');
    },
  };
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller,
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: aDispatchEvent(),
      fetchImpl: async () => mockResponse(200, responses.shift()),
    }),
    /gates.*pending/i,
  );
});

test('S2 @spec:018-project-integrity-hardening never completes a review Check Run from the wrong GitHub App', async () => {
  const responses = [
    aCurrentPullRequest(),
    {
      total_count: 3,
      check_runs: [
        {
          id: 11,
          name: 'gates',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 15368 },
        },
        {
          id: 12,
          name: 'semgrep',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: 44001 },
        },
        { ...aPendingReviewCheck(), app: { id: 666 } },
      ],
    },
  ];
  const controller = {
    async complete() {
      throw new Error('completion must not run for an untrusted review App');
    },
  };
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller,
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: aDispatchEvent(),
      fetchImpl: async () => mockResponse(200, responses.shift()),
    }),
    /missing current clean-context-review.*trusted GitHub App/i,
  );
});

test('S2 @spec:018-project-integrity-hardening never accepts required checks or reviewers from dispatch inputs', async () => {
  const { runReviewEvidenceWorkflow } = loadSubject();
  const event = aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(aPassingAttestation()),
      requiredChecks: JSON.stringify(currentRequiredChecks()),
      trustedReviewers: JSON.stringify(['attacker-controlled-reviewer']),
    },
  });

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {},
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: event,
      fetchImpl: async () => {
        throw new Error('GitHub must not be queried for invalid dispatch inputs');
      },
    }),
    /unknown.*requiredChecks|unknown.*trustedReviewers/i,
  );
});

test('S2 @spec:018-project-integrity-hardening permits completion only for the founder on main', async () => {
  const { runReviewEvidenceWorkflow } = loadSubject();

  await assert.rejects(
    runReviewEvidenceWorkflow({
      controller: {},
      env: aWorkflowEnvironment({
        GITHUB_ACTOR: 'repository-admin',
        GITHUB_REF: 'refs/heads/attacker-branch',
        KIMEN_REVIEW_MODE: 'complete',
      }),
      eventPayload: aDispatchEvent(),
      fetchImpl: async () => {
        throw new Error('GitHub must not be queried for unauthorized dispatch');
      },
    }),
    /founder|refs\/heads\/main/i,
  );
});

test('S2 @spec:018-project-integrity-hardening keeps the review workflow trusted, SHA-pinned and least-privilege', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  const pendingJob = /\n {2}pending:\n([\s\S]*?)\n {2}complete:/.exec(workflow)?.[1] ?? '';

  assert.match(
    workflow,
    /pull_request_target:\s*\n\s*types:\s*\[opened, reopened, synchronize, ready_for_review\]/,
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /packet_manifest_base64:/);
  assert.match(workflow, /checks:\s*write/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pull-requests:\s*read/);
  assert.doesNotMatch(workflow, /write-all|contents:\s*write|pull-requests:\s*write/);
  assert.match(workflow, /step-security\/harden-runner@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /^\s*uses:\s+[^@\s]+@(?![0-9a-f]{40}\b)/gm);
  assert.match(workflow, /ref:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow, /ref:\s*refs\/heads\/main/);
  assert.match(workflow, /github\.actor\s*==\s*'MarsGotta'/);
  assert.match(pendingJob, /github\.repository\s*==\s*'kimen-dev\/kimen'/);
  assert.match(pendingJob, /github\.event\.pull_request\.base\.ref\s*==\s*'main'/);
  assert.match(workflow, /github\.ref\s*==\s*'refs\/heads\/main'/);
  assert.doesNotMatch(workflow, /\$\{\{\s*(?:inputs|github\.event\.inputs)\./);
  assert.match(workflow, /review-evidence\.cjs review-workflow/);
});
