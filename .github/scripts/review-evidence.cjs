// @spec:018-project-integrity-hardening
'use strict';

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { TextDecoder } = require('node:util');

const CHECK_NAME = 'clean-context-review';
const PRODUCTION_REPOSITORY = 'kimen-dev/kimen';
const PRODUCTION_FOUNDER = 'MarsGotta';
const API_VERSION = '2022-11-28';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const LOWER_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REVIEWER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const PACKET_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/;
const MAX_PACKET_MANIFEST_BASE64_LENGTH = 60_000;
const MAX_PACKET_MANIFEST_BYTES = 45_000;
const MAX_PACKET_MANIFEST_FILES = 256;
const MAX_PACKET_FILE_BYTES = 32 * 1024 * 1024;
const MAX_PACKET_AGGREGATE_BYTES = 128 * 1024 * 1024;
const REQUIRED_PACKET_PATHS = [
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

class ReviewEvidenceError extends Error {
  constructor(message, decision) {
    super(message);
    this.name = 'ReviewEvidenceError';
    this.decision = decision;
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addUnknownKeyErrors(value, allowedKeys, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`${path} contains unknown field "${key}"`);
    }
  }
  return true;
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateRepository(value, path, errors, requireProduction = true) {
  if (typeof value !== 'string' || !REPOSITORY_PATTERN.test(value)) {
    errors.push(`${path} must be an owner/name repository identifier`);
  } else if (requireProduction && value !== PRODUCTION_REPOSITORY) {
    errors.push(`${path} must equal ${PRODUCTION_REPOSITORY}`);
  }
}

function isRepositoryIssueUrl(value, repository) {
  if (
    typeof value !== 'string' ||
    typeof repository !== 'string' ||
    !REPOSITORY_PATTERN.test(repository)
  ) {
    return false;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    return false;
  }

  const issuePathPrefix = `/${repository}/issues/`;
  if (!url.pathname.startsWith(issuePathPrefix)) {
    return false;
  }
  return /^[1-9][0-9]*$/.test(url.pathname.slice(issuePathPrefix.length));
}

function validateSha(value, path, errors) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) {
    errors.push(`${path} must be a 40-hex Git SHA`);
  }
}

function validateDigest(value, path, errors) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    errors.push(`${path} must be a 64-hex SHA-256 digest`);
  }
}

function validatePacketManifestFile(value, index, errors) {
  const path = `packet manifest files[${index}]`;
  if (!addUnknownKeyErrors(value, ['path', 'size', 'sha256'], path, errors)) {
    return;
  }

  if (
    typeof value.path !== 'string' ||
    value.path.length === 0 ||
    value.path.length > 512 ||
    !PACKET_PATH_PATTERN.test(value.path) ||
    value.path.startsWith('/') ||
    value.path.endsWith('/') ||
    value.path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    errors.push(`${path}.path must be a canonical relative packet path`);
  } else if (value.path === 'packet-manifest.json') {
    errors.push(`${path}.path must not contain the self-referential packet-manifest.json`);
  }
  if (!isNonNegativeInteger(value.size) || value.size > MAX_PACKET_FILE_BYTES) {
    errors.push(`${path}.size must be an integer from 0 through 33554432`);
  }
  if (typeof value.sha256 !== 'string' || !LOWER_SHA256_PATTERN.test(value.sha256)) {
    errors.push(`${path}.sha256 must be a lowercase 64-hex SHA-256 digest`);
  }
}

function validatePacketManifest(value, currentRevision, errors) {
  if (
    !addUnknownKeyErrors(
      value,
      ['schemaVersion', 'baseSha', 'headSha', 'files'],
      'packet manifest',
      errors,
    )
  ) {
    return null;
  }
  if (value.schemaVersion !== 1) {
    errors.push('packet manifest schemaVersion must equal 1');
  }
  validateSha(value.baseSha, 'packet manifest baseSha', errors);
  validateSha(value.headSha, 'packet manifest headSha', errors);
  if (value.baseSha !== currentRevision.baseSha) {
    errors.push('packet manifest baseSha does not match current revision baseSha');
  }
  if (value.headSha !== currentRevision.headSha) {
    errors.push('packet manifest headSha does not match current revision headSha');
  }
  if (
    !Array.isArray(value.files) ||
    value.files.length === 0 ||
    value.files.length > MAX_PACKET_MANIFEST_FILES
  ) {
    errors.push('packet manifest files must contain 1 through 256 regular files');
    return null;
  }

  let aggregateBytes = 0;
  let previousPath = null;
  const observedPaths = new Set();
  for (const [index, file] of value.files.entries()) {
    validatePacketManifestFile(file, index, errors);
    if (!isRecord(file) || typeof file.path !== 'string') {
      continue;
    }
    if (previousPath !== null && file.path <= previousPath) {
      errors.push('packet manifest files must be strictly sorted by path with no duplicates');
    }
    previousPath = file.path;
    observedPaths.add(file.path);
    if (isNonNegativeInteger(file.size)) {
      aggregateBytes += file.size;
      if (aggregateBytes > MAX_PACKET_AGGREGATE_BYTES) {
        errors.push('packet manifest aggregate file bytes exceed the 128 MiB limit');
        break;
      }
    }
  }
  for (const requiredPath of REQUIRED_PACKET_PATHS) {
    if (!observedPaths.has(requiredPath)) {
      errors.push(`packet manifest is missing required packet file ${requiredPath}`);
    }
  }
  if (errors.length > 0) {
    return null;
  }
  return {
    schemaVersion: value.schemaVersion,
    baseSha: value.baseSha,
    headSha: value.headSha,
    files: value.files.map((file) => ({
      path: file.path,
      size: file.size,
      sha256: file.sha256,
    })),
  };
}

