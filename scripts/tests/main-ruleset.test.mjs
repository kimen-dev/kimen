// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';
import { canonicalJson, canonicalJsonSha256, sha256 } from '../lib/canonical-json.mjs';

const currentHeadSha = '1111111111111111111111111111111111111111';
const staleHeadSha = '2222222222222222222222222222222222222222';
const githubActionsAppId = 15_368;
const socketAppId = 156_372;
const reviewAppId = githubActionsAppId;
const reviewPullRequest = 42;
const founderLogin = 'MarsGotta';
const founderUserId = 9_072_675;
const restorationIssue = 123;
const productionCheckContexts = [
  'gates',
  'mutation',
  'containment',
  'analyze',
  'semgrep',
  'osv-scan / osv-scan',
  'dependency-review',
  'secrets',
  'Socket Security: Pull Request Alerts',
];
const productionIntegrationPolicy = {
  gates: githubActionsAppId,
  mutation: githubActionsAppId,
  containment: githubActionsAppId,
  analyze: githubActionsAppId,
  semgrep: githubActionsAppId,
  'osv-scan / osv-scan': githubActionsAppId,
  'dependency-review': githubActionsAppId,
  secrets: githubActionsAppId,
  'Socket Security: Pull Request Alerts': socketAppId,
  'clean-context-review': reviewAppId,
};
const rollbackSchema = 'kimen-ruleset-rollback-v1';
const createIntentSchema = 'kimen-ruleset-create-intent-v1';
const exclusiveWriterConfirmation = 'founder-confirms-exclusive-ruleset-writer';
const breakGlassConfirmation = 'founder-opens-current-pr-only-bypass';
const subjectPath = fileURLToPath(
  new URL('../../.github/scripts/review-evidence.cjs', import.meta.url),
);
const applyRulesetPath = fileURLToPath(
  new URL('../../scripts/github/apply-main-ruleset.sh', import.meta.url),
);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

async function readRuleset() {
  const source = await readFile(
    new URL('../../.github/rulesets/main.json', import.meta.url),
    'utf8',
  );
  return JSON.parse(source);
}

function findRule(ruleset, type) {
  return ruleset.rules.find((rule) => rule.type === type);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function aUserBypass(actorId) {
  return { actor_id: actorId, actor_type: 'User', bypass_mode: 'pull_request' };
}

function currentGreenRequiredCheckRuns() {
  return productionCheckContexts.map((name, index) => ({
    id: 8_000 + index,
    name,
    head_sha: currentHeadSha,
    status: 'completed',
    conclusion: 'success',
    app: { id: productionIntegrationPolicy[name] },
    external_id: `fixture:${name}:${currentHeadSha}`,
  }));
}

function missingSecurityFamilies(requiredChecks) {
  const contexts = requiredChecks.map(({ context }) => context).join('\n');
  return [
    ['deterministic gates', /gates/i],
    ['CodeQL', /analyze/i],
    ['Semgrep', /semgrep/i],
    ['OSV', /osv/i],
    ['dependency review', /dependency.*review/i],
    ['secret scanning', /secret/i],
    ['Socket', /socket/i],
  ]
    .filter(([, pattern]) => !pattern.test(contexts))
    .map(([name]) => name);
}

function aBreakGlassRequest(overrides = {}) {
  return {
    policy: {
      repository: 'kimen-dev/kimen',
      founderLogin,
      requiredLabel: 'break-glass',
      bypassMode: 'pull_request',
    },
    event: {
      eventName: 'pull_request_target',
      repository: 'kimen-dev/kimen',
      actor: founderLogin,
      pullRequest: {
        number: 42,
        author: founderLogin,
        headSha: currentHeadSha,
        labels: ['break-glass'],
      },
    },
    request: {
      bypassMode: 'pull_request',
      justification: 'The security scanner is unavailable and blocks an urgent patch.',
      restorationIssue: 'https://github.com/kimen-dev/kimen/issues/123',
    },
    ...overrides,
  };
}

function validateBreakGlass(payload) {
  const result = spawnSync(process.execPath, [subjectPath, 'validate-break-glass'], {
    encoding: 'utf8',
    input: `${JSON.stringify(payload)}\n`,
  });
  const stdout = result.stdout.trim();

  assert.notEqual(
    stdout,
    '',
    `break-glass validation must emit one JSON decision; stderr:\n${result.stderr}`,
  );

  return {
    decision: JSON.parse(stdout),
    exitCode: result.status,
  };
}

function renderRuleset(env = {}) {
  return spawnSync('bash', [applyRulesetPath, '--render'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });
}

const fakeGhSource = [
  `#!${process.execPath}`,
  "const { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } = require('node:fs');",
  'const statePath = process.env.FAKE_GH_STATE;',
  "const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { calls: [], payload: null, existingId: null, deleted: false };",
  'const args = process.argv.slice(2);',
  'state.calls.push(args);',
  'const save = () => writeFileSync(statePath, JSON.stringify(state));',
  "if (args[0] === 'auth') { if (process.env.FAKE_GH_SWAP_BACKUP_PATH) { writeFileSync(process.env.FAKE_GH_SWAP_BACKUP_PATH, process.env.FAKE_GH_SWAP_BACKUP_BYTES); writeFileSync(process.env.FAKE_GH_SWAP_BACKUP_PATH + '.sha256', process.env.FAKE_GH_SWAP_BACKUP_DIGEST + '\\n'); } save(); process.exit(0); }",
  "if (args[0] !== 'api') { save(); process.exit(2); }",
  "const endpoint = args.find((value) => value.startsWith('repos/')) || '';",
  "const methodIndex = args.indexOf('--method');",
  "const method = methodIndex === -1 ? 'GET' : args[methodIndex + 1];",
  "const inputIndex = args.indexOf('--input');",
  "if (endpoint === '' && args.includes('user') && method === 'GET') { save(); process.stdout.write(JSON.stringify(state.authenticatedUser) + '\\n'); process.exit(0); }",
  "if (endpoint.endsWith('/pulls/42') && method === 'GET') { state.pullRequestReads = (state.pullRequestReads || 0) + 1; if (process.env.FAKE_GH_MOVE_HEAD_ON_SECOND_PR_GET === '1' && state.pullRequestReads === 2) { const movedHead = '2222222222222222222222222222222222222222'; state.pullRequest.head.sha = movedHead; state.checkRuns = state.checkRuns.map((check) => ({ ...check, head_sha: movedHead, external_id: check.name === 'clean-context-review' ? 'clean-context-review:pr:42:' + movedHead : check.external_id })); } save(); process.stdout.write(JSON.stringify(state.pullRequest) + '\\n'); process.exit(0); }",
  "if (endpoint.endsWith('/issues/123') && method === 'GET') { save(); process.stdout.write(JSON.stringify(state.restorationIssue) + '\\n'); process.exit(0); }",
  "if (/\\/commits\\/[0-9a-f]{40}\\/check-runs$/i.test(endpoint) && method === 'GET') { save(); process.stdout.write(JSON.stringify({ total_count: state.checkRuns.length, check_runs: state.checkRuns }) + '\\n'); process.exit(0); }",
  "const excludesParents = args.includes('includes_parents=false');",
  "if (endpoint.endsWith('/rulesets') && method === 'GET') { if (process.env.FAKE_GH_SWAP_BACKUP_ANCESTOR && !state.ancestorSwapped) { const ancestor = process.env.FAKE_GH_SWAP_BACKUP_ANCESTOR; const backup = process.env.FAKE_GH_SWAP_BACKUP_DIRECTORY; renameSync(ancestor, ancestor + '.original'); mkdirSync(ancestor, { mode: 0o700 }); renameSync(ancestor + '.original' + backup.slice(ancestor.length), backup); state.ancestorSwapped = true; } if (state.existingId) process.stdout.write(String(state.existingId) + '\\n'); if (!excludesParents && state.inheritedId) process.stdout.write(String(state.inheritedId) + '\\n'); save(); process.exit(0); }",
  "if (endpoint.endsWith('/rulesets') && method === 'POST') { const entries = readdirSync(process.env.KIMEN_RULESET_BACKUP_DIR); const intent = entries.find((entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256')); state.journalBeforePost = Boolean(intent && entries.includes(intent + '.sha256') && (statSync(process.env.KIMEN_RULESET_BACKUP_DIR + '/' + intent).mode & 0o777) === 0o600); if (process.env.KIMEN_FSYNC_LOG) appendFileSync(process.env.KIMEN_FSYNC_LOG, 'REMOTE POST\\n'); const postMode = process.env.FAKE_GH_POST_MODE; if (postMode === 'error-no-mutate') { save(); process.exit(1); } if (postMode === 'concurrent-error-no-mutate') { state.payload = JSON.parse(readFileSync(args[inputIndex + 1], 'utf8')); state.existingId = 88; state.concurrentCreation = true; save(); process.exit(1); } state.payload = JSON.parse(readFileSync(args[inputIndex + 1], 'utf8')); state.existingId = 77; state.mutationCount = (state.mutationCount || 0) + 1; save(); if (process.env.FAKE_GH_BREAK_BACKUP_DIR === '1') chmodSync(process.env.KIMEN_RULESET_BACKUP_DIR, 0o500); if (postMode === 'mutate-error') process.exit(1); if (postMode === 'malformed-success') { process.stdout.write('{malformed\\n'); process.exit(0); } process.stdout.write('{\"id\":77}\\n'); process.exit(0); }",
  "if (/\\/rulesets\\/[0-9]+$/.test(endpoint) && method === 'PUT') { const input = args[inputIndex + 1] === '-' ? readFileSync(0, 'utf8') : readFileSync(args[inputIndex + 1], 'utf8'); const requested = JSON.parse(input); state.putPayloads = [...(state.putPayloads || []), requested]; const putNumber = state.putPayloads.length; const putMode = String(putNumber) === process.env.FAKE_GH_PUT_ERROR_ON_N ? 'error-no-mutate' : process.env.FAKE_GH_PUT_MODE; if (process.env.FAKE_GH_PUT_NOOP !== '1' && putMode !== 'error-no-mutate') { state.payload = requested; state.mutationCount = (state.mutationCount || 0) + 1; if (requested.enforcement === 'active' && process.env.FAKE_GH_FAIL_REQUIRED_AFTER_ACTIVATION && !state.requiredCheckDrifted) { const context = process.env.FAKE_GH_FAIL_REQUIRED_AFTER_ACTIVATION; const prior = state.checkRuns.filter((check) => check.name === context).sort((left, right) => right.id - left.id)[0]; if (prior) state.checkRuns.push({ ...prior, id: Math.max(...state.checkRuns.map((check) => check.id)) + 1, status: 'completed', conclusion: 'failure', external_id: 'post-put-drift' }); state.requiredCheckDrifted = true; } if (requested.bypass_actors?.length === 1) { if (process.env.FAKE_GH_MERGE_AFTER_GRANT === '1') { state.pullRequest.state = 'closed'; state.pullRequest.merged = true; state.pullRequest.merge_commit_sha = '3333333333333333333333333333333333333333'; } if (process.env.FAKE_GH_CHANGE_HEAD_AFTER_GRANT === '1') state.pullRequest.head.sha = '2222222222222222222222222222222222222222'; if (process.env.FAKE_GH_EDIT_BODY_AFTER_GRANT === '1') state.pullRequest.body = state.pullRequest.body.replace('urgent repair', 'different emergency'); } } save(); if (putMode === 'mutate-error' || putMode === 'error-no-mutate') process.exit(1); process.stdout.write(JSON.stringify(requested) + '\\n'); process.exit(0); }",
  "if (/\\/rulesets\\/[0-9]+$/.test(endpoint) && method === 'GET') { const include = args.includes('--include'); const forcedStatus = process.env.FAKE_GH_DETAIL_GET_HTTP_STATUS; const requestedId = Number(endpoint.slice(endpoint.lastIndexOf('/') + 1)); const inherited = state.inheritedId === requestedId; if (process.env.FAKE_GH_DETAIL_GET_NETWORK_ERROR === '1' || process.env.FAKE_GH_DETAIL_GET_ERROR === '1' || (process.env.FAKE_GH_DETAIL_GET_ERROR_AFTER_MUTATION === '1' && (state.mutationCount || 0) > 0)) { save(); process.exit(1); } if (forcedStatus) { if (include) process.stdout.write('HTTP/2 ' + forcedStatus + ' Forced\\n\\n'); save(); process.exit(1); } if (process.env.FAKE_GH_DETAIL_GET_ERROR_ONCE_AFTER_MUTATION === '1' && (state.mutationCount || 0) > 0 && !state.detailGetErrorUsed) { state.detailGetErrorUsed = true; save(); process.exit(1); } if ((!state.existingId && !inherited) || (inherited && excludesParents)) { if (include) process.stdout.write('HTTP/2 404 Not Found\\n\\n'); save(); process.exit(1); } if (include) process.stdout.write('HTTP/2 200 OK\\n\\n'); const selectedId = inherited ? state.inheritedId : state.existingId; const responseId = process.env.FAKE_GH_DETAIL_ID_OVERRIDE ? Number(process.env.FAKE_GH_DETAIL_ID_OVERRIDE) : selectedId; const selectedPayload = inherited ? state.inheritedPayload : state.payload; const sourceType = process.env.FAKE_GH_DETAIL_SOURCE_TYPE || (inherited ? 'Organization' : 'Repository'); const source = process.env.FAKE_GH_DETAIL_SOURCE || (inherited ? 'kimen-dev' : 'kimen-dev/kimen'); const payload = { id: responseId, source_type: sourceType, source, ...structuredClone(selectedPayload) }; const mismatch = process.env.FAKE_GH_MISMATCH; if ((mismatch === 'once-after-mutation' && (state.mutationCount || 0) > 0 && !state.mismatchUsed) || (mismatch === 'active-once' && payload.enforcement === 'active' && !state.mismatchUsed)) { state.mismatchUsed = true; payload.enforcement = payload.enforcement === 'active' ? 'disabled' : 'active'; } if (process.env.FAKE_GH_SWAP_WRITER_LOCK_AFTER_MUTATION === '1' && (state.mutationCount || 0) > 0 && !state.writerLockSwapped) { const lock = process.env.KIMEN_RULESET_BACKUP_DIR + '/.exclusive-writer.lock'; renameSync(lock, lock + '.original'); mkdirSync(lock, { mode: 0o700 }); state.writerLockSwapped = true; } save(); process.stdout.write(JSON.stringify(payload) + '\\n'); process.exit(0); }",
  "if (/\\/rulesets\\/[0-9]+$/.test(endpoint) && method === 'DELETE') { const deleteMode = process.env.FAKE_GH_DELETE_MODE; if (process.env.FAKE_GH_DELETE_NOOP !== '1' && deleteMode !== 'error-no-mutate') { state.deleted = true; state.existingId = null; state.mutationCount = (state.mutationCount || 0) + 1; } save(); if (deleteMode === 'mutate-error' || deleteMode === 'error-no-mutate') process.exit(1); process.exit(0); }",
  'save();',
  'process.exit(3);',
].join('\n');

async function createFakeGitHub(t) {
  const directory = await mkdtemp(join(await realpath(tmpdir()), 'kimen-ruleset-gh-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const ghPath = join(directory, 'gh');
  const statePath = join(directory, 'state.json');
  const backupDirectory = join(directory, 'backups');
  await writeFile(ghPath, `${fakeGhSource}\n`);
  await chmod(ghPath, 0o755);
  await writeFile(
    statePath,
    JSON.stringify({
      calls: [],
      putPayloads: [],
      payload: null,
      existingId: null,
      deleted: false,
      pullRequest: {
        number: reviewPullRequest,
        state: 'open',
        merged: false,
        user: { login: founderLogin },
        base: { ref: 'main', repo: { full_name: 'kimen-dev/kimen' } },
        head: { sha: currentHeadSha },
        labels: [{ name: 'break-glass' }],
        body: [
          '<!-- break-glass-justification -->',
          'A required security scanner is unavailable during an urgent repair.',
          '<!-- break-glass-restoration-issue -->',
          `https://github.com/kimen-dev/kimen/issues/${restorationIssue}`,
          '<!-- break-glass-end -->',
        ].join('\n'),
      },
      authenticatedUser: { id: founderUserId, login: founderLogin, type: 'User' },
      restorationIssue: {
        number: restorationIssue,
        state: 'open',
        html_url: `https://github.com/kimen-dev/kimen/issues/${restorationIssue}`,
      },
      checkRuns: [
        ...currentGreenRequiredCheckRuns(),
        {
          id: 9_001,
          name: 'clean-context-review',
          head_sha: currentHeadSha,
          status: 'completed',
          conclusion: 'success',
          app: { id: reviewAppId },
          external_id: `clean-context-review:pr:${reviewPullRequest}:${currentHeadSha}`,
        },
      ],
    }),
  );
  return { directory, statePath, backupDirectory };
}

async function updateFakeGitHubState(fake, update) {
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await writeFile(fake.statePath, JSON.stringify({ ...state, ...update }));
}

async function assertNoRulesetMutation(fake) {
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(
    state.calls.some(
      (call) => call.includes('POST') || call.includes('PUT') || call.includes('DELETE'),
    ),
    false,
  );
}

async function liveRulesetEnvironment(fake, overrides = {}) {
  const integrations = { ...productionIntegrationPolicy };
  return {
    ...process.env,
    PATH: `${fake.directory}:${process.env.PATH}`,
    FAKE_GH_STATE: fake.statePath,
    KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify(integrations),
    KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER: exclusiveWriterConfirmation,
    KIMEN_CONFIRM_BREAK_GLASS_SESSION: breakGlassConfirmation,
    KIMEN_BREAK_GLASS_TIMEOUT_SECONDS: '1',
    KIMEN_REVIEW_PULL_REQUEST: String(reviewPullRequest),
    KIMEN_RULESET_BACKUP_DIR: fake.backupDirectory,
    ...overrides,
  };
}

async function activateMainRuleset(fake, env) {
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...env,
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });
  assert.equal(activated.status, 0, activated.stderr || activated.stdout);
  await updateFakeGitHubState(fake, { calls: [], putPayloads: [] });
}

function openBreakGlass(env, overrides = {}) {
  return spawnSync('bash', [applyRulesetPath, '--open-break-glass', String(reviewPullRequest)], {
    encoding: 'utf8',
    env: { ...env, ...overrides },
    timeout: 10_000,
  });
}

function closeBreakGlass(evidence, env, overrides = {}) {
  return spawnSync('bash', [applyRulesetPath, '--close-break-glass', evidence], {
    encoding: 'utf8',
    env: { ...env, ...overrides },
    timeout: 10_000,
  });
}

function terminateBreakGlassAfterGrant(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'bash',
      [applyRulesetPath, '--open-break-glass', String(reviewPullRequest)],
      {
        env: { ...env, KIMEN_BREAK_GLASS_TIMEOUT_SECONDS: '30' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stderr = '';
    let stdout = '';
    let terminated = false;
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`break-glass session did not open before test timeout\n${stderr}`));
    }, 20_000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (!terminated && stderr.includes('BREAK-GLASS OPEN')) {
        terminated = true;
        child.kill('SIGTERM');
      }
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stderr, stdout });
    });
  });
}

