import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, onTestFinished } from 'vitest';

// @spec:018-project-integrity-hardening

const require = createRequire(import.meta.url);
const subjectPath = fileURLToPath(
  new URL('../../.github/scripts/review-evidence.cjs', import.meta.url),
);
const templatePath = fileURLToPath(
  new URL('../../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url),
);
const workflowPath = fileURLToPath(
  new URL('../../.github/workflows/review-evidence.yml', import.meta.url),
);
const {
  API_VERSION,
  CHECK_NAME,
  ReviewEvidenceError,
  breakGlassPayloadFromEvent,
  createCheckRunController,
  evaluateReviewEvidence,
  exitCodeForDecision,
  extractMarkerValue,
  runCli,
  runReviewEvidenceWorkflow,
  validateBreakGlass,
} = require(subjectPath);

const currentHeadSha = '1111111111111111111111111111111111111111';
const currentBaseSha = '2222222222222222222222222222222222222222';
const staleHeadSha = '3333333333333333333333333333333333333333';
const digestA = 'a'.repeat(64);
const digestB = 'b'.repeat(64);
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

const aPassingAttestation = (overrides = {}) => ({
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
});

const aPacketManifest = (overrides = {}) => ({
  schemaVersion: 1,
  baseSha: currentBaseSha,
  headSha: currentHeadSha,
  files: requiredPacketPaths.map((path, index) => ({
    path,
    size: index + 1,
    sha256: ((index % 6) + 4).toString(16).repeat(64),
  })),
  ...overrides,
});

const aPacketHandoff = (manifest = aPacketManifest(), sourceOverride) => {
  const source = sourceOverride ?? Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8');
  return {
    attestation: aPassingAttestation({
      packetSha256: createHash('sha256').update(source).digest('hex'),
    }),
    manifest,
    manifestBase64: source.toString('base64'),
  };
};

const currentRequiredChecks = (overrides = {}) => [
  {
    context: 'gates',
    headSha: currentHeadSha,
    integrationId: 15_368,
    status: 'success',
    ...overrides,
  },
  {
    context: 'semgrep',
    headSha: currentHeadSha,
    integrationId: 44_001,
    status: 'success',
  },
];

const anEvaluation = (overrides = {}) => ({
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
});

const aCurrentPullRequest = (overrides = {}) => ({
  number: 42,
  state: 'open',
  head: { sha: currentHeadSha },
  base: {
    sha: currentBaseSha,
    ref: 'main',
    repo: { full_name: 'kimen-dev/kimen' },
  },
  ...overrides,
});

const aWorkflowEnvironment = (overrides = {}) => ({
  GITHUB_ACTOR: 'MarsGotta',
  GITHUB_API_URL: 'https://api.github.test',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'kimen-dev/kimen',
  GITHUB_TOKEN: 'test-token',
  KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify({
    'clean-context-review': 15_368,
    gates: 15_368,
    semgrep: 44_001,
  }),
  KIMEN_FOUNDER_LOGIN: 'MarsGotta',
  KIMEN_TRUSTED_REVIEWERS_JSON: JSON.stringify(['trusted-clean-context-reviewer']),
  ...overrides,
});

const aDispatchEvent = (overrides = {}) => {
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
};

const aDispatchEventForPacket = (packet) =>
  aDispatchEvent({
    inputs: {
      pull_request: '42',
      attestation: JSON.stringify(packet.attestation),
      packet_manifest_base64: packet.manifestBase64,
    },
  });

const aPendingReviewCheck = (overrides = {}) => ({
  id: 99,
  name: CHECK_NAME,
  head_sha: currentHeadSha,
  status: 'in_progress',
  conclusion: null,
  external_id: `${CHECK_NAME}:pr:42:${currentHeadSha}`,
  app: { id: 15_368 },
  ...overrides,
});

const anObservedCheck = (overrides = {}) => ({
  id: 11,
  name: 'gates',
  head_sha: currentHeadSha,
  status: 'completed',
  conclusion: 'success',
  external_id: null,
  app: { id: 15_368 },
  ...overrides,
});

const successfulObservedChecks = () => [
  anObservedCheck(),
  anObservedCheck({ id: 12, name: 'semgrep', app: { id: 44_001 } }),
  aPendingReviewCheck(),
];

const mockResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return body;
  },
  async text() {
    return JSON.stringify(body);
  },
});

const pendingControllerResponse = (overrides = {}) => ({
  id: 99,
  name: CHECK_NAME,
  head_sha: currentHeadSha,
  status: 'in_progress',
  conclusion: null,
  ...overrides,
});

const completedControllerResponse = (overrides = {}) => ({
  id: 99,
  name: CHECK_NAME,
  head_sha: currentHeadSha,
  status: 'completed',
  conclusion: 'success',
  ...overrides,
});

const validBreakGlassPayload = (overrides = {}) => ({
  policy: {
    repository: 'kimen-dev/kimen',
    founderLogin: 'marsgotta',
    requiredLabel: 'break-glass',
    bypassMode: 'pull_request',
  },
  event: {
    eventName: 'pull_request_target',
    repository: 'kimen-dev/kimen',
    actor: 'marsgotta',
    pullRequest: {
      number: 42,
      author: 'marsgotta',
      headSha: currentHeadSha,
      labels: ['break-glass'],
    },
  },
  request: {
    bypassMode: 'pull_request',
    justification: 'Scanner outage blocks an urgent security patch.',
    restorationIssue: 'https://github.com/kimen-dev/kimen/issues/123',
  },
  ...overrides,
});