function verifyPacketManifestBase64(source, currentRevision, attestation) {
  if (typeof source !== 'string' || source.length === 0) {
    throw new ReviewEvidenceError('packet manifest base64 is required');
  }
  if (
    source.length > MAX_PACKET_MANIFEST_BASE64_LENGTH ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source)
  ) {
    throw new ReviewEvidenceError(
      'packet manifest must be canonical base64 within 60000 characters',
    );
  }
  const bytes = Buffer.from(source, 'base64');
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PACKET_MANIFEST_BYTES ||
    bytes.toString('base64') !== source
  ) {
    throw new ReviewEvidenceError('packet manifest must decode canonically within 45000 bytes');
  }

  let text;
  let value;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    throw new ReviewEvidenceError('packet manifest must contain valid UTF-8 JSON');
  }
  const errors = [];
  const canonicalValue = validatePacketManifest(value, currentRevision, errors);
  if (errors.length > 0 || canonicalValue === null) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  const canonicalText = `${JSON.stringify(canonicalValue)}\n`;
  if (text !== canonicalText) {
    throw new ReviewEvidenceError('packet manifest bytes must use the canonical JSON encoding');
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (
    !isRecord(attestation) ||
    typeof attestation.packetSha256 !== 'string' ||
    digest !== attestation.packetSha256.toLowerCase()
  ) {
    throw new ReviewEvidenceError('packet manifest digest does not match attestation.packetSha256');
  }
  return { digest, manifest: canonicalValue };
}

function validateCurrentRevision(value, errors) {
  if (
    !addUnknownKeyErrors(
      value,
      ['repository', 'pullRequest', 'headSha', 'baseSha'],
      'currentRevision',
      errors,
    )
  ) {
    return;
  }

  validateRepository(value.repository, 'currentRevision.repository', errors);
  if (!isPositiveInteger(value.pullRequest)) {
    errors.push('currentRevision.pullRequest must be a positive integer');
  }
  validateSha(value.headSha, 'currentRevision.headSha', errors);
  validateSha(value.baseSha, 'currentRevision.baseSha', errors);
}

function validateAttestation(value, errors) {
  if (
    !addUnknownKeyErrors(
      value,
      [
        'schemaVersion',
        'repository',
        'pullRequest',
        'headSha',
        'baseSha',
        'packetSha256',
        'reportSha256',
        'reviewer',
        'round',
        'verdict',
        'openCritical',
        'openImportant',
      ],
      'attestation',
      errors,
    )
  ) {
    return;
  }

  if (value.schemaVersion !== 1) {
    errors.push('attestation.schemaVersion must equal 1');
  }
  validateRepository(value.repository, 'attestation.repository', errors);
  if (!isPositiveInteger(value.pullRequest)) {
    errors.push('attestation.pullRequest must be a positive integer');
  }
  validateSha(value.headSha, 'attestation.headSha', errors);
  validateSha(value.baseSha, 'attestation.baseSha', errors);
  validateDigest(value.packetSha256, 'attestation.packetSha256', errors);
  validateDigest(value.reportSha256, 'attestation.reportSha256', errors);
  if (typeof value.reviewer !== 'string' || !REVIEWER_PATTERN.test(value.reviewer)) {
    errors.push('attestation.reviewer must be a non-empty trusted reviewer identifier');
  }
  if (value.round !== 1 && value.round !== 2) {
    errors.push('attestation.round must equal 1 or 2');
  }
  if (value.verdict !== 'pass' && value.verdict !== 'fail') {
    errors.push('attestation.verdict must equal pass or fail');
  }
  if (!isNonNegativeInteger(value.openCritical)) {
    errors.push('attestation.openCritical must be a non-negative integer');
  }
  if (!isNonNegativeInteger(value.openImportant)) {
    errors.push('attestation.openImportant must be a non-negative integer');
  }
}

function validateRequiredChecks(value, errors) {
  if (!Array.isArray(value)) {
    errors.push('requiredChecks must be an array');
    return;
  }

  const contexts = new Set();
  for (const [index, check] of value.entries()) {
    const path = `requiredChecks[${index}]`;
    if (
      !addUnknownKeyErrors(check, ['context', 'headSha', 'integrationId', 'status'], path, errors)
    ) {
      continue;
    }

    if (typeof check.context !== 'string' || check.context.trim() === '') {
      errors.push(`${path}.context must be a non-empty string`);
    } else if (contexts.has(check.context)) {
      errors.push(`${path}.context duplicates required check "${check.context}"`);
    } else {
      contexts.add(check.context);
    }
    validateSha(check.headSha, `${path}.headSha`, errors);
    if (!isPositiveInteger(check.integrationId)) {
      errors.push(`${path}.integrationId must be a positive integer`);
    }
    if (!['pending', 'success', 'failure'].includes(check.status)) {
      errors.push(`${path}.status must equal pending, success or failure`);
    }
  }
}

function validateTrustedReviewers(value, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('trustedReviewers must be a non-empty array');
    return;
  }

  const reviewers = new Set();
  for (const [index, reviewer] of value.entries()) {
    if (typeof reviewer !== 'string' || !REVIEWER_PATTERN.test(reviewer)) {
      errors.push(`trustedReviewers[${index}] must be a reviewer identifier`);
    } else if (reviewers.has(reviewer)) {
      errors.push(`trustedReviewers[${index}] duplicates reviewer "${reviewer}"`);
    } else {
      reviewers.add(reviewer);
    }
  }
}

