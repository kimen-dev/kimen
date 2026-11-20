// @spec:018-project-integrity-hardening
// The release runs the core gates and the browser gate's shards in separate
// jobs; scripts/release/compose-gate-evidence.mjs joins their current-run
// evidence into the record the capability binding reads.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkCapabilities,
  discoverMandatoryEvidenceIds,
  parseGateEvidence,
} from '../gates/check-capabilities.mjs';
import {
  BROWSER_GATE_EVIDENCE_ID,
  composeReleaseGateEvidence,
  RELEASE_BROWSER_ENGINES,
  runComposeCli,
} from '../release/compose-gate-evidence.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const browserGate = join(repositoryRoot, 'scripts/gates/gates-browser.sh');
const temporaryRoot = await realpath(tmpdir());
const SHARDS = 4;

const tsv = (rows) => rows.map((row) => `${row.join('\t')}\n`).join('');

// What gates-browser.sh records for one green shard (see the real-gate test
// below, which checks this against the gate itself).
function shardEvidence(engine, index, count = SHARDS) {
  const rows = [
    ['browser', 'config-typecheck', 'green'],
    ['browser', `browser-executable:${engine}`, 'green'],
    ['browser', `test-browser:${engine}:${String(index)}/${String(count)}`, 'green'],
  ];
  if (engine === 'chromium' && index === count) {
    rows.push(
      ['browser', 'test-browser-wrappers:chromium', 'green'],
      ['browser', 'test-browser-catalog:chromium', 'green'],
      ['browser', 'test-browser-adapter-mcp-apps:chromium', 'green'],
    );
  }
  return tsv(rows);
}

function everyShard(count = SHARDS) {
  return RELEASE_BROWSER_ENGINES.flatMap((engine) =>
    Array.from({ length: count }, (_, index) => ({
      label: `${engine}-${String(index + 1)}`,
      source: shardEvidence(engine, index + 1, count),
    })),
  );
}

// Every mandatory gate but the browser one green, as gates-core.sh records it.
async function coreEvidence() {
  const ids = await discoverMandatoryEvidenceIds();
  return tsv(
    ids
      .filter((id) => id !== BROWSER_GATE_EVIDENCE_ID && id !== 'core')
      .map((id) => ['core', id, 'green']),
  );
}

test('@spec:018-project-integrity-hardening S13 the composed release evidence is the suite record with the browser gate green', async () => {
  const mandatory = await discoverMandatoryEvidenceIds();
  const core = await coreEvidence();
  const composed = composeReleaseGateEvidence({ browser: everyShard(), core });

  // Every row each job recorded is kept, and the browser gate is green.
  assert.ok(composed.startsWith(core));
  for (const { source } of everyShard()) assert.ok(composed.includes(source));
  assert.ok(composed.endsWith(`release\t${BROWSER_GATE_EVIDENCE_ID}\tgreen\n`));
  assert.deepEqual(
    parseGateEvidence(composed, mandatory).find(({ id }) => id === BROWSER_GATE_EVIDENCE_ID),
    { id: BROWSER_GATE_EVIDENCE_ID, status: 'green' },
  );
});

