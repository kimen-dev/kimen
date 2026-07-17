import assert from 'node:assert/strict';
import { access, lstat, readFile, readdir, readlink } from 'node:fs/promises';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);
const readRepositoryFile = (path) => readFile(new URL(path, repositoryRoot), 'utf8');
const isMissing = async (path) => {
  await assert.rejects(access(new URL(path, repositoryRoot)), /ENOENT/u);
};

test('PR quality is one required job without mutation or containment', async () => {
  const [workflow, ruleset] = await Promise.all([
    readRepositoryFile('.github/workflows/ci.yml'),
    readRepositoryFile('.github/rulesets/main.json').then(JSON.parse),
  ]);
  const requiredChecks = ruleset.rules
    .find(({ type }) => type === 'required_status_checks')
    .parameters.required_status_checks.map(({ context }) => context);

  assert.match(workflow, /^ {2}quality:$/mu);
  assert.doesNotMatch(workflow, /^ {2}(?:mutation|containment):$/gmu);
  assert.doesNotMatch(workflow, /KIMEN_MUTATION/u);
  assert.deepEqual(requiredChecks, ['quality']);
});

test('mutation runs on two dedicated cadences and never on pull requests or pushes', async () => {
  const workflow = await readRepositoryFile('.github/workflows/mutation.yml');

  assert.match(workflow, /^ {2}schedule:$/mu);
  // Exactly two crons: the daily changed-core pass plus the weekly (Sunday)
  // full-elements mutation and coverage floors. Expensive feedback stays on
  // dedicated schedules — the PR pipeline keeps one required result (Art. III).
  assert.equal((workflow.match(/cron:/gu) ?? []).length, 2);
  assert.match(workflow, /--before='24 hours ago'/u);
  assert.match(workflow, /run-mutation\.sh --scope full-elements/u);
  assert.match(workflow, /test:coverage/u);
  assert.match(workflow, /upload-artifact@[a-f0-9]{40}/u);
  assert.doesNotMatch(workflow, /^ {2}(?:pull_request|push|workflow_dispatch):/gmu);
});

test('sandbox containment runs only when its own surface changes', async () => {
  const workflow = await readRepositoryFile('.github/workflows/containment.yml');

  assert.match(workflow, /^ {2}pull_request:[\s\S]*?paths:[\s\S]*?sandbox\/\*\*/mu);
  assert.match(workflow, /^ {2}push:[\s\S]*?paths:[\s\S]*?sandbox\/\*\*/mu);
});

test('containment build allows the npm registry used by its Dockerfile', async () => {
  const [workflow, dockerfile] = await Promise.all([
    readRepositoryFile('.github/workflows/containment.yml'),
    readRepositoryFile('sandbox/Dockerfile'),
  ]);

  assert.match(dockerfile, /^RUN npm ci\b/mu);
  assert.match(workflow, /^ {12}registry\.npmjs\.org:443$/mu);
});

test('ordinary gates never run approval hashes, mutation or containment', async () => {
  const [core, suite] = await Promise.all([
    readRepositoryFile('scripts/gates/gates-core.sh'),
    readRepositoryFile('scripts/gates/gates-suite.sh'),
  ]);

  assert.doesNotMatch(core, /check-approvals|test:mutation|test:sandbox/u);
  assert.doesNotMatch(suite, /mutation|containment/u);
  assert.match(suite, /gates-browser\.sh chromium/u);
});

test('spec approval uses founder judgment without repository hash markers', async () => {
  const specDirectories = (
    await readdir(new URL('specs/', repositoryRoot), {
      withFileTypes: true,
    })
  ).filter((entry) => entry.isDirectory());
  const approvalMarkers = await Promise.all(
    specDirectories.map(async ({ name }) => {
      try {
        await access(new URL(`specs/${name}/.approved`, repositoryRoot));
        return name;
      } catch {
        return null;
      }
    }),
  );

  assert.deepEqual(approvalMarkers.filter(Boolean), []);
  await Promise.all([
    isMissing('scripts/gates/check-approvals.sh'),
    isMissing('scripts/gates/record-approval.sh'),
    isMissing('scripts/gates/migrate-approvals.sh'),
  ]);
});

test('clean-context review is optional and has no custom Check Run machinery', async () => {
  const skill = await readRepositoryFile('.agents/skills/requesting-code-review/SKILL.md');

  assert.match(skill, /optional/iu);
  assert.match(skill, /one pass|single pass/iu);
  assert.doesNotMatch(skill, /packet-manifest|attestation|Check Run|round 2/iu);
  await Promise.all([
    isMissing('.github/workflows/review-evidence.yml'),
    isMissing('.github/scripts/review-evidence.cjs'),
    isMissing('.github/scripts/review-evidence.test.cjs'),
    isMissing('.agents/skills/requesting-code-review/scripts/review-package.sh'),
  ]);
});

test('agent skills are vendor-neutral with a Claude compatibility symlink', async () => {
  const compatibility = new URL('.claude/skills', repositoryRoot);

  assert.equal((await lstat(compatibility)).isSymbolicLink(), true);
  assert.equal(await readlink(compatibility), '../.agents/skills');
  await access(new URL('.agents/skills/frontend-qa/SKILL.md', repositoryRoot));
});

test('security scans are scheduled and dependency review is path-scoped', async () => {
  const [codeql, security, dependencies] = await Promise.all([
    readRepositoryFile('.github/workflows/codeql.yml'),
    readRepositoryFile('.github/workflows/security.yml'),
    readRepositoryFile('.github/workflows/dependency-review.yml'),
  ]);

  assert.doesNotMatch(codeql, /^ {2}pull_request:/gmu);
  assert.doesNotMatch(security, /^ {2}pull_request:/gmu);
  assert.match(dependencies, /^ {2}pull_request:[\s\S]*?paths:[\s\S]*?pnpm-lock\.yaml/mu);
});
