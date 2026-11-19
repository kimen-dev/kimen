import assert from 'node:assert/strict';
import { access, lstat, readFile, readdir, readlink } from 'node:fs/promises';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);
const readRepositoryFile = (path) => readFile(new URL(path, repositoryRoot), 'utf8');
const isMissing = async (path) => {
  await assert.rejects(access(new URL(path, repositoryRoot)), /ENOENT/u);
};

test('PR quality is one required result without mutation or containment', async () => {
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

// The complete suite runs as parallel jobs, and `quality` is the result that
// the ruleset requires. It has to be green only when every part is, and the
// parts together have to be exactly `gates-suite.sh`: the core gates, and the
// Chromium browser gate split into shards that cover its files once each.
test('the required result is green only when the core job and every browser shard are', async () => {
  const [workflow, suite] = await Promise.all([
    readRepositoryFile('.github/workflows/ci.yml'),
    readRepositoryFile('scripts/gates/gates-suite.sh'),
  ]);
  const job = (name) => {
    const start = workflow.search(new RegExp(`^ {2}${name}:$`, 'mu'));
    assert.notEqual(start, -1, `ci.yml must declare jobs.${name}`);
    const rest = workflow.slice(start + 1);
    const end = rest.search(/^ {2}\S[^\n]*:$/mu);
    return end === -1 ? rest : rest.slice(0, end);
  };

  // The suite is its two gates and nothing else...
  assert.deepEqual(
    [...suite.matchAll(/^run_gate (\S+) (.+)$/gmu)].map((match) => match[2]),
    ['bash scripts/gates/gates-core.sh', 'bash scripts/gates/gates-browser.sh chromium'],
  );
  // ...the core job runs the first...
  assert.match(job('core'), /^ {8}run: bash scripts\/gates\/gates-core\.sh$/mu);
  // ...and the browser shards the second, one share of the files each.
  const browser = job('browser');
  assert.match(browser, /^ {8}run: bash scripts\/gates\/gates-browser\.sh chromium$/mu);
  const shards = /^ {8}shard: \[([^\]]+)\]$/mu.exec(browser)?.[1].split(',').map(Number);
  const count = Number(
    /KIMEN_BROWSER_SHARD: \$\{\{ matrix\.shard \}\}\/(\d+)$/mu.exec(browser)?.[1],
  );
  assert.ok(count > 0, 'the browser job must pass its shard as <index>/<count>');
  assert.deepEqual(
    shards,
    Array.from({ length: count }, (_, index) => index + 1),
  );
  assert.match(browser, /^ {6}fail-fast: false$/mu);

  // The required result waits for both, also when one fails, and passes only
  // when each succeeded.
  const quality = job('quality');
  assert.match(quality, /^ {4}needs: \[core, browser\]$/mu);
  assert.match(quality, /^ {4}if: always\(\)$/mu);
  assert.match(quality, /CORE_RESULT: \$\{\{ needs\.core\.result \}\}/u);
  assert.match(quality, /BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/u);
  assert.match(
    quality,
    /\[ "\$CORE_RESULT" = 'success' \] && \[ "\$BROWSER_RESULT" = 'success' \]/u,
  );
});

test('dependency-only PRs keep one required result and run affected quality', async () => {
  const [workflow, dependencyGate, nx] = await Promise.all([
    readRepositoryFile('.github/workflows/ci.yml'),
    readRepositoryFile('scripts/gates/gates-dependencies.sh'),
    readRepositoryFile('nx.json').then(JSON.parse),
  ]);

  assert.match(workflow, /fetch-depth:\s*0/u);
  assert.match(workflow, /git merge-base/u);
  assert.match(workflow, /classify-ci-scope\.mjs/u);
  assert.match(workflow, /gates-dependencies\.sh/u);
  assert.match(workflow, /steps\.scope\.outputs\.scope == 'full'/u);
  assert.match(workflow, /steps\.scope\.outputs\.scope == 'dependencies'/u);
  assert.match(workflow, /steps\.scope\.outputs\.scope == 'sandbox'/u);
  assert.match(workflow, /steps\.scope\.outputs\.scope == 'workflows'/u);
  assert.match(dependencyGate, /nx run-many -t build/u);
  assert.match(dependencyGate, /nx affected -t test/u);
  assert.match(dependencyGate, /nx affected -t size/u);
  assert.doesNotMatch(dependencyGate, /semgrep-scan/u);
  assert.match(dependencyGate, /dependency-browser-impact\.mjs/u);
  assert.match(dependencyGate, /gates-browser\.sh chromium/u);
  assert.match(workflow, /steps\.browser-impact\.outputs\.needed == 'true'/u);
  assert.equal(nx.pluginsConfig?.['@nx/js']?.projectsAffectedByDependencyUpdates, 'auto');
});

test('infra checks execute installed tools without re-entering pnpm', async () => {
  const checks = await Promise.all([
    readRepositoryFile('scripts/tests/config-typecheck.test.mjs'),
    readRepositoryFile('scripts/tests/eslint-cache-ignore.test.mjs'),
  ]);

  for (const source of checks) {
    assert.doesNotMatch(source, /spawnSync\(['"]pnpm['"]/u);
    assert.match(source, /spawnSync\(\s*process\.execPath/u);
  }
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

test('renovate config is validated by Renovate, only when that surface changes', async () => {
  const [workflow, gate, core] = await Promise.all([
    readRepositoryFile('.github/workflows/renovate-config.yml'),
    readRepositoryFile('scripts/gates/check-renovate-config.sh'),
    readRepositoryFile('scripts/gates/gates-core.sh'),
  ]);

  assert.match(workflow, /^ {2}pull_request:[\s\S]*?paths:[\s\S]*?renovate\.json/mu);
  assert.match(workflow, /^ {2}push:[\s\S]*?paths:[\s\S]*?renovate\.json/mu);

  // Out of the one required result on purpose: this surface changes a few
  // times a year, and the validator arrives as a large npx download that every
  // other pull request would pay for nothing.
  assert.doesNotMatch(core, /check-renovate-config/u);

  // Pinned, never `@latest` — the verdict has to be a function of the tree
  // (Art. X). Safe for this class: the config Renovate rejected is refused
  // with the identical message by validators several majors older, so schema
  // checking does not drift the way a rule registry does.
  assert.match(gate, /^RENOVATE_VERSION='\d+\.\d+\.\d+'$/mu);
  assert.doesNotMatch(gate, /renovate@latest/u);
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

test('SAST blocks inside the one required result on pinned rules, and explores on a schedule', async () => {
  const [ci, security, gate, core, engineLock] = await Promise.all([
    readRepositoryFile('.github/workflows/ci.yml'),
    readRepositoryFile('.github/workflows/security.yml'),
    readRepositoryFile('scripts/gates/semgrep-scan.sh'),
    readRepositoryFile('scripts/gates/gates-core.sh'),
    readRepositoryFile('.semgrep/requirements.txt'),
  ]);

  // The scan is a gate in the suite, not a workflow step: `gates-suite.sh` is
  // what contributors run for local readiness, and a suite that omits a gate
  // CI enforces reports green for changes CI rejects. CI only installs the
  // engine.
  assert.match(core, /run_core_gate semgrep bash scripts\/gates\/semgrep-scan\.sh/u);
  assert.doesNotMatch(ci, /run: bash scripts\/gates\/semgrep-scan\.sh/u);
  assert.match(ci, /run: bash scripts\/gates\/install-semgrep\.sh /u);

  // The required result scans the ruleset pinned in-tree, so its verdict is a
  // function of the tree alone: `p/default` resolves server-side, and an
  // upstream rule change must not redden a pull request that changed nothing.
  assert.match(gate, /--config \.semgrep\//u);
  await access(new URL('.semgrep/p-default.vendored.yml', repositoryRoot));

  // ...and the scheduled scan keeps the live registry. The pinned set blocks;
  // the live set explores, and is how the pinned one finds out it is behind.
  assert.match(security, /--config p\/default/u);
  assert.doesNotMatch(security, /semgrep-scan\.sh/u);

  // Both scans skip the ruleset itself. Rule files carry code patterns as
  // data and other rules match them, so a scan that reads `.semgrep/` as
  // source fails on its own configuration.
  assert.match(gate, /--exclude \.semgrep/u);
  assert.match(security, /--exclude \.semgrep/u);

  // The engine version is part of the pin: a different Semgrep on PATH can
  // evaluate the same rules differently, so the gate must not simply take it.
  assert.match(gate, /installed_version|--version/u);

  // One engine version across its two anchors: the gate that demands it and
  // the hash-locked requirements the workflows install from. The workflows
  // name no version of their own, so there is nothing in them to drift; a
  // drifted engine reports on different rules than the gate it is meant to
  // predict.
  const pinned = (source) => /semgrep(?:_VERSION=['"]|[=@]=?)(\d+\.\d+\.\d+)/iu.exec(source)?.[1];
  assert.equal(pinned(engineLock), pinned(gate));
  assert.match(pinned(gate) ?? '', /^\d+\.\d+\.\d+$/u);
  assert.equal(pinned(ci), undefined);
  assert.equal(pinned(security), undefined);
  assert.match(security, /run: bash scripts\/gates\/install-semgrep\.sh /u);
});

// The gate scans a ruleset pinned in-tree and needs no network, but Semgrep
// asks semgrep.dev for its latest release on every `--version` and at the end
// of every scan. The required check blocks that host, and each question hung
// about 100 seconds before giving up: three of them were a third of a CI run.
test('the SAST gate never asks semgrep.dev for a version, when installed or when scanning', async () => {
  const [gate, installer] = await Promise.all([
    readRepositoryFile('scripts/gates/semgrep-scan.sh'),
    readRepositoryFile('scripts/gates/install-semgrep.sh'),
  ]);

  const exported = gate.indexOf('export SEMGREP_ENABLE_VERSION_CHECK=0');
  assert.notEqual(exported, -1, 'semgrep-scan.sh must disable the version check');
  assert.ok(
    exported < gate.indexOf('installed_version()'),
    'the version check is disabled before the first semgrep invocation',
  );
  for (const line of installer.split('\n').filter((entry) => /semgrep" --version/u.test(entry))) {
    assert.match(line, /SEMGREP_ENABLE_VERSION_CHECK=0 "\$target\/bin\/semgrep" --version/u, line);
  }
  assert.match(installer, /SEMGREP_ENABLE_VERSION_CHECK=0 /u);
});