describe('review evidence evaluator', () => {
  it('S3 accepts only a passing attestation and successful required checks for the current revision', () => {
    const result = evaluateReviewEvidence(anEvaluation());

    expect(result).toEqual({ status: 'success', headSha: currentHeadSha, reasons: [] });
    expect(exitCodeForDecision(result)).toBe(0);
    expect(exitCodeForDecision({ status: 'valid' })).toBe(0);
    expect(exitCodeForDecision({ status: 'pending' })).toBe(2);
    expect(exitCodeForDecision({ status: 'failure' })).toBe(1);
  });

  it('S3 keeps absent, stale or queued evidence pending on the current head', () => {
    const missing = evaluateReviewEvidence(anEvaluation({ attestation: null }));
    const staleAttestation = evaluateReviewEvidence(
      anEvaluation({ attestation: aPassingAttestation({ headSha: staleHeadSha }) }),
    );
    const staleBase = evaluateReviewEvidence(
      anEvaluation({ attestation: aPassingAttestation({ baseSha: staleHeadSha }) }),
    );
    const queued = evaluateReviewEvidence(
      anEvaluation({ requiredChecks: currentRequiredChecks({ status: 'pending' }) }),
    );
    const staleCheck = evaluateReviewEvidence(
      anEvaluation({ requiredChecks: currentRequiredChecks({ headSha: staleHeadSha }) }),
    );
    const emptyChecks = evaluateReviewEvidence(anEvaluation({ requiredChecks: [] }));

    expect(missing).toEqual({
      status: 'pending',
      headSha: currentHeadSha,
      reasons: ['missing review attestation for current revision'],
    });
    expect(staleAttestation.reasons).toEqual([
      'attestation head SHA does not cover the current revision',
    ]);
    expect(staleBase.reasons).toEqual([
      'attestation baseSha does not match the current revision baseSha',
    ]);
    expect(queued.reasons).toEqual(['gates is pending on the current revision']);
    expect(staleCheck.reasons).toEqual(['gates head SHA does not cover the current revision']);
    expect(emptyChecks.reasons).toEqual(['missing required checks for current revision']);
    for (const result of [missing, staleAttestation, staleBase, queued, staleCheck, emptyChecks]) {
      expect(result.status).toBe('pending');
      expect(result.headSha).toBe(currentHeadSha);
    }
  });

  it('S3 rejects failed checks, failed verdicts, open findings and untrusted reviewers', () => {
    const cases = [
      [
        anEvaluation({ requiredChecks: currentRequiredChecks({ status: 'failure' }) }),
        'gates has failure status on the current revision',
      ],
      [
        anEvaluation({ attestation: aPassingAttestation({ verdict: 'fail' }) }),
        'attestation verdict is fail, not pass',
      ],
      [
        anEvaluation({ attestation: aPassingAttestation({ openCritical: 1 }) }),
        'attestation openCritical must be zero for a passing review',
      ],
      [
        anEvaluation({ attestation: aPassingAttestation({ openImportant: 1 }) }),
        'attestation openImportant must be zero for a passing review',
      ],
      [
        anEvaluation({ trustedReviewers: ['another-trusted-reviewer'] }),
        'attestation reviewer "trusted-clean-context-reviewer" is not trusted',
      ],
    ];

    for (const [payload, reason] of cases) {
      expect(evaluateReviewEvidence(payload)).toEqual({
        status: 'failure',
        headSha: currentHeadSha,
        reasons: [reason],
      });
    }
  });

  it('S3 binds attestation repository, pull request and revision identities', () => {
    const repository = evaluateReviewEvidence(
      anEvaluation({
        attestation: aPassingAttestation({ repository: 'attacker/example' }),
      }),
    );
    const pullRequest = evaluateReviewEvidence(
      anEvaluation({ attestation: aPassingAttestation({ pullRequest: 43 }) }),
    );
    const head = evaluateReviewEvidence(
      anEvaluation({ attestation: aPassingAttestation({ headSha: staleHeadSha }) }),
    );
    const base = evaluateReviewEvidence(
      anEvaluation({ attestation: aPassingAttestation({ baseSha: staleHeadSha }) }),
    );

    expect(repository.reasons).toContain('attestation.repository must equal kimen-dev/kimen');
    expect(pullRequest.reasons).toContain(
      'attestation pullRequest does not match current revision pullRequest',
    );
    expect(head.status).toBe('pending');
    expect(base.status).toBe('pending');
  });

  it('S3 rejects unknown fields at every evaluator schema boundary', () => {
    const top = evaluateReviewEvidence({ ...anEvaluation(), unsignedExtension: true });
    const revision = evaluateReviewEvidence({
      ...anEvaluation(),
      currentRevision: { ...anEvaluation().currentRevision, unsignedExtension: true },
    });
    const attestation = evaluateReviewEvidence({
      ...anEvaluation(),
      attestation: aPassingAttestation({ unsignedExtension: true }),
    });
    const checks = evaluateReviewEvidence({
      ...anEvaluation(),
      requiredChecks: [{ ...currentRequiredChecks()[0], unsignedExtension: true }],
    });

    expect(top.reasons).toEqual(['evaluation contains unknown field "unsignedExtension"']);
    expect(revision.reasons).toEqual([
      'currentRevision contains unknown field "unsignedExtension"',
    ]);
    expect(attestation.reasons).toEqual(['attestation contains unknown field "unsignedExtension"']);
    expect(checks.reasons).toEqual([
      'requiredChecks[0] contains unknown field "unsignedExtension"',
    ]);
  });

  it('S3 validates the complete attestation schema fail closed', () => {
    const invalidFields = [
      ['schemaVersion', 2, /schemaVersion/],
      ['repository', 'invalid', /repository/],
      ['pullRequest', 0, /pullRequest/],
      ['headSha', 'short', /headSha/],
      ['baseSha', 'short', /baseSha/],
      ['packetSha256', 'short', /packetSha256/],
      ['reportSha256', 'c'.repeat(63), /reportSha256/],
      ['reviewer', '', /reviewer/],
      ['round', 3, /round/],
      ['verdict', 'maybe', /verdict/],
      ['openCritical', -1, /openCritical/],
      ['openImportant', 1.5, /openImportant/],
    ];

    for (const [field, value, message] of invalidFields) {
      const result = evaluateReviewEvidence(
        anEvaluation({ attestation: aPassingAttestation({ [field]: value }) }),
      );
      expect(result.status, field).toBe('failure');
      expect(result.reasons.join('\n'), field).toMatch(message);
    }
  });

  it('S3 validates current revision, required checks and trusted-reviewer schemas fail closed', () => {
    const cases = [
      [anEvaluation({ currentRevision: null }), /currentRevision must be an object/],
      [
        anEvaluation({
          currentRevision: { ...anEvaluation().currentRevision, repository: 'attacker/example' },
        }),
        /currentRevision.repository must equal/,
      ],
      [
        anEvaluation({
          currentRevision: { ...anEvaluation().currentRevision, pullRequest: 0 },
        }),
        /currentRevision.pullRequest/,
      ],
      [anEvaluation({ requiredChecks: null }), /requiredChecks must be an array/],
      [
        anEvaluation({ requiredChecks: [currentRequiredChecks()[0], currentRequiredChecks()[0]] }),
        /duplicates required check/,
      ],
      [
        anEvaluation({ requiredChecks: currentRequiredChecks({ context: '' }) }),
        /context must be a non-empty string/,
      ],
      [
        anEvaluation({ requiredChecks: currentRequiredChecks({ integrationId: 0 }) }),
        /integrationId must be a positive integer/,
      ],
      [
        anEvaluation({ requiredChecks: currentRequiredChecks({ status: 'neutral' }) }),
        /status must equal pending, success or failure/,
      ],
      [anEvaluation({ trustedReviewers: [] }), /trustedReviewers must be a non-empty array/],
      [anEvaluation({ trustedReviewers: ['trusted', 'trusted'] }), /duplicates reviewer/],
      [anEvaluation({ trustedReviewers: [''] }), /must be a reviewer identifier/],
    ];

    for (const [payload, message] of cases) {
      const result = evaluateReviewEvidence(payload);
      expect(result.status).toBe('failure');
      expect(result.reasons.join('\n')).toMatch(message);
    }
  });

  it('S3 preserves failures ahead of pending reasons and the observable current head', () => {
    const result = evaluateReviewEvidence(
      anEvaluation({
        attestation: aPassingAttestation({ verdict: 'fail', headSha: staleHeadSha }),
        requiredChecks: currentRequiredChecks({ status: 'pending' }),
      }),
    );

    expect(result).toEqual({
      status: 'failure',
      headSha: currentHeadSha,
      reasons: [
        'attestation verdict is fail, not pass',
        'attestation head SHA does not cover the current revision',
        'gates is pending on the current revision',
      ],
    });
    expect(evaluateReviewEvidence(null)).toEqual({
      status: 'failure',
      headSha: null,
      reasons: ['evaluation must be an object'],
    });
  });
});

