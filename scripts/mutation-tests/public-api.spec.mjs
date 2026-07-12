import { describe, expect, it } from 'vitest';

import { canonicalJsonSha256 } from '../lib/canonical-json.mjs';
import {
  classifyPublicApiChange,
  createPublicApiSnapshot,
  evaluatePublicApiChange,
} from '../lib/public-api.mjs';

// @spec:018-project-integrity-hardening#S10

const elementsPackage = '@kimen/elements';
const tokensPackage = '@kimen/tokens';
const clone = (value) => JSON.parse(JSON.stringify(value));
const noMutation = () => undefined;

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

const legacyRootSymbol = (tag, overrides = {}) => ({
  target: `./dist/components/${tag}.js`,
  deprecatedSince: '1.1.0',
  replacement: `${elementsPackage}/${tag}`,
  ...overrides,
});

const aSurface = (overrides = {}) => ({
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
          description: 'Button component.',
          properties: { variant: publicFacet() },
          attributes: { variant: publicFacet() },
          events: {},
          methods: {},
          slots: {},
          parts: {},
          cssProperties: {
            '--ki-button-bg': {
              type: 'color',
              description: 'Background color.',
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
});

const aDeclaration = (baseline, candidate, overrides = {}) => ({
  schemaVersion: 1,
  packages: [elementsPackage],
  baselineVersion: baseline.surface.packages[elementsPackage].version,
  baselineSha256: baseline.surfaceSha256,
  candidateSha256: candidate.surfaceSha256,
  release: 'major',
  reason: 'Exercise the compatibility contract.',
  ...overrides,
});

const aFirstReleaseDeclaration = (candidate, overrides = {}) => ({
  schemaVersion: 1,
  firstRelease: true,
  packages: [tokensPackage, elementsPackage],
  baselineVersion: null,
  baselineSha256: null,
  candidateSha256: candidate.surfaceSha256,
  release: 'minor',
  reason: 'Declare the initial public surface.',
  ...overrides,
});

const snapshots = (mutate, overrides) => {
  const baseline = createPublicApiSnapshot(aSurface());
  const candidateSurface = aSurface(overrides);
  mutate(candidateSurface);
  return { baseline, candidate: createPublicApiSnapshot(candidateSurface) };
};

const withStylesheetSurface = (surface, { light, dark }) => {
  surface.packages[tokensPackage].stylesheets = {
    './css/onmars-light.css': {
      target: './dist/css/onmars-light.css',
      contexts: { light: { ...light }, dark: { ...dark } },
    },
  };
  return surface;
};

describe('public API snapshot mutation boundary', () => {
  it('S10 canonicalizes object keys and the browser set while hashing surface only', () => {
    const surface = aSurface();
    surface.browserBaseline.reverse();
    surface.packages = {
      [tokensPackage]: surface.packages[tokensPackage],
      [elementsPackage]: surface.packages[elementsPackage],
    };

    const snapshot = createPublicApiSnapshot(surface);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.surface.browserBaseline).toEqual(['chromium', 'firefox', 'webkit']);
    expect(Object.keys(snapshot.surface.packages)).toEqual([elementsPackage, tokensPackage]);
    expect(snapshot.surfaceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshot.surfaceSha256).toBe(canonicalJsonSha256(snapshot.surface));
    expect(Object.hasOwn(snapshot.surface, 'surfaceSha256')).toBe(false);
  });

  it.each([
    ['null surface', null, /surface must be an object/i],
    ['array surface', [], /surface must be an object/i],
    ['missing packages', { browserBaseline: [] }, /packages must be an object/i],
    ['missing browsers', { packages: {} }, /browserBaseline must be an array/i],
    [
      'non-string browser',
      { packages: {}, browserBaseline: [1] },
      /browserBaseline entries must be non-empty strings/i,
    ],
    [
      'empty browser',
      { packages: {}, browserBaseline: [''] },
      /browserBaseline entries must be non-empty strings/i,
    ],
    [
      'duplicate browser',
      { packages: {}, browserBaseline: ['webkit', 'webkit'] },
      /must not contain duplicate webkit/i,
    ],
  ])('S10 rejects %s', (_name, surface, error) => {
    expect(() => createPublicApiSnapshot(surface)).toThrow(error);
  });

  it.each([
    ['non-object package', null, /elements must be an object/i],
    ['non-semver version', { version: 'v1', exports: {} }, /version must be a semantic version/i],
    ['missing exports', { version: '1.0.0' }, /exports must be an object/i],
    [
      'non-object components',
      { version: '1.0.0', exports: {}, components: [] },
      /components must be an object/i,
    ],
    [
      'non-object tokens',
      { version: '1.0.0', exports: {}, tokens: [] },
      /tokens must be an object/i,
    ],
  ])('S10 rejects a package with %s', (_name, packageSurface, error) => {
    const surface = { packages: { [elementsPackage]: packageSurface }, browserBaseline: [] };
    expect(() => createPublicApiSnapshot(surface)).toThrow(error);
  });

  it.each([
    ['non-object entry', null, /export.*must be an object/i],
    [
      'empty target',
      { target: '', deprecatedSince: null, replacement: null },
      /target must be a non-empty string/i,
    ],
    ['missing metadata', { target: './dist/a.js' }, /must carry deprecatedSince and replacement/i],
    [
      'empty deprecation',
      { target: './dist/a.js', deprecatedSince: '', replacement: null },
      /deprecatedSince must be null or a non-empty string/i,
    ],
    [
      'invalid deprecation version',
      { target: './dist/a.js', deprecatedSince: 'next', replacement: './b' },
      /deprecatedSince must be a semantic version/i,
    ],
    [
      'empty replacement',
      { target: './dist/a.js', deprecatedSince: null, replacement: '' },
      /replacement must be null or a non-empty string/i,
    ],
  ])('S10 rejects an export with %s', (_name, entry, error) => {
    const surface = aSurface();
    surface.packages[elementsPackage].exports['./ki-button'] = entry;
    expect(() => createPublicApiSnapshot(surface)).toThrow(error);
  });

  it.each([
    ['non-object', null, /KiButton must be an object/i],
    ['empty target', legacyRootSymbol('ki-button', { target: '' }), /KiButton target/i],
    [
      'missing deprecation',
      legacyRootSymbol('ki-button', { deprecatedSince: null }),
      /KiButton.*deprecated/i,
    ],
    [
      'invalid deprecation',
      legacyRootSymbol('ki-button', { deprecatedSince: 'v1' }),
      /KiButton.*semantic version/i,
    ],
    [
      'missing replacement',
      legacyRootSymbol('ki-button', { replacement: '' }),
      /KiButton.*replacement/i,
    ],
    [
      'other package',
      legacyRootSymbol('ki-button', { replacement: '@other/elements/ki-button' }),
      /KiButton.*direct.*subpath/i,
    ],
    [
      'wildcard replacement',
      legacyRootSymbol('ki-button', { replacement: `${elementsPackage}/ki-*` }),
      /KiButton.*concrete direct subpath/i,
    ],
    [
      'traversal replacement',
      legacyRootSymbol('ki-button', { replacement: `${elementsPackage}/../ki-button` }),
      /KiButton.*concrete direct subpath/i,
    ],
    [
      'wrong export target',
      legacyRootSymbol('ki-button', { replacement: `${elementsPackage}/ki-dialog` }),
      /KiButton.*declared export target/i,
    ],
    [
      'unresolved alias for exported target',
      legacyRootSymbol('ki-button', { replacement: `${elementsPackage}/ki-missing` }),
      /KiButton.*does not name the export/i,
    ],
  ])('S10 rejects a root symbol with %s metadata', (_name, symbol, error) => {
    const surface = aSurface();
    surface.packages[elementsPackage].rootSymbols.KiButton = symbol;
    expect(() => createPublicApiSnapshot(surface)).toThrow(error);
  });

  it('S10 resolves a concrete root replacement through a safe export pattern', () => {
    const surface = aSurface();
    surface.packages[elementsPackage].exports = {
      '.': publicExport('./dist/index.js'),
      './ki-*': publicExport('./dist/components/ki-*.js'),
    };

    expect(() => createPublicApiSnapshot(surface)).not.toThrow();
  });
});

describe('public API SemVer classifier mutation boundary', () => {
  it('S10 treats documentation and equivalent union formatting as PATCH', () => {
    const { baseline, candidate } = snapshots((surface) => {
      const facet = surface.packages[elementsPackage].components['ki-button'].properties.variant;
      facet.description = 'Updated documentation.';
      facet.type = "'danger'|'neutral'";
    });

    const result = classifyPublicApiChange({ baseline, candidate });

    expect(result.release).toBe('patch');
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'documentation', release: 'patch' }),
        expect.objectContaining({ kind: 'type', release: 'patch' }),
      ]),
    );
  });

  it.each([
    [
      'optional facet addition',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet();
      },
    ],
    [
      'type widening',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.type =
          "'neutral' | 'danger' | 'quiet'";
      },
    ],
    [
      'requiredness relaxation',
      (surface) => {
        const facet = surface.packages[elementsPackage].components['ki-button'].properties.variant;
        facet.required = false;
      },
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.required =
          true;
      },
    ],
    [
      'deprecation introduction',
      (surface) => {
        const facet = surface.packages[elementsPackage].components['ki-button'].properties.variant;
        facet.deprecatedSince = '1.2.0';
        facet.replacement = 'tone';
      },
    ],
    [
      'browser addition',
      (surface) => {
        surface.browserBaseline.push('servo');
      },
    ],
    [
      'export addition',
      (surface) => {
        surface.packages[elementsPackage].exports['./ki-new'] = publicExport(
          './dist/components/ki-new.js',
        );
      },
    ],
    [
      'token addition',
      (surface) => {
        surface.packages[tokensPackage].tokens['--ki-text-new'] = publicFacet();
      },
    ],
    [
      'component addition',
      (surface) => {
        surface.packages[elementsPackage].components['ki-new'] = {
          properties: {},
          attributes: {},
          events: {},
          methods: {},
          slots: {},
          parts: {},
          cssProperties: {},
        };
      },
    ],
    [
      'package addition',
      (surface) => {
        surface.packages['@kimen/new'] = { version: '1.2.0', exports: {} };
      },
    ],
  ])('S10 classifies %s as MINOR', (_name, mutateCandidate, mutateBaseline = noMutation) => {
    const baselineSurface = aSurface();
    mutateBaseline(baselineSurface);
    const candidateSurface = clone(baselineSurface);
    mutateCandidate(candidateSurface);

    expect(
      classifyPublicApiChange({
        baseline: createPublicApiSnapshot(baselineSurface),
        candidate: createPublicApiSnapshot(candidateSurface),
      }).release,
    ).toBe('minor');
  });

  it.each([
    [
      'required optional facet addition',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet({
          required: true,
        });
      },
    ],
    [
      'optional to required',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.required =
          true;
      },
    ],
    [
      'type narrowing',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.type =
          "'neutral'";
      },
    ],
    [
      'complex type change',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.type =
          '(value: string) => void';
      },
    ],
    [
      'default change',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].properties.variant.default =
          'danger';
      },
    ],
    [
      'facet removal',
      (surface) => {
        delete surface.packages[elementsPackage].components['ki-button'].properties.variant;
      },
    ],
    [
      'browser removal',
      (surface) => {
        surface.browserBaseline.pop();
      },
    ],
    [
      'component removal',
      (surface) => {
        delete surface.packages[elementsPackage].components['ki-button'];
      },
    ],
    [
      'package removal',
      (surface) => {
        Reflect.deleteProperty(surface.packages, tokensPackage);
      },
    ],
    [
      'unknown component grammar',
      (surface) => {
        surface.packages[elementsPackage].components['ki-button'].futureFacet = {};
      },
    ],
    [
      'unknown package grammar',
      (surface) => {
        surface.packages[elementsPackage].futureMetadata = true;
      },
    ],
    [
      'unknown surface grammar',
      (surface) => {
        surface.futurePolicy = true;
      },
    ],
  ])('S10 classifies %s as MAJOR', (_name, mutateCandidate) => {
    const { baseline, candidate } = snapshots(mutateCandidate);
    expect(classifyPublicApiChange({ baseline, candidate }).release).toBe('major');
  });

  it('S10 reports export, token and root removals with baseline metadata', () => {
    const { baseline, candidate } = snapshots((surface) => {
      delete surface.packages[elementsPackage].exports['./ki-dialog'];
      delete surface.packages[tokensPackage].tokens['--ki-text-base'];
      delete surface.packages[elementsPackage].rootSymbols.KiDialog;
    });

    const result = classifyPublicApiChange({ baseline, candidate });

    expect(result.release).toBe('major');
    expect(result.removals.map(({ path }) => path)).toEqual([
      'packages.@kimen/elements.exports../ki-dialog',
      'packages.@kimen/elements.rootSymbols.KiDialog',
      'packages.@kimen/tokens.tokens.--ki-text-base',
    ]);
  });

  it('S10 rejects stale or structurally invalid snapshot envelopes', () => {
    const baseline = createPublicApiSnapshot(aSurface());
    const candidate = createPublicApiSnapshot(aSurface());

    expect(() => classifyPublicApiChange({ baseline: null, candidate })).toThrow(
      /baseline snapshot must be an object/i,
    );
    expect(() =>
      classifyPublicApiChange({ baseline: { ...baseline, schemaVersion: 2 }, candidate }),
    ).toThrow(/baseline snapshot schemaVersion/i);
    expect(() =>
      classifyPublicApiChange({ baseline: { ...baseline, surfaceSha256: 'bad' }, candidate }),
    ).toThrow(/baseline surfaceSha256 digest/i);
    const tampered = clone(candidate);
    tampered.surface.browserBaseline.pop();
    expect(() => classifyPublicApiChange({ baseline, candidate: tampered })).toThrow(
      /candidate.*digest does not match/i,
    );
  });

  it('S10 classifies an additive effective stylesheet token as MINOR owned by tokens', () => {
    const baselineSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111' },
      dark: { '--ki-text-base': '#eeeeee' },
    });
    const candidateSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111', '--ki-text-new': '#222222' },
      dark: { '--ki-text-base': '#eeeeee', '--ki-text-new': '#dddddd' },
    });

    const result = classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    });

    expect(result.release).toBe('minor');
    expect(result.changes.filter(({ path }) => path.includes('--ki-text-new'))).toEqual([
      {
        release: 'minor',
        path: 'packages.@kimen/tokens.stylesheets../css/onmars-light.css.contexts.dark.--ki-text-new',
        kind: 'added',
        packageName: tokensPackage,
      },
      {
        release: 'minor',
        path: 'packages.@kimen/tokens.stylesheets../css/onmars-light.css.contexts.light.--ki-text-new',
        kind: 'added',
        packageName: tokensPackage,
      },
    ]);
  });

  it('S10 classifies an effective stylesheet value change as MAJOR owned by tokens', () => {
    const baselineSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111' },
      dark: { '--ki-text-base': '#eeeeee' },
    });
    const candidateSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111' },
      dark: { '--ki-text-base': '#dddddd' },
    });

    const result = classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    });

    expect(result.release).toBe('major');
    expect(result.changes).toContainEqual({
      release: 'major',
      path: 'packages.@kimen/tokens.stylesheets../css/onmars-light.css.contexts.dark.--ki-text-base',
      kind: 'effective-value',
      packageName: tokensPackage,
    });
  });

  it('S10 ignores DTCG type/default representation changes while effective CSS is stable', () => {
    const baselineSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111' },
      dark: { '--ki-text-base': '#eeeeee' },
    });
    baselineSurface.packages[tokensPackage].tokens['--ki-text-base'].default = '#111111';
    const candidateSurface = clone(baselineSurface);
    candidateSurface.packages[tokensPackage].tokens['--ki-text-base'].type = 'shadow';
    candidateSurface.packages[tokensPackage].tokens['--ki-text-base'].default = {
      color: '#111111',
      blur: '0px',
    };

    const result = classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    });

    expect(result).toEqual({ release: 'patch', changes: [], removals: [], newRootSymbols: [] });
  });

  it('S10 assigns browser changes to elements and stylesheet changes to tokens', () => {
    const baselineSurface = withStylesheetSurface(aSurface(), {
      light: { '--ki-text-base': '#111111' },
      dark: { '--ki-text-base': '#eeeeee' },
    });
    const candidateSurface = clone(baselineSurface);
    candidateSurface.browserBaseline.push('servo');
    candidateSurface.packages[tokensPackage].stylesheets['./css/onmars-light.css'].contexts.light[
      '--ki-text-new'
    ] = '#222222';

    const result = classifyPublicApiChange({
      baseline: createPublicApiSnapshot(baselineSurface),
      candidate: createPublicApiSnapshot(candidateSurface),
    });

    expect(result.changes.find(({ path }) => path === 'browserBaseline.servo')).toEqual({
      release: 'minor',
      path: 'browserBaseline.servo',
      kind: 'added',
      packageName: elementsPackage,
    });
    expect(result.changes.find(({ path }) => path.includes('--ki-text-new'))).toEqual({
      release: 'minor',
      path: 'packages.@kimen/tokens.stylesheets../css/onmars-light.css.contexts.light.--ki-text-new',
      kind: 'added',
      packageName: tokensPackage,
    });
  });

  it('S10 leaves an unknown global delta unowned and blocks it', () => {
    const baseline = createPublicApiSnapshot(aSurface());
    const candidateSurface = aSurface();
    candidateSurface.futureGlobalContract = { enabled: true };
    const candidate = createPublicApiSnapshot(candidateSurface);

    const result = evaluatePublicApiChange({ baseline, candidate, declaration: null });

    expect(result.release).toBe('major');
    expect(result.decision).toBe('blocked');
    expect(result.changes).toContainEqual({
      release: 'major',
      path: 'surface.futureGlobalContract',
      kind: 'unknown',
      packageName: null,
    });
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.stringMatching(/unknown global or unowned/iu)]),
    );
  });
});