async function breakGlassEvidence(fake) {
  const entries = await readdir(fake.backupDirectory);
  const evidence = entries.find(
    (entry) => entry.startsWith('break-glass-') && !entry.endsWith('.sha256'),
  );
  assert.ok(evidence, 'break-glass session must persist recovery evidence');
  return join(fake.backupDirectory, evidence);
}

async function installFsyncProbe(fake) {
  const logPath = join(fake.directory, 'fsync.log');
  const nodePath = join(fake.directory, 'node');
  await writeFile(
    nodePath,
    `#!/bin/sh\ncase "$2" in\n  *fs.fsyncSync*)\n    printf '%s\\n' "$3" >> "$KIMEN_FSYNC_LOG"\n    if [ -n "$KIMEN_FSYNC_FAIL_PATH" ] && [ "$3" = "$KIMEN_FSYNC_FAIL_PATH" ]; then\n      exit 74\n    fi\n    case "$3" in\n      */main-before-*.sha256)\n        if [ -n "$KIMEN_FSYNC_DRIFT_STATE" ] && [ ! -e "$KIMEN_FSYNC_DRIFT_MARKER" ]; then\n          ${JSON.stringify(process.execPath)} -e 'const fs = require("node:fs"); const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); state.payload = { ...state.payload, enforcement: "evaluate" }; fs.writeFileSync(process.argv[1], JSON.stringify(state)); fs.writeFileSync(process.argv[2], "drifted\\n");' "$KIMEN_FSYNC_DRIFT_STATE" "$KIMEN_FSYNC_DRIFT_MARKER"\n        fi\n        ;;\n    esac\n    ;;\nesac\nexec ${JSON.stringify(process.execPath)} "$@"\n`,
  );
  await chmod(nodePath, 0o755);
  return logPath;
}

