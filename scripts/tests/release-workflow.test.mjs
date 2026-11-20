// @spec:018-project-integrity-hardening
// @spec:151-release-automation
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const releaseWorkflow = await readFile(
  new URL('../../.github/workflows/release.yml', import.meta.url),
  'utf8',
);
// The offline consumer installs the packed @kimen/elements, whose only runtime
// dependency is the exact @stencil/core it declares: the primed stores must
// hold that version, or a compiler bump breaks the prerelease install.
const elementsStencil = JSON.parse(
  await readFile(new URL('../../packages/elements/package.json', import.meta.url), 'utf8'),
).dependencies['@stencil/core'];

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

test('@spec:018-project-integrity-hardening S6 prerelease runs the full browser gate for every matrix engine', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const installEngine =
    'pnpm --filter @kimen/elements exec playwright install --with-deps "${{ matrix.engine }}"';
  const fullBrowserGate = 'bash scripts/gates/gates-browser.sh "${{ matrix.engine }}"';
  const candidateConsumer = 'node scripts/consumer-contract.mjs';

  assert.equal(occurrenceCount(browserJob, fullBrowserGate), 1);
  assert.ok(browserJob.indexOf(fullBrowserGate) > browserJob.indexOf(installEngine));
  assert.ok(browserJob.indexOf(fullBrowserGate) < browserJob.indexOf(candidateConsumer));
});

test('@spec:018-project-integrity-hardening S6 prerelease permits the runner apt sources required by Playwright', () => {
  for (const jobName of ['validate-core', 'browser']) {
    const job = readJob(releaseWorkflow, jobName);
    assert.match(job, /^ {12}azure\.archive\.ubuntu\.com:80$/m);
    assert.match(job, /^ {12}dl\.google\.com:443$/m);
    assert.match(job, /^ {12}storage\.googleapis\.com:443$/m);
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
  const suiteIndex = job.indexOf('run: bash scripts/gates/gates-suite.sh');
  assert.notEqual(suiteIndex, -1, 'validate-core must run the gate suite');
  assert.notEqual(installIndex, -1, 'validate-core must install Semgrep');
  assert.ok(installIndex < suiteIndex, 'Semgrep must be installed before the gate suite runs');
  // pip downloads the locked files from PyPI, and this job blocks every
  // undeclared host.
  assert.match(job, /^ {12}pypi\.org:443$/m);
  assert.match(job, /^ {12}files\.pythonhosted\.org:443$/m);
});

test('@spec:018-project-integrity-hardening S8 release validation proves the packaging contract before the candidate is built', () => {
  const validateCore = readJob(releaseWorkflow, 'validate-core');
  const coreGate = 'bash scripts/gates/gates-suite.sh';
  const packagingGate = 'pnpm run packaging';
  const candidateBuild = 'node scripts/release/candidate-cli.mjs build';

  assert.equal(occurrenceCount(validateCore, packagingGate), 1);
  assert.ok(validateCore.indexOf(packagingGate) > validateCore.indexOf(coreGate));
  assert.ok(validateCore.indexOf(packagingGate) < validateCore.indexOf(candidateBuild));
});

test('@spec:018-project-integrity-hardening S13 release binds available capability claims to green gate evidence', () => {
  const validateCore = readJob(releaseWorkflow, 'validate-core');
  const suiteGate = 'bash scripts/gates/gates-suite.sh';
  const evidenceBinding = 'scripts/gates/check-capabilities.mjs';
  const candidateBuild = 'node scripts/release/candidate-cli.mjs build';

  // The binding consumes the full-suite current-run evidence at the release SHA.
  assert.equal(occurrenceCount(validateCore, '--write-evidence'), 1);
  assert.match(
    validateCore,
    /--gate-evidence "\$KIMEN_CACHE_ROOT\/gate-evidence\/current-run\.tsv"/u,
  );
  // It runs on the suite evidence and gates the candidate build.
  assert.ok(validateCore.indexOf(evidenceBinding) > validateCore.indexOf(suiteGate));
  assert.ok(validateCore.indexOf(evidenceBinding) < validateCore.indexOf(candidateBuild));
});

test('@spec:018-project-integrity-hardening S6 browsers and independent verification consume validate-core output', () => {
  assert.deepEqual(readYamlList(readJob(releaseWorkflow, 'browser'), 'needs'), ['validate-core']);
  assert.deepEqual(readYamlList(readJob(releaseWorkflow, 'verify-candidate'), 'needs'), [
    'validate-core',
  ]);
});

test('@spec:018-project-integrity-hardening S6 publication needs the complete prerelease evidence set', () => {
  const publishNeeds = readYamlList(readJob(releaseWorkflow, 'publish'), 'needs');

  assert.deepEqual(publishNeeds, ['validate-core', 'verify-candidate', 'browser']);
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

test('@spec:018-project-integrity-hardening S8 prerelease primes both documented offline installer stores before the consumer runs', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const npmPrime = `npm cache add --cache "$consumer_cache/npm" @stencil/core@${elementsStencil}`;
  const pnpmPrime = `XDG_CACHE_HOME="$consumer_cache/xdg" pnpm --dir "$consumer_cache/pnpm-prime" --store-dir "$consumer_cache/pnpm-store" add --ignore-scripts --save-exact @stencil/core@${elementsStencil}`;
  const consumer = 'node scripts/consumer-contract.mjs';

  assert.match(
    browserJob,
    /mkdir -p .*"\$consumer_cache\/npm".*"\$consumer_cache\/pnpm-store".*"\$consumer_cache\/pnpm-prime".*"\$consumer_cache\/xdg"/u,
  );
  assert.match(browserJob, new RegExp(npmPrime.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(browserJob, new RegExp(pnpmPrime.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.ok(browserJob.indexOf(npmPrime) < browserJob.indexOf(consumer));
  assert.ok(browserJob.indexOf(pnpmPrime) < browserJob.indexOf(consumer));
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

test('S7 each release fence expects the three canonical packages and checks the installed MCP server', () => {
  const scope = '["@kimen/elements", "@kimen/tokens", "@kimen/mcp-server"]';
  const browser = readJob(releaseWorkflow, 'browser');
  const independent = readJob(releaseWorkflow, 'verify-candidate');
  const publish = readJob(releaseWorkflow, 'publish');

  assert.ok(browser.includes(`const expectedPackages = ${scope};`));
  assert.ok(browser.includes('[...report.packages, verification.mcpServer]'));
  assert.ok(publish.includes(`const expected = ${scope};`));
  assert.match(publish, /manifest\.packages\.length !== expected\.length/u);
  assert.match(independent, /node-version: 26/u);
  assert.match(independent, /node scripts\/release\/candidate-cli\.mjs verify/u);
  assert.doesNotMatch(independent, /registry\.npmjs\.org|id-token: write/u);
});