function decision(status, headSha, reasons) {
  return { status, headSha, reasons };
}

function evaluateReviewEvidence(payload) {
  const errors = [];
  if (
    !addUnknownKeyErrors(
      payload,
      ['currentRevision', 'attestation', 'requiredChecks', 'trustedReviewers'],
      'evaluation',
      errors,
    )
  ) {
    return decision('failure', null, errors);
  }

  validateCurrentRevision(payload.currentRevision, errors);
  validateRequiredChecks(payload.requiredChecks, errors);
  validateTrustedReviewers(payload.trustedReviewers, errors);
  const headSha =
    isRecord(payload.currentRevision) && typeof payload.currentRevision.headSha === 'string'
      ? payload.currentRevision.headSha
      : null;

  if (errors.length > 0) {
    return decision('failure', headSha, errors);
  }

  if (payload.attestation === null) {
    return decision('pending', headSha, ['missing review attestation for current revision']);
  }

  const attestationErrors = [];
  validateAttestation(payload.attestation, attestationErrors);
  if (attestationErrors.length > 0) {
    return decision('failure', headSha, attestationErrors);
  }

  const failures = [];
  const pending = [];
  const { attestation, currentRevision, requiredChecks, trustedReviewers } = payload;

  if (attestation.repository !== currentRevision.repository) {
    failures.push('attestation repository does not match current revision repository');
  }
  if (attestation.pullRequest !== currentRevision.pullRequest) {
    failures.push('attestation pullRequest does not match current revision pullRequest');
  }
  if (attestation.headSha !== currentRevision.headSha) {
    pending.push('attestation head SHA does not cover the current revision');
  }
  if (attestation.baseSha !== currentRevision.baseSha) {
    pending.push('attestation baseSha does not match the current revision baseSha');
  }
  if (!trustedReviewers.includes(attestation.reviewer)) {
    failures.push(`attestation reviewer "${attestation.reviewer}" is not trusted`);
  }
  if (attestation.verdict !== 'pass') {
    failures.push(`attestation verdict is ${attestation.verdict}, not pass`);
  }
  if (attestation.openCritical !== 0) {
    failures.push('attestation openCritical must be zero for a passing review');
  }
  if (attestation.openImportant !== 0) {
    failures.push('attestation openImportant must be zero for a passing review');
  }

  if (requiredChecks.length === 0) {
    pending.push('missing required checks for current revision');
  }
  for (const check of requiredChecks) {
    if (check.headSha !== currentRevision.headSha) {
      pending.push(`${check.context} head SHA does not cover the current revision`);
    } else if (check.status === 'failure') {
      failures.push(`${check.context} has failure status on the current revision`);
    } else if (check.status === 'pending') {
      pending.push(`${check.context} is pending on the current revision`);
    }
  }

  if (failures.length > 0) {
    return decision('failure', headSha, [...failures, ...pending]);
  }
  if (pending.length > 0) {
    return decision('pending', headSha, pending);
  }
  return decision('success', headSha, []);
}

function exitCodeForDecision(result) {
  if (result.status === 'success' || result.status === 'valid') {
    return 0;
  }
  if (result.status === 'pending') {
    return 2;
  }
  return 1;
}

function validateOptionalDetailsUrl(value, path, errors) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string') {
    errors.push(`${path} must be an HTTPS URL`);
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      errors.push(`${path} must be an HTTPS URL`);
    }
  } catch {
    errors.push(`${path} must be an HTTPS URL`);
  }
}

function validatePendingInput(input) {
  const errors = [];
  if (
    !addUnknownKeyErrors(
      input,
      ['repository', 'pullRequest', 'headSha', 'detailsUrl'],
      'pending input',
      errors,
    )
  ) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  validateRepository(input.repository, 'pending input.repository', errors);
  if (!isPositiveInteger(input.pullRequest)) {
    errors.push('pending input.pullRequest must be a positive integer');
  }
  validateSha(input.headSha, 'pending input.headSha', errors);
  validateOptionalDetailsUrl(input.detailsUrl, 'pending input.detailsUrl', errors);
  if (errors.length > 0) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
}

function validateCompleteInput(input) {
  const errors = [];
  if (
    !addUnknownKeyErrors(
      input,
      ['repository', 'checkRunId', 'evaluation', 'detailsUrl'],
      'complete input',
      errors,
    )
  ) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  validateRepository(input.repository, 'complete input.repository', errors);
  if (!isPositiveInteger(input.checkRunId)) {
    errors.push('complete input.checkRunId must be a positive integer');
  }
  validateOptionalDetailsUrl(input.detailsUrl, 'complete input.detailsUrl', errors);
  if (!isRecord(input.evaluation)) {
    errors.push('complete input.evaluation must be an object');
  }
  if (errors.length > 0) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
}

function normalizeCheckRun(value) {
  if (!isRecord(value) || !isPositiveInteger(value.id)) {
    throw new ReviewEvidenceError('GitHub returned an invalid Check Run response');
  }
  return {
    id: value.id,
    name: value.name,
    headSha: value.head_sha,
    status: value.status,
    conclusion: value.conclusion ?? null,
  };
}