async function installChmodSwapProbe(fake) {
  const directory = join(fake.directory, 'chmod-swap-bin');
  const chmodPath = join(directory, 'chmod');
  await mkdir(directory, { mode: 0o700 });
  await writeFile(
    chmodPath,
    `#!${process.execPath}
const { existsSync, renameSync, symlinkSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[1] === process.env.FAKE_CHMOD_SWAP_PATH && !existsSync(process.env.FAKE_CHMOD_SWAP_MARKER)) {
  renameSync(args[1], args[1] + '.original');
  symlinkSync(process.env.FAKE_CHMOD_EXTERNAL_PATH, args[1]);
  writeFileSync(process.env.FAKE_CHMOD_SWAP_MARKER, 'swapped\\n');
}
const result = spawnSync('/bin/chmod', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
`,
  );
  await chmod(chmodPath, 0o755);
  return directory;
}

async function installRollbackBackupFailureProbe(fake) {
  const directory = join(fake.directory, 'mktemp-failure-bin');
  const mktempPath = join(directory, 'mktemp');
  await mkdir(directory, { mode: 0o700 });
  await writeFile(
    mktempPath,
    `#!/bin/sh
case "$1" in
  */main-before-*) exit 74 ;;
esac
exec /usr/bin/mktemp "$@"
`,
  );
  await chmod(mktempPath, 0o755);
  return directory;
}

async function applyDisabled(fake, env) {
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const entries = await readdir(fake.backupDirectory);
  const [backupName] = entries.filter(
    (entry) => entry.startsWith('main-before-') && !entry.endsWith('.sha256'),
  );
  return join(fake.backupDirectory, backupName);
}

async function writeRollbackEvidence(backupPath, backup) {
  const bytes = canonicalJson(backup);
  await writeFile(backupPath, bytes, { mode: 0o600 });
  await writeFile(`${backupPath}.sha256`, `${sha256(bytes)}\n`, { mode: 0o600 });
}

async function aRollbackFixture(t) {
  const fake = await createFakeGitHub(t);
  const payload = await readRuleset();
  await updateFakeGitHubState(fake, {
    payload,
    existingId: 77,
  });
  const env = await liveRulesetEnvironment(fake);
  const backupPath = join(fake.directory, 'rollback.json');
  const unsignedBackup = {
    schemaVersion: rollbackSchema,
    repository: 'kimen-dev/kimen',
    rulesetName: 'kimen-protected-main',
    rulesetId: 77,
    operation: 'updated',
    payload,
    expectedForwardPayload: payload,
  };
  const backup = withRollbackIntegrity(unsignedBackup);
  await writeRollbackEvidence(backupPath, backup);
  return { backup, backupPath, env, fake };
}

function rollBack(backupPath, env, overrides = {}) {
  return spawnSync('bash', [applyRulesetPath, '--rollback', backupPath], {
    encoding: 'utf8',
    env: { ...env, ...overrides },
  });
}

function claimCreation(intentPath, rulesetId, env, overrides = {}) {
  return spawnSync('bash', [applyRulesetPath, '--claim-create', intentPath, String(rulesetId)], {
    encoding: 'utf8',
    env: { ...env, ...overrides },
  });
}

function writerLockPath(fake) {
  return join(fake.backupDirectory, '.exclusive-writer.lock');
}

async function readWriterLockState(fake) {
  return JSON.parse(await readFile(join(writerLockPath(fake), 'state.json'), 'utf8'));
}

async function findRollbackBackup(fake, operation) {
  const entries = await readdir(fake.backupDirectory);
  for (const name of entries) {
    if (!name.startsWith('main-before-') || name.endsWith('.sha256')) continue;
    const path = join(fake.backupDirectory, name);
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (value.operation === operation) return { path, value };
  }
  throw new Error(`missing ${operation} rollback backup`);
}

function withRollbackIntegrity(unsignedBackup) {
  return {
    ...unsignedBackup,
    integritySha256: canonicalJsonSha256(unsignedBackup),
  };
}

function withCreationIntentIntegrity(payload) {
  const unsignedIntent = {
    schemaVersion: createIntentSchema,
    repository: 'kimen-dev/kimen',
    rulesetName: 'kimen-protected-main',
    operation: 'create',
    payload,
  };
  return {
    ...unsignedIntent,
    integritySha256: canonicalJsonSha256(unsignedIntent),
  };
}

function rewriteRollbackBackup(backup, overrides) {
  return withRollbackIntegrity({
    schemaVersion: backup.schemaVersion,
    repository: backup.repository,
    rulesetName: backup.rulesetName,
    rulesetId: backup.rulesetId,
    operation: backup.operation,
    payload: backup.payload,
    expectedForwardPayload: backup.expectedForwardPayload,
    ...overrides,
  });
}

test('S2 @spec:018-project-integrity-hardening keeps the desired main ruleset disabled at rest', async () => {
  const ruleset = await readRuleset();
  const requiredChecks = findRule(ruleset, 'required_status_checks').parameters
    .required_status_checks;

  assert.equal(ruleset.target, 'branch');
  assert.equal(ruleset.enforcement, 'disabled');
  assert.deepEqual(ruleset.conditions.ref_name.include, ['refs/heads/main']);
  assert.deepEqual(ruleset.conditions.ref_name.exclude, []);
  assert.equal(
    requiredChecks.some(({ context }) => context === 'clean-context-review'),
    false,
    'the initial desired payload must not create an impossible review requirement',
  );
});

test('S2 @spec:018-project-integrity-hardening requires current squash PRs and blocks destructive main updates', async () => {
  const ruleset = await readRuleset();
  const pullRequestRule = findRule(ruleset, 'pull_request');
  const statusRule = findRule(ruleset, 'required_status_checks');

  assert.ok(findRule(ruleset, 'deletion'));
  assert.ok(findRule(ruleset, 'non_fast_forward'));
  assert.ok(findRule(ruleset, 'required_linear_history'));
  assert.deepEqual(pullRequestRule.parameters.allowed_merge_methods, ['squash']);
  assert.equal(pullRequestRule.parameters.required_approving_review_count, 0);
  assert.equal(pullRequestRule.parameters.required_review_thread_resolution, true);
  assert.equal(statusRule.parameters.strict_required_status_checks_policy, true);
});

test('S2 @spec:018-project-integrity-hardening declares every required gate family with a disabled sentinel', async () => {
  const ruleset = await readRuleset();
  const requiredChecks = findRule(ruleset, 'required_status_checks').parameters
    .required_status_checks;

  assert.deepEqual(missingSecurityFamilies(requiredChecks), []);
  assert.ok(
    requiredChecks.some(({ context }) => context === 'containment'),
    'mandatory Linux containment must be a required main check',
  );
  assert.ok(requiredChecks.length >= 7);
  assert.ok(requiredChecks.every(({ integration_id: integrationId }) => integrationId === 1));
});

test('S2 @spec:018-project-integrity-hardening binds required gates to exact GitHub Check Run names', async () => {
  const ruleset = await readRuleset();
  const requiredChecks = findRule(ruleset, 'required_status_checks').parameters
    .required_status_checks;

  assert.deepEqual(
    requiredChecks.map(({ context }) => context),
    productionCheckContexts,
  );
});

test('S2 @spec:018-project-integrity-hardening keeps the active-policy source free of standing bypass authority', async () => {
  const ruleset = await readRuleset();

  assert.deepEqual(ruleset.bypass_actors, []);
});

test('S2 @spec:018-project-integrity-hardening refuses to render unresolved live integration IDs', () => {
  const result = renderRuleset();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /KIMEN_CHECK_INTEGRATIONS_JSON|integration/i);
});

test('S2 @spec:018-project-integrity-hardening renders only observed integration IDs without standing bypass', async () => {
  const desired = await readRuleset();
  const requiredChecks = findRule(desired, 'required_status_checks').parameters
    .required_status_checks;
  const integrations = Object.fromEntries(
    requiredChecks.map(({ context }, index) => [context, 20_000 + index]),
  );
  const result = renderRuleset({
    KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify(integrations),
  });

  assert.equal(result.status, 0, result.stderr);
  const rendered = JSON.parse(result.stdout);
  assert.equal(rendered.enforcement, 'disabled');
  assert.deepEqual(rendered.bypass_actors, []);
  assert.deepEqual(
    findRule(rendered, 'required_status_checks').parameters.required_status_checks,
    requiredChecks.map(({ context }) => ({ context, integration_id: integrations[context] })),
  );
});

test('S2 @spec:018-project-integrity-hardening rejects non-integer integration IDs', async () => {
  const desired = await readRuleset();
  const requiredChecks = findRule(desired, 'required_status_checks').parameters
    .required_status_checks;
  const integrations = Object.fromEntries(
    requiredChecks.map(({ context }, index) => [context, index === 0 ? 20_000.5 : 20_001 + index]),
  );
  const result = renderRuleset({
    KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify(integrations),
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /integration|unresolved|integer/i);
});

test('S2 @spec:018-project-integrity-hardening keeps rollback evidence in an explicit writable directory', async () => {
  const source = await readFile(applyRulesetPath, 'utf8');

  assert.match(source, /KIMEN_RULESET_BACKUP_DIR/);
  assert.match(source, /--rollback/);
});

test('S2 @spec:018-project-integrity-hardening documents and requires the exact exclusive-writer confirmation', async (t) => {
  const source = await readFile(applyRulesetPath, 'utf8');
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER: 'not-an-exclusive-writer-confirmation',
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /exclusive|single.writer|confirmation/i);
  assert.match(source, /If-Match|ETag/);
  assert.match(source, /GitHub UI|other admin|external writer/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening leaves a durable local lock fail-closed', async (t) => {
  const fake = await createFakeGitHub(t);
  await mkdir(fake.backupDirectory, { mode: 0o700 });
  const lockPath = join(fake.backupDirectory, '.exclusive-writer.lock');
  await mkdir(lockPath, { mode: 0o700 });
  const env = await liveRulesetEnvironment(fake);

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /lock|writer|already|manual/i);
  assert.equal((await lstat(lockPath)).isDirectory(), true);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening fsyncs every newly-created evidence-directory link before POST', async (t) => {
  const fake = await createFakeGitHub(t);
  const logPath = await installFsyncProbe(fake);
  const env = await liveRulesetEnvironment(fake, { KIMEN_FSYNC_LOG: logPath });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const events = (await readFile(logPath, 'utf8')).trim().split('\n');
  const evidenceDirectoryIndex = events.indexOf(fake.backupDirectory);
  const parentDirectoryIndex = events.indexOf(fake.directory);
  const postIndex = events.indexOf('REMOTE POST');
  assert.ok(evidenceDirectoryIndex >= 0, 'the evidence directory itself must be fsynced');
  assert.ok(parentDirectoryIndex > evidenceDirectoryIndex, 'its newly-linked parent must follow');
  assert.ok(postIndex > parentDirectoryIndex, 'every directory fsync must complete before POST');
});

