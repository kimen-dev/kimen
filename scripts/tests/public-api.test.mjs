// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalJsonSha256 } from '../lib/canonical-json.mjs';

const subjectUrl = new URL('../lib/public-api.mjs', import.meta.url);
const elementsPackage = '@kimen/elements';
const tokensPackage = '@kimen/tokens';

async function loadSubject() {
  let subject;
  try {
    subject = await import(subjectUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('T051 RED: scripts/lib/public-api.mjs is not implemented');
    }
    throw error;
  }

  assert.equal(
    typeof subject.createPublicApiSnapshot,
    'function',
    'createPublicApiSnapshot export is required',
  );
  assert.equal(
    typeof subject.classifyPublicApiChange,
    'function',
    'classifyPublicApiChange export is required',
  );
  assert.equal(
    typeof subject.evaluatePublicApiChange,
    'function',
    'evaluatePublicApiChange export is required',
  );
  return subject;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

const publicFacet = (overrides = {}) => ({
  type: "'neutral' | 'danger'",
  default: 'neutral',
  required: false,
  description: 'Visual intent of the control.',
  deprecatedSince: null,
  replacement: null,
  ...overrides,
});

const publicExport = (target, overrides = {}) => ({
  target,
  deprecatedSince: null,
  replacement: null,
  ...overrides,
});

const legacyRootSymbol = (tag) => ({
  target: `./dist/components/${tag}.js`,
  deprecatedSince: '1.1.0',
  replacement: `${elementsPackage}/${tag}`,
});

function aSurface(overrides = {}) {
  return {
    packages: {
      [elementsPackage]: {
        version: overrides.elementsVersion ?? '1.2.0',
        exports: {
          '.': publicExport('./dist/index.js'),
          './ki-button': publicExport('./dist/components/ki-button.js'),
          './ki-dialog': publicExport('./dist/components/ki-dialog.js'),
        },
        components: {
          'ki-button': {
            properties: {
              variant: publicFacet(),
            },
            attributes: {
              variant: publicFacet(),
            },
            events: {},
            methods: {},
            slots: {},
            parts: {},
            cssProperties: {
              '--ki-button-bg': {
                type: 'color',
                description: 'Background color of the button.',
                deprecatedSince: null,
                replacement: null,
              },
            },
          },
        },
        rootSymbols: {
          KiButton: legacyRootSymbol('ki-button'),
          KiDialog: legacyRootSymbol('ki-dialog'),
        },
      },
      [tokensPackage]: {
        version: overrides.tokensVersion ?? '1.2.0',
        exports: {
          '.': publicExport('./dist/index.js'),
          './css/onmars-light.css': publicExport('./dist/css/onmars-light.css'),
        },
        tokens: {
          '--ki-text-base': {
            type: 'color',
            description: 'Default foreground color.',
            deprecatedSince: null,
            replacement: null,
          },
        },
      },
    },
    browserBaseline: overrides.browserBaseline ?? ['chromium', 'firefox', 'webkit'],
  };
}

function aDeclaration(baseline, candidate, overrides = {}) {
  return {
    schemaVersion: 1,
    packages: [elementsPackage],
    baselineVersion: baseline.surface.packages[elementsPackage].version,
    baselineSha256: baseline.surfaceSha256,
    candidateSha256: candidate.surfaceSha256,
    release: 'major',
    reason: 'Exercise the compatibility contract.',
    ...overrides,
  };
}

function aFirstReleaseDeclaration(candidate, overrides = {}) {
  return {
    schemaVersion: 1,
    firstRelease: true,
    packages: [elementsPackage, tokensPackage],
    baselineVersion: null,
    baselineSha256: null,
    candidateSha256: candidate.surfaceSha256,
    release: 'minor',
    reason: 'Declare the initial 0.1.0 public surface explicitly.',
    ...overrides,
  };
}

function addStylesheetSurface(surface, values) {
  surface.packages[tokensPackage].stylesheets = {
    './css/onmars-light.css': {
      target: './dist/css/onmars-light.css',
      contexts: {
        light: { ...values.light },
        dark: { ...values.dark },
      },
    },
  };
  return surface;
}

test('[S10] canonical snapshots sort set-like data and hash only the normalized surface', async () => {
  const { createPublicApiSnapshot } = await loadSubject();
  const surface = aSurface();
  const reordered = clone(surface);
  reordered.browserBaseline.reverse();
  reordered.packages = {
    [tokensPackage]: reordered.packages[tokensPackage],
    [elementsPackage]: reordered.packages[elementsPackage],
  };
  reordered.packages[elementsPackage].rootSymbols = {
    KiDialog: reordered.packages[elementsPackage].rootSymbols.KiDialog,
    KiButton: reordered.packages[elementsPackage].rootSymbols.KiButton,
  };

  const snapshot = createPublicApiSnapshot(surface);
  const reorderedSnapshot = createPublicApiSnapshot(reordered);

  assert.equal(snapshot.schemaVersion, 1);
  assert.deepEqual(snapshot, reorderedSnapshot);
  assert.deepEqual(snapshot.surface.browserBaseline, ['chromium', 'firefox', 'webkit']);
  assert.deepEqual(Object.keys(snapshot.surface.packages), [elementsPackage, tokensPackage]);
  assert.equal(snapshot.surfaceSha256, canonicalJsonSha256(snapshot.surface));
  assert.match(snapshot.surfaceSha256, /^[0-9a-f]{64}$/);
});

test('[S10] a description-only delta is PATCH', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components[
    'ki-button'
  ].properties.variant.description = 'Visual intent of the button control.';
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'patch');
});

