// @spec:018-project-integrity-hardening#S10
// @spec:067-merge-friendly-checks#S1
// @spec:067-merge-friendly-checks#S2
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalJson,
  canonicalJsonSha256,
  writeCanonicalJsonFile,
} from '../lib/canonical-json.mjs';
import {
  classifyPublicApiChange,
  createPublicApiDeclaration,
  createPublicApiSnapshot,
  evaluatePublicApiChange,
} from '../lib/public-api.mjs';

const gatePath = fileURLToPath(new URL('../gates/check-public-api.mjs', import.meta.url));
const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url));
const coreGatesPath = fileURLToPath(new URL('../gates/gates-core.sh', import.meta.url));
const bootstrapBaselinePath = fileURLToPath(
  new URL('../../changes/api/baselines/0.0.0.json', import.meta.url),
);
const elementsPackage = '@kimen/elements';
const tokensPackage = '@kimen/tokens';
const bootstrapSurfaceSha256 = 'b5cf9427802783f74a2b3467a3f02bb3207a7064be984e086fa2dcbccbfb71c7';

const publicExport = (target) => ({
  target,
  deprecatedSince: null,
  replacement: null,
});

function aSurface(version = '1.2.0') {
  return {
    packages: {
      [elementsPackage]: {
        version,
        exports: {
          '.': publicExport('./dist/index.js'),
          './ki-button': publicExport('./dist/components/ki-button.js'),
        },
        rootSymbols: {
          KiButton: {
            target: './dist/components/ki-button.js',
            deprecatedSince: '1.1.0',
            replacement: `${elementsPackage}/ki-button`,
          },
        },
        components: {
          'ki-button': {
            description: 'An action button.',
            properties: {
              variant: {
                type: "'neutral' | 'danger'",
                default: 'neutral',
                required: false,
                description: 'Visual intent.',
                deprecatedSince: null,
                replacement: null,
              },
            },
            attributes: {},
            events: {},
            methods: {},
            slots: {},
            parts: {},
            cssProperties: {},
          },
        },
      },
    },
    browserBaseline: ['chromium', 'firefox', 'webkit'],
  };
}

async function createFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-public-api-gate-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  return root;
}

function runGate(root, ...args) {
  return spawnSync(process.execPath, [gatePath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME,
      LC_ALL: 'C',
      PATH: process.env.PATH,
    },
  });
}

function output(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

test('[S10] explicit canonical fixture paths evaluate a digest-valid candidate', async (t) => {
  const root = await createFixture(t);
  const baselinePath = join(root, 'baseline.json');
  const candidatePath = join(root, 'candidate.json');
  const snapshot = createPublicApiSnapshot(aSurface());
  await Promise.all([
    writeCanonicalJsonFile(baselinePath, snapshot),
    writeCanonicalJsonFile(candidatePath, snapshot),
  ]);

  const result = runGate(
    root,
    '--baseline',
    baselinePath,
    '--candidate',
    candidatePath,
    '--declaration',
    'none',
  );

  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /PASS public-api: release=patch decision=passed/u);
});

test('[S10] an undeclared breaking fixture exits non-zero with the blocking reason', async (t) => {
  const root = await createFixture(t);
  const baselinePath = join(root, 'baseline.json');
  const candidatePath = join(root, 'candidate.json');
  const candidateSurface = aSurface('2.0.0');
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  await Promise.all([
    writeCanonicalJsonFile(baselinePath, createPublicApiSnapshot(aSurface())),
    writeCanonicalJsonFile(candidatePath, createPublicApiSnapshot(candidateSurface)),
  ]);

  const result = runGate(
    root,
    '--baseline',
    baselinePath,
    '--candidate',
    candidatePath,
    '--declaration',
    'none',
  );

  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /BLOCKED public-api: release=major/u);
  assert.match(output(result), /requires a digest-bound MAJOR declaration/u);
});