test('S2 @spec:018-project-integrity-hardening blocks POST when a created-directory parent fsync fails', async (t) => {
  const fake = await createFakeGitHub(t);
  const logPath = await installFsyncProbe(fake);
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_FSYNC_FAIL_PATH: fake.directory,
    KIMEN_FSYNC_LOG: logPath,
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /fsync|persist|evidence|directory/i);
  const events = (await readFile(logPath, 'utf8')).trim().split('\n');
  assert.deepEqual(events.slice(0, 2), [fake.backupDirectory, fake.directory]);
  assert.equal(events.includes('REMOTE POST'), false);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a relative backup path below a non-sticky world-writable ancestor', async (t) => {
  const fake = await createFakeGitHub(t);
  const unsafeAncestor = join(fake.directory, 'unsafe-ancestor');
  const backupDirectory = join(unsafeAncestor, 'backups');
  await mkdir(unsafeAncestor, { mode: 0o700 });
  await chmod(unsafeAncestor, 0o777);
  await mkdir(backupDirectory, { mode: 0o700 });
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_RULESET_BACKUP_DIR: relative(repositoryRoot, backupDirectory),
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /ancestor|world|group|writable|permission/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening permits a root-owned sticky temporary ancestor without weakening its child', async (t) => {
  const stickyRoot = await realpath('/tmp');
  const stickyMetadata = await lstat(stickyRoot);
  assert.equal(stickyMetadata.uid, 0);
  assert.equal((stickyMetadata.mode & 0o1000) !== 0, true);
  const directory = await mkdtemp(join(stickyRoot, 'kimen-ruleset-sticky-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const fake = await createFakeGitHub(t);
  const backupDirectory = join(directory, 'backups');
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_RULESET_BACKUP_DIR: backupDirectory,
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  assert.equal((await lstat(backupDirectory)).mode & 0o777, 0o700);
});

test('S2 @spec:018-project-integrity-hardening detects an ancestor inode swap even when the lock inode returns to its original path', async (t) => {
  const fake = await createFakeGitHub(t);
  const stableAncestor = join(fake.directory, 'stable-ancestor');
  const backupDirectory = join(stableAncestor, 'backups');
  await mkdir(stableAncestor, { mode: 0o700 });
  await mkdir(backupDirectory, { mode: 0o700 });
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_SWAP_BACKUP_ANCESTOR: stableAncestor,
    FAKE_GH_SWAP_BACKUP_DIRECTORY: backupDirectory,
    KIMEN_RULESET_BACKUP_DIR: relative(repositoryRoot, backupDirectory),
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /ancestor|chain|inode|identity|changed/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.ancestorSwapped, true);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening applies disabled first and can roll back a created ruleset', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const backupPath = await applyDisabled(fake, env);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  const stateAfterApply = JSON.parse(await readFile(fake.statePath, 'utf8'));
  const expectedUnsignedBackup = {
    schemaVersion: rollbackSchema,
    repository: 'kimen-dev/kimen',
    rulesetName: 'kimen-protected-main',
    rulesetId: 77,
    operation: 'created',
    payload: stateAfterApply.payload,
    expectedForwardPayload: stateAfterApply.payload,
  };
  assert.deepEqual(backup, withRollbackIntegrity(expectedUnsignedBackup));
  const backupMetadata = await lstat(backupPath);
  assert.equal(backupMetadata.isFile(), true);
  assert.equal(backupMetadata.isSymbolicLink(), false);
  assert.equal(backupMetadata.mode & 0o777, 0o600);
  assert.equal(backupMetadata.nlink, 1);
  const sidecarMetadata = await lstat(`${backupPath}.sha256`);
  assert.equal(sidecarMetadata.isFile(), true);
  assert.equal(sidecarMetadata.isSymbolicLink(), false);
  assert.equal(sidecarMetadata.mode & 0o777, 0o600);
  assert.equal(sidecarMetadata.nlink, 1);

  const rolledBack = rollBack(backupPath, env);
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.deleted, true);
  assert.ok(state.calls.some((call) => call.includes('DELETE')));
  assert.ok(
    state.calls.filter((call) => call.includes('repos/kimen-dev/kimen/rulesets/77')).length >= 3,
    'rollback must GET before deletion and verify the resource afterwards',
  );
  assert.ok(
    state.calls.filter((call) => call.includes('repos/kimen-dev/kimen/rulesets')).length >= 3,
    'rollback must verify the ruleset list after deletion',
  );
});

test('S2 @spec:018-project-integrity-hardening treats an exact disabled initial policy as an idempotent no-op', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  await updateFakeGitHubState(fake, { calls: [] });

  const reapplied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(reapplied.status, 0, reapplied.stderr || reapplied.stdout);
  assert.match(reapplied.stderr + reapplied.stdout, /already|no.op|exact|disabled/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses to downgrade an active ruleset through apply-disabled', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    payload: { ...state.payload, enforcement: 'active' },
  });

  const reapplied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(reapplied.status, 0);
  assert.match(reapplied.stderr + reapplied.stdout, /active|downgrade|disabled initial|diverg/i);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(after.payload.enforcement, 'active');
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses to overwrite a divergent disabled ruleset', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  const divergent = cloneJson(state.payload);
  divergent.bypass_actors = [aUserBypass(4243)];
  await updateFakeGitHubState(fake, { calls: [], payload: divergent });

  const reapplied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(reapplied.status, 0);
  assert.match(reapplied.stderr + reapplied.stdout, /diverg|disabled initial|refus|exact/i);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(after.payload, divergent);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening selects only the exact repository ruleset when an inherited namesake exists', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const local = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  const inherited = cloneJson(local);
  inherited.bypass_actors = [aUserBypass(6789)];
  await updateFakeGitHubState(fake, {
    calls: [],
    existingId: 77,
    inheritedId: 88,
    inheritedPayload: inherited,
    payload: local,
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.existingId, 77);
  assert.deepEqual(state.payload, local);
  assert.ok(state.calls.some((call) => call.includes('repos/kimen-dev/kimen/rulesets/77')));
  assert.equal(
    state.calls.some((call) => call.includes('repos/kimen-dev/kimen/rulesets/88')),
    false,
  );
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening creates a repository ruleset when only an inherited namesake exists', async (t) => {
  const fake = await createFakeGitHub(t);
  const inherited = await readRuleset();
  await updateFakeGitHubState(fake, {
    existingId: null,
    inheritedId: 88,
    inheritedPayload: inherited,
    payload: null,
  });
  const env = await liveRulesetEnvironment(fake);

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.existingId, 77);
  assert.ok(state.calls.some((call) => call.includes('POST')));
  assert.equal(
    state.calls.some((call) => call.includes('repos/kimen-dev/kimen/rulesets/88')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening restores the exact prior ruleset after an update', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const previous = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  const activationEnv = {
    ...env,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const applied = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: activationEnv,
  });

  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const entries = await readdir(fake.backupDirectory);
  const backupNames = entries.filter(
    (entry) => entry.startsWith('main-before-') && !entry.endsWith('.sha256'),
  );
  const backupRecords = await Promise.all(
    backupNames.map(async (name) => ({
      name,
      value: JSON.parse(await readFile(join(fake.backupDirectory, name), 'utf8')),
    })),
  );
  const backupName = backupRecords.find(({ value }) => value.operation === 'updated').name;
  const backupPath = join(fake.backupDirectory, backupName);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  assert.equal(backup.schemaVersion, rollbackSchema);
  assert.equal(backup.repository, 'kimen-dev/kimen');
  assert.equal(backup.rulesetName, 'kimen-protected-main');
  assert.equal(backup.operation, 'updated');
  assert.equal(backup.rulesetId, 77);
  assert.deepEqual(backup.payload, previous);
  const appliedState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(backup.expectedForwardPayload, appliedState.payload);
  assert.equal(
    backup.integritySha256,
    canonicalJsonSha256({
      schemaVersion: backup.schemaVersion,
      repository: backup.repository,
      rulesetName: backup.rulesetName,
      rulesetId: backup.rulesetId,
      operation: backup.operation,
      payload: backup.payload,
      expectedForwardPayload: backup.expectedForwardPayload,
    }),
  );

  const rolledBack = rollBack(backupPath, activationEnv);
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
  assert.equal(state.calls.filter((call) => call.includes('PUT')).length, 2);
  assert.ok(
    state.calls.filter((call) => call.includes('repos/kimen-dev/kimen/rulesets/77')).length >= 4,
    'rollback must GET before restoration and verify the exact state afterwards',
  );
});