test('[S10] a new optional public property is MINOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet({
    type: "'solid' | 'quiet'",
    default: 'solid',
    description: 'Visual prominence of the button.',
  });
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'minor');
});

test('[S10] an optional public property becoming required is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant.required =
    true;
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
});

test('[S10] narrowing a public type is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant.type =
    "'neutral'";
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
});

test('[S10] changing a public default is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant.default =
    'danger';
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
});

test('[S10] removing a public property is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
});

test('[S10] reducing the supported browser baseline is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface({ browserBaseline: ['chromium', 'firefox'] }));

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
  assert.equal(
    result.changes.find(({ path }) => path === 'browserBaseline.webkit')?.packageName,
    elementsPackage,
  );
});

test('[S10] an additive effective CSS token is MINOR and belongs to the token package', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baselineSurface = addStylesheetSurface(aSurface(), {
    light: { '--ki-text-base': '#111111' },
    dark: { '--ki-text-base': '#eeeeee' },
  });
  const candidateSurface = addStylesheetSurface(aSurface(), {
    light: { '--ki-text-base': '#111111', '--ki-text-new': '#222222' },
    dark: { '--ki-text-base': '#eeeeee', '--ki-text-new': '#dddddd' },
  });
  const result = classifyPublicApiChange({
    baseline: createPublicApiSnapshot(baselineSurface),
    candidate: createPublicApiSnapshot(candidateSurface),
  });

  assert.equal(result.release, 'minor');
  assert.ok(
    result.changes
      .filter(({ path }) => path.includes('--ki-text-new'))
      .every(({ packageName }) => packageName === tokensPackage),
  );
});

test('[S10] changing an effective CSS token value is MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baselineSurface = addStylesheetSurface(aSurface(), {
    light: { '--ki-text-base': '#111111' },
    dark: { '--ki-text-base': '#eeeeee' },
  });
  const candidateSurface = addStylesheetSurface(aSurface(), {
    light: { '--ki-text-base': '#111111' },
    dark: { '--ki-text-base': '#dddddd' },
  });

  assert.equal(
    classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    }).release,
    'major',
  );
});

test('[S10] internal token type/default representation does not override published CSS', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baselineSurface = addStylesheetSurface(aSurface(), {
    light: { '--ki-text-base': '#111111' },
    dark: { '--ki-text-base': '#eeeeee' },
  });
  const candidateSurface = clone(baselineSurface);
  candidateSurface.packages[tokensPackage].tokens['--ki-text-base'].type = 'shadow';
  candidateSurface.packages[tokensPackage].tokens['--ki-text-base'].default = {
    color: '#111111',
  };

  assert.equal(
    classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    }).release,
    'patch',
  );
});