test('[S10] a stale declaration digest fails closed', async (t) => {
  const root = await createFixture(t);
  const baselinePath = join(root, 'baseline.json');
  const candidatePath = join(root, 'candidate.json');
  const declarationPath = join(root, 'declaration.json');
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());
  await Promise.all([
    writeCanonicalJsonFile(baselinePath, baseline),
    writeCanonicalJsonFile(candidatePath, candidate),
    writeCanonicalJsonFile(declarationPath, {
      schemaVersion: 1,
      packages: [elementsPackage],
      baselineVersion: '1.2.0',
      baselineSha256: baseline.surfaceSha256,
      candidateSha256: 'a'.repeat(64),
      release: 'patch',
      reason: 'Exercise stale candidate binding.',
    }),
  ]);

  const result = runGate(
    root,
    '--baseline',
    baselinePath,
    '--candidate',
    candidatePath,
    '--declaration',
    declarationPath,
  );

  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /candidate digest is stale/u);
});

test('[S10] first release requires explicit none plus an exact declaration', async (t) => {
  const root = await createFixture(t);
  const candidatePath = join(root, 'candidate.json');
  const declarationPath = join(root, 'declaration.json');
  const candidate = createPublicApiSnapshot(aSurface('0.1.0'));
  await Promise.all([
    writeCanonicalJsonFile(candidatePath, candidate),
    writeCanonicalJsonFile(declarationPath, {
      schemaVersion: 1,
      firstRelease: true,
      packages: [elementsPackage],
      baselineVersion: null,
      baselineSha256: null,
      candidateSha256: candidate.surfaceSha256,
      release: 'minor',
      reason: 'Declare the first package surface.',
    }),
  ]);

  const result = runGate(
    root,
    '--baseline',
    'none',
    '--candidate',
    candidatePath,
    '--declaration',
    declarationPath,
  );

  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /PASS public-api: release=minor decision=passed/u);
});

test('[S10] the gate has no implicit repository candidate or declaration', async (t) => {
  const root = await createFixture(t);

  const result = runGate(root);

  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /explicit --baseline, --candidate, and --declaration/u);
});

test('[S1] the gate combines declarations for independently changed public values', async (t) => {
  const root = await createFixture(t);
  const baselinePath = join(root, 'baseline.json');
  const candidatePath = join(root, 'candidate.json');
  const declarationsPath = join(root, 'declarations');
  const baseline = createPublicApiSnapshot(aSurface());
  const documentation = aSurface();
  documentation.packages[elementsPackage].components['ki-button'].description = 'Run an action.';
  const addition = aSurface();
  addition.browserBaseline.push('servo');
  const combined = JSON.parse(JSON.stringify(documentation));
  combined.browserBaseline = addition.browserBaseline;
  await Promise.all([
    writeCanonicalJsonFile(baselinePath, baseline),
    writeCanonicalJsonFile(candidatePath, createPublicApiSnapshot(combined)),
    writeCanonicalJsonFile(
      join(declarationsPath, 'browser.json'),
      createPublicApiDeclaration({
        baseline,
        candidate: createPublicApiSnapshot(addition),
        release: 'minor',
        reason: 'Support Servo.',
      }),
    ),
    writeCanonicalJsonFile(
      join(declarationsPath, 'docs.json'),
      createPublicApiDeclaration({
        baseline,
        candidate: createPublicApiSnapshot(documentation),
        release: 'patch',
        reason: 'Clarify the purpose of the action button.',
      }),
    ),
  ]);

  const args = [
    '--baseline',
    baselinePath,
    '--candidate',
    candidatePath,
    '--declarations',
    declarationsPath,
  ];
  const accepted = runGate(root, ...args);
  assert.equal(accepted.status, 0, output(accepted));
  assert.match(accepted.stdout, /PASS public-api: release=minor decision=passed/u);

  await rm(join(declarationsPath, 'docs.json'));
  const rejected = runGate(root, ...args);
  assert.equal(rejected.status, 1, output(rejected));
  assert.match(output(rejected), /undeclared.*ki-button\/description/iu);
});