test('@spec:018-project-integrity-hardening S13 the capability binding passes on the composed evidence and not on the core evidence alone', async (t) => {
  const root = await mkdtemp(join(temporaryRoot, 'kimen-release-evidence-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const core = await coreEvidence();
  const composedPath = join(root, 'release-gate-evidence.tsv');
  const corePath = join(root, 'core.tsv');
  await writeFile(composedPath, composeReleaseGateEvidence({ browser: everyShard(), core }));
  await writeFile(corePath, core);
  const bind = (gateEvidence) =>
    checkCapabilities({
      arguments_: [
        '--write-evidence',
        join(root, 'capability-evidence.json'),
        '--gate-evidence',
        gateEvidence,
      ],
      environment: {},
      stdout: { write: () => true },
    });

  await bind(composedPath);
  await assert.rejects(bind(corePath), /test-browser evidence is missing/u);
});

test('@spec:018-project-integrity-hardening S6 no browser gate is green unless every engine reports every shard green', () => {
  const core = tsv([['core', 'build', 'green']]);
  const without = (engine, index) =>
    everyShard().filter(({ label }) => label !== `${engine}-${String(index)}`);
  const replacing = (engine, index, source) => [
    ...without(engine, index),
    { label: `${engine}-${String(index)}`, source },
  ];
  const cases = [
    ['a missing shard', without('webkit', 3), /webkit shard 3\/4 has no evidence/u],
    [
      'a missing engine',
      everyShard().filter(({ label }) => !label.startsWith('firefox-')),
      /no browser evidence for firefox/u,
    ],
    [
      'a shard recorded twice',
      [...everyShard(), { label: 'again', source: shardEvidence('chromium', 2) }],
      /chromium shard 2 is recorded twice/u,
    ],
    [
      'a red row',
      replacing(
        'chromium',
        4,
        shardEvidence('chromium', 4).replace(
          'test-browser-catalog:chromium\tgreen',
          'test-browser-catalog:chromium\tred',
        ),
      ),
      /test-browser-catalog:chromium as red/u,
    ],
    [
      'a skipped suite',
      replacing('firefox', 1, shardEvidence('firefox', 1).replace('1/4\tgreen', '1/4\tskipped')),
      /as skipped, not green/u,
    ],
    [
      'shards that disagree on their count',
      replacing('chromium', 1, shardEvidence('chromium', 1, 3)),
      /chromium shards disagree/u,
    ],
    [
      'an unsharded run',
      replacing(
        'webkit',
        1,
        tsv([
          ['browser', 'browser-executable:webkit', 'green'],
          ['browser', 'test-browser:webkit', 'green'],
        ]),
      ),
      /exactly one browser shard, found 0/u,
    ],
    [
      'an engine outside the release',
      [...everyShard(), { label: 'edge', source: shardEvidence('edge', 1) }],
      /edge, which is not a release browser engine/u,
    ],
    [
      'a shard outside its count',
      replacing('chromium', 1, shardEvidence('chromium', 5)),
      /shard 5\/4, outside its count/u,
    ],
    [
      'no record of the executable',
      replacing(
        'firefox',
        2,
        shardEvidence('firefox', 2).replace(/^.*browser-executable.*\n/mu, ''),
      ),
      /does not record the firefox executable/u,
    ],
    [
      'a row from another gate',
      replacing('webkit', 2, `${shardEvidence('webkit', 2)}core\tbuild\tgreen\n`),
      /has a core row/u,
    ],
    ['an empty shard', replacing('webkit', 4, ''), /webkit-4 is empty/u],
    [
      'a malformed shard',
      replacing('webkit', 4, `${shardEvidence('webkit', 4)}browser\tgreen\n`),
      /webkit-4 has a malformed row at line 4/u,
    ],
    ['no browser evidence at all', [], /no browser evidence was given/u],
  ];
  for (const [name, browser, message] of cases) {
    assert.throws(() => composeReleaseGateEvidence({ browser, core }), message, name);
  }
  assert.throws(
    () => composeReleaseGateEvidence({ browser: everyShard(), core: '' }),
    /core evidence is empty/u,
  );
});

// The composer reads what gates-browser.sh writes, at the path the release
// job uploads it from. Each engine's shards run the real gate here, with
// pnpm and the browser executable stubbed, in CI mode as on a runner.
test('@spec:018-project-integrity-hardening S6 the real gate shards of every engine compose into a green browser gate', async (t) => {
  const root = await mkdtemp(join(temporaryRoot, 'kimen-release-shards-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const bin = join(root, 'bin');
  await mkdir(bin, { recursive: true });
  await writeFile(join(bin, 'pnpm'), '#!/usr/bin/env bash\nexit 0\n');
  await chmod(join(bin, 'pnpm'), 0o755);

  const browser = [];
  for (const engine of RELEASE_BROWSER_ENGINES) {
    const cacheRoot = join(root, engine, 'cache');
    const browsers = join(root, engine, 'browsers');
    const home = join(root, engine, 'home');
    await Promise.all([browsers, home].map((path) => mkdir(path, { recursive: true })));
    const resolved = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `const engines = await import('./packages/elements/node_modules/playwright/index.mjs');
process.stdout.write(engines[process.argv[1]].executablePath());`,
        engine,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsers },
      },
    );
    assert.equal(resolved.status, 0, resolved.stderr);
    await mkdir(dirname(resolved.stdout), { recursive: true });
    await writeFile(resolved.stdout, '#!/usr/bin/env bash\nexit 0\n');
    await chmod(resolved.stdout, 0o755);

    for (let shard = 1; shard <= SHARDS; shard += 1) {
      const result = spawnSync('bash', [browserGate, engine], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          CI: 'true',
          HOME: home,
          KIMEN_BROWSER_SHARD: `${String(shard)}/${String(SHARDS)}`,
          KIMEN_CACHE_ROOT: cacheRoot,
          PATH: `${bin}:${process.env.PATH}`,
          PLAYWRIGHT_BROWSERS_PATH: browsers,
        },
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      const source = await readFile(join(cacheRoot, 'gate-evidence/current-run.tsv'), 'utf8');
      assert.equal(source, shardEvidence(engine, shard));
      browser.push({ label: `${engine}-${String(shard)}`, source });
    }
  }

  const composed = composeReleaseGateEvidence({
    browser,
    core: tsv([['core', 'build', 'green']]),
  });
  assert.ok(composed.endsWith(`release\t${BROWSER_GATE_EVIDENCE_ID}\tgreen\n`));
});

test('@spec:018-project-integrity-hardening S13 the composer CLI writes the composed record from evidence files', async (t) => {
  const root = await mkdtemp(join(temporaryRoot, 'kimen-release-cli-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const core = tsv([['core', 'build', 'green']]);
  await writeFile(join(root, 'core.tsv'), core);
  const files = [];
  for (const { label, source } of everyShard()) {
    const path = join(root, `gate-evidence-browser-${label}`, 'current-run.tsv');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source);
    files.push(path);
  }
  const output = join(root, 'composed.tsv');
  let printed = '';

  const composed = await runComposeCli({
    arguments_: ['--core', join(root, 'core.tsv'), '--output', output, ...files],
    stdout: { write: (text) => (printed += text) },
  });

  assert.equal(await readFile(output, 'utf8'), composed);
  assert.match(printed, /12 browser shards across chromium, firefox, webkit; test-browser green/u);
  for (const arguments_ of [
    ['--output', output, ...files],
    ['--core', join(root, 'core.tsv'), ...files],
    ['--core', join(root, 'core.tsv'), '--output', output],
    ['--core', join(root, 'core.tsv'), '--output', output, '--shards', '4', ...files],
  ]) {
    await assert.rejects(runComposeCli({ arguments_ }), /compose-gate-evidence:/u);
  }
  await assert.rejects(
    runComposeCli({
      arguments_: ['--core', join(root, 'core.tsv'), '--output', output, files[0]],
    }),
    /has no evidence|no browser evidence/u,
  );
});

// The composer, the release matrix and the suite agree: the same engines, and
// the evidence ID the suite gives its browser gate.
test('@spec:018-project-integrity-hardening S6 the composer names the release matrix engines and the suite browser gate', async () => {
  const [release, suite] = await Promise.all([
    readFile(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8'),
    readFile(join(repositoryRoot, 'scripts/gates/gates-suite.sh'), 'utf8'),
  ]);
  const engines = /^ {8}engine: \[([^\]]+)\]$/mu
    .exec(release)?.[1]
    .split(',')
    .map((engine) => engine.trim());

  assert.deepEqual(engines, [...RELEASE_BROWSER_ENGINES]);
  assert.match(
    suite,
    new RegExp(
      `^run_gate ${BROWSER_GATE_EVIDENCE_ID} bash scripts/gates/gates-browser\\.sh `,
      'mu',
    ),
  );
  assert.ok((await discoverMandatoryEvidenceIds()).includes(BROWSER_GATE_EVIDENCE_ID));
});