function createCheckRunController(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const token = options.token ?? process.env.KIMEN_REVIEW_APP_TOKEN;
  const apiBaseUrl = (
    options.apiBaseUrl ??
    process.env.GITHUB_API_URL ??
    'https://api.github.com'
  ).replace(/\/$/, '');
  const now = options.now ?? (() => new Date());

  if (typeof fetchImpl !== 'function') {
    throw new ReviewEvidenceError('native fetch is unavailable');
  }
  if (typeof token !== 'string' || token.trim() === '') {
    throw new ReviewEvidenceError('dedicated review App token is required for Check Run updates');
  }
  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiBaseUrl);
  } catch {
    throw new ReviewEvidenceError('GitHub API base URL must be a valid HTTPS URL');
  }
  if (parsedApiUrl.protocol !== 'https:') {
    throw new ReviewEvidenceError('GitHub API base URL must be a valid HTTPS URL');
  }

  async function request(repository, suffix, method, body) {
    const response = await fetchImpl(`${apiBaseUrl}/repos/${repository}${suffix}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': API_VERSION,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response || typeof response.ok !== 'boolean') {
      throw new ReviewEvidenceError('GitHub Check Run request returned an invalid response');
    }
    if (!response.ok) {
      let detail;
      try {
        detail = (await response.text()).slice(0, 500);
      } catch {
        detail = '';
      }
      throw new ReviewEvidenceError(
        `GitHub Check Run request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      );
    }
    return response.json();
  }

  async function pending(input) {
    validatePendingInput(input);
    const body = {
      name: CHECK_NAME,
      head_sha: input.headSha,
      status: 'in_progress',
      external_id: `${CHECK_NAME}:pr:${input.pullRequest}:${input.headSha}`,
      ...(input.detailsUrl === undefined ? {} : { details_url: input.detailsUrl }),
      output: {
        title: 'Clean-context review pending',
        summary: `Waiting for founder-controlled review evidence for PR #${input.pullRequest} at ${input.headSha}.`,
      },
    };
    const created = normalizeCheckRun(await request(input.repository, '/check-runs', 'POST', body));
    if (created.name !== CHECK_NAME || created.headSha !== input.headSha) {
      throw new ReviewEvidenceError(
        'GitHub created a Check Run that is not bound to the requested head',
      );
    }
    return created;
  }

  async function complete(input) {
    validateCompleteInput(input);
    const evaluation = evaluateReviewEvidence(input.evaluation);
    if (evaluation.status !== 'success') {
      throw new ReviewEvidenceError(
        `review evidence is ${evaluation.status}: ${evaluation.reasons.join('; ')}`,
        evaluation,
      );
    }
    if (input.repository !== input.evaluation.currentRevision.repository) {
      throw new ReviewEvidenceError(
        'complete input.repository does not match evaluation currentRevision.repository',
        evaluation,
      );
    }

    const suffix = `/check-runs/${input.checkRunId}`;
    const existing = normalizeCheckRun(await request(input.repository, suffix, 'GET'));
    if (existing.name !== CHECK_NAME) {
      throw new ReviewEvidenceError(`Check Run name must equal ${CHECK_NAME}`, evaluation);
    }
    if (existing.headSha !== evaluation.headSha) {
      throw new ReviewEvidenceError(
        'Check Run head SHA does not match the current review revision',
        evaluation,
      );
    }
    if (existing.status === 'completed') {
      if (existing.conclusion === 'success') {
        return { decision: evaluation, checkRun: existing };
      }
      throw new ReviewEvidenceError(
        `refusing to overwrite completed Check Run conclusion ${existing.conclusion}`,
        evaluation,
      );
    }

    const { attestation } = input.evaluation;
    const completionBody = {
      status: 'completed',
      conclusion: 'success',
      completed_at: now().toISOString(),
      ...(input.detailsUrl === undefined ? {} : { details_url: input.detailsUrl }),
      output: {
        title: 'Clean-context review passed',
        summary: [
          `Validated review evidence for ${evaluation.headSha}.`,
          `Reviewer: ${attestation.reviewer}; round: ${attestation.round}.`,
          `Packet SHA-256: ${attestation.packetSha256}.`,
          `Report SHA-256: ${attestation.reportSha256}.`,
        ].join('\n'),
      },
    };
    const completed = normalizeCheckRun(
      await request(input.repository, suffix, 'PATCH', completionBody),
    );
    if (
      completed.name !== CHECK_NAME ||
      completed.headSha !== evaluation.headSha ||
      completed.status !== 'completed' ||
      completed.conclusion !== 'success'
    ) {
      throw new ReviewEvidenceError(
        'GitHub returned an unexpected completed Check Run',
        evaluation,
      );
    }
    return { decision: evaluation, checkRun: completed };
  }

  return { pending, complete };
}

function parseTrustedJson(source, path) {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new ReviewEvidenceError(`${path} is required`);
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new ReviewEvidenceError(`${path} must contain valid JSON`);
  }
}

