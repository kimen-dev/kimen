// @spec:018-project-integrity-hardening#S12
import assert from 'node:assert/strict';
import test from 'node:test';

const subjectUrl = new URL('../generator-smoke.mjs', import.meta.url);
const tag = 'ki-avatar';
const feature = '018-project-integrity-hardening';
const legacyRootDigest = 'a'.repeat(64);
const requiredSurfaces = Object.freeze([
  'unit',
  'tokens',
  'cem',
  'llms',
  'build',
  'pack',
  'attw',
  'budget',
  'browser',
]);

async function loadSubject() {
  let subject;
  try {
    subject = await import(subjectUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('T062 RED: scripts/generator-smoke.mjs is not implemented');
    }
    throw error;
  }

  assert.equal(
    typeof subject.createGeneratorSmokePlan,
    'function',
    'createGeneratorSmokePlan export is required',
  );
  assert.equal(
    typeof subject.validateGeneratorSmokeEvidence,
    'function',
    'validateGeneratorSmokeEvidence export is required',
  );
  assert.equal(
    typeof subject.runGeneratorSmoke,
    'function',
    'runGeneratorSmoke export is required',
  );
  assert.equal(
    typeof subject.createGeneratorSmokeEnvironment,
    'function',
    'createGeneratorSmokeEnvironment export is required',
  );
  return subject;
}

function aDisposableAvatarEvidence() {
  return {
    schemaVersion: 1,
    tag,
    spec: feature,
    disposable: true,
    manualEdits: [],
    legacyRoot: {
      beforeSha256: legacyRootDigest,
      afterSha256: legacyRootDigest,
    },
    surfaces: {
      unit: {
        status: 'passed',
        discovered: ['packages/elements/src/components/ki-avatar/ki-avatar.spec.tsx'],
      },
      tokens: {
        status: 'passed',
        discovered: ['packages/tokens/tokens/component/avatar.tokens.json'],
      },
      cem: {
        status: 'passed',
        discovered: ['ki-avatar'],
      },
      llms: {
        status: 'passed',
        discovered: ['ki-avatar'],
      },
      build: {
        status: 'passed',
        discovered: ['packages/elements/dist/components/ki-avatar.js'],
      },
      pack: {
        status: 'passed',
        discovered: ['@kimen/elements/ki-avatar'],
      },
      attw: {
        status: 'passed',
        discovered: ['./ki-avatar'],
      },
      budget: {
        status: 'passed',
        discovered: ['ki-avatar'],
      },
      browser: {
        status: 'passed',
        discovered: ['packages/elements/browser-tests/ki-avatar.browser.spec.ts'],
      },
    },
  };
}

function withoutSurface(surface) {
  const evidence = aDisposableAvatarEvidence();
  const surfaces = Object.fromEntries(
    Object.entries(evidence.surfaces).filter(([name]) => name !== surface),
  );
  return { ...evidence, surfaces };
}

test('S12 plans a disposable ki-avatar run with no post-generation edit step', async () => {
  const { createGeneratorSmokePlan } = await loadSubject();

  const plan = createGeneratorSmokePlan({ tag, spec: feature });

  assert.equal(plan.tag, tag);
  assert.equal(plan.spec, feature);
  assert.equal(plan.disposable, true);
  assert.deepEqual(plan.manualEdits, []);
  assert.deepEqual(plan.requiredSurfaces, requiredSurfaces);
  assert.deepEqual(plan.steps.map(({ id }) => id).toSorted(), [
    'attw',
    'browser',
    'budget',
    'build',
    'cem',
    'llms',
    'pack',
    'scaffold',
    'tokens',
    'unit',
  ]);
  assert.equal(
    plan.steps.findIndex(({ id }) => id === 'build') <
      plan.steps.findIndex(({ id }) => id === 'unit'),
    true,
    'the real unit setup imports built Stencil output',
  );
});

test('S12 isolates npm, pnpm, Nx, and browser caches from mutable user state', async () => {
  const { createGeneratorSmokeEnvironment } = await loadSubject();
  const environment = createGeneratorSmokeEnvironment({
    temporaryRoot: '/tmp/kimen-smoke',
    baseEnvironment: { PATH: '/bin', PLAYWRIGHT_BROWSERS_PATH: '/trusted/browsers' },
  });

  assert.equal(environment.NPM_CONFIG_CACHE, '/tmp/kimen-smoke/cache/npm');
  assert.equal(environment.npm_config_cache, '/tmp/kimen-smoke/cache/npm');
  assert.equal(environment.NPM_CONFIG_USERCONFIG, '/tmp/kimen-smoke/config/npmrc');
  assert.equal(environment.NX_CACHE_DIRECTORY, '/tmp/kimen-smoke/cache/nx');
  assert.equal(environment.PLAYWRIGHT_BROWSERS_PATH, '/trusted/browsers');
  assert.equal(environment.NX_DAEMON, 'false');
});

test('S12 accepts complete unit/token/CEM/llms/build/pack/ATTW/budget/browser evidence', async () => {
  const { validateGeneratorSmokeEvidence } = await loadSubject();
  const evidence = aDisposableAvatarEvidence();

  assert.doesNotThrow(() => validateGeneratorSmokeEvidence(evidence));
});

for (const surface of requiredSurfaces) {
  test(`S12 fails closed when disposable ki-avatar lacks ${surface} discovery`, async () => {
    const { validateGeneratorSmokeEvidence } = await loadSubject();

    assert.throws(
      () => validateGeneratorSmokeEvidence(withoutSurface(surface)),
      new RegExp(surface, 'iu'),
    );
  });
}

test('S12 rejects a smoke that required a post-generation manual edit', async () => {
  const { validateGeneratorSmokeEvidence } = await loadSubject();
  const evidence = aDisposableAvatarEvidence();
  evidence.manualEdits = ['register ki-avatar in a parallel list'];

  assert.throws(() => validateGeneratorSmokeEvidence(evidence), /manual edit/iu);
});

test('S12 rejects growth of the deprecated root barrel during generation', async () => {
  const { validateGeneratorSmokeEvidence } = await loadSubject();
  const evidence = aDisposableAvatarEvidence();
  evidence.legacyRoot.afterSha256 = 'b'.repeat(64);

  assert.throws(() => validateGeneratorSmokeEvidence(evidence), /legacy root|root barrel|sha256/iu);
});