test('[S10] an unknown global delta is unowned and blocks without package attribution', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.futureGlobalContract = { enabled: true };
  const candidate = createPublicApiSnapshot(candidateSurface);
  const result = evaluatePublicApiChange({ baseline, candidate, declaration: null });

  assert.equal(result.decision, 'blocked');
  assert.equal(
    result.changes.find(({ path }) => path === 'surface.futureGlobalContract')?.packageName,
    null,
  );
  assert.match(result.reasons.join('\n'), /unknown global|unowned/iu);
});

test('[S10] a no-op declaration is rejected because no package changed', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());

  assert.throws(
    () =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate),
      }),
    /packages.*exactly|no package|no-op/iu,
  );
});

test('[S10] an unknown public-surface delta fails closed as MAJOR', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = clone(baseline);
  candidate.surface.packages[elementsPackage].components['ki-button'].futureFacets = {
    teleportTarget: { description: 'A facet from a newer snapshot grammar.' },
  };
  candidate.surfaceSha256 = canonicalJsonSha256(candidate.surface);

  const result = classifyPublicApiChange({ baseline, candidate });

  assert.equal(result.release, 'major');
});

test('[S10] snapshot comparison rejects a stale baseline digest', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  baseline.surface.packages[elementsPackage].components[
    'ki-button'
  ].properties.variant.description = 'Tampered after hashing.';
  const candidate = createPublicApiSnapshot(aSurface());

  assert.throws(
    () => classifyPublicApiChange({ baseline, candidate }),
    /baseline.*(?:digest|surfaceSha256)/i,
  );
});

test('[S10] snapshot comparison rejects a stale candidate digest', async () => {
  const { classifyPublicApiChange, createPublicApiSnapshot } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());
  candidate.surface.browserBaseline = ['chromium'];

  assert.throws(
    () => classifyPublicApiChange({ baseline, candidate }),
    /candidate.*(?:digest|surfaceSha256)/i,
  );
});

test('[S10] a declaration bound to an older baseline digest is stale', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());
  const declaration = aDeclaration(baseline, candidate, {
    baselineSha256: 'a'.repeat(64),
  });

  assert.throws(
    () => evaluatePublicApiChange({ baseline, candidate, declaration }),
    /baseline.*digest/i,
  );
});

test('[S10] a declaration bound to an older candidate digest is stale', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());
  const declaration = aDeclaration(baseline, candidate, {
    candidateSha256: 'b'.repeat(64),
  });

  assert.throws(
    () => evaluatePublicApiChange({ baseline, candidate, declaration }),
    /candidate.*digest/i,
  );
});

test('[S10] a declaration must name exactly the packages whose public surface changed', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[tokensPackage].tokens['--ki-text-base'].description =
    'Changed token documentation.';
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate, { packages: [elementsPackage] });

  assert.throws(
    () => evaluatePublicApiChange({ baseline, candidate, declaration }),
    /packages.*@kimen\/tokens|@kimen\/tokens.*packages/iu,
  );
});

test('[S10] a declaration naming another baseline version is stale', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(aSurface());
  const declaration = aDeclaration(baseline, candidate, {
    baselineVersion: '1.1.0',
  });

  assert.throws(
    () => evaluatePublicApiChange({ baseline, candidate, declaration }),
    /baseline.*version/i,
  );
});

test('[S10] a missing baseline fails unless the declaration is explicitly first-release', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const candidate = createPublicApiSnapshot(aSurface({ elementsVersion: '0.1.0' }));

  assert.throws(
    () => evaluatePublicApiChange({ baseline: null, candidate, declaration: null }),
    /baseline.*first.release|first.release.*baseline/i,
  );
});