test('[S2] an unrelated MAJOR cannot cover a public delta declared as PATCH', () => {
  const baseline = createPublicApiSnapshot(aSurface());
  const property = aSurface();
  property.packages[elementsPackage].components['ki-button'].properties.variant.default = 'danger';
  const browser = aSurface();
  browser.browserBaseline.push('servo');
  const combined = JSON.parse(JSON.stringify(property));
  combined.browserBaseline = browser.browserBaseline;
  const candidate = createPublicApiSnapshot(combined);
  const major = createPublicApiDeclaration({
    baseline,
    candidate: createPublicApiSnapshot(property),
    release: 'major',
    reason: 'Change the default action intent.',
  });
  const patch = createPublicApiDeclaration({
    baseline,
    candidate: createPublicApiSnapshot(browser),
    release: 'patch',
    reason: 'Add Servo with an insufficient release class.',
  });

  const result = evaluatePublicApiChange({ baseline, candidate, declarations: [major, patch] });
  assert.equal(result.decision, 'blocked');
  assert.match(
    result.reasons.join('\n'),
    /Declared patch is lower than actual minor at \/browserBaseline\/servo/u,
  );
});

test('[S2] changing the declared value requires a new declaration at that path', () => {
  const baseline = createPublicApiSnapshot(aSurface());
  const surface = aSurface();
  const component = surface.packages[elementsPackage].components['ki-button'];
  component.description = 'An action with one published description.';
  const old = createPublicApiDeclaration({
    baseline,
    candidate: createPublicApiSnapshot(surface),
    release: 'patch',
    reason: 'Clarify the description.',
  });
  component.description = 'An action with a later published description.';
  const candidate = createPublicApiSnapshot(surface);
  const rejected = evaluatePublicApiChange({ baseline, candidate, declarations: [old] });
  assert.equal(rejected.decision, 'blocked');
  assert.match(rejected.reasons.join('\n'), /Stale declaration.*ki-button\/description/u);

  const updated = createPublicApiDeclaration({
    baseline,
    candidate,
    declarations: [old],
    release: 'patch',
    reason: 'Document the revised action description.',
  });
  assert.equal(
    evaluatePublicApiChange({ baseline, candidate, declarations: [old, updated] }).decision,
    'passed',
  );
});

test('[S1] cumulative migration upgrades only the exact deltas outside the active ledger', () => {
  const baseline = createPublicApiSnapshot(aSurface());
  const browser = aSurface();
  browser.browserBaseline.push('servo');
  const first = createPublicApiDeclaration({
    baseline,
    candidate: createPublicApiSnapshot(browser),
    release: 'minor',
    reason: 'Support Servo.',
  });
  const surface = JSON.parse(JSON.stringify(browser));
  surface.packages[elementsPackage].components['ki-button'].description = 'An action trigger.';
  const candidate = createPublicApiSnapshot(surface);
  const legacy = {
    candidate,
    declaration: {
      baselineSha256: baseline.surfaceSha256,
      baselineVersion: '1.2.0',
      candidateSha256: candidate.surfaceSha256,
      packages: [elementsPackage],
      reason: 'Support Servo and clarify the action button.',
      release: 'minor',
      schemaVersion: 1,
    },
  };

  const migrated = createPublicApiDeclaration({
    baseline,
    candidate,
    declarations: [first],
    legacy,
  });
  assert.deepEqual(Object.keys(migrated.deltas), [
    '/packages/@kimen~1elements/components/ki-button/description',
  ]);
  assert.equal(migrated.reason, legacy.declaration.reason);
  assert.equal(
    evaluatePublicApiChange({
      baseline,
      candidate,
      declarations: [first, migrated],
    }).decision,
    'passed',
  );

  surface.browserBaseline.push('edge');
  assert.throws(
    () =>
      createPublicApiDeclaration({
        baseline,
        candidate: createPublicApiSnapshot(surface),
        declarations: [first],
        legacy,
      }),
    /Legacy declaration does not match the uncovered delta at \/browserBaseline\/edge/u,
  );
});