function trustedIntegrationPolicy(source) {
  const value = parseTrustedJson(source, 'KIMEN_CHECK_INTEGRATIONS_JSON');
  if (!isRecord(value)) {
    throw new ReviewEvidenceError(
      'KIMEN_CHECK_INTEGRATIONS_JSON must map check names to GitHub App IDs',
    );
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new ReviewEvidenceError('KIMEN_CHECK_INTEGRATIONS_JSON must not be empty');
  }
  for (const [context, integrationId] of entries) {
    if (context.trim() !== context || context === '' || context.length > 200) {
      throw new ReviewEvidenceError(
        'KIMEN_CHECK_INTEGRATIONS_JSON contains an invalid check context',
      );
    }
    if (!isPositiveInteger(integrationId) || integrationId <= 1) {
      throw new ReviewEvidenceError(
        `KIMEN_CHECK_INTEGRATIONS_JSON must bind ${context} to an observed GitHub App ID`,
      );
    }
  }
  if (!Object.hasOwn(value, CHECK_NAME)) {
    throw new ReviewEvidenceError(
      `KIMEN_CHECK_INTEGRATIONS_JSON must bind ${CHECK_NAME} to its observed GitHub App ID`,
    );
  }
  if (entries.length === 1) {
    throw new ReviewEvidenceError(
      'KIMEN_CHECK_INTEGRATIONS_JSON must include at least one deterministic required check',
    );
  }
  const reviewIntegrationId = value[CHECK_NAME];
  if (
    entries.some(
      ([context, integrationId]) => context !== CHECK_NAME && integrationId === reviewIntegrationId,
    )
  ) {
    throw new ReviewEvidenceError(
      `${CHECK_NAME} must bind to a dedicated trusted GitHub App ID not shared by another required check`,
    );
  }
  return value;
}

function trustedReviewerPolicy(source) {
  const value = parseTrustedJson(source, 'KIMEN_TRUSTED_REVIEWERS_JSON');
  const errors = [];
  validateTrustedReviewers(value, errors);
  if (errors.length > 0) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  return value;
}

function createWorkflowGitHubClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const apiBaseUrl = (
    options.apiBaseUrl ??
    process.env.GITHUB_API_URL ??
    'https://api.github.com'
  ).replace(/\/$/, '');

  if (typeof fetchImpl !== 'function') {
    throw new ReviewEvidenceError('native fetch is unavailable');
  }
  if (typeof token !== 'string' || token.trim() === '') {
    throw new ReviewEvidenceError('GITHUB_TOKEN is required for GitHub state validation');
  }
  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiBaseUrl);
  } catch {
    throw new ReviewEvidenceError('GitHub API base URL must be a valid HTTPS URL');
  }
  if (parsedApiUrl.protocol !== 'https:') {
    throw new ReviewEvidenceError('GitHub API base URL must be a valid HTTPS URL');
  }

  async function request(repository, suffix) {
    const response = await fetchImpl(`${apiBaseUrl}/repos/${repository}${suffix}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': API_VERSION,
      },
    });
    if (!response || typeof response.ok !== 'boolean') {
      throw new ReviewEvidenceError('GitHub state request returned an invalid response');
    }
    if (!response.ok) {
      let detail;
      try {
        detail = (await response.text()).slice(0, 500);
      } catch {
        detail = '';
      }
      throw new ReviewEvidenceError(
        `GitHub state request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      );
    }
    return response.json();
  }

  return {
    getCheckRuns(repository, headSha) {
      return request(repository, `/commits/${headSha}/check-runs?filter=latest&per_page=100`);
    },
    getPullRequest(repository, pullRequest) {
      return request(repository, `/pulls/${pullRequest}`);
    },
  };
}

function normalizeCurrentPullRequest(value, repository, pullRequest) {
  const errors = [];
  if (!isRecord(value)) {
    throw new ReviewEvidenceError('GitHub returned an invalid current pull request');
  }
  if (value.number !== pullRequest) {
    errors.push('GitHub pull request number does not match the requested pull request');
  }
  if (value.state !== 'open') {
    errors.push('GitHub pull request must currently be open');
  }
  const head = isRecord(value.head) ? value.head : {};
  const base = isRecord(value.base) ? value.base : {};
  const baseRepository = isRecord(base.repo) ? base.repo : {};
  validateSha(head.sha, 'GitHub pull request head SHA', errors);
  validateSha(base.sha, 'GitHub pull request base SHA', errors);
  if (base.ref !== 'main') {
    errors.push('GitHub pull request base ref must equal main');
  }
  if (baseRepository.full_name !== repository) {
    errors.push('GitHub pull request base repository does not match the trusted repository');
  }
  if (errors.length > 0) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  return {
    repository,
    pullRequest,
    headSha: head.sha,
    baseSha: base.sha,
  };
}

function normalizeObservedCheckRuns(value) {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.total_count) ||
    !Array.isArray(value.check_runs)
  ) {
    throw new ReviewEvidenceError('GitHub returned an invalid Check Runs response');
  }
  if (value.total_count !== value.check_runs.length) {
    throw new ReviewEvidenceError(
      'GitHub Check Runs response was truncated; refusing incomplete required-check evidence',
    );
  }

  return value.check_runs.map((check, index) => {
    const errors = [];
    const app = isRecord(check?.app) ? check.app : {};
    if (!isRecord(check) || !isPositiveInteger(check.id)) {
      errors.push(`check_runs[${index}].id must be a positive integer`);
    }
    if (typeof check?.name !== 'string' || check.name === '') {
      errors.push(`check_runs[${index}].name must be non-empty`);
    }
    validateSha(check?.head_sha, `check_runs[${index}].head_sha`, errors);
    if (typeof check?.status !== 'string' || check.status === '') {
      errors.push(`check_runs[${index}].status must be non-empty`);
    }
    if (check?.conclusion !== null && typeof check?.conclusion !== 'string') {
      errors.push(`check_runs[${index}].conclusion must be a string or null`);
    }
    if (!isPositiveInteger(app.id)) {
      errors.push(`check_runs[${index}].app.id must be a positive integer`);
    }
    if (
      check?.external_id !== undefined &&
      check.external_id !== null &&
      typeof check.external_id !== 'string'
    ) {
      errors.push(`check_runs[${index}].external_id must be a string or null`);
    }
    if (errors.length > 0) {
      throw new ReviewEvidenceError(errors.join('; '));
    }
    return {
      id: check.id,
      name: check.name,
      headSha: check.head_sha,
      status: check.status,
      conclusion: check.conclusion,
      externalId: check.external_id ?? null,
      integrationId: app.id,
    };
  });
}