describe('public API declaration mutation boundary', () => {
  it('S10 accepts only the exact digest-bound first-release contract', () => {
    const candidate = createPublicApiSnapshot(
      aSurface({ elementsVersion: '0.1.0', tokensVersion: '0.1.0' }),
    );

    expect(
      evaluatePublicApiChange({
        baseline: null,
        candidate,
        declaration: aFirstReleaseDeclaration(candidate),
      }),
    ).toEqual({ release: 'minor', decision: 'passed', reasons: [], changes: [] });
  });

  it.each([
    ['missing declaration', null, /explicit first-release/i],
    ['missing flag', { firstRelease: false }, /requires firstRelease: true/i],
    ['baseline version', { baselineVersion: '0.0.0' }, /null baseline version and digest/i],
    ['baseline digest', { baselineSha256: 'a'.repeat(64) }, /null baseline version and digest/i],
    ['stale candidate', { candidateSha256: 'b'.repeat(64) }, /candidate digest is stale/i],
    ['missing package', { packages: [elementsPackage] }, /every candidate package exactly/i],
    ['wrong release', { release: 'major' }, /initial surface as minor/i],
    ['bad schema', { schemaVersion: 2 }, /schemaVersion/i],
    ['empty packages', { packages: [] }, /packages must be a non-empty array/i],
    [
      'duplicate package',
      { packages: [elementsPackage, elementsPackage] },
      /unique non-empty package names/i,
    ],
    ['bad release', { release: 'unknown' }, /release must be patch, minor, or major/i],
    ['empty reason', { reason: '' }, /reason must be non-empty/i],
  ])('S10 rejects first release with %s', (_name, override, error) => {
    const candidate = createPublicApiSnapshot(
      aSurface({ elementsVersion: '0.1.0', tokensVersion: '0.1.0' }),
    );
    const declaration = override === null ? null : aFirstReleaseDeclaration(candidate, override);

    expect(() => evaluatePublicApiChange({ baseline: null, candidate, declaration })).toThrow(
      error,
    );
  });

  it('S10 binds a normal declaration to baseline version and both digests', () => {
    const { baseline, candidate } = snapshots((surface) => {
      surface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet();
    });

    expect(
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { release: 'minor' }),
      }).decision,
    ).toBe('passed');
    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { firstRelease: true }),
      }),
    ).toThrow(/first-release declaration cannot be used with a baseline/i);
    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { baselineSha256: 'a'.repeat(64) }),
      }),
    ).toThrow(/baseline digest is stale/i);
    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { candidateSha256: 'b'.repeat(64) }),
      }),
    ).toThrow(/candidate digest is stale/i);
    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { baselineVersion: '1.1.0' }),
      }),
    ).toThrow(/baseline version is stale/i);
    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate, { packages: ['@kimen/missing'] }),
      }),
    ).toThrow(/package.*absent from a snapshot/i);
  });

  it('S10 passes undeclared PATCH and MINOR but blocks undeclared or underdeclared MAJOR', () => {
    const unchanged = snapshots(noMutation);
    const additive = snapshots((surface) => {
      surface.packages[elementsPackage].components['ki-button'].properties.tone = publicFacet();
    });
    const breaking = snapshots((surface) => {
      surface.packages[elementsPackage].components['ki-button'].properties.variant.required = true;
    });

    expect(evaluatePublicApiChange({ ...unchanged, declaration: null }).decision).toBe('passed');
    expect(evaluatePublicApiChange({ ...additive, declaration: null }).decision).toBe('passed');
    expect(evaluatePublicApiChange({ ...breaking, declaration: null })).toEqual(
      expect.objectContaining({
        release: 'major',
        decision: 'blocked',
        reasons: [expect.stringMatching(/requires.*MAJOR declaration/i)],
      }),
    );
    expect(
      evaluatePublicApiChange({
        ...additive,
        declaration: aDeclaration(additive.baseline, additive.candidate, { release: 'patch' }),
      }),
    ).toEqual(
      expect.objectContaining({
        release: 'minor',
        decision: 'blocked',
        reasons: [expect.stringMatching(/lower than actual minor/i)],
      }),
    );
  });

  it('S10 permits removal only after replacement-bearing deprecation shipped a prior minor', () => {
    const baselineSurface = aSurface();
    const variant =
      baselineSurface.packages[elementsPackage].components['ki-button'].properties.variant;
    variant.deprecatedSince = '1.1.0';
    variant.replacement = 'tone';
    const candidateSurface = clone(baselineSurface);
    candidateSurface.packages[elementsPackage].version = '2.0.0';
    delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
    const baseline = createPublicApiSnapshot(baselineSurface);
    const candidate = createPublicApiSnapshot(candidateSurface);
    const declaration = aDeclaration(baseline, candidate);

    expect(evaluatePublicApiChange({ baseline, candidate, declaration }).decision).toBe('passed');

    const tooRecentSurface = clone(baselineSurface);
    tooRecentSurface.packages[elementsPackage].components[
      'ki-button'
    ].properties.variant.deprecatedSince = '1.2.0';
    const tooRecent = createPublicApiSnapshot(tooRecentSurface);
    expect(
      evaluatePublicApiChange({
        baseline: tooRecent,
        candidate,
        declaration: aDeclaration(tooRecent, candidate),
      }),
    ).toEqual(
      expect.objectContaining({
        decision: 'blocked',
        reasons: [expect.stringMatching(/at least one prior minor/i)],
      }),
    );
  });

  it.each([
    [
      'missing deprecation',
      (facet) => {
        facet.deprecatedSince = null;
      },
      /without prior deprecation/i,
    ],
    [
      'missing replacement',
      (facet) => {
        facet.replacement = null;
      },
      /without replacement/i,
    ],
  ])('S10 blocks removal with %s metadata', (_name, mutateFacet, error) => {
    const baselineSurface = aSurface();
    const facet =
      baselineSurface.packages[elementsPackage].components['ki-button'].properties.variant;
    facet.deprecatedSince = '1.1.0';
    facet.replacement = 'tone';
    mutateFacet(facet);
    const candidateSurface = aSurface({ elementsVersion: '2.0.0' });
    delete candidateSurface.packages[elementsPackage].components['ki-button'].properties.variant;
    const baseline = createPublicApiSnapshot(baselineSurface);
    const candidate = createPublicApiSnapshot(candidateSurface);

    expect(
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate),
      }).reasons,
    ).toEqual([expect.stringMatching(error)]);
  });

  it('S10 permanently blocks growth of the frozen legacy root', () => {
    const { baseline, candidate } = snapshots((surface) => {
      surface.packages[elementsPackage].rootSymbols.KiAvatar = legacyRootSymbol('ki-avatar');
    });

    expect(
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate),
      }),
    ).toEqual(
      expect.objectContaining({
        decision: 'blocked',
        reasons: [expect.stringMatching(/new symbol.*frozen legacy root/i)],
      }),
    );
  });

  it('S10 rejects a declaration when no package surface changed', () => {
    const baseline = createPublicApiSnapshot(aSurface());
    const candidate = createPublicApiSnapshot(aSurface());

    expect(() =>
      evaluatePublicApiChange({
        baseline,
        candidate,
        declaration: aDeclaration(baseline, candidate),
      }),
    ).toThrow(/packages must exactly match changed packages:/iu);
  });
});
