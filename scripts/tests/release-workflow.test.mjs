// @spec:018-project-integrity-hardening
// @spec:151-release-automation
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const releaseWorkflow = await readFile(
  new URL('../../.github/workflows/release.yml', import.meta.url),
  'utf8',
);
// The offline consumer installs the packed @kimen/elements and @kimen/tokens:
// the primed installer stores must hold every runtime dependency they
// declare, at its exact version, or the prerelease install breaks. Today
// there is none (elements compiles Stencil's runtime into its modules).
const consumerDependencies = (
  await Promise.all(
    ['elements', 'tokens'].map(async (directory) =>
      Object.entries(
        JSON.parse(
          await readFile(
            new URL(`../../packages/${directory}/package.json`, import.meta.url),
            'utf8',
          ),
        ).dependencies ?? {},
      ).map(([name, version]) => `${name}@${version}`),
    ),
  )
).flat();

function readJob(source, jobName) {
  const heading = new RegExp(`^  ${jobName}:\\s*$`, 'm').exec(source);
  assert.ok(heading, `release workflow must declare jobs.${jobName}`);

  const bodyStart = heading.index + heading[0].length;
  const tail = source.slice(bodyStart);
  const nextJob = tail.search(/^ {2}[a-zA-Z0-9_-]+:\s*$/m);
  return nextJob === -1 ? tail : tail.slice(0, nextJob);
}