function latestMatchingCheck(checkRuns, predicate) {
  let latest = null;
  for (const check of checkRuns) {
    if (predicate(check) && (latest === null || check.id > latest.id)) {
      latest = check;
    }
  }
  return latest;
}

function requiredCheckStatus(check) {
  if (check === null || check.status !== 'completed') {
    return 'pending';
  }
  return check.conclusion === 'success' ? 'success' : 'failure';
}

function deriveRequiredChecks(checkRuns, currentRevision, integrationPolicy) {
  return Object.entries(integrationPolicy)
    .filter(([context]) => context !== CHECK_NAME)
    .map(([context, integrationId]) => {
      const observed = latestMatchingCheck(
        checkRuns,
        (check) =>
          check.name === context &&
          check.headSha === currentRevision.headSha &&
          check.integrationId === integrationId,
      );
      return {
        context,
        headSha: currentRevision.headSha,
        integrationId,
        status: requiredCheckStatus(observed),
      };
    });
}

function workflowRepository(eventPayload, env) {
  const errors = [];
  validateRepository(env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY', errors);
  const eventRepository = isRecord(eventPayload.repository) ? eventPayload.repository : {};
  if (eventRepository.full_name !== env.GITHUB_REPOSITORY) {
    errors.push('event repository does not match GITHUB_REPOSITORY');
  }
  if (errors.length > 0) {
    throw new ReviewEvidenceError(errors.join('; '));
  }
  return env.GITHUB_REPOSITORY;
}

function eventPullRequestNumber(value, path) {
  if (isPositiveInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9][0-9]*$/.test(value)) {
    const parsed = Number(value);
    if (isPositiveInteger(parsed)) {
      return parsed;
    }
  }
  throw new ReviewEvidenceError(`${path} must be a positive integer`);
}

function readReviewWorkflowEvent(env) {
  if (typeof env.GITHUB_EVENT_PATH !== 'string' || env.GITHUB_EVENT_PATH.trim() === '') {
    throw new ReviewEvidenceError('GITHUB_EVENT_PATH is required');
  }
  const eventPayload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  if (!isRecord(eventPayload)) {
    throw new ReviewEvidenceError('GITHUB_EVENT_PATH must contain a JSON object');
  }
  return eventPayload;
}

async function runPendingReviewWorkflow({ api, controller, env, eventPayload, repository }) {
  const allowedActions = ['opened', 'reopened', 'synchronize', 'ready_for_review'];
  if (env.GITHUB_EVENT_NAME !== 'pull_request_target') {
    throw new ReviewEvidenceError('pending review evidence requires pull_request_target');
  }
  if (!allowedActions.includes(eventPayload.action)) {
    throw new ReviewEvidenceError('unsupported pull_request_target action');
  }
  if (!isRecord(eventPayload.pull_request)) {
    throw new ReviewEvidenceError('event pull_request must be an object');
  }
  const pullRequest = eventPullRequestNumber(
    eventPayload.pull_request.number,
    'event pull_request.number',
  );
  const currentRevision = normalizeCurrentPullRequest(
    await api.getPullRequest(repository, pullRequest),
    repository,
    pullRequest,
  );
  return controller.pending({
    repository,
    pullRequest,
    headSha: currentRevision.headSha,
  });
}

async function runCompleteReviewWorkflow({ api, controller, env, eventPayload, repository }) {
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
    throw new ReviewEvidenceError('review completion requires workflow_dispatch');
  }
  if (env.KIMEN_FOUNDER_LOGIN !== PRODUCTION_FOUNDER || env.GITHUB_ACTOR !== PRODUCTION_FOUNDER) {
    throw new ReviewEvidenceError('review completion may be dispatched only by the founder');
  }
  if (env.GITHUB_REF !== 'refs/heads/main') {
    throw new ReviewEvidenceError('review completion requires refs/heads/main');
  }
  const inputErrors = [];
  if (
    !addUnknownKeyErrors(
      eventPayload.inputs,
      ['pull_request', 'attestation', 'packet_manifest_base64'],
      'workflow_dispatch inputs',
      inputErrors,
    )
  ) {
    throw new ReviewEvidenceError(inputErrors.join('; '));
  }
  if (inputErrors.length > 0) {
    throw new ReviewEvidenceError(inputErrors.join('; '));
  }
  const pullRequest = eventPullRequestNumber(
    eventPayload.inputs.pull_request,
    'workflow_dispatch inputs.pull_request',
  );
  const attestation = parseTrustedJson(
    eventPayload.inputs.attestation,
    'workflow_dispatch inputs.attestation',
  );
  const integrationPolicy = trustedIntegrationPolicy(env.KIMEN_CHECK_INTEGRATIONS_JSON);
  const trustedReviewers = trustedReviewerPolicy(env.KIMEN_TRUSTED_REVIEWERS_JSON);
  const currentRevision = normalizeCurrentPullRequest(
    await api.getPullRequest(repository, pullRequest),
    repository,
    pullRequest,
  );
  verifyPacketManifestBase64(
    eventPayload.inputs.packet_manifest_base64,
    currentRevision,
    attestation,
  );
  const checkRuns = normalizeObservedCheckRuns(
    await api.getCheckRuns(repository, currentRevision.headSha),
  );
  const reviewIntegrationId = integrationPolicy[CHECK_NAME];
  const expectedExternalId = `${CHECK_NAME}:pr:${pullRequest}:${currentRevision.headSha}`;
  const reviewCheck = latestMatchingCheck(
    checkRuns,
    (check) =>
      check.name === CHECK_NAME &&
      check.headSha === currentRevision.headSha &&
      check.integrationId === reviewIntegrationId &&
      check.externalId === expectedExternalId,
  );
  if (reviewCheck === null) {
    throw new ReviewEvidenceError(
      `missing current ${CHECK_NAME} Check Run from the trusted GitHub App`,
    );
  }

  const evaluation = {
    currentRevision,
    attestation,
    requiredChecks: deriveRequiredChecks(checkRuns, currentRevision, integrationPolicy),
    trustedReviewers,
  };
  const evaluationDecision = evaluateReviewEvidence(evaluation);
  if (evaluationDecision.status !== 'success') {
    throw new ReviewEvidenceError(
      `review evidence is ${evaluationDecision.status}: ${evaluationDecision.reasons.join('; ')}`,
      evaluationDecision,
    );
  }
  return controller.complete({
    repository,
    checkRunId: reviewCheck.id,
    evaluation,
  });
}