test('S2 @spec:018-project-integrity-hardening rejects a stale created rollback after the ruleset evolves', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const backupPath = await applyDisabled(fake, env);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    payload: { ...state.payload, enforcement: 'active' },
  });

  const rolledBack = rollBack(backupPath, env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /stale|expected forward|current state/i);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(after.existingId, 77);
  assert.equal(after.payload.enforcement, 'active');
  assert.equal(
    after.calls.some((call) => call.includes('PUT') || call.includes('DELETE')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening treats an already absent created rollback as idempotent', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const backupPath = await applyDisabled(fake, env);
  await updateFakeGitHubState(fake, {
    calls: [],
    deleted: true,
    existingId: null,
    payload: null,
  });

  const rolledBack = rollBack(backupPath, env);

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(after.existingId, null);
  assert.equal(
    after.calls.some((call) => call.includes('PUT') || call.includes('DELETE')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening requires an authoritative 404 before treating rollback as absent', async (t) => {
  const fixture = await aRollbackFixture(t);
  const createdBackup = rewriteRollbackBackup(fixture.backup, {
    operation: 'created',
    payload: fixture.backup.payload,
    expectedForwardPayload: fixture.backup.payload,
  });
  await writeRollbackEvidence(fixture.backupPath, createdBackup);
  await updateFakeGitHubState(fixture.fake, {
    calls: [],
    deleted: false,
    existingId: null,
    payload: null,
  });

  for (const [label, override] of [
    ['403', { FAKE_GH_DETAIL_GET_HTTP_STATUS: '403' }],
    ['500', { FAKE_GH_DETAIL_GET_HTTP_STATUS: '500' }],
    ['network', { FAKE_GH_DETAIL_GET_NETWORK_ERROR: '1' }],
  ]) {
    const rolledBack = rollBack(fixture.backupPath, fixture.env, override);
    assert.notEqual(rolledBack.status, 0, `${label} must fail closed`);
    assert.match(rolledBack.stderr + rolledBack.stdout, /404|HTTP|network|absence|confirm/i);
  }
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening requires exclusive-writer confirmation for rollback', async (t) => {
  const fixture = await aRollbackFixture(t);
  await updateFakeGitHubState(fixture.fake, { calls: [] });

  const rolledBack = rollBack(fixture.backupPath, fixture.env, {
    KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER: '',
  });

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /exclusive|single.writer|confirmation/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a stale updated rollback after later policy drift', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...env,
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });
  assert.equal(activated.status, 0, activated.stderr || activated.stdout);
  const backup = await findRollbackBackup(fake, 'updated');
  const appliedState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    payload: { ...appliedState.payload, enforcement: 'evaluate' },
  });

  const rolledBack = rollBack(backup.path, env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /stale|expected forward|current state/i);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(after.payload.enforcement, 'evaluate');
  assert.equal(
    after.calls.some((call) => call.includes('PUT') || call.includes('DELETE')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening treats an already restored update as idempotent', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, env);
  const previous = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...env,
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });
  assert.equal(activated.status, 0, activated.stderr || activated.stdout);
  const backup = await findRollbackBackup(fake, 'updated');
  await updateFakeGitHubState(fake, { calls: [], payload: previous });

  const rolledBack = rollBack(backup.path, env);

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(after.payload, previous);
  assert.equal(
    after.calls.some((call) => call.includes('PUT')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects rollback against a detail response from the wrong origin', async (t) => {
  const fixture = await aRollbackFixture(t);

  const rolledBack = rollBack(fixture.backupPath, fixture.env, {
    FAKE_GH_DETAIL_SOURCE: 'kimen-dev',
    FAKE_GH_DETAIL_SOURCE_TYPE: 'Organization',
  });

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /origin|repository|source|stale/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening validates the detail GET ID before persisting update rollback evidence', async (t) => {
  const fake = await createFakeGitHub(t);
  const payload = await readRuleset();
  await updateFakeGitHubState(fake, { existingId: 77, payload });
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_DETAIL_ID_OVERRIDE: '78' });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /ID|identity|ruleset 77/i);
  await assertNoRulesetMutation(fake);
  const entries = await readdir(fake.backupDirectory);
  assert.equal(
    entries.some((entry) => entry.startsWith('main-before-')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects a main detail response from the wrong ruleset origin', async (t) => {
  const fake = await createFakeGitHub(t);
  const payload = await readRuleset();
  await updateFakeGitHubState(fake, { existingId: 77, payload });
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_DETAIL_SOURCE: 'kimen-dev',
    FAKE_GH_DETAIL_SOURCE_TYPE: 'Organization',
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /origin|repository|source/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a symlink rollback backup before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  const symlinkPath = join(fixture.fake.directory, 'rollback-link.json');
  await symlink(fixture.backupPath, symlinkPath);

  const rolledBack = rollBack(symlinkPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /regular|symlink|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback backup below a symlink ancestor', async (t) => {
  const fixture = await aRollbackFixture(t);
  const physicalDirectory = await mkdtemp(join(fixture.fake.directory, 'physical-backups-'));
  const linkedDirectory = join(fixture.fake.directory, 'linked-backups');
  const physicalBackup = join(physicalDirectory, 'rollback.json');
  const linkedBackup = join(linkedDirectory, 'rollback.json');
  await writeRollbackEvidence(physicalBackup, fixture.backup);
  await symlink(physicalDirectory, linkedDirectory);

  const rolledBack = rollBack(linkedBackup, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /ancestor|symlink|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a hardlinked rollback backup before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  const hardlinkPath = join(fixture.fake.directory, 'rollback-hardlink.json');
  await link(fixture.backupPath, hardlinkPath);
  const bytes = await readFile(hardlinkPath);
  await writeFile(`${hardlinkPath}.sha256`, `${sha256(bytes)}\n`, { mode: 0o600 });

  const rolledBack = rollBack(hardlinkPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /hardlink|link count|regular|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback backup in an insecure directory', async (t) => {
  const fixture = await aRollbackFixture(t);
  await chmod(fixture.fake.directory, 0o777);

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  await chmod(fixture.fake.directory, 0o700);
  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /directory|permission|owner|secure/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects bytes that no longer match the process sidecar', async (t) => {
  const fixture = await aRollbackFixture(t);
  const bytes = await readFile(fixture.backupPath, 'utf8');
  await writeFile(fixture.backupPath, `${bytes}\n`);

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /sidecar|digest|integrity|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening uses one frozen backup when the source is swapped after validation', async (t) => {
  const fixture = await aRollbackFixture(t);
  const previous = cloneJson(fixture.backup.payload);
  previous.bypass_actors = [aUserBypass(9876)];
  const originalBackup = rewriteRollbackBackup(fixture.backup, { payload: previous });
  await writeRollbackEvidence(fixture.backupPath, originalBackup);
  const malicious = cloneJson(previous);
  malicious.bypass_actors = [aUserBypass(666)];
  const maliciousBytes = canonicalJson(
    rewriteRollbackBackup(fixture.backup, { payload: malicious }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env, {
    FAKE_GH_SWAP_BACKUP_PATH: fixture.backupPath,
    FAKE_GH_SWAP_BACKUP_BYTES: maliciousBytes,
    FAKE_GH_SWAP_BACKUP_DIGEST: sha256(maliciousBytes),
  });

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fixture.fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
});

test('S2 @spec:018-project-integrity-hardening rejects an unknown rollback schema before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  await writeRollbackEvidence(
    fixture.backupPath,
    rewriteRollbackBackup(fixture.backup, { schemaVersion: 'untrusted-v9' }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /schema|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback for another repository before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  await writeRollbackEvidence(
    fixture.backupPath,
    rewriteRollbackBackup(fixture.backup, { repository: 'attacker/example' }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /repository|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback for another ruleset name before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  await writeRollbackEvidence(
    fixture.backupPath,
    rewriteRollbackBackup(fixture.backup, { rulesetName: 'attacker-policy' }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /ruleset|name|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback whose ruleset ID disagrees with GitHub', async (t) => {
  const fixture = await aRollbackFixture(t);
  await writeRollbackEvidence(
    fixture.backupPath,
    rewriteRollbackBackup(fixture.backup, { rulesetId: 78 }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /ruleset|id|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a rollback payload not bound to its ruleset name', async (t) => {
  const fixture = await aRollbackFixture(t);
  const payload = { ...fixture.backup.payload, name: 'attacker-policy' };
  await writeRollbackEvidence(
    fixture.backupPath,
    rewriteRollbackBackup(fixture.backup, { payload }),
  );

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /payload|ruleset|name|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a tampered rollback operation before mutation', async (t) => {
  const fixture = await aRollbackFixture(t);
  await writeRollbackEvidence(fixture.backupPath, { ...fixture.backup, operation: 'created' });

  const rolledBack = rollBack(fixture.backupPath, fixture.env);

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /integrity|operation|backup/i);
  await assertNoRulesetMutation(fixture.fake);
});

test('S2 @spec:018-project-integrity-hardening detects a PUT that reports success without restoring the backup', async (t) => {
  const fixture = await aRollbackFixture(t);
  const previous = cloneJson(fixture.backup.payload);
  previous.bypass_actors = [aUserBypass(9876)];
  const backup = rewriteRollbackBackup(fixture.backup, { payload: previous });
  await writeRollbackEvidence(fixture.backupPath, backup);

  const rolledBack = rollBack(fixture.backupPath, fixture.env, { FAKE_GH_PUT_NOOP: '1' });

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /restore|mismatch|verify/i);
  const state = JSON.parse(await readFile(fixture.fake.statePath, 'utf8'));
  assert.notDeepEqual(state.payload, previous);
});

test('S2 @spec:018-project-integrity-hardening detects a DELETE that reports success without removing the ruleset', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const backupPath = await applyDisabled(fake, env);

  const rolledBack = rollBack(backupPath, env, { FAKE_GH_DELETE_NOOP: '1' });

  assert.notEqual(rolledBack.status, 0);
  assert.match(rolledBack.stderr + rolledBack.stdout, /delete|exists|verify/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.existingId, 77);
  assert.equal(state.deleted, false);
});

test('S2 @spec:018-project-integrity-hardening reconciles a rollback PUT that mutates before reporting an error', async (t) => {
  const fixture = await aRollbackFixture(t);
  const previous = cloneJson(fixture.backup.payload);
  previous.bypass_actors = [aUserBypass(9876)];
  const backup = rewriteRollbackBackup(fixture.backup, { payload: previous });
  await writeRollbackEvidence(fixture.backupPath, backup);

  const rolledBack = rollBack(fixture.backupPath, fixture.env, {
    FAKE_GH_PUT_MODE: 'mutate-error',
  });

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fixture.fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
});

test('S2 @spec:018-project-integrity-hardening reconciles a transient GET error after rollback PUT', async (t) => {
  const fixture = await aRollbackFixture(t);
  const previous = cloneJson(fixture.backup.payload);
  previous.bypass_actors = [aUserBypass(9876)];
  const backup = rewriteRollbackBackup(fixture.backup, { payload: previous });
  await writeRollbackEvidence(fixture.backupPath, backup);

  const rolledBack = rollBack(fixture.backupPath, fixture.env, {
    FAKE_GH_DETAIL_GET_ERROR_ONCE_AFTER_MUTATION: '1',
  });

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fixture.fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
  assert.ok(
    state.calls.filter((call) => call.includes('repos/kimen-dev/kimen/rulesets/77')).length >= 4,
  );
});

test('S2 @spec:018-project-integrity-hardening reconciles a rollback DELETE that mutates before reporting an error', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const backupPath = await applyDisabled(fake, env);

  const rolledBack = rollBack(backupPath, env, {
    FAKE_GH_DELETE_MODE: 'mutate-error',
  });

  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.existingId, null);
  assert.equal(state.deleted, true);
});

test('S2 @spec:018-project-integrity-hardening revalidates the exact live payload immediately before main PUT', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const logPath = await installFsyncProbe(fake);
  const driftMarker = join(fake.directory, 'drifted');
  const env = {
    ...initialEnv,
    KIMEN_FSYNC_DRIFT_MARKER: driftMarker,
    KIMEN_FSYNC_DRIFT_STATE: fake.statePath,
    KIMEN_FSYNC_LOG: logPath,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const applied = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /drift|changed|revalid|exact|refus/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.payload.enforcement, 'evaluate');
  assert.equal(
    state.calls.some((call) => call.includes('PUT')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening rolls back a main PUT that mutates before reporting an error', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const previous = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  await updateFakeGitHubState(fake, { calls: [], mutationCount: 0 });
  const env = {
    ...initialEnv,
    FAKE_GH_PUT_MODE: 'mutate-error',
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const applied = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /PUT|ambiguous|roll.*back/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
  assert.ok(state.calls.filter((call) => call.includes('PUT')).length >= 2);
});

test('S2 @spec:018-project-integrity-hardening rolls back when the final GET cannot confirm the main PUT', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const previous = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  await updateFakeGitHubState(fake, { calls: [], detailGetErrorUsed: false, mutationCount: 0 });
  const env = {
    ...initialEnv,
    FAKE_GH_DETAIL_GET_ERROR_ONCE_AFTER_MUTATION: '1',
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const applied = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /GET|observ|confirm|roll.*back/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload, previous);
  assert.ok(state.calls.filter((call) => call.includes('PUT')).length >= 2);
});

test('S2 @spec:018-project-integrity-hardening removes a created ruleset when rollback evidence cannot be persisted', async (t) => {
  const fake = await createFakeGitHub(t);
  const probeDirectory = await installRollbackBackupFailureProbe(fake);
  const baseEnv = await liveRulesetEnvironment(fake);
  const env = { ...baseEnv, PATH: `${probeDirectory}:${baseEnv.PATH}` };

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /backup|evidence/i);
  assert.match(applied.stderr + applied.stdout, /77/);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.deleted, true);
  assert.equal(state.existingId, null);
  assert.ok(state.calls.some((call) => call.includes('POST')));
  assert.ok(state.calls.some((call) => call.includes('DELETE')));
  const entries = await readdir(fake.backupDirectory);
  assert.ok(
    entries.some((entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256')),
    'the pre-POST journal must survive a later rollback-backup write failure',
  );
});

test('S2 @spec:018-project-integrity-hardening journals before POST without deleting an uncorrelated ambiguous creation', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /POST|journal|recovery|ambiguous/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.journalBeforePost, true);
  assert.equal(state.existingId, 77);
  assert.equal(state.deleted, false);
  assert.equal(
    state.calls.some((call) => call.includes('DELETE')),
    false,
  );
  const entries = await readdir(fake.backupDirectory);
  const [intentName] = entries.filter(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  assert.ok(intentName, 'ambiguous POST must retain its pre-mutation recovery journal');
  const intentPath = join(fake.backupDirectory, intentName);
  const intent = JSON.parse(await readFile(intentPath, 'utf8'));
  assert.equal(intent.schemaVersion, createIntentSchema);
  assert.equal(intent.repository, 'kimen-dev/kimen');
  assert.equal(intent.rulesetName, 'kimen-protected-main');
  assert.equal(intent.operation, 'create');
  assert.equal((await lstat(intentPath)).mode & 0o777, 0o600);
  assert.equal((await lstat(`${intentPath}.sha256`)).mode & 0o777, 0o600);
});

test('S2 @spec:018-project-integrity-hardening retains a malformed successful POST for explicit recovery', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'malformed-success' });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /POST|malformed|journal|recovery|ambiguous/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.journalBeforePost, true);
  assert.equal(state.existingId, 77);
  assert.equal(state.deleted, false);
  assert.equal(
    state.calls.some((call) => call.includes('DELETE')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening never deletes a concurrent creation after an uncorrelated POST error', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_POST_MODE: 'concurrent-error-no-mutate',
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /ambiguous|journal|claim|manual/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.concurrentCreation, true);
  assert.equal(state.existingId, 88);
  assert.equal(state.deleted, false);
  assert.equal(
    state.calls.some((call) => call.includes('DELETE')),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening safely claims an ambiguous creation journal before rollback', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  await updateFakeGitHubState(fake, { calls: [] });

  const claimed = claimCreation(intentPath, 77, env);

  assert.equal(claimed.status, 0, claimed.stderr || claimed.stdout);
  assert.match(claimed.stdout, /claimed|rollback/i);
  const backupMatch = claimed.stdout.match(/rollback:\s*(.+)$/m);
  assert.ok(backupMatch, 'claim must return a durable rollback backup path');
  const afterClaim = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(
    afterClaim.calls.some((call) => call.includes('PUT') || call.includes('DELETE')),
    false,
  );

  const rolledBack = rollBack(backupMatch[1].trim(), env);
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const afterRollback = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(afterRollback.existingId, null);
  assert.equal(afterRollback.deleted, true);
});

test('S2 @spec:018-project-integrity-hardening retains a recovery-ready lock for an ambiguous POST and lets only the exact journal adopt it', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  const lockState = await readWriterLockState(fake);
  assert.equal(lockState.state, 'recovery-ready');
  assert.equal(lockState.recoveryKind, 'create-intent');
  assert.equal(lockState.evidencePath, await realpath(intentPath));
  assert.equal(lockState.evidenceSha256, sha256(await readFile(intentPath)));

  const claimed = claimCreation(intentPath, 77, env);

  assert.equal(claimed.status, 0, claimed.stderr || claimed.stdout);
  await assert.rejects(lstat(writerLockPath(fake)), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening rejects foreign evidence when adopting a recovery-ready creation lock', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  const foreignIntent = join(fake.directory, 'foreign-create-intent.json');
  await writeFile(foreignIntent, await readFile(intentPath), { mode: 0o600 });
  await writeFile(`${foreignIntent}.sha256`, await readFile(`${intentPath}.sha256`), {
    mode: 0o600,
  });
  await updateFakeGitHubState(fake, { calls: [] });

  const rejected = claimCreation(foreignIntent, 77, env);

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr + rejected.stdout, /evidence|journal|recovery|lock|binding/i);
  assert.equal((await readWriterLockState(fake)).state, 'recovery-ready');
  await assertNoRulesetMutation(fake);

  const claimed = claimCreation(intentPath, 77, env);
  assert.equal(claimed.status, 0, claimed.stderr || claimed.stdout);
  await assert.rejects(lstat(writerLockPath(fake)), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening retains and exactly recovers the lock after an ambiguous activation PUT', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const disabledPayload = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  await updateFakeGitHubState(fake, { calls: [], mutationCount: 0 });
  const env = {
    ...initialEnv,
    FAKE_GH_DETAIL_GET_ERROR_AFTER_MUTATION: '1',
    FAKE_GH_PUT_MODE: 'mutate-error',
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  const lockState = await readWriterLockState(fake);
  assert.equal(lockState.state, 'recovery-ready');
  assert.equal(lockState.recoveryKind, 'rollback-backup');
  const foreignBackup = join(fake.directory, 'foreign-rollback-backup.json');
  await writeFile(foreignBackup, await readFile(lockState.evidencePath), { mode: 0o600 });
  await writeFile(`${foreignBackup}.sha256`, await readFile(`${lockState.evidencePath}.sha256`), {
    mode: 0o600,
  });
  await updateFakeGitHubState(fake, { calls: [] });
  const rejected = rollBack(foreignBackup, initialEnv);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr + rejected.stdout, /evidence|recovery|lock|binding/i);
  assert.equal((await readWriterLockState(fake)).state, 'recovery-ready');
  await assertNoRulesetMutation(fake);

  const rolledBack = rollBack(lockState.evidencePath, initialEnv);
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(after.payload, disabledPayload);
  await assert.rejects(lstat(writerLockPath(fake)), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening retains and exactly recovers the lock when final GET cannot reconcile activation', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const disabledPayload = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  await updateFakeGitHubState(fake, { calls: [], mutationCount: 0 });
  const env = {
    ...initialEnv,
    FAKE_GH_DETAIL_GET_ERROR_AFTER_MUTATION: '1',
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  const lockState = await readWriterLockState(fake);
  assert.equal(lockState.state, 'recovery-ready');
  assert.equal(lockState.recoveryKind, 'rollback-backup');
  const rolledBack = rollBack(lockState.evidencePath, initialEnv);
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(after.payload, disabledPayload);
  await assert.rejects(lstat(writerLockPath(fake)), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening rejects a substituted writer-lock inode before release', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_SWAP_WRITER_LOCK_AFTER_MUTATION: '1',
  });

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /lock|identity|inode|changed|substitut/i);
  assert.equal((await lstat(writerLockPath(fake))).isDirectory(), true);
  assert.equal((await lstat(`${writerLockPath(fake)}.original`)).isDirectory(), true);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.writerLockSwapped, true);
});

test('S2 @spec:018-project-integrity-hardening rejects a substituted writer-lock inode before recovery adoption', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  const lockPath = writerLockPath(fake);
  const stateBytes = await readFile(join(lockPath, 'state.json'));
  await rename(lockPath, `${lockPath}.original`);
  await mkdir(lockPath, { mode: 0o700 });
  await writeFile(join(lockPath, 'state.json'), stateBytes, { mode: 0o600 });
  await updateFakeGitHubState(fake, { calls: [] });

  const claimed = claimCreation(intentPath, 77, env);

  assert.notEqual(claimed.status, 0);
  assert.match(claimed.stderr + claimed.stdout, /device|inode|identity|unsafe|lock/i);
  await assertNoRulesetMutation(fake);
  assert.equal((await lstat(lockPath)).isDirectory(), true);
  assert.equal((await lstat(`${lockPath}.original`)).isDirectory(), true);
});

test('S2 @spec:018-project-integrity-hardening never chmods a swapped external target after writer-lock mkdir', async (t) => {
  const fake = await createFakeGitHub(t);
  const probeDirectory = await installChmodSwapProbe(fake);
  const externalPath = join(fake.directory, 'external-lock-target');
  const markerPath = join(fake.directory, 'lock-chmod-swapped');
  await writeFile(externalPath, 'external\n', { mode: 0o600 });
  const baseEnv = await liveRulesetEnvironment(fake);
  const env = {
    ...baseEnv,
    PATH: `${probeDirectory}:${baseEnv.PATH}`,
    FAKE_CHMOD_EXTERNAL_PATH: externalPath,
    FAKE_CHMOD_SWAP_MARKER: markerPath,
    FAKE_CHMOD_SWAP_PATH: writerLockPath(fake),
  };

  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal((await lstat(externalPath)).mode & 0o777, 0o600);
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  await assert.rejects(lstat(markerPath), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening never chmods a swapped external target after recovery-adoption mkdir', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env: initialEnv,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  const probeDirectory = await installChmodSwapProbe(fake);
  const externalPath = join(fake.directory, 'external-adoption-target');
  const markerPath = join(fake.directory, 'adoption-chmod-swapped');
  await writeFile(externalPath, 'external\n', { mode: 0o600 });
  const env = {
    ...initialEnv,
    PATH: `${probeDirectory}:${initialEnv.PATH}`,
    FAKE_CHMOD_EXTERNAL_PATH: externalPath,
    FAKE_CHMOD_SWAP_MARKER: markerPath,
    FAKE_CHMOD_SWAP_PATH: `${writerLockPath(fake)}/.recovery-adoption`,
  };

  const claimed = claimCreation(intentPath, 77, env);

  assert.equal((await lstat(externalPath)).mode & 0o777, 0o600);
  assert.equal(claimed.status, 0, claimed.stderr || claimed.stdout);
  await assert.rejects(lstat(markerPath), { code: 'ENOENT' });
});

test('S2 @spec:018-project-integrity-hardening creates lock state through an exclusive no-follow descriptor', async () => {
  const source = await readFile(applyRulesetPath, 'utf8');

  assert.doesNotMatch(source, /chmod 700 "\$WRITER_LOCK"/);
  assert.doesNotMatch(source, /chmod 700 "\$adoption"/);
  assert.match(source, /O_EXCL/);
  assert.match(source, /O_NOFOLLOW/);
});

test('S2 @spec:018-project-integrity-hardening rejects a creation claim whose explicit ID does not match GitHub', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, { FAKE_GH_POST_MODE: 'mutate-error' });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });
  assert.notEqual(applied.status, 0);
  const entries = await readdir(fake.backupDirectory);
  const intentName = entries.find(
    (entry) => entry.startsWith('create-intent-') && !entry.endsWith('.sha256'),
  );
  const intentPath = join(fake.backupDirectory, intentName);
  await updateFakeGitHubState(fake, { calls: [] });

  const claimed = claimCreation(intentPath, 78, env);

  assert.notEqual(claimed.status, 0);
  assert.match(claimed.stderr + claimed.stdout, /ID|identity|exact|claim/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a creation claim against the wrong ruleset origin', async (t) => {
  const fake = await createFakeGitHub(t);
  const payload = await readRuleset();
  await updateFakeGitHubState(fake, { existingId: 77, payload });
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_DETAIL_SOURCE: 'kimen-dev',
    FAKE_GH_DETAIL_SOURCE_TYPE: 'Organization',
  });
  const intentPath = join(fake.directory, 'create-intent.json');
  await writeRollbackEvidence(intentPath, withCreationIntentIntegrity(payload));

  const claimed = claimCreation(intentPath, 77, env);

  assert.notEqual(claimed.status, 0);
  assert.match(claimed.stderr + claimed.stdout, /claim|origin|repository|source/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening requires exclusive-writer confirmation for creation claims', async (t) => {
  const fake = await createFakeGitHub(t);
  const payload = await readRuleset();
  await updateFakeGitHubState(fake, { existingId: 77, payload });
  const env = await liveRulesetEnvironment(fake);
  const intentPath = join(fake.directory, 'create-intent.json');
  await writeRollbackEvidence(intentPath, withCreationIntentIntegrity(payload));

  const claimed = claimCreation(intentPath, 77, env, {
    KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER: '',
  });

  assert.notEqual(claimed.status, 0);
  assert.match(claimed.stderr + claimed.stdout, /exclusive|single.writer|confirmation/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening fsyncs recovery evidence before remote creation', async () => {
  const source = await readFile(applyRulesetPath, 'utf8');
  const intentCall = source.indexOf('create_creation_intent "$PAYLOAD"');
  const postCall = source.indexOf('gh api --method POST');

  assert.match(source, /fsyncSync/);
  assert.match(source, /sync_evidence_pair/);
  assert.ok(intentCall >= 0 && postCall > intentCall, 'journal persistence must precede POST');
});