describe('review Check Run REST controller', () => {
  it('S3 creates a pending Check Run on the exact head with trusted request metadata', async () => {
    const calls = [];
    const controller = createCheckRunController({
      token: 'test-token',
      apiBaseUrl: 'https://api.github.test/',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return mockResponse(201, pendingControllerResponse());
      },
    });

    const result = await controller.pending({
      repository: 'kimen-dev/kimen',
      pullRequest: 42,
      headSha: currentHeadSha,
      detailsUrl: 'https://github.test/review/42',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: 'https://api.github.test/repos/kimen-dev/kimen/check-runs',
      options: {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    });
    expect(JSON.parse(calls[0].options.body)).toEqual({
      name: CHECK_NAME,
      head_sha: currentHeadSha,
      status: 'in_progress',
      external_id: `${CHECK_NAME}:pr:42:${currentHeadSha}`,
      details_url: 'https://github.test/review/42',
      output: {
        title: 'Clean-context review pending',
        summary: `Waiting for founder-controlled review evidence for PR #42 at ${currentHeadSha}.`,
      },
    });
    expect(result).toEqual({
      id: 99,
      name: CHECK_NAME,
      headSha: currentHeadSha,
      status: 'in_progress',
      conclusion: null,
    });
  });

  it('S3 rejects invalid pending input before making a network request', async () => {
    const controller = createCheckRunController({
      token: 'test-token',
      apiBaseUrl: 'https://api.github.test',
      fetchImpl: async () => {
        throw new Error('network must remain untouched');
      },
    });
    const invalidInputs = [
      [{ repository: 'attacker/example', pullRequest: 42, headSha: currentHeadSha }, /repository/],
      [{ repository: 'kimen-dev/kimen', pullRequest: 0, headSha: currentHeadSha }, /pullRequest/],
      [{ repository: 'kimen-dev/kimen', pullRequest: 42, headSha: 'short' }, /headSha/],
      [
        {
          repository: 'kimen-dev/kimen',
          pullRequest: 42,
          headSha: currentHeadSha,
          detailsUrl: 'http://insecure.test',
        },
        /detailsUrl/,
      ],
      [
        {
          repository: 'kimen-dev/kimen',
          pullRequest: 42,
          headSha: currentHeadSha,
          unsignedExtension: true,
        },
        /unknown field/,
      ],
    ];

    for (const [input, message] of invalidInputs) {
      await expect(controller.pending(input)).rejects.toThrow(message);
    }
  });

  it('S3 fails closed on invalid controller dependencies and API responses', async () => {
    expect(() => createCheckRunController({ fetchImpl: {}, token: 'token' })).toThrow(
      /fetch is unavailable/,
    );
    expect(() => createCheckRunController({ fetchImpl: async () => undefined, token: '' })).toThrow(
      /GITHUB_TOKEN/,
    );
    expect(() =>
      createCheckRunController({
        fetchImpl: async () => undefined,
        token: 'token',
        apiBaseUrl: 'http://api.github.test',
      }),
    ).toThrow(/valid HTTPS URL/);
    expect(() =>
      createCheckRunController({
        fetchImpl: async () => undefined,
        token: 'token',
        apiBaseUrl: 'not a URL',
      }),
    ).toThrow(/valid HTTPS URL/);

    const invalidResponse = createCheckRunController({
      token: 'token',
      fetchImpl: async () => ({}),
    });
    await expect(
      invalidResponse.pending({
        repository: 'kimen-dev/kimen',
        pullRequest: 42,
        headSha: currentHeadSha,
      }),
    ).rejects.toThrow(/invalid response/);

    const failedResponse = createCheckRunController({
      token: 'token',
      fetchImpl: async () => mockResponse(403, { message: 'denied' }),
    });
    await expect(
      failedResponse.pending({
        repository: 'kimen-dev/kimen',
        pullRequest: 42,
        headSha: currentHeadSha,
      }),
    ).rejects.toThrow(/HTTP 403.*denied/);

    const mismatchedResponse = createCheckRunController({
      token: 'token',
      fetchImpl: async () =>
        mockResponse(201, pendingControllerResponse({ head_sha: staleHeadSha })),
    });
    await expect(
      mismatchedResponse.pending({
        repository: 'kimen-dev/kimen',
        pullRequest: 42,
        headSha: currentHeadSha,
      }),
    ).rejects.toThrow(/not bound to the requested head/);
  });

  it('S3 completes only the pending Check Run bound to successful current evidence', async () => {
    const calls = [];
    const controller = createCheckRunController({
      token: 'test-token',
      apiBaseUrl: 'https://api.github.test',
      now: () => new Date('2026-07-09T12:00:00.000Z'),
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return options.method === 'GET'
          ? mockResponse(200, pendingControllerResponse())
          : mockResponse(200, completedControllerResponse());
      },
    });

    const result = await controller.complete({
      repository: 'kimen-dev/kimen',
      checkRunId: 99,
      evaluation: anEvaluation(),
      detailsUrl: 'https://github.test/review/42',
    });

    expect(calls.map(({ options }) => options.method)).toEqual(['GET', 'PATCH']);
    expect(calls.map(({ url }) => url)).toEqual([
      'https://api.github.test/repos/kimen-dev/kimen/check-runs/99',
      'https://api.github.test/repos/kimen-dev/kimen/check-runs/99',
    ]);
    expect(JSON.parse(calls[1].options.body)).toEqual({
      status: 'completed',
      conclusion: 'success',
      completed_at: '2026-07-09T12:00:00.000Z',
      details_url: 'https://github.test/review/42',
      output: {
        title: 'Clean-context review passed',
        summary: [
          `Validated review evidence for ${currentHeadSha}.`,
          'Reviewer: trusted-clean-context-reviewer; round: 1.',
          `Packet SHA-256: ${digestA}.`,
          `Report SHA-256: ${digestB}.`,
        ].join('\n'),
      },
    });
    expect(result).toEqual({
      decision: { status: 'success', headSha: currentHeadSha, reasons: [] },
      checkRun: {
        id: 99,
        name: CHECK_NAME,
        headSha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
      },
    });
  });

  it('S3 never patches stale, wrongly named or unsuccessfully completed Check Runs', async () => {
    const cases = [
      [pendingControllerResponse({ head_sha: staleHeadSha }), /head SHA.*current/],
      [pendingControllerResponse({ name: 'attacker-check' }), /name must equal/],
      [
        completedControllerResponse({ conclusion: 'failure' }),
        /refusing to overwrite completed.*failure/,
      ],
    ];

    for (const [response, message] of cases) {
      const calls = [];
      const controller = createCheckRunController({
        token: 'token',
        fetchImpl: async (_url, options) => {
          calls.push(options.method);
          return mockResponse(200, response);
        },
      });
      await expect(
        controller.complete({
          repository: 'kimen-dev/kimen',
          checkRunId: 99,
          evaluation: anEvaluation(),
        }),
      ).rejects.toThrow(message);
      expect(calls).toEqual(['GET']);
    }
  });

  it('S3 treats an already-successful current Check Run as idempotently complete', async () => {
    const calls = [];
    const controller = createCheckRunController({
      token: 'token',
      fetchImpl: async (_url, options) => {
        calls.push(options.method);
        return mockResponse(200, completedControllerResponse());
      },
    });

    const result = await controller.complete({
      repository: 'kimen-dev/kimen',
      checkRunId: 99,
      evaluation: anEvaluation(),
    });

    expect(calls).toEqual(['GET']);
    expect(result.checkRun).toMatchObject({ status: 'completed', conclusion: 'success' });
  });

  it('S3 rejects invalid completion input or non-success evidence before REST access', async () => {
    const controller = createCheckRunController({
      token: 'token',
      fetchImpl: async () => {
        throw new Error('network must remain untouched');
      },
    });
    const invalidInputs = [
      [
        { repository: 'attacker/example', checkRunId: 99, evaluation: anEvaluation() },
        /repository/,
      ],
      [{ repository: 'kimen-dev/kimen', checkRunId: 0, evaluation: anEvaluation() }, /checkRunId/],
      [
        { repository: 'kimen-dev/kimen', checkRunId: 99, evaluation: null },
        /evaluation must be an object/,
      ],
      [
        {
          repository: 'kimen-dev/kimen',
          checkRunId: 99,
          evaluation: anEvaluation(),
          detailsUrl: 'http://insecure.test',
        },
        /detailsUrl/,
      ],
      [
        {
          repository: 'kimen-dev/kimen',
          checkRunId: 99,
          evaluation: anEvaluation(),
          unsignedExtension: true,
        },
        /unknown field/,
      ],
      [
        {
          repository: 'kimen-dev/kimen',
          checkRunId: 99,
          evaluation: anEvaluation({ attestation: null }),
        },
        /review evidence is pending/,
      ],
      [
        {
          repository: 'kimen-dev/kimen',
          checkRunId: 99,
          evaluation: {
            ...anEvaluation(),
            currentRevision: {
              ...anEvaluation().currentRevision,
              repository: 'attacker/example',
            },
          },
        },
        /currentRevision.repository/,
      ],
    ];

    for (const [input, message] of invalidInputs) {
      await expect(controller.complete(input)).rejects.toThrow(message);
    }
  });

  it('S3 validates the completed REST representation before reporting success', async () => {
    const responses = [
      mockResponse(200, pendingControllerResponse()),
      mockResponse(200, completedControllerResponse({ conclusion: 'failure' })),
    ];
    const controller = createCheckRunController({
      token: 'token',
      fetchImpl: async () => responses.shift(),
    });

    await expect(
      controller.complete({
        repository: 'kimen-dev/kimen',
        checkRunId: 99,
        evaluation: anEvaluation(),
      }),
    ).rejects.toThrow(/unexpected completed Check Run/);
  });
});