async function runReviewEvidenceWorkflow(options = {}) {
  const env = options.env ?? process.env;
  const eventPayload = options.eventPayload ?? readReviewWorkflowEvent(env);
  if (!isRecord(eventPayload)) {
    throw new ReviewEvidenceError('workflow event payload must be a JSON object');
  }
  const repository = workflowRepository(eventPayload, env);
  const api = createWorkflowGitHubClient({
    fetchImpl: options.fetchImpl,
    token: env.GITHUB_TOKEN,
    apiBaseUrl: env.GITHUB_API_URL,
  });
  const controller =
    options.controller ??
    createCheckRunController({
      fetchImpl: options.fetchImpl,
      token: env.KIMEN_REVIEW_APP_TOKEN,
      apiBaseUrl: env.GITHUB_API_URL,
    });

  if (env.KIMEN_REVIEW_MODE === 'pending') {
    return runPendingReviewWorkflow({ api, controller, env, eventPayload, repository });
  }
  if (env.KIMEN_REVIEW_MODE === 'complete') {
    return runCompleteReviewWorkflow({ api, controller, env, eventPayload, repository });
  }
  throw new ReviewEvidenceError('KIMEN_REVIEW_MODE must equal pending or complete');
}

function validateBreakGlass(payload) {
  const reasons = [];
  if (!addUnknownKeyErrors(payload, ['policy', 'event', 'request'], 'break-glass input', reasons)) {
    return { status: 'invalid', reasons };
  }

  const { policy, event, request } = payload;
  if (
    !addUnknownKeyErrors(
      policy,
      ['repository', 'founderLogin', 'requiredLabel', 'bypassMode'],
      'policy',
      reasons,
    )
  ) {
    return { status: 'invalid', reasons };
  }
  if (
    !addUnknownKeyErrors(
      event,
      ['eventName', 'repository', 'actor', 'pullRequest'],
      'event',
      reasons,
    )
  ) {
    return { status: 'invalid', reasons };
  }
  if (
    !addUnknownKeyErrors(
      request,
      ['bypassMode', 'justification', 'restorationIssue'],
      'request',
      reasons,
    )
  ) {
    return { status: 'invalid', reasons };
  }
  if (
    !addUnknownKeyErrors(
      event.pullRequest,
      ['number', 'author', 'headSha', 'labels'],
      'event.pullRequest',
      reasons,
    )
  ) {
    return { status: 'invalid', reasons };
  }

  validateRepository(policy.repository, 'policy.repository', reasons);
  if (typeof policy.founderLogin !== 'string' || policy.founderLogin.trim() === '') {
    reasons.push('policy founderLogin must identify the founder');
  }
  if (typeof policy.requiredLabel !== 'string' || policy.requiredLabel.trim() === '') {
    reasons.push('policy requiredLabel must be non-empty');
  }
  if (policy.bypassMode !== 'pull_request') {
    reasons.push('policy bypass mode must equal pull_request');
  }
  if (event.eventName !== 'pull_request_target') {
    reasons.push('event must be pull_request_target');
  }
  if (event.repository !== policy.repository) {
    reasons.push('event repository must match trusted policy repository');
  }
  if (event.actor !== policy.founderLogin) {
    reasons.push('event actor must be the founder');
  }
  if (!isPositiveInteger(event.pullRequest.number)) {
    reasons.push('pull request number must be a positive integer');
  }
  if (event.pullRequest.author !== policy.founderLogin) {
    reasons.push('pull request author must be the founder');
  }
  validateSha(event.pullRequest.headSha, 'event.pullRequest.headSha', reasons);
  if (
    !Array.isArray(event.pullRequest.labels) ||
    !event.pullRequest.labels.every((label) => typeof label === 'string')
  ) {
    reasons.push('pull request labels must be strings');
  } else if (!event.pullRequest.labels.includes(policy.requiredLabel)) {
    reasons.push(`pull request requires ${policy.requiredLabel} label`);
  }
  if (request.bypassMode !== 'pull_request' || request.bypassMode !== policy.bypassMode) {
    reasons.push('request bypass mode must equal pull_request');
  }
  if (typeof request.justification !== 'string' || request.justification.trim() === '') {
    reasons.push('break-glass justification is required');
  }
  if (!isRepositoryIssueUrl(request.restorationIssue, policy.repository)) {
    reasons.push('restoration issue must be an issue URL in the policy repository');
  }

  return reasons.length === 0 ? { status: 'valid', reasons: [] } : { status: 'invalid', reasons };
}