test('S2 @spec:018-project-integrity-hardening rolls back automatically when live verification differs', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, {
    FAKE_GH_MISMATCH: 'once-after-mutation',
  });
  const applied = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(applied.status, 0);
  assert.match(applied.stderr + applied.stdout, /mismatch|rolling back/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.deleted, true);
});

test('S2 @spec:018-project-integrity-hardening refuses activation without the exact confirmation', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /activation confirmation missing/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(
    state.calls.some(
      (call) => call.includes('POST') || call.includes('PUT') || call.includes('DELETE'),
    ),
    false,
  );
});

test('S2 @spec:018-project-integrity-hardening transitions disabled initial policy to a current trusted review requirement and rolls back exactly', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  const appliedInitial = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(appliedInitial.status, 0, appliedInitial.stderr || appliedInitial.stdout);
  const initialState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  const initialRequiredChecks = findRule(initialState.payload, 'required_status_checks').parameters
    .required_status_checks;
  assert.equal(initialState.payload.enforcement, 'disabled');
  assert.equal(
    initialRequiredChecks.some(({ context }) => context === 'clean-context-review'),
    false,
  );

  const activationEnv = {
    ...env,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: activationEnv,
  });

  assert.equal(activated.status, 0, activated.stderr || activated.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  const requiredChecks = findRule(state.payload, 'required_status_checks').parameters
    .required_status_checks;
  assert.equal(state.payload.enforcement, 'active');
  assert.deepEqual(
    requiredChecks.filter(({ context }) => context === 'clean-context-review'),
    [{ context: 'clean-context-review', integration_id: reviewAppId }],
  );
  assert.ok(state.calls.some((call) => call.includes('repos/kimen-dev/kimen/pulls/42')));
  assert.ok(
    state.calls.some((call) =>
      call.includes(`repos/kimen-dev/kimen/commits/${currentHeadSha}/check-runs`),
    ),
  );
  assert.equal(
    state.calls.filter((call) =>
      call.includes(`repos/kimen-dev/kimen/commits/${currentHeadSha}/check-runs`),
    ).length,
    2,
    'activation must observe the current green review Check Run both before and after mutation',
  );

  const backupEntries = await readdir(fake.backupDirectory);
  const backupNames = backupEntries.filter(
    (entry) => entry.startsWith('main-before-') && !entry.endsWith('.sha256'),
  );
  const backups = await Promise.all(
    backupNames.map(async (name) => ({
      name,
      value: JSON.parse(await readFile(join(fake.backupDirectory, name), 'utf8')),
    })),
  );
  const transitionBackup = backups.find(({ value }) => value.operation === 'updated');
  assert.ok(transitionBackup, 'activation must retain the exact disabled initial payload');
  assert.deepEqual(transitionBackup.value.payload, initialState.payload);
  const backupPath = join(fake.backupDirectory, transitionBackup.name);
  const rolledBack = spawnSync('bash', [applyRulesetPath, '--rollback', backupPath], {
    encoding: 'utf8',
    env: activationEnv,
  });
  assert.equal(rolledBack.status, 0, rolledBack.stderr || rolledBack.stdout);
  const rolledBackState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(rolledBackState.deleted, false);
  assert.deepEqual(rolledBackState.payload, initialState.payload);
});