function readYamlList(source, key) {
  const keyMatch = new RegExp(`^(\\s*)${key}:\\s*(.*)$`, 'm').exec(source);
  assert.ok(keyMatch, `expected ${key} in YAML block`);

  const inlineValue = keyMatch[2].trim();
  if (inlineValue.startsWith('[') && inlineValue.endsWith(']')) {
    return inlineValue
      .slice(1, -1)
      .split(',')
      .map((value) => value.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  if (inlineValue !== '') {
    return [inlineValue.replace(/^['"]|['"]$/g, '')];
  }

  const keyIndent = keyMatch[1].length;
  const values = [];
  const followingLines = source.slice(keyMatch.index + keyMatch[0].length).split('\n');
  for (const line of followingLines) {
    if (line.trim() === '') continue;
    const indentation = line.length - line.trimStart().length;
    if (indentation <= keyIndent) break;
    const item = /^\s*-\s+([^#]+?)(?:\s+#.*)?$/.exec(line);
    if (!item) break;
    values.push(item[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  return values;
}

function occurrenceCount(source, needle) {
  return source.split(needle).length - 1;
}

function readNestedYamlScalar(source, parentKey, childKey) {
  const lines = source.split('\n');
  const parentIndex = lines.findIndex((line) => line.trim() === `${parentKey}:`);
  assert.notEqual(parentIndex, -1, `expected ${parentKey} in YAML block`);
  const parentIndent = lines[parentIndex].length - lines[parentIndex].trimStart().length;

  for (const line of lines.slice(parentIndex + 1)) {
    if (line.trim() === '') continue;
    const indentation = line.length - line.trimStart().length;
    if (indentation <= parentIndent) break;
    const prefix = `${childKey}:`;
    if (line.trim().startsWith(prefix)) return line.trim().slice(prefix.length).trim();
  }
  return null;
}

test('@spec:018-project-integrity-hardening S6 prerelease uses exactly Chromium, Firefox and WebKit', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const engineKey = /^\s+(engine|browser):\s*/m.exec(browserJob)?.[1];

  assert.ok(engineKey, 'browser matrix must name its engine dimension');
  assert.deepEqual(readYamlList(browserJob, engineKey), ['chromium', 'firefox', 'webkit']);
});

test('@spec:018-project-integrity-hardening S6 prerelease keeps every engine outcome after one fails', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');

  assert.equal(
    readNestedYamlScalar(browserJob, 'strategy', 'fail-fast'),
    'false',
    'the browser matrix must keep running after failure',
  );
});

// The browser shards of the release, read the way governance-80-20 reads the
// PR CI shards: the matrix lists 1..n and the gate receives <index>/<n>.
function releaseBrowserShards() {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const shards = /^ {8}shard: \[([^\]]+)\]$/mu.exec(browserJob)?.[1].split(',').map(Number);
  const count = Number(
    /^ {10}KIMEN_BROWSER_SHARD: \$\{\{ matrix\.shard \}\}\/(\d+)$/mu.exec(browserJob)?.[1],
  );
  return { count, shards };
}

test('@spec:018-project-integrity-hardening S6 prerelease shards the browser gate as 1..n, each passing <index>/<n>', () => {
  const { count, shards } = releaseBrowserShards();

  assert.ok(count > 1, 'the browser job must pass its shard as <index>/<count>');
  assert.deepEqual(
    shards,
    Array.from({ length: count }, (_, index) => index + 1),
  );
  assert.ok(
    readJob(releaseWorkflow, 'browser').includes(
      `    name: browser (\${{ matrix.engine }} \${{ matrix.shard }}/${String(count)})\n`,
    ),
    'each browser job names its engine and shard',
  );
});

test('@spec:018-project-integrity-hardening S6 prerelease runs the full browser gate for every matrix engine', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const installEngine =
    'pnpm --filter @kimen/elements exec playwright install --with-deps "${{ matrix.engine }}"';
  const browserGate = 'bash scripts/gates/gates-browser.sh "${{ matrix.engine }}"';
  const candidateConsumer = 'node scripts/consumer-contract.mjs';
  const gateStep =
    /^ {6}- name: [^\n]+\n {8}env:\n {10}KIMEN_BROWSER_SHARD: [^\n]+\n {8}run: ([^\n]+)$/mu;

  // One invocation per job, of the complete gate's own command, given its
  // shard: no narrower scope and no other gate.
  assert.equal(occurrenceCount(browserJob, browserGate), 1);
  assert.equal(gateStep.exec(browserJob)?.[1], browserGate);
  assert.doesNotMatch(browserJob, /KIMEN_GATE_SCOPE|KIMEN_AFFECTED|--plan/u);
  assert.ok(browserJob.indexOf(browserGate) > browserJob.indexOf(installEngine));
  assert.ok(browserJob.indexOf(browserGate) < browserJob.indexOf(candidateConsumer));
});

// The shards of one engine together are its complete gate: every shard runs
// its own share of the elements files (Vitest --shard=<index>/<n> runs each
// file in exactly one), and each Chromium-only suite runs in exactly one
// shard. The gate itself says which suites a shard runs.
test('@spec:018-project-integrity-hardening S6 the shards of every engine together run its complete browser gate', () => {
  const { count, shards } = releaseBrowserShards();
  const engines = readYamlList(readJob(releaseWorkflow, 'browser'), 'engine');
  const gate = fileURLToPath(new URL('../gates/gates-browser.sh', import.meta.url));
  const environment = { ...process.env };
  delete environment.KIMEN_GATE_SCOPE;
  delete environment.KIMEN_AFFECTED_PROJECTS;

  const plan = (engine, shard) => {
    const result = spawnSync('bash', [gate, engine, '--plan'], {
      encoding: 'utf8',
      env: { ...environment, KIMEN_BROWSER_SHARD: `${String(shard)}/${String(count)}` },
    });
    assert.equal(result.status, 0, result.stderr);
    return /^suites=(.*)$/mu.exec(result.stdout)[1].split(',').filter(Boolean);
  };
  const chromiumOnly = plan('chromium', count).filter((suite) => suite !== 'elements');
  assert.ok(chromiumOnly.length > 0, 'the last Chromium shard carries the Chromium-only suites');

  for (const engine of engines) {
    const plans = shards.map((shard) => plan(engine, shard));
    for (const suites of plans) {
      assert.ok(suites.includes('elements'), `a ${engine} shard skips the elements suite`);
    }
    assert.deepEqual(
      plans.flatMap((suites) => suites.filter((suite) => suite !== 'elements')).toSorted(),
      engine === 'chromium' ? chromiumOnly.toSorted() : [],
      `${engine} shards must run each Chromium-only suite exactly once`,
    );
  }
});

// Only the browser jobs install a browser, so only they reach the hosts it
// comes from.
test('@spec:018-project-integrity-hardening S6 prerelease permits the runner apt sources required by Playwright where it installs a browser', () => {
  for (const jobName of ['validate-core', 'browser', 'verify-candidate', 'capability-claims']) {
    const job = readJob(releaseWorkflow, jobName);
    const installsBrowser = job.includes('playwright install');
    assert.equal(installsBrowser, jobName === 'browser', `${jobName} browser install`);
    for (const endpoint of [
      /^ {12}azure\.archive\.ubuntu\.com:80$/m,
      /^ {12}dl\.google\.com:443$/m,
      /^ {12}storage\.googleapis\.com:443$/m,
    ]) {
      assert.equal(endpoint.test(job), installsBrowser, `${jobName} ${String(endpoint)}`);
    }
  }
});

// The Semgrep scan is a gate inside `gates-suite.sh`, and a hosted runner has
// no `semgrep` on PATH: the job that runs the suite has to install the engine
// first. ci.yml did; this workflow, which only runs at release, did not, so
// the first dry run after the gate was added stopped two minutes in.
//
// How it is installed matters here more than anywhere: validate-core is the
// job that builds the tarballs a release publishes. `pipx install semgrep==X`
// pins one package and lets pip choose its seventy dependencies at run time,
// so any of them could run code beside the candidate. The engine is therefore
// installed from a lock that names every package with its hashes.
test('@spec:018-project-integrity-hardening S6 every workflow installs Semgrep from the hash-locked requirements, and release validation does it before its suite', async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
  const [gate, installer, lock, ciWorkflow, securityWorkflow] = await Promise.all([
    read('../gates/semgrep-scan.sh'),
    read('../gates/install-semgrep.sh'),
    read('../../.semgrep/requirements.txt'),
    read('../../.github/workflows/ci.yml'),
    read('../../.github/workflows/security.yml'),
  ]);
  const pinned = /^SEMGREP_VERSION='([0-9]+\.[0-9]+\.[0-9]+)'$/m.exec(gate);
  assert.ok(pinned, 'semgrep-scan.sh must pin one exact Semgrep version');

  // The lock carries the engine at the version the gate demands, and nothing
  // in it can be fetched without a hash to check it against.
  const entries = lock
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .join('\n')
    .split(/\n(?! )/u);
  assert.ok(entries.length > 1, 'the lock must list Semgrep and its dependencies');
  assert.equal(
    entries.filter((entry) => entry.startsWith(`semgrep==${pinned[1]} \\`)).length,
    1,
    `the lock must pin semgrep==${pinned[1]} exactly once`,
  );
  for (const entry of entries) {
    assert.match(entry, /^[a-z0-9][a-z0-9._-]*==[^\s;]+( ; [^\\]+)? \\\n/u, entry.slice(0, 80));
    const hashes = entry.split('\n').slice(1);
    assert.ok(hashes.length > 0, `no hash for ${entry.slice(0, 60)}`);
    for (const hash of hashes) {
      assert.match(hash, /^ {4}--hash=sha256:[a-f0-9]{64}( \\)?$/u, hash);
    }
  }

  // The installer refuses anything the lock does not vouch for: no
  // dependency resolution, no source builds, hashes required.
  assert.match(installer, /^lock='\.semgrep\/requirements\.txt'$/m);
  assert.match(
    installer,
    /-m pip install [^\n]*--require-hashes[^\n]*--no-deps[^\n]*--only-binary :all:[^\n]*-r "\$lock"$/m,
  );

  const install = 'run: bash scripts/gates/install-semgrep.sh "$RUNNER_TEMP/semgrep"';
  for (const [name, workflow] of [
    ['ci.yml', ciWorkflow],
    ['security.yml', securityWorkflow],
    ['release.yml', releaseWorkflow],
  ]) {
    assert.ok(workflow.includes(install), `${name} must run "${install}"`);
    assert.doesNotMatch(
      workflow,
      /pipx install|pip install|^\s*(?:run: |- )?uvx /mu,
      `${name} installs a Python package outside the lock`,
    );
  }

  const job = readJob(releaseWorkflow, 'validate-core');
  const installIndex = job.indexOf(install);
  const coreIndex = job.indexOf('run: bash scripts/gates/gates-core.sh');
  assert.notEqual(coreIndex, -1, 'validate-core must run the core gate');
  assert.notEqual(installIndex, -1, 'validate-core must install Semgrep');
  assert.ok(installIndex < coreIndex, 'Semgrep must be installed before the core gate runs');
  // pip downloads the locked files from PyPI, and this job blocks every
  // undeclared host.
  assert.match(job, /^ {12}pypi\.org:443$/m);
  assert.match(job, /^ {12}files\.pythonhosted\.org:443$/m);
});

test('@spec:018-project-integrity-hardening S8 release validation proves the packaging contract before the candidate is built', () => {
  const validateCore = readJob(releaseWorkflow, 'validate-core');
  const coreGate = 'run: bash scripts/gates/gates-core.sh';
  const packagingGate = 'pnpm run packaging';
  const candidateBuild = 'node scripts/release/candidate-cli.mjs build';

  assert.equal(occurrenceCount(validateCore, packagingGate), 1);
  assert.ok(validateCore.indexOf(packagingGate) > validateCore.indexOf(coreGate));
  assert.ok(validateCore.indexOf(packagingGate) < validateCore.indexOf(candidateBuild));
});

// validate-core runs the core gates and each browser job one shard of the
// browser gate. Each keeps the current-run evidence its gate wrote, and only
// when that gate exited 0: the upload is a later step with no condition.
test('@spec:018-project-integrity-hardening S13 every release gate keeps its own current-run evidence', () => {
  const evidence = 'path: ${{ env.KIMEN_CACHE_ROOT }}/gate-evidence/current-run.tsv';
  const kept = [
    ['validate-core', 'run: bash scripts/gates/gates-core.sh', 'name: gate-evidence-core'],
    [
      'browser',
      'run: bash scripts/gates/gates-browser.sh "${{ matrix.engine }}"',
      'name: gate-evidence-browser-${{ matrix.engine }}-${{ matrix.shard }}',
    ],
  ];
  for (const [jobName, gate, artifact] of kept) {
    const steps = readJob(releaseWorkflow, jobName).split(/^ {6}- /mu);
    const gateStep = steps.findIndex((step) => step.includes(gate));
    const keepStep = steps.findIndex((step) => step.includes(artifact));
    assert.notEqual(gateStep, -1, `${jobName} must run ${gate}`);
    assert.ok(keepStep > gateStep, `${jobName} must keep its evidence after its gate`);
    assert.ok(steps[keepStep].includes(evidence), `${jobName} must keep ${evidence}`);
    assert.match(steps[keepStep], /^ {8}uses: actions\/upload-artifact@[a-f0-9]{40} /mu);
    assert.match(steps[keepStep], /^ {10}overwrite: false$/mu);
    assert.doesNotMatch(steps[keepStep], /^ {8}if:/mu, 'evidence is kept only after a green gate');
  }
  // The core job runs the core gates only; the browser gate runs in shards.
  const coreCommands = readJob(releaseWorkflow, 'validate-core')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(coreCommands, /gates-suite\.sh|gates-browser\.sh|playwright install/u);
});

test('@spec:018-project-integrity-hardening S13 release binds available capability claims to green gate evidence', () => {
  const claims = readJob(releaseWorkflow, 'capability-claims');
  const compose = 'node scripts/release/compose-gate-evidence.mjs';
  const binding = 'node scripts/gates/check-capabilities.mjs';

  // It runs once every core and browser gate has run at the candidate SHA...
  assert.deepEqual(readYamlList(claims, 'needs'), ['validate-core', 'browser']);
  assert.match(claims, /ref: \$\{\{ needs\.validate-core\.outputs\.source-sha \}\}/u);
  assert.match(claims, /^ {10}pattern: gate-evidence-\*$/mu);
  assert.match(claims, /^ {4}permissions:\n {6}contents: read$/mu);
  // ...composes the core job's evidence and every browser shard's...
  assert.equal(occurrenceCount(claims, compose), 1);
  assert.match(claims, /--core "\$evidence\/gate-evidence-core\/current-run\.tsv"/u);
  assert.match(claims, /--output "\$RUNNER_TEMP\/release-gate-evidence\.tsv"/u);
  assert.match(claims, /^ {12}"\$evidence"\/gate-evidence-browser-\*\/current-run\.tsv$/mu);
  // ...and binds the claims to that composed record, failing on any error.
  assert.equal(occurrenceCount(claims, binding), 1);
  assert.equal(occurrenceCount(claims, '--write-evidence'), 1);
  assert.match(claims, /--gate-evidence "\$RUNNER_TEMP\/release-gate-evidence\.tsv"$/mu);
  assert.ok(claims.indexOf(compose) < claims.indexOf(binding));
  assert.match(claims, /^ {10}set -euo pipefail$/mu);
});

test('@spec:018-project-integrity-hardening S6 browsers and independent verification consume validate-core output', () => {
  assert.deepEqual(readYamlList(readJob(releaseWorkflow, 'browser'), 'needs'), ['validate-core']);
  assert.deepEqual(readYamlList(readJob(releaseWorkflow, 'verify-candidate'), 'needs'), [
    'validate-core',
  ]);
});

// Every engine and every shard is a `browser` job: needing `browser` waits for
// all of them, and any one that fails or is cancelled keeps publish from
// starting.
test('@spec:018-project-integrity-hardening S6 publication needs the complete prerelease evidence set', () => {
  const publish = readJob(releaseWorkflow, 'publish');

  assert.deepEqual(readYamlList(publish, 'needs'), [
    'validate-core',
    'verify-candidate',
    'browser',
    'capability-claims',
  ]);
  assert.doesNotMatch(publish, /always\(\)|failure\(\)|cancelled\(\)|continue-on-error/u);
});

// The nightly schedule is a release dry run on main (docs/releasing.md): it
// runs every validation job and can never publish. GitHub runs a schedule on
// the default branch, never on a tag, so validate-core builds a dry-run
// candidate, and publish, which requires a tag ref besides, never starts. Only
// publish enters the npm environment or holds an OIDC token, and the workflow
// reads no secret, so a scheduled run needs neither.
test('@spec:018-project-integrity-hardening S7 the nightly release dry run validates everything and can never publish', async () => {
  const ciWorkflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  const triggers = /^on:\n((?: {2}.*\n|\n)+?)(?=\S)/mu.exec(releaseWorkflow)?.[1] ?? '';
  const events = [...triggers.matchAll(/^ {2}([a-z_]+):/gmu)].map((match) => match[1]);
  assert.deepEqual(events, ['workflow_dispatch', 'push', 'schedule']);

  // One daily run, an hour or more away from the Chromium nightly in ci.yml.
  const crons = [...triggers.matchAll(/cron: '([^']+)'/gu)].map((match) => match[1]);
  assert.equal(crons.length, 1, 'one nightly schedule');
  assert.match(crons[0], /^\d+ \d+ \* \* \*$/u, 'the schedule runs daily');
  const minuteOfDay = (cron) => {
    const [minute, hour] = cron.split(' ').map(Number);
    return hour * 60 + minute;
  };
  const ciCron = /^ {4}- cron: '([^']+)'/mu.exec(ciWorkflow)?.[1];
  assert.ok(ciCron, 'ci.yml keeps its nightly schedule');
  const gap = Math.abs(minuteOfDay(crons[0]) - minuteOfDay(ciCron));
  assert.ok(Math.min(gap, 24 * 60 - gap) >= 60, 'the dry run is offset from the ci nightly');

  // Release mode is set in one place, and only for a run on a tag.
  const validateCore = readJob(releaseWorkflow, 'validate-core');
  assert.equal(occurrenceCount(validateCore, "mode='release'"), 1);
  assert.match(
    validateCore,
    /^ {10}mode='dry-run'\n {10}tag_arguments=\(\)\n {10}if \[\[ "\$GITHUB_REF_TYPE" == 'tag' \]\]; then\n {12}mode='release'$/mu,
  );

  // Publication needs a tag ref as well as a release manifest...
  const publish = readJob(releaseWorkflow, 'publish');
  assert.match(
    publish,
    /^ {4}if: github\.ref_type == 'tag' && needs\.validate-core\.outputs\.mode == 'release'$/mu,
  );
  assert.match(publish, /^ {4}environment:\n {6}name: npm$/mu);
  // ...while every validation job runs unconditionally, outside the npm
  // environment and without an OIDC token.
  for (const jobName of ['validate-core', 'browser', 'verify-candidate', 'capability-claims']) {
    assert.doesNotMatch(
      readJob(releaseWorkflow, jobName),
      /^ {4}(?:if|environment):|id-token/mu,
      jobName,
    );
  }
  assert.doesNotMatch(releaseWorkflow, /\$\{\{\s*secrets\./u, 'release reads no secret');
});

// `npm publish --provenance` signs the statement before it uploads anything:
// it trades the job's OIDC token for a short-lived certificate at Fulcio and
// records the signature in Rekor (the defaults of npm's bundled
// @sigstore/sign). With egress blocked, both hosts have to be declared or the
// first real release fails at its last step, which no dry run ever reaches.
// The list stays exact: the one job that holds publication authority reaches
// nothing it does not need.
test('@spec:018-project-integrity-hardening S6 publication reaches the registry and the two services that sign its provenance, and nothing else', () => {
  const publish = readJob(releaseWorkflow, 'publish');
  assert.match(publish, /npm publish .* --provenance/u);
  assert.match(publish, /^ {10}egress-policy: block$/m);

  const allowlist = /^ {10}allowed-endpoints: >-\n((?: {12}\S+\n)+)/m.exec(publish);
  assert.ok(allowlist, 'publish must declare its allowed endpoints as a folded list');

  assert.deepEqual(
    allowlist[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => line.trim()),
    [
      'api.github.com:443',
      '*.actions.githubusercontent.com:443',
      '*.blob.core.windows.net:443',
      'registry.npmjs.org:443',
      'fulcio.sigstore.dev:443',
      'rekor.sigstore.dev:443',
    ],
  );
});

test('@spec:018-project-integrity-hardening S8 prerelease primes both documented offline installer stores with exactly the consumer dependencies before the consumer runs', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const consumer = 'node scripts/consumer-contract.mjs';

  assert.match(
    browserJob,
    /mkdir -p .*"\$consumer_cache\/npm".*"\$consumer_cache\/pnpm-store".*"\$consumer_cache\/xdg"/u,
  );
  const primed = (pattern) =>
    [...browserJob.matchAll(pattern)].map((match) => ({ spec: match[1], at: match.index }));
  const npmPrimed = primed(/npm cache add --cache "\$consumer_cache\/npm" (\S+)/gu);
  const pnpmPrimed = primed(
    /pnpm --dir "\$consumer_cache\/pnpm-prime" --store-dir "\$consumer_cache\/pnpm-store" add --ignore-scripts --save-exact (\S+)/gu,
  );
  for (const stores of [npmPrimed, pnpmPrimed]) {
    assert.deepEqual(
      stores.map(({ spec }) => spec),
      consumerDependencies,
    );
    for (const { at } of stores) assert.ok(at < browserJob.indexOf(consumer));
  }
});

test('@spec:018-project-integrity-hardening S6 each candidate verifier binds the immutable digest exactly once', () => {
  const digestArgument = '--sha256 "${{ needs.validate-core.outputs.candidate-sha256 }}"';

  assert.equal(occurrenceCount(readJob(releaseWorkflow, 'browser'), digestArgument), 1);
  assert.equal(occurrenceCount(readJob(releaseWorkflow, 'verify-candidate'), digestArgument), 1);
});

test('@spec:018-project-integrity-hardening S8 terminal consumer fence validates the complete report', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const consumer = 'node scripts/consumer-contract.mjs';
  const terminalFence = 'const report = JSON.parse(readFileSync(process.argv[1], "utf8"));';
  const requiredEvidence = [
    'report.browser',
    'report.installationExamples',
    'report.installationRuns',
    'report.packages',
    'report.snippets',
    'browser.customElementDefined',
    'browser.executedSnippetCount',
    'browser.httpRequestPolicyEnforced',
    'browser.networkPolicyScope',
    'browser.shadowButtonRendered',
    'browser.tagName',
    'browser.themeCustomPropertiesResolved',
    'browser.themeResolved',
    'browser.themeTokenOverrideResolved',
    'browser.webSocketPolicyEnforced',
    'source !== "tarball"',
    'workspaceLinked !== false',
  ];

  assert.ok(browserJob.indexOf(terminalFence) > browserJob.indexOf(consumer));
  for (const evidence of requiredEvidence) {
    assert.ok(browserJob.includes(evidence), `terminal consumer fence must validate ${evidence}`);
  }
});

test('@spec:018-project-integrity-hardening S8 exact candidate consumer receives an isolated cache and explicit offline mode', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');

  assert.match(
    browserJob,
    /NPM_CONFIG_OFFLINE=true npm_config_offline=true\s+node scripts\/consumer-contract\.mjs/u,
  );
  assert.match(browserJob, /--cache-dir "\$consumer_cache"/u);
});

test('S7 each release fence expects its canonical packages and checks the installed MCP server', async () => {
  const { releasePackages } = await import('../release/release-plan.mjs');
  const list = (names) => `[${names.map((name) => `"${name}"`).join(', ')}]`;
  // The browser consumer contract stays on the packages it installs in a page.
  const consumerScope = list(['@kimen/elements', '@kimen/tokens', '@kimen/mcp-server']);
  const browser = readJob(releaseWorkflow, 'browser');
  const independent = readJob(releaseWorkflow, 'verify-candidate');
  const publish = readJob(releaseWorkflow, 'publish');

  assert.ok(browser.includes(`const expectedPackages = ${consumerScope};`));
  assert.ok(browser.includes('[...report.packages, verification.mcpServer]'));
  assert.ok(publish.includes(`const expected = ${list([...releasePackages.keys()])};`));
  assert.match(publish, /manifest\.packages\.length !== expected\.length/u);
  assert.match(independent, /node-version: 26/u);
  assert.match(independent, /node scripts\/release\/candidate-cli\.mjs verify/u);
  assert.doesNotMatch(independent, /registry\.npmjs\.org|id-token: write/u);
});

// The publisher re-reads every packed manifest from the exact bytes it is
// about to publish, so a workspace: range that reached a tarball stops the
// release there even though the candidate builder and verifiers refuse it.
test('S7 the publisher refuses a packed manifest whose runtime dependencies carry a workspace range', () => {
  const publish = readJob(releaseWorkflow, 'publish');
  const check =
    'if (["dependencies", "optionalDependencies", "peerDependencies"].some((field) => JSON.stringify(manifest[field] ?? {}).includes("workspace:"))) throw new Error("packed runtime dependencies must not carry workspace: ranges");';

  assert.equal(occurrenceCount(publish, check), 1);
  assert.ok(publish.indexOf(check) < publish.indexOf('npm publish "$package_path"'));
  assert.doesNotMatch(publish, /actions\/checkout|pnpm install|npm (?:ci|install)/u);
});

// The clean-consumer smoke runs in validate-core, on the candidate it just
// built and by its digest, before the candidate is uploaded; that job already
// reaches the registry its third-party dependencies come from.
test('S7 validate-core smokes the exact candidate in a clean consumer before uploading it', () => {
  const validateCore = readJob(releaseWorkflow, 'validate-core');
  const build = 'node scripts/release/candidate-cli.mjs build';
  const smoke = 'node scripts/release/candidate-cli.mjs smoke';
  const upload = 'name: Upload immutable candidate';

  assert.equal(occurrenceCount(validateCore, smoke), 1);
  assert.ok(validateCore.indexOf(build) < validateCore.indexOf(smoke));
  assert.ok(validateCore.indexOf(smoke) < validateCore.indexOf(upload));
  assert.match(
    validateCore,
    /^ {10}CANDIDATE_SHA256: \$\{\{ steps\.candidate\.outputs\.candidate-sha256 \}\}$/mu,
  );
  assert.match(validateCore, /--archive "\$RUNNER_TEMP\/release-candidate\/candidate\.tar"/u);
  assert.match(validateCore, /--sha256 "\$CANDIDATE_SHA256"/u);
  assert.match(validateCore, /^ {12}registry\.npmjs\.org:443$/mu);
});