test('[S10] an exact explicit first-release declaration is accepted as MINOR', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const candidate = createPublicApiSnapshot(
    aSurface({ elementsVersion: '0.1.0', tokensVersion: '0.1.0' }),
  );
  const declaration = aFirstReleaseDeclaration(candidate);

  const result = evaluatePublicApiChange({ baseline: null, candidate, declaration });

  assert.equal(result.release, 'minor');
  assert.equal(result.decision, 'passed');
});

test('[S10] declaring less than the actual release class blocks the candidate', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet({
    type: "'solid' | 'quiet'",
    default: 'solid',
    description: 'Visual prominence of the button.',
  });
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate, { release: 'patch' });

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.release, 'minor');
  assert.equal(result.decision, 'blocked');
});

test('[S10] an undeclared breaking removal is blocked', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface({ elementsVersion: '2.0.0' });
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  const candidate = createPublicApiSnapshot(candidateSurface);

  const result = evaluatePublicApiChange({ baseline, candidate, declaration: null });

  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'blocked');
});

test('[S10] a declared removal passes after deprecation and replacement shipped one prior MINOR', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baselineSurface = aSurface();
  baselineSurface.packages[elementsPackage].components[
    'ki-button'
  ].properties.variant.deprecatedSince = '1.1.0';
  baselineSurface.packages[elementsPackage].components['ki-button'].properties.variant.replacement =
    'tone';
  const candidateSurface = aSurface({ elementsVersion: '2.0.0' });
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  const baseline = createPublicApiSnapshot(baselineSurface);
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate);

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'passed');
});

test('[S10] a same-version deprecation is too recent for removal', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baselineSurface = aSurface();
  baselineSurface.packages[elementsPackage].components[
    'ki-button'
  ].properties.variant.deprecatedSince = '1.2.0';
  baselineSurface.packages[elementsPackage].components['ki-button'].properties.variant.replacement =
    'tone';
  const candidateSurface = aSurface({ elementsVersion: '2.0.0' });
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  const baseline = createPublicApiSnapshot(baselineSurface);
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate);

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'blocked');
  assert.match(result.reasons.join('\n'), /deprecat.*minor/i);
});

test('[S10] removal without replacement metadata stays blocked even when MAJOR is declared', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const candidateSurface = aSurface({ elementsVersion: '2.0.0' });
  delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
  const baseline = createPublicApiSnapshot(aSurface());
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate);

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'blocked');
  assert.match(result.reasons.join('\n'), /deprecat|replacement/i);
});

test('[S10] every legacy root symbol requires deprecation and a direct-subpath replacement', async () => {
  const { createPublicApiSnapshot } = await loadSubject();
  const missingReplacement = aSurface();
  missingReplacement.packages[elementsPackage].rootSymbols.KiDialog.replacement = '';
  const wrongReplacement = aSurface();
  wrongReplacement.packages[elementsPackage].rootSymbols.KiDialog.replacement =
    `${elementsPackage}/ki-button`;
  const missingDeprecation = aSurface();
  missingDeprecation.packages[elementsPackage].rootSymbols.KiButton.deprecatedSince = null;

  assert.throws(
    () => createPublicApiSnapshot(missingReplacement),
    /KiDialog.*replacement|replacement.*KiDialog/i,
  );
  assert.throws(
    () => createPublicApiSnapshot(wrongReplacement),
    /KiDialog.*replacement|replacement.*KiDialog/i,
  );
  assert.throws(
    () => createPublicApiSnapshot(missingDeprecation),
    /KiButton.*deprecated|deprecated.*KiButton/i,
  );
});

test('[S10] the frozen legacy root rejects a new symbol even with complete metadata', async () => {
  const { createPublicApiSnapshot, evaluatePublicApiChange } = await loadSubject();
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface();
  candidateSurface.packages[elementsPackage].rootSymbols.KiAvatar = legacyRootSymbol('ki-avatar');
  const candidate = createPublicApiSnapshot(candidateSurface);
  const declaration = aDeclaration(baseline, candidate, { release: 'major' });

  const result = evaluatePublicApiChange({ baseline, candidate, declaration });

  assert.equal(result.decision, 'blocked');
  assert.match(result.reasons.join('\n'), /root.*(?:frozen|new symbol)|new.*root symbol/i);
});