test('S2 @spec:018-project-integrity-hardening refuses activation when one exact required Check Run is absent', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: state.checkRuns.filter(({ name }) => name !== 'containment'),
  });

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...initialEnv,
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /required.*Check Run|containment/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses activation when a required Check Run comes from the wrong App', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: state.checkRuns.map((check) =>
      check.name === 'semgrep' ? { ...check, app: { id: githubActionsAppId + 1 } } : check,
    ),
  });

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...initialEnv,
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /required.*trusted App ID/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rolls back when a required Check Run stops passing after activation PUT', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const initialState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, { calls: [], putPayloads: [], requiredCheckDrifted: false });

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...initialEnv,
      FAKE_GH_FAIL_REQUIRED_AFTER_ACTIVATION: 'gates',
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /required.*Check Run|rolling back/i);
  const finalState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(finalState.payload, initialState.payload);
  assert.equal(
    finalState.calls.filter((call) =>
      call.includes(`repos/kimen-dev/kimen/commits/${currentHeadSha}/check-runs`),
    ).length,
    2,
    'activation must observe every exact required Check Run before and after PUT',
  );
});

test('S2 @spec:018-project-integrity-hardening rolls back when the PR head changes after activation evidence', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const initialState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, { calls: [], pullRequestReads: 0, putPayloads: [] });

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env: {
      ...initialEnv,
      FAKE_GH_MOVE_HEAD_ON_SECOND_PR_GET: '1',
      KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
    },
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /head.*changed|required.*observation/i);
  const finalState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(finalState.payload, initialState.payload);
});