describe('trusted review workflow state', () => {
  it('S3 creates pending evidence for the API-current PR head, never event-carried SHAs', async () => {
    const apiCalls = [];
    const pendingCalls = [];
    const controller = {
      async pending(input) {
        pendingCalls.push(input);
        return { id: 99, ...input };
      },
    };
    const event = {
      action: 'opened',
      repository: { full_name: 'kimen-dev/kimen' },
      pull_request: {
        number: 42,
        head: { sha: staleHeadSha },
        base: { sha: staleHeadSha },
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

    expect(apiCalls).toEqual([
      {
        url: 'https://api.github.test/repos/kimen-dev/kimen/pulls/42',
        options: expect.objectContaining({ method: 'GET' }),
      },
    ]);
    expect(pendingCalls).toEqual([
      { repository: 'kimen-dev/kimen', pullRequest: 42, headSha: currentHeadSha },
    ]);
    expect(result.headSha).toBe(currentHeadSha);
  });

  it('S3 accepts every approved pending trigger action and strict positive PR identifiers', async () => {
    for (const action of ['opened', 'reopened', 'synchronize', 'ready_for_review']) {
      const pendingCalls = [];
      await runReviewEvidenceWorkflow({
        controller: {
          async pending(input) {
            pendingCalls.push(input);
            return input;
          },
        },
        env: aWorkflowEnvironment({
          GITHUB_EVENT_NAME: 'pull_request_target',
          KIMEN_REVIEW_MODE: 'pending',
        }),
        eventPayload: {
          action,
          repository: { full_name: 'kimen-dev/kimen' },
          pull_request: { number: 42 },
        },
        fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
      });
      expect(pendingCalls).toHaveLength(1);
    }
  });

  it('S3 rejects untrusted pending events and non-current PR state before controller mutation', async () => {
    const baseOptions = {
      controller: {
        async pending() {
          throw new Error('pending mutation must not run');
        },
      },
      env: aWorkflowEnvironment({
        GITHUB_EVENT_NAME: 'pull_request_target',
        KIMEN_REVIEW_MODE: 'pending',
      }),
      eventPayload: {
        action: 'opened',
        repository: { full_name: 'kimen-dev/kimen' },
        pull_request: { number: 42 },
      },
    };
    const cases = [
      [
        {
          ...baseOptions,
          env: { ...baseOptions.env, GITHUB_EVENT_NAME: 'pull_request' },
          fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
        },
        /requires pull_request_target/,
      ],
      [
        {
          ...baseOptions,
          eventPayload: { ...baseOptions.eventPayload, action: 'closed' },
          fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
        },
        /unsupported.*action/,
      ],
      [
        {
          ...baseOptions,
          eventPayload: { ...baseOptions.eventPayload, pull_request: null },
          fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
        },
        /pull_request must be an object/,
      ],
      [
        {
          ...baseOptions,
          eventPayload: {
            ...baseOptions.eventPayload,
            pull_request: { number: '0' },
          },
          fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
        },
        /positive integer/,
      ],
      [
        {
          ...baseOptions,
          fetchImpl: async () => mockResponse(200, aCurrentPullRequest({ state: 'closed' })),
        },
        /must currently be open/,
      ],
      [
        {
          ...baseOptions,
          fetchImpl: async () =>
            mockResponse(
              200,
              aCurrentPullRequest({
                base: {
                  sha: currentBaseSha,
                  ref: 'release',
                  repo: { full_name: 'kimen-dev/kimen' },
                },
              }),
            ),
        },
        /base ref must equal main/,
      ],
    ];

    for (const [options, message] of cases) {
      await expect(runReviewEvidenceWorkflow(options)).rejects.toThrow(message);
    }
  });

  it('S3 completes from the current GitHub PR and exact trusted-App policy only', async () => {
    const apiCalls = [];
    const completionCalls = [];
    const responses = [
      aCurrentPullRequest(),
      { total_count: 3, check_runs: successfulObservedChecks() },
    ];
    const controller = {
      async complete(input) {
        completionCalls.push(input);
        return { checkRun: { id: input.checkRunId }, decision: { status: 'success' } };
      },
    };

    const result = await runReviewEvidenceWorkflow({
      controller,
      env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
      eventPayload: aDispatchEvent(),
      fetchImpl: async (url, options) => {
        apiCalls.push({ url, options });
        return mockResponse(200, responses.shift());
      },
    });

    expect(apiCalls.map(({ url }) => url)).toEqual([
      'https://api.github.test/repos/kimen-dev/kimen/pulls/42',
      `https://api.github.test/repos/kimen-dev/kimen/commits/${currentHeadSha}/check-runs?filter=latest&per_page=100`,
    ]);
    expect(completionCalls).toEqual([
      {
        repository: 'kimen-dev/kimen',
        checkRunId: 99,
        evaluation: {
          currentRevision: {
            repository: 'kimen-dev/kimen',
            pullRequest: 42,
            headSha: currentHeadSha,
            baseSha: currentBaseSha,
          },
          attestation: aPacketHandoff().attestation,
          requiredChecks: [
            {
              context: 'gates',
              headSha: currentHeadSha,
              integrationId: 15_368,
              status: 'success',
            },
            {
              context: 'semgrep',
              headSha: currentHeadSha,
              integrationId: 44_001,
              status: 'success',
            },
          ],
          trustedReviewers: ['trusted-clean-context-reviewer'],
        },
      },
    ]);
    expect(result).toEqual({ checkRun: { id: 99 }, decision: { status: 'success' } });
  });

  it('S2 verifies canonical packet-manifest bytes, inventory and live revision before observing checks', async () => {
    const missingManifestEvent = aDispatchEvent();
    delete missingManifestEvent.inputs.packet_manifest_base64;
    const validManifest = aPacketManifest();
    const reversedFiles = [...validManifest.files].reverse();
    const traversalFiles = validManifest.files
      .map((file, index) => (index === 0 ? { ...file, path: '../MANIFEST.md' } : file))
      .sort((left, right) => left.path.localeCompare(right.path));
    const selfReferentialFiles = validManifest.files
      .map((file, index) => (index === 0 ? { ...file, path: 'packet-manifest.json' } : file))
      .sort((left, right) => left.path.localeCompare(right.path));
    const negativeSizeFiles = validManifest.files.map((file, index) =>
      index === 0 ? { ...file, size: -1 } : file,
    );
    const aggregateOverflowFiles = validManifest.files.map((file, index) =>
      index < 5 ? { ...file, size: 32 * 1024 * 1024 } : file,
    );
    const uppercaseDigestFiles = validManifest.files.map((file, index) =>
      index === 0 ? { ...file, sha256: 'A'.repeat(64) } : file,
    );
    const tooManyFiles = Array.from({ length: 257 }, (_, index) => ({
      path: `evidence/image-${String(index).padStart(3, '0')}.png`,
      size: 1,
      sha256: digestA,
    }));
    const prettySource = Buffer.from(JSON.stringify(validManifest, null, 2), 'utf8');
    const cases = [
      [missingManifestEvent, /packet manifest.*required/],
      [
        aDispatchEvent({
          inputs: {
            pull_request: '42',
            attestation: JSON.stringify(aPassingAttestation()),
            packet_manifest_base64: '*not-base64*',
          },
        }),
        /packet manifest.*canonical base64/,
      ],
      [
        aDispatchEvent({
          inputs: {
            pull_request: '42',
            attestation: JSON.stringify(aPassingAttestation()),
            packet_manifest_base64: Buffer.from([0xff]).toString('base64'),
          },
        }),
        /packet manifest.*UTF-8 JSON/,
      ],
      [
        aDispatchEvent({
          inputs: {
            pull_request: '42',
            attestation: JSON.stringify(aPassingAttestation()),
            packet_manifest_base64: Buffer.from('{', 'utf8').toString('base64'),
          },
        }),
        /packet manifest.*UTF-8 JSON/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(validManifest, prettySource)),
        /packet manifest.*canonical JSON/,
      ],
      [
        aDispatchEventForPacket({
          ...aPacketHandoff(),
          attestation: aPassingAttestation({ packetSha256: digestA }),
        }),
        /packet manifest.*digest.*attestation/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ schemaVersion: 2 }))),
        /packet manifest schemaVersion/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ unexpected: true }))),
        /packet manifest.*unknown field.*unexpected/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ baseSha: staleHeadSha }))),
        /packet manifest baseSha.*current revision/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ headSha: staleHeadSha }))),
        /packet manifest headSha.*current revision/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: [] }))),
        /packet manifest files.*1 through 256/,
      ],
      [
        aDispatchEventForPacket(
          aPacketHandoff(aPacketManifest({ files: [null, ...validManifest.files] })),
        ),
        /packet manifest files\[0\].*object/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: tooManyFiles }))),
        /packet manifest files.*1 through 256/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: reversedFiles }))),
        /packet manifest files.*strictly sorted/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: traversalFiles }))),
        /packet manifest files\[0\].path.*canonical relative/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: selfReferentialFiles }))),
        /packet manifest files.*self-referential/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: negativeSizeFiles }))),
        /packet manifest files\[0\].size.*0 through/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: aggregateOverflowFiles }))),
        /packet manifest aggregate.*128 MiB/,
      ],
      [
        aDispatchEventForPacket(aPacketHandoff(aPacketManifest({ files: uppercaseDigestFiles }))),
        /packet manifest files\[0\].sha256.*lowercase/,
      ],
      [
        aDispatchEventForPacket(
          aPacketHandoff(aPacketManifest({ files: validManifest.files.slice(1) })),
        ),
        /packet manifest.*missing required packet file MANIFEST\.md/,
      ],
    ];

    for (const [eventPayload, expectedError] of cases) {
      let apiCalls = 0;
      await expect(
        runReviewEvidenceWorkflow({
          controller: {
            async complete() {
              throw new Error('invalid packet manifest reached completion');
            },
          },
          env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
          eventPayload,
          fetchImpl: async () => {
            apiCalls += 1;
            if (apiCalls === 1) return mockResponse(200, aCurrentPullRequest());
            throw new Error('invalid packet manifest reached the Check Runs query');
          },
        }),
      ).rejects.toThrow(expectedError);
      expect(apiCalls).toBe(1);
    }
  });

  it('S3 ignores same-name checks from stale SHAs or the wrong GitHub App', async () => {
    const cases = [
      anObservedCheck({ app: { id: 666 } }),
      anObservedCheck({ head_sha: staleHeadSha }),
    ];

    for (const candidate of cases) {
      const responses = [
        aCurrentPullRequest(),
        {
          total_count: 3,
          check_runs: [
            candidate,
            anObservedCheck({ id: 12, name: 'semgrep', app: { id: 44_001 } }),
            aPendingReviewCheck(),
          ],
        },
      ];
      await expect(
        runReviewEvidenceWorkflow({
          controller: {
            async complete() {
              throw new Error('completion must remain unreachable');
            },
          },
          env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
          eventPayload: aDispatchEvent(),
          fetchImpl: async () => mockResponse(200, responses.shift()),
        }),
      ).rejects.toThrow(/gates.*pending/);
    }
  });

  it('S3 never completes a stale or wrong-App clean-context Check Run', async () => {
    const cases = [
      aPendingReviewCheck({ app: { id: 666 } }),
      aPendingReviewCheck({ head_sha: staleHeadSha }),
      aPendingReviewCheck({ external_id: `${CHECK_NAME}:pr:41:${currentHeadSha}` }),
    ];

    for (const candidate of cases) {
      const checks = successfulObservedChecks();
      checks[2] = candidate;
      const responses = [aCurrentPullRequest(), { total_count: 3, check_runs: checks }];
      await expect(
        runReviewEvidenceWorkflow({
          controller: {
            async complete() {
              throw new Error('completion must remain unreachable');
            },
          },
          env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
          eventPayload: aDispatchEvent(),
          fetchImpl: async () => mockResponse(200, responses.shift()),
        }),
      ).rejects.toThrow(/missing current clean-context-review.*trusted GitHub App/);
    }
  });

  it('S3 uses the latest trusted check and maps GitHub states to success, pending or failure', async () => {
    const runWithLatest = async (latest) => {
      const checks = [
        anObservedCheck(),
        latest,
        anObservedCheck({ id: 12, name: 'semgrep', app: { id: 44_001 } }),
        aPendingReviewCheck(),
      ];
      const responses = [aCurrentPullRequest(), { total_count: 4, check_runs: checks }];
      return runReviewEvidenceWorkflow({
        controller: {
          async complete() {
            throw new Error('completion must remain unreachable');
          },
        },
        env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
        eventPayload: aDispatchEvent(),
        fetchImpl: async () => mockResponse(200, responses.shift()),
      });
    };

    await expect(
      runWithLatest(anObservedCheck({ id: 20, status: 'queued', conclusion: null })),
    ).rejects.toThrow(/gates.*pending/);
    await expect(runWithLatest(anObservedCheck({ id: 20, conclusion: 'failure' }))).rejects.toThrow(
      /gates.*failure/,
    );
  });

  it('S3 rejects truncated or malformed GitHub Check Runs state', async () => {
    const payloads = [
      { total_count: 4, check_runs: successfulObservedChecks() },
      { total_count: -1, check_runs: [] },
      { total_count: 1, check_runs: [anObservedCheck({ app: { id: 0 } })] },
      { total_count: 1, check_runs: [anObservedCheck({ conclusion: 42 })] },
    ];

    for (const payload of payloads) {
      const responses = [aCurrentPullRequest(), payload];
      await expect(
        runReviewEvidenceWorkflow({
          controller: {},
          env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
          eventPayload: aDispatchEvent(),
          fetchImpl: async () => mockResponse(200, responses.shift()),
        }),
      ).rejects.toThrow(/Check Runs response|check_runs\[0\]/);
    }
  });

  it('S3 accepts no required-check or reviewer policy from dispatch inputs', async () => {
    const event = aDispatchEvent({
      inputs: {
        pull_request: '42',
        attestation: JSON.stringify(aPassingAttestation()),
        requiredChecks: JSON.stringify(currentRequiredChecks()),
        trustedReviewers: JSON.stringify(['attacker-controlled-reviewer']),
      },
    });

    await expect(
      runReviewEvidenceWorkflow({
        controller: {},
        env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete' }),
        eventPayload: event,
        fetchImpl: async () => {
          throw new Error('GitHub must not be queried for invalid dispatch inputs');
        },
      }),
    ).rejects.toThrow(/unknown.*requiredChecks|unknown.*trustedReviewers/);
  });

  it('S3 permits completion only for the production founder on main', async () => {
    const cases = [
      [
        aWorkflowEnvironment({
          GITHUB_ACTOR: 'repository-admin',
          KIMEN_REVIEW_MODE: 'complete',
        }),
        /founder/,
      ],
      [
        aWorkflowEnvironment({
          KIMEN_FOUNDER_LOGIN: 'repository-admin',
          KIMEN_REVIEW_MODE: 'complete',
        }),
        /founder/,
      ],
      [
        aWorkflowEnvironment({
          GITHUB_REF: 'refs/heads/attacker-branch',
          KIMEN_REVIEW_MODE: 'complete',
        }),
        /refs\/heads\/main/,
      ],
    ];

    for (const [env, message] of cases) {
      await expect(
        runReviewEvidenceWorkflow({
          controller: {},
          env,
          eventPayload: aDispatchEvent(),
          fetchImpl: async () => {
            throw new Error('GitHub must not be queried for unauthorized dispatch');
          },
        }),
      ).rejects.toThrow(message);
    }
  });

  it('S3 validates trusted integration and reviewer policy before querying mutable state', async () => {
    const invalidPolicies = [
      ['KIMEN_CHECK_INTEGRATIONS_JSON', '', /required/],
      ['KIMEN_CHECK_INTEGRATIONS_JSON', 'not-json', /valid JSON/],
      ['KIMEN_CHECK_INTEGRATIONS_JSON', '[]', /must map/],
      ['KIMEN_CHECK_INTEGRATIONS_JSON', '{}', /must not be empty/],
      [
        'KIMEN_CHECK_INTEGRATIONS_JSON',
        JSON.stringify({ [CHECK_NAME]: 1, gates: 15_368 }),
        /observed GitHub App ID/,
      ],
      [
        'KIMEN_CHECK_INTEGRATIONS_JSON',
        JSON.stringify({ gates: 15_368 }),
        /must bind clean-context-review/,
      ],
      [
        'KIMEN_CHECK_INTEGRATIONS_JSON',
        JSON.stringify({ [CHECK_NAME]: 15_368 }),
        /at least one deterministic required check/,
      ],
      ['KIMEN_TRUSTED_REVIEWERS_JSON', '[]', /non-empty array/],
      ['KIMEN_TRUSTED_REVIEWERS_JSON', '["trusted","trusted"]', /duplicates reviewer/],
    ];

    for (const [key, value, message] of invalidPolicies) {
      await expect(
        runReviewEvidenceWorkflow({
          controller: {},
          env: aWorkflowEnvironment({ KIMEN_REVIEW_MODE: 'complete', [key]: value }),
          eventPayload: aDispatchEvent(),
          fetchImpl: async () => {
            throw new Error('GitHub must not be queried for invalid trusted policy');
          },
        }),
      ).rejects.toThrow(message);
    }
  });

  it('S3 reads a trusted workflow event file and rejects repository or mode drift', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-review-workflow-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    const eventPath = join(root, 'event.json');
    await writeFile(
      eventPath,
      JSON.stringify({
        action: 'opened',
        repository: { full_name: 'kimen-dev/kimen' },
        pull_request: { number: 42 },
      }),
    );
    const env = aWorkflowEnvironment({
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_EVENT_PATH: eventPath,
      KIMEN_REVIEW_MODE: 'pending',
    });

    await expect(
      runReviewEvidenceWorkflow({
        controller: {
          async pending(input) {
            return input;
          },
        },
        env,
        fetchImpl: async () => mockResponse(200, aCurrentPullRequest()),
      }),
    ).resolves.toMatchObject({ headSha: currentHeadSha });
    await expect(
      runReviewEvidenceWorkflow({
        controller: {},
        env: { ...env, KIMEN_REVIEW_MODE: 'unknown' },
        eventPayload: { repository: { full_name: 'kimen-dev/kimen' } },
        fetchImpl: async () => mockResponse(200, {}),
      }),
    ).rejects.toThrow(/must equal pending or complete/);
    await expect(
      runReviewEvidenceWorkflow({
        controller: {},
        env,
        eventPayload: { repository: { full_name: 'attacker/example' } },
        fetchImpl: async () => mockResponse(200, {}),
      }),
    ).rejects.toThrow(/event repository.*GITHUB_REPOSITORY/);
  });

  it('S3 keeps the workflow SHA-pinned, least-privilege and on trusted revisions', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const pendingJob = /\n {2}pending:\n([\s\S]*?)\n {2}complete:/.exec(workflow)?.[1] ?? '';

    expect(workflow).toMatch(
      /pull_request_target:\s*\n\s*types:\s*\[opened, reopened, synchronize, ready_for_review\]/,
    );
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/checks:\s*write/);
    expect(workflow).toMatch(/contents:\s*read/);
    expect(workflow).toMatch(/pull-requests:\s*read/);
    expect(workflow).not.toMatch(/write-all|contents:\s*write|pull-requests:\s*write/);
    expect(workflow).toMatch(/step-security\/harden-runner@[0-9a-f]{40}/);
    expect(workflow).toMatch(/actions\/checkout@[0-9a-f]{40}/);
    expect(workflow).not.toMatch(/^\s*uses:\s+[^@\s]+@(?![0-9a-f]{40}\b)/gm);
    expect(workflow).toMatch(/ref:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    expect(workflow).toMatch(/ref:\s*refs\/heads\/main/);
    expect(workflow).toMatch(/github\.actor\s*==\s*'MarsGotta'/);
    expect(pendingJob).toMatch(/github\.repository\s*==\s*'kimen-dev\/kimen'/);
    expect(pendingJob).toMatch(/github\.event\.pull_request\.base\.ref\s*==\s*'main'/);
    expect(workflow).toMatch(/github\.ref\s*==\s*'refs\/heads\/main'/);
    expect(workflow).not.toMatch(/\$\{\{\s*(?:inputs|github\.event\.inputs)\./);
    expect(workflow).toMatch(/review-evidence\.cjs review-workflow/);
  });
});