function extractMarkerValue(body, marker) {
  if (typeof body !== 'string' || typeof marker !== 'string' || !/^[a-z0-9-]+$/i.test(marker)) {
    return '';
  }

  const normalizedMarker = marker.toLowerCase();
  const markerPattern = /<!--\s*([a-z0-9-]+)\s*-->/gi;
  let selectedEnd = null;
  let match;
  while ((match = markerPattern.exec(body)) !== null) {
    if (selectedEnd !== null) {
      return body.slice(selectedEnd, match.index).trim();
    }
    if (match[1].toLowerCase() === normalizedMarker) {
      selectedEnd = markerPattern.lastIndex;
    }
  }
  return selectedEnd === null ? '' : body.slice(selectedEnd).trim();
}

function breakGlassPayloadFromEvent(eventPayload, env = process.env) {
  if (!isRecord(eventPayload)) {
    throw new ReviewEvidenceError('GITHUB_EVENT_PATH must contain a JSON object');
  }
  const pullRequest = isRecord(eventPayload.pull_request) ? eventPayload.pull_request : {};
  const repository = isRecord(eventPayload.repository) ? eventPayload.repository : {};
  const author = isRecord(pullRequest.user) ? pullRequest.user : {};
  const head = isRecord(pullRequest.head) ? pullRequest.head : {};
  const labels = Array.isArray(pullRequest.labels)
    ? pullRequest.labels.map((label) => (isRecord(label) ? label.name : null))
    : [];
  const trustedRepository = env.GITHUB_REPOSITORY;
  const founderLogin = env.KIMEN_FOUNDER_LOGIN;

  if (typeof trustedRepository !== 'string' || typeof founderLogin !== 'string') {
    throw new ReviewEvidenceError(
      'GITHUB_REPOSITORY and KIMEN_FOUNDER_LOGIN are required trusted policy inputs',
    );
  }

  return {
    policy: {
      repository: trustedRepository,
      founderLogin,
      requiredLabel: env.KIMEN_BREAK_GLASS_LABEL ?? 'break-glass',
      bypassMode: 'pull_request',
    },
    event: {
      eventName: env.GITHUB_EVENT_NAME,
      repository: repository.full_name,
      actor: env.GITHUB_ACTOR,
      pullRequest: {
        number: pullRequest.number,
        author: author.login,
        headSha: head.sha,
        labels,
      },
    },
    request: {
      bypassMode: 'pull_request',
      justification: extractMarkerValue(pullRequest.body, 'break-glass-justification'),
      restorationIssue: extractMarkerValue(pullRequest.body, 'break-glass-restoration-issue'),
    },
  };
}

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const source = Buffer.concat(chunks).toString('utf8');
  if (source.trim() === '') {
    throw new ReviewEvidenceError('expected one JSON object on stdin');
  }
  return JSON.parse(source);
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function runCli(argv = process.argv.slice(2), env = process.env) {
  const [command] = argv;
  if (command === 'evaluate') {
    const result = evaluateReviewEvidence(await readStandardInput());
    writeJson(result);
    return exitCodeForDecision(result);
  }
  if (command === 'pending') {
    const result = await createCheckRunController().pending(await readStandardInput());
    writeJson(result);
    return 0;
  }
  if (command === 'complete') {
    const result = await createCheckRunController().complete(await readStandardInput());
    writeJson(result);
    return 0;
  }
  if (command === 'review-workflow') {
    const result = await runReviewEvidenceWorkflow({ env });
    writeJson(result);
    return 0;
  }
  if (command === 'validate-break-glass') {
    const result = validateBreakGlass(await readStandardInput());
    writeJson(result);
    return exitCodeForDecision(result);
  }
  if (command === 'validate-break-glass-event') {
    if (typeof env.GITHUB_EVENT_PATH !== 'string' || env.GITHUB_EVENT_PATH.trim() === '') {
      throw new ReviewEvidenceError('GITHUB_EVENT_PATH is required');
    }
    const eventPayload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    const result = validateBreakGlass(breakGlassPayloadFromEvent(eventPayload, env));
    writeJson(result);
    return exitCodeForDecision(result);
  }
  if (command === 'break-glass-payload-event') {
    if (typeof env.GITHUB_EVENT_PATH !== 'string' || env.GITHUB_EVENT_PATH.trim() === '') {
      throw new ReviewEvidenceError('GITHUB_EVENT_PATH is required');
    }
    const eventPayload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    writeJson(breakGlassPayloadFromEvent(eventPayload, env));
    return 0;
  }
  throw new ReviewEvidenceError(
    'usage: review-evidence.cjs evaluate|pending|complete|review-workflow|validate-break-glass|validate-break-glass-event|break-glass-payload-event',
  );
}

module.exports = {
  API_VERSION,
  CHECK_NAME,
  ReviewEvidenceError,
  breakGlassPayloadFromEvent,
  createCheckRunController,
  evaluateReviewEvidence,
  exitCodeForDecision,
  extractMarkerValue,
  runReviewEvidenceWorkflow,
  runCli,
  validateBreakGlass,
};

if (require.main === module) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      const result =
        error instanceof ReviewEvidenceError && error.decision
          ? error.decision
          : { status: 'failure', headSha: null, reasons: [error.message] };
      writeJson(result);
      process.exitCode = exitCodeForDecision(result);
    });
}
