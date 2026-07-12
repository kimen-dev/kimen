// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const releaseWorkflow = await readFile(
  new URL('../../.github/workflows/release.yml', import.meta.url),
  'utf8',
);

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
  }
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

test('@spec:018-project-integrity-hardening S8 prerelease primes both documented offline installer stores before the consumer runs', () => {
  const browserJob = readJob(releaseWorkflow, 'browser');
  const npmPrime = 'npm cache add --cache "$consumer_cache/npm" @stencil/core@4.43.5';
  const pnpmPrime =
    'XDG_CACHE_HOME="$consumer_cache/xdg" pnpm --dir "$consumer_cache/pnpm-prime" --store-dir "$consumer_cache/pnpm-store" add --ignore-scripts --save-exact @stencil/core@4.43.5';
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