test('S2 @spec:018-project-integrity-hardening treats the exact active review policy as an idempotent no-op', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(activated.status, 0, activated.stderr || activated.stdout);
  const activePayload = JSON.parse(await readFile(fake.statePath, 'utf8')).payload;
  await updateFakeGitHubState(fake, { calls: [], mutationCount: 0 });

  const reactivated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.equal(reactivated.status, 0, reactivated.stderr || reactivated.stdout);
  assert.match(reactivated.stderr + reactivated.stdout, /already|no.op|exact|active/i);
  const after = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(after.payload, activePayload);
  assert.equal(
    after.calls.filter((call) => call.some((argument) => argument.includes('/check-runs'))).length,
    1,
    'an active no-op must still revalidate the exact current review before accepting live state',
  );
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses final activation when no real review Check Run exists', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: currentGreenRequiredCheckRuns(),
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(
    activated.stderr + activated.stdout,
    /required Check Run.*clean-context-review|clean-context-review.*completed\/success/i,
  );
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses an incomplete current review Check Run', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_004,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'in_progress',
        conclusion: null,
        app: { id: reviewAppId },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /green|success|current.*Check Run/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses an unsuccessful current review Check Run', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_005,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'failure',
        app: { id: reviewAppId },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /green|success|current.*Check Run/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a same-App review Check Run without the exact external identity', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_006,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
        external_id: `other-controller:pr:${reviewPullRequest}:${currentHeadSha}`,
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /external|current.*Check Run|identity/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a same-App review Check Run with no external identity', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_006,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /external|current.*Check Run|identity/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening lets a newer same-App run with the wrong external identity supersede an older exact success', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const externalId = `clean-context-review:pr:${reviewPullRequest}:${currentHeadSha}`;
  await updateFakeGitHubState(fake, {
    calls: [],
    mutationCount: 0,
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_007,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
        external_id: externalId,
      },
      {
        id: 9_008,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'in_progress',
        conclusion: null,
        app: { id: reviewAppId },
        external_id: `wrong-controller:pr:${reviewPullRequest}:${currentHeadSha}`,
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /latest|external|identity|green/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening lets a newer same-App run missing external identity supersede an older exact success', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const externalId = `clean-context-review:pr:${reviewPullRequest}:${currentHeadSha}`;
  await updateFakeGitHubState(fake, {
    calls: [],
    mutationCount: 0,
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_009,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
        external_id: externalId,
      },
      {
        id: 9_010,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'failure',
        app: { id: reviewAppId },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /latest|external|identity|green/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening lets the newest exact review Check Run invalidate an older success', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const externalId = `clean-context-review:pr:${reviewPullRequest}:${currentHeadSha}`;
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_007,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
        external_id: externalId,
      },
      {
        id: 9_008,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'in_progress',
        conclusion: null,
        app: { id: reviewAppId },
        external_id: externalId,
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /latest|current|green|success/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening lets the newest failed review Check Run invalidate an older success', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  const externalId = `clean-context-review:pr:${reviewPullRequest}:${currentHeadSha}`;
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_009,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
        external_id: externalId,
      },
      {
        id: 9_010,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'failure',
        app: { id: reviewAppId },
        external_id: externalId,
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };

  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /latest|current|green|success/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses a review Check Run for an older PR head', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_002,
        name: 'clean-context-review',
        head_sha: staleHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(
    activated.stderr + activated.stdout,
    /required Check Run.*clean-context-review|clean-context-review.*completed\/success/i,
  );
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses a current review Check Run from an untrusted App', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  await applyDisabled(fake, initialEnv);
  await updateFakeGitHubState(fake, {
    calls: [],
    checkRuns: [
      ...currentGreenRequiredCheckRuns(),
      {
        id: 9_003,
        name: 'clean-context-review',
        head_sha: currentHeadSha,
        status: 'completed',
        conclusion: 'success',
        app: { id: reviewAppId + 1 },
      },
    ],
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /trusted App ID|current.*Check Run/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses final activation without a trusted review App binding', async (t) => {
  const fake = await createFakeGitHub(t);
  const desired = await readRuleset();
  const integrations = Object.fromEntries(
    findRule(desired, 'required_status_checks').parameters.required_status_checks.map(
      ({ context }, index) => [context, 20_000 + index],
    ),
  );
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_CHECK_INTEGRATIONS_JSON: JSON.stringify(integrations),
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  });
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /bind clean-context-review|trusted App ID/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses to create the final active policy without the verified disabled initial state', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake, {
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  });
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /disabled initial ruleset|initial.*disabled/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening refuses activation when the live initial payload has drifted', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  const appliedInitial = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env: initialEnv,
  });
  assert.equal(appliedInitial.status, 0, appliedInitial.stderr || appliedInitial.stdout);
  const initialState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  await updateFakeGitHubState(fake, {
    calls: [],
    payload: { ...initialState.payload, enforcement: 'active' },
  });
  const env = {
    ...initialEnv,
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(
    activated.stderr + activated.stdout,
    /does not match.*disabled initial|matches neither.*disabled initial/i,
  );
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rolls back final activation when the live review-required payload differs', async (t) => {
  const fake = await createFakeGitHub(t);
  const initialEnv = await liveRulesetEnvironment(fake);
  const appliedInitial = spawnSync('bash', [applyRulesetPath, '--apply-disabled'], {
    encoding: 'utf8',
    env: initialEnv,
  });
  assert.equal(appliedInitial.status, 0, appliedInitial.stderr || appliedInitial.stdout);
  const initialState = JSON.parse(await readFile(fake.statePath, 'utf8'));
  const env = {
    ...initialEnv,
    FAKE_GH_MISMATCH: 'active-once',
    KIMEN_CONFIRM_RULESET_ACTIVATION: 'activate-current-green-revision',
  };
  const activated = spawnSync('bash', [applyRulesetPath, '--activate'], {
    encoding: 'utf8',
    env,
  });

  assert.notEqual(activated.status, 0);
  assert.match(activated.stderr + activated.stdout, /mismatch|rolling back/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.deleted, false);
  assert.deepEqual(state.payload, initialState.payload);
  assert.ok(
    state.calls.some((call) =>
      call.includes(`repos/kimen-dev/kimen/commits/${currentHeadSha}/check-runs`),
    ),
  );
});

test('S2 @spec:018-project-integrity-hardening validates a complete founder break-glass PR', () => {
  const result = validateBreakGlass(aBreakGlassRequest());

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.decision, { status: 'valid', reasons: [] });
});

test('S2 @spec:018-project-integrity-hardening rejects a non-founder break-glass actor', () => {
  const request = aBreakGlassRequest();
  request.event.actor = 'generic-repository-admin';

  const result = validateBreakGlass(request);

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'invalid');
  assert.match(result.decision.reasons.join('\n'), /actor.*founder/i);
});

test('S2 @spec:018-project-integrity-hardening rejects break-glass outside PR-only mode', () => {
  const request = aBreakGlassRequest();
  request.request.bypassMode = 'always';

  const result = validateBreakGlass(request);

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'invalid');
  assert.match(result.decision.reasons.join('\n'), /bypass.*pull_request/i);
});

test('S2 @spec:018-project-integrity-hardening rejects break-glass without written justification', () => {
  const request = aBreakGlassRequest();
  request.request.justification = '   ';

  const result = validateBreakGlass(request);

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'invalid');
  assert.match(result.decision.reasons.join('\n'), /justification/i);
});

test('S2 @spec:018-project-integrity-hardening rejects break-glass without a repository restoration issue', () => {
  const request = aBreakGlassRequest();
  request.request.restorationIssue = 'https://example.test/issues/123';

  const result = validateBreakGlass(request);

  assert.equal(result.exitCode, 1);
  assert.equal(result.decision.status, 'invalid');
  assert.match(result.decision.reasons.join('\n'), /restoration.*issue/i);
});

test('S2 @spec:018-project-integrity-hardening exposes machine-readable break-glass fields in the PR template', async () => {
  const template = await readFile(
    new URL('../../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url),
    'utf8',
  );

  assert.match(template, /break-glass/i);
  assert.match(template, /<!--\s*break-glass-justification\s*-->/i);
  assert.match(template, /<!--\s*break-glass-restoration-issue\s*-->/i);
});

test('S2 @spec:018-project-integrity-hardening runs break-glass validation only from founder PR events', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/break-glass.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.actor/);
  assert.match(workflow, /github\.event\.pull_request\.user\.login/);
  assert.match(workflow, /github\.event\.pull_request\.base\.ref\s*==\s*'main'/);
  assert.match(workflow, /validate-break-glass/);
  assert.match(workflow, /KIMEN_BREAK_GLASS_LABEL:\s*break-glass/);
  assert.match(workflow, /KIMEN_FOUNDER_LOGIN:\s*MarsGotta/);
});

test('S2 @spec:018-project-integrity-hardening grants one bounded founder User bypass and revokes it after the human merge', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const opened = openBreakGlass(env, { FAKE_GH_MERGE_AFTER_GRANT: '1' });

  assert.equal(opened.status, 0, opened.stderr || opened.stdout);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(state.payload.enforcement, 'active');
  assert.deepEqual(state.payload.bypass_actors, []);
  assert.equal(state.putPayloads.length, 2);
  assert.deepEqual(state.putPayloads[0].bypass_actors, [
    { actor_id: founderUserId, actor_type: 'User', bypass_mode: 'pull_request' },
  ]);
  assert.deepEqual(state.putPayloads[1].bypass_actors, []);
  assert.equal(
    state.calls.some((call) => call.some((value) => value.endsWith('/pulls/42/merge'))),
    false,
  );
  const evidencePath = await breakGlassEvidence(fake);
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  assert.equal(evidence.schemaVersion, 'kimen-break-glass-rollback-v1');
  assert.equal(evidence.breakGlass.pullRequest, reviewPullRequest);
  assert.equal(evidence.breakGlass.headSha, currentHeadSha);
  assert.equal(evidence.breakGlass.founderLogin, founderLogin);
  assert.equal(evidence.breakGlass.founderUserId, founderUserId);
  assert.equal(evidence.breakGlass.restorationIssueNumber, restorationIssue);
  assert.match(evidence.breakGlass.requestPayloadSha256, /^[0-9a-f]{64}$/);
  assert.ok(
    evidence.breakGlass.deadlineEpochSeconds - evidence.breakGlass.openedAtEpochSeconds <= 600,
  );
});

test('S2 @spec:018-project-integrity-hardening rejects a non-founder authenticated user before granting bypass', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);
  await updateFakeGitHubState(fake, {
    authenticatedUser: { id: 666, login: 'Mallory', type: 'User' },
  });

  const opened = openBreakGlass(env);

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /authenticated.*founder|MarsGotta/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening rejects a closed or non-issue restoration target before granting bypass', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);
  await updateFakeGitHubState(fake, {
    restorationIssue: {
      number: restorationIssue,
      state: 'closed',
      html_url: `https://github.com/kimen-dev/kimen/issues/${restorationIssue}`,
      pull_request: { url: 'https://api.github.test/pulls/123' },
    },
  });

  const opened = openBreakGlass(env);

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /restoration issue.*open|pull request/i);
  await assertNoRulesetMutation(fake);
});

test('S2 @spec:018-project-integrity-hardening revokes the temporary bypass when the PR head changes', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const opened = openBreakGlass(env, { FAKE_GH_CHANGE_HEAD_AFTER_GRANT: '1' });

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /head|revision|changed/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload.bypass_actors, []);
  assert.deepEqual(state.putPayloads.at(-1).bypass_actors, []);
});

test('S2 @spec:018-project-integrity-hardening revokes when the validated break-glass body changes', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const opened = openBreakGlass(env, { FAKE_GH_EDIT_BODY_AFTER_GRANT: '1' });

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /validated request payload changed/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload.bypass_actors, []);
});

test('S2 @spec:018-project-integrity-hardening revokes on timeout and close remains idempotent', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const opened = openBreakGlass(env);

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /timeout|deadline/i);
  const evidencePath = await breakGlassEvidence(fake);
  const afterTimeout = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(afterTimeout.payload.bypass_actors, []);
  const putCount = afterTimeout.putPayloads.length;

  const closed = closeBreakGlass(evidencePath, env);

  assert.equal(closed.status, 0, closed.stderr || closed.stdout);
  const afterClose = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(afterClose.putPayloads.length, putCount);
  assert.deepEqual(afterClose.payload.bypass_actors, []);
});

test('S2 @spec:018-project-integrity-hardening revokes the temporary bypass on TERM', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const interrupted = await terminateBreakGlassAfterGrant(env);

  assert.equal(interrupted.code, 130, interrupted.stderr || interrupted.stdout);
  assert.match(interrupted.stderr, /interrupted.*revoking/i);
  const state = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(state.payload.bypass_actors, []);
});

test('S2 @spec:018-project-integrity-hardening retains exact recovery evidence when revoke fails and close completes it', async (t) => {
  const fake = await createFakeGitHub(t);
  const env = await liveRulesetEnvironment(fake);
  await activateMainRuleset(fake, env);

  const opened = openBreakGlass(env, { FAKE_GH_PUT_ERROR_ON_N: '2' });

  assert.notEqual(opened.status, 0);
  assert.match(opened.stderr + opened.stdout, /recovery|revok|rollback/i);
  const evidencePath = await breakGlassEvidence(fake);
  const unresolved = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.equal(unresolved.payload.bypass_actors.length, 1);

  const closed = closeBreakGlass(evidencePath, env);

  assert.equal(closed.status, 0, closed.stderr || closed.stdout);
  const recovered = JSON.parse(await readFile(fake.statePath, 'utf8'));
  assert.deepEqual(recovered.payload.bypass_actors, []);
});