test('[S10] non-canonical snapshot bytes are rejected', async (t) => {
  const root = await createFixture(t);
  const baselinePath = join(root, 'baseline.json');
  const candidatePath = join(root, 'candidate.json');
  const snapshot = createPublicApiSnapshot(aSurface());
  await writeCanonicalJsonFile(baselinePath, snapshot);
  await writeFile(candidatePath, JSON.stringify(snapshot), 'utf8');
  assert.notEqual(JSON.stringify(snapshot), canonicalJson(snapshot));

  const result = runGate(
    root,
    '--baseline',
    baselinePath,
    '--candidate',
    candidatePath,
    '--declaration',
    'none',
  );

  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /candidate.*canonical JSON/u);
});

test('[S10] the immutable 0.0.0 bootstrap baseline is canonical and digest-valid', async () => {
  const bytes = await readFile(bootstrapBaselinePath, 'utf8');
  const baseline = JSON.parse(bytes);

  assert.equal(bytes, canonicalJson(baseline));
  assert.equal(baseline.surfaceSha256, bootstrapSurfaceSha256);
  assert.equal(baseline.surface.packages[elementsPackage].version, '0.0.0');
  assert.equal(baseline.surface.packages[tokensPackage].version, '0.0.0');
  assert.equal(Object.keys(baseline.surface.packages[elementsPackage].components).length, 20);
  assert.equal(Object.keys(baseline.surface.packages[elementsPackage].rootSymbols).length, 32);
  assert.equal(Object.keys(baseline.surface.packages[elementsPackage].modules).length, 22);
  assert.equal(Object.keys(baseline.surface.packages[tokensPackage].tokens).length, 939);
  assert.equal(
    Object.keys(baseline.surface.packages[tokensPackage].stylesheets['./css'].contexts.light)
      .length,
    939,
  );
  assert.equal(classifyPublicApiChange({ baseline, candidate: baseline }).release, 'patch');
});

test('[S10] the 0.0.0 root metadata overlay cannot authorize a removal', async () => {
  const baseline = JSON.parse(await readFile(bootstrapBaselinePath, 'utf8'));
  const candidate = JSON.parse(JSON.stringify(baseline));
  delete candidate.surface.packages[elementsPackage].rootSymbols.KiButton;
  candidate.surfaceSha256 = canonicalJsonSha256(candidate.surface);
  const declaration = {
    schemaVersion: 1,
    packages: [elementsPackage],
    baselineVersion: '0.0.0',
    baselineSha256: baseline.surfaceSha256,
    candidateSha256: candidate.surfaceSha256,
    release: 'major',
    reason: 'Prove the bootstrap overlay remains removal-ineligible.',
  };

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.decision, 'blocked');
  assert.match(result.reasons.join('\n'), /at least one prior minor/u);
});

test('[S10] public API stays in fast quality while packed consumers stay release-scoped', async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const coreGates = await readFile(coreGatesPath, 'utf8');

  assert.match(packageJson.scripts['check:api'], /--declarations changes\/api(?:\s|$)/u);
  assert.doesNotMatch(packageJson.scripts['check:api'], /--declaration\s/u);
  assert.equal(
    packageJson.scripts['test:consumer-contract'],
    'bash scripts/gates/cache-env.sh -- pnpm run test:consumer-contract:isolated',
  );
  assert.equal(
    packageJson.scripts['test:consumer-contract:isolated'],
    'node --test scripts/tests/consumer-contract.test.mjs && node scripts/tests/consumer-contract-real-smoke.mjs',
  );
  assert.equal(
    packageJson.scripts['check:packed-manifest'],
    'node scripts/gates/check-packed-manifest.mjs',
  );
  assert.doesNotMatch(coreGates, /run_core_gate packed-manifest/u);
  assert.doesNotMatch(coreGates, /run_core_gate pack-consumer/u);
  assert.match(coreGates, /run_core_gate public-api pnpm run check:api/u);
});