describe('break-glass parsing and validation', () => {
  it('S3 validates only the exact founder-authored pull-request bypass contract', () => {
    expect(validateBreakGlass(validBreakGlassPayload())).toEqual({
      status: 'valid',
      reasons: [],
    });

    const invalidCases = [
      [{ ...validBreakGlassPayload(), unsignedExtension: true }, /unknown field/],
      [
        validBreakGlassPayload({
          policy: { ...validBreakGlassPayload().policy, unsignedExtension: true },
        }),
        /unknown field/,
      ],
      [
        validBreakGlassPayload({
          event: { ...validBreakGlassPayload().event, actor: 'repository-admin' },
        }),
        /actor must be the founder/,
      ],
      [
        validBreakGlassPayload({
          event: {
            ...validBreakGlassPayload().event,
            pullRequest: {
              ...validBreakGlassPayload().event.pullRequest,
              author: 'repository-admin',
            },
          },
        }),
        /author must be the founder/,
      ],
      [
        validBreakGlassPayload({
          event: {
            ...validBreakGlassPayload().event,
            pullRequest: {
              ...validBreakGlassPayload().event.pullRequest,
              labels: [],
            },
          },
        }),
        /requires break-glass label/,
      ],
      [
        validBreakGlassPayload({
          request: { ...validBreakGlassPayload().request, justification: '   ' },
        }),
        /justification is required/,
      ],
      [
        validBreakGlassPayload({
          request: {
            ...validBreakGlassPayload().request,
            restorationIssue: 'https://github.com/attacker/example/issues/123',
          },
        }),
        /issue URL in the policy repository/,
      ],
      ...[
        'https://github.com/kimen-dev/kimen/issues/123?redirect=attacker',
        'https://github.com/kimen-dev/kimen/issues/123#ambiguous',
        'https://user@github.com/kimen-dev/kimen/issues/123',
        'https://github.com/kimen-dev/kimen/issues/01',
        'https://github.com/kimen-dev/kimen/issues/%31',
      ].map((restorationIssue) => [
        validBreakGlassPayload({
          request: { ...validBreakGlassPayload().request, restorationIssue },
        }),
        /issue URL in the policy repository/,
      ]),
      [
        validBreakGlassPayload({
          request: { ...validBreakGlassPayload().request, bypassMode: 'always' },
        }),
        /bypass mode must equal pull_request/,
      ],
    ];

    for (const [payload, message] of invalidCases) {
      const result = validateBreakGlass(payload);
      expect(result.status).toBe('invalid');
      expect(result.reasons.join('\n')).toMatch(message);
    }
  });

  it('S3 extracts exact template markers without treating PR text as executable input', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-break-glass-mutation-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    const shellSentinel = join(root, 'must-not-exist');
    const template = await readFile(templatePath, 'utf8');
    const body = template
      .replace(
        '<!-- break-glass-justification -->\n\n',
        `<!-- break-glass-justification -->\nScanner outage; $(touch ${shellSentinel}) stays inert.\n`,
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

    expect(payload.request).toEqual({
      bypassMode: 'pull_request',
      justification: `Scanner outage; $(touch ${shellSentinel}) stays inert.`,
      restorationIssue: 'https://github.com/kimen-dev/kimen/issues/123',
    });
    expect(validateBreakGlass(payload)).toEqual({ status: 'valid', reasons: [] });
    expect(existsSync(shellSentinel)).toBe(false);
  });

  it('S3 keeps repository and founder policy outside attacker-controlled event data', () => {
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
            'An event cannot replace trusted policy.',
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

    expect(payload.policy).toEqual({
      repository: 'kimen-dev/kimen',
      founderLogin: 'marsgotta',
      requiredLabel: 'break-glass',
      bypassMode: 'pull_request',
    });
    expect(validateBreakGlass(payload).reasons).toContain(
      'event repository must match trusted policy repository',
    );
  });

  it('S3 parses marker whitespace and stops at the next marker deterministically', () => {
    const body = [
      'before',
      '<!--   Break-Glass-Justification   -->',
      ' first value ',
      '<!-- break-glass-restoration-issue -->',
      'https://github.com/kimen-dev/kimen/issues/123',
    ].join('\n');

    expect(extractMarkerValue(body, 'break-glass-justification')).toBe('first value');
    expect(extractMarkerValue(body, 'break-glass-restoration-issue')).toBe(
      'https://github.com/kimen-dev/kimen/issues/123',
    );
    expect(extractMarkerValue(body, 'missing')).toBe('');
    expect(extractMarkerValue(null, 'missing')).toBe('');
    expect(extractMarkerValue(body, 'break-glass-justification.*')).toBe('');
  });

  it('S3 validates the event-file CLI without executing marker contents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-break-glass-cli-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    const eventPath = join(root, 'event.json');
    const shellSentinel = join(root, 'must-not-exist');
    await writeFile(
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
            `Scanner outage; $(touch ${shellSentinel}) stays inert.`,
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

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ status: 'valid', reasons: [] });
    expect(existsSync(shellSentinel)).toBe(false);
  });

  it('S3 exposes only the declared CLI modes and requires an event path', async () => {
    await expect(runCli(['unsupported-command'], {})).rejects.toThrow(/usage:/);
    await expect(runCli(['validate-break-glass-event'], {})).rejects.toThrow(
      /GITHUB_EVENT_PATH is required/,
    );
    expect(ReviewEvidenceError.prototype).toBeInstanceOf(Error);
  });
});
