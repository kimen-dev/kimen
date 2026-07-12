import { describe, expect, it } from 'vitest';

import {
  assertMutationThresholds,
  classifyChangedFiles,
  evaluateMutationReport,
  evaluateMutationScore,
  groupCoreFiles,
  hashMutationRunnerScope,
  hashMutationScope,
  MUTATION_SCOPE_SCHEMA_VERSION,
  MUTATION_THRESHOLD,
} from '../lib/mutation-policy.mjs';

// @spec:018-project-integrity-hardening

const aHash = (character) => character.repeat(64);

const scopeInput = {
  files: [
    { path: 'scripts/lib/zeta.mjs', classification: 'core', runner: 'node' },
    { path: 'scripts/lib/alpha.mjs', classification: 'core', runner: 'node' },
  ],
  policyHash: aHash('a'),
  configHashes: { node: aHash('b'), elements: aHash('c') },
  lockfileHash: aHash('d'),
};

const mutationReport = ({
  files,
  statuses = [
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Killed',
    'Survived',
    'NoCoverage',
    'Timeout',
  ],
}) => ({
  schemaVersion: '1.0',
  thresholds: { high: 70, low: 70, break: 70 },
  config: { mutate: files, thresholds: { high: 70, low: 70, break: 70 } },
  files: Object.fromEntries(
    files.map((path) => [
      path,
      {
        mutants: statuses.map((status, index) => ({ id: String(index), status })),
      },
    ]),
  ),
});

describe('mutation policy classification', () => {
  it('@spec:018 S3 exposes the frozen threshold and scope schema', () => {
    expect(MUTATION_THRESHOLD).toBe(70);
    expect(MUTATION_SCOPE_SCHEMA_VERSION).toBe(1);
  });

  it('@spec:018 S3 sorts changed core files and assigns named runners', () => {
    expect(
      classifyChangedFiles([
        'scripts/lib/canonical-json.mjs',
        'packages/elements/src/components/ki-button/ki-button.tsx',
      ]),
    ).toEqual([
      {
        path: 'packages/elements/src/components/ki-button/ki-button.tsx',
        classification: 'core',
        runner: 'elements',
      },
      { path: 'scripts/lib/canonical-json.mjs', classification: 'core', runner: 'node' },
    ]);
  });

  it.each([
    ['packages/elements/src/components/ki-button/ki-button.css', /non-executable/i],
    ['.agents/skills/review/scripts/run.sh', /agent tooling/i],
    ['.claude/skills/review/scripts/run.sh', /agent tooling/i],
    ['packages/elements/dist/index.js', /generated or vendored/i],
    ['.cache/result.js', /generated or vendored/i],
    ['scripts/tests/example.mjs', /test, fixture and story/i],
    ['scripts/foo.spec.mjs', /test, fixture and story/i],
    [
      'packages/elements/src/components/ki-button/ki-button.stories.tsx',
      /test, fixture and story/i,
    ],
    ['packages/elements/src/components.d.ts', /type declarations/i],
    ['eslint.config.mjs', /configuration/i],
    ['packages/elements/vitest.setup.mjs', /configuration/i],
    ['.github/workflows/ci.yml', /configuration/i],
    ['packages/elements/src/index.ts', /entry-point glue/i],
    ['packages/catalog/index.mjs', /entry-point glue/i],
    ['site/src/main.ts', /browser presentation/i],
    ['scripts/gates/example.sh', /shell orchestration/i],
  ])('@spec:018 S3 gives %s an explicit exclusion reason', (path, reason) => {
    expect(classifyChangedFiles([path])).toEqual([
      { path, classification: 'excluded', reason: expect.stringMatching(reason) },
    ]);
  });

  it.each([
    ['scripts/lib/a.mjs', 'node'],
    ['tools/generator/src/a.ts', 'node'],
    ['.github/scripts/a.cjs', 'node'],
    ['sandbox/lib/a.js', 'node'],
    ['packages/catalog/src/a.ts', 'node'],
    ['packages/tokens/scripts/a.mjs', 'node'],
    ['packages/tokens/build.mjs', 'node'],
    ['packages/elements/src/components/ki-a/ki-a.tsx', 'elements'],
  ])('@spec:018 S3 classifies %s for %s', (path, runner) => {
    expect(classifyChangedFiles([path])).toEqual([{ path, classification: 'core', runner }]);
  });

  it('@spec:018 S3 normalizes dot and Windows separators before duplicate detection', () => {
    expect(classifyChangedFiles(['.\\scripts\\lib\\a.mjs'])).toEqual([
      { path: 'scripts/lib/a.mjs', classification: 'core', runner: 'node' },
    ]);
    expect(() => classifyChangedFiles(['scripts/lib/a.mjs', './scripts/lib/a.mjs'])).toThrow(
      /duplicate changed path/i,
    );
  });

  it.each([
    [null, /must be an array/i],
    [[''], /non-empty strings/i],
    [['\u0000bad.mjs'], /control or invalid UTF-8/i],
    [['/absolute.mjs'], /repository-relative/i],
    [['C:/absolute.mjs'], /repository-relative/i],
    [['../escape.mjs'], /invalid repository path/i],
    [['folder/'], /invalid repository path/i],
    [['experimental/new-core.ts'], /unclassified executable paths/i],
  ])('@spec:018 S3 fails closed for malformed changed paths %#', (paths, expected) => {
    expect(() => classifyChangedFiles(paths)).toThrow(expected);
  });

  it('@spec:018 S3 groups only normalized core files by runner', () => {
    expect(
      groupCoreFiles([
        { path: 'scripts/lib/z.mjs', classification: 'core', runner: 'node' },
        { path: 'README.md', classification: 'excluded', reason: 'documentation' },
        {
          path: 'packages/elements/src/a.ts',
          classification: 'core',
          runner: 'elements',
        },
        { path: 'scripts/lib/a.mjs', classification: 'core', runner: 'node' },
      ]),
    ).toEqual({
      elements: ['packages/elements/src/a.ts'],
      node: ['scripts/lib/a.mjs', 'scripts/lib/z.mjs'],
    });
  });

  it.each([
    [null, /files must be an array/i],
    [[null], /entries must be objects/i],
    [[{ path: 'scripts/a.mjs', classification: 'core', runner: 'other' }], /named runner/i],
    [[{ path: 'README.md', classification: 'excluded', reason: '' }], /requires a reason/i],
    [[{ path: 'README.md', classification: 'other' }], /invalid mutation classification/i],
    [
      [
        { path: 'scripts/a.mjs', classification: 'core', runner: 'node' },
        { path: './scripts/a.mjs', classification: 'core', runner: 'node' },
      ],
      /duplicate mutation scope file/i,
    ],
  ])('@spec:018 S3 rejects malformed classified files %#', (files, expected) => {
    expect(() => groupCoreFiles(files)).toThrow(expected);
  });
});

describe('mutation policy scope hashes', () => {
  it('@spec:018 S3 canonicalizes file and config ordering', () => {
    const first = hashMutationScope(scopeInput);
    const second = hashMutationScope({
      ...scopeInput,
      files: [...scopeInput.files].reverse(),
      configHashes: {
        elements: scopeInput.configHashes.elements,
        node: scopeInput.configHashes.node,
      },
    });

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
  });

  it('@spec:018 S3 binds files, policy, configs, and lockfile', () => {
    const baseline = hashMutationScope(scopeInput);

    expect(
      hashMutationScope({
        ...scopeInput,
        files: [{ ...scopeInput.files[0], path: 'scripts/lib/changed.mjs' }],
      }),
    ).not.toBe(baseline);
    expect(hashMutationScope({ ...scopeInput, policyHash: aHash('e') })).not.toBe(baseline);
    expect(
      hashMutationScope({
        ...scopeInput,
        configHashes: { ...scopeInput.configHashes, node: aHash('e') },
      }),
    ).not.toBe(baseline);
    expect(hashMutationScope({ ...scopeInput, lockfileHash: aHash('e') })).not.toBe(baseline);
  });

  it('@spec:018 S3 runner scope binds the runner and exact sorted files', () => {
    const input = {
      runner: 'node',
      files: ['scripts/lib/b.mjs', 'scripts/lib/a.mjs'],
      policyHash: aHash('a'),
      configHashes: { node: aHash('b'), elements: aHash('c'), vitest: aHash('d') },
      lockfileHash: aHash('e'),
    };
    const baseline = hashMutationRunnerScope(input);

    expect(baseline).toMatch(/^[0-9a-f]{64}$/);
    expect(hashMutationRunnerScope({ ...input, files: [...input.files].reverse() })).toBe(baseline);
    expect(hashMutationRunnerScope({ ...input, runner: 'elements' })).not.toBe(baseline);
    expect(hashMutationRunnerScope({ ...input, files: ['scripts/lib/a.mjs'] })).not.toBe(baseline);
  });

  it.each([
    [() => hashMutationScope(null), /scope must be an object/i],
    [() => hashMutationScope({ ...scopeInput, policyHash: 'A'.repeat(64) }), /lowercase SHA-256/i],
    [() => hashMutationScope({ ...scopeInput, configHashes: {} }), /at least one config hash/i],
    [
      () => hashMutationScope({ ...scopeInput, configHashes: { 'Bad key': aHash('b') } }),
      /invalid mutation config hash key/i,
    ],
    [() => hashMutationRunnerScope(null), /runner scope must be an object/i],
    [() => hashMutationRunnerScope({ ...scopeInput, runner: 'other' }), /node or elements/i],
    [
      () => hashMutationRunnerScope({ ...scopeInput, runner: 'node', files: [] }),
      /non-empty array/i,
    ],
    [
      () =>
        hashMutationRunnerScope({
          ...scopeInput,
          runner: 'node',
          files: ['scripts/a.mjs', './scripts/a.mjs'],
        }),
      /duplicate mutation runner files path/i,
    ],
  ])('@spec:018 S3 rejects malformed hash input %#', (operation, expected) => {
    expect(operation).toThrow(expected);
  });
});

describe('mutation policy report evaluation', () => {
  it('@spec:018 S3 scores valid outcomes rationally per group', () => {
    const files = ['scripts/lib/canonical-json.mjs'];

    expect(evaluateMutationReport(mutationReport({ files }), files)).toEqual({
      counts: {
        detected: 8,
        invalid: 0,
        killed: 7,
        noCoverage: 1,
        runtimeError: 0,
        compileError: 0,
        ignored: 0,
        survived: 1,
        timeout: 1,
        valid: 10,
      },
      decision: 'pass',
      score: 80,
      threshold: 70,
    });
  });

  it('@spec:018 S3 fails 69 and passes exactly 70 without rounding', () => {
    const files = ['scripts/lib/core.mjs'];
    const at69 = mutationReport({
      files,
      statuses: [...Array(69).fill('Killed'), ...Array(31).fill('Survived')],
    });
    const at70 = mutationReport({
      files,
      statuses: [...Array(70).fill('Killed'), ...Array(30).fill('Survived')],
    });

    expect(evaluateMutationReport(at69, files).decision).toBe('fail');
    expect(evaluateMutationReport(at69, files).score).toBe(69);
    expect(evaluateMutationReport(at70, files).decision).toBe('pass');
    expect(evaluateMutationReport(at70, files).score).toBe(70);
    expect(evaluateMutationScore(69)).toEqual({ score: 69, threshold: 70, decision: 'fail' });
    expect(evaluateMutationScore(70)).toEqual({ score: 70, threshold: 70, decision: 'pass' });
  });

  it('@spec:018 S3 counts invalid outcomes separately and never lets them improve score', () => {
    const files = ['scripts/lib/core.mjs'];
    const result = evaluateMutationReport(
      mutationReport({
        files,
        statuses: ['Killed', 'CompileError', 'RuntimeError', 'Ignored'],
      }),
      files,
    );

    expect(result).toEqual({
      counts: {
        detected: 1,
        invalid: 3,
        killed: 1,
        noCoverage: 0,
        runtimeError: 1,
        compileError: 1,
        ignored: 1,
        survived: 0,
        timeout: 0,
        valid: 1,
      },
      decision: 'pass',
      score: 100,
      threshold: 70,
    });
  });

  it.each([
    [null, /report must be an object/i],
    [{}, /unsupported mutation report schema/i],
    [
      { ...mutationReport({ files: ['a.mjs'] }), schemaVersion: '2.0' },
      /unsupported mutation report schema/i,
    ],
    [
      { ...mutationReport({ files: ['a.mjs'] }), thresholds: { high: 70, low: 70, break: 69 } },
      /threshold.*70/i,
    ],
    [{ ...mutationReport({ files: ['a.mjs'] }), config: null }, /missing its effective config/i],
    [
      {
        ...mutationReport({ files: ['a.mjs'] }),
        config: { mutate: ['a.mjs'], thresholds: { high: 69, low: 70, break: 70 } },
      },
      /threshold.*70/i,
    ],
    [{ ...mutationReport({ files: ['a.mjs'] }), files: null }, /files must be an object/i],
  ])('@spec:018 S3 rejects malformed report envelope %#', (report, expected) => {
    expect(() => evaluateMutationReport(report, ['a.mjs'])).toThrow(expected);
  });

  it('@spec:018 S3 requires exact configured and observed file sets', () => {
    const wrongConfig = mutationReport({ files: ['scripts/lib/a.mjs'] });
    wrongConfig.config.mutate = ['scripts/lib/b.mjs'];
    const wrongObserved = mutationReport({ files: ['scripts/lib/a.mjs'] });
    wrongObserved.files = { 'scripts/lib/b.mjs': { mutants: [{ status: 'Killed' }] } };

    expect(() => evaluateMutationReport(wrongConfig, ['scripts/lib/a.mjs'])).toThrow(
      /configured files differ from exact files/i,
    );
    expect(() => evaluateMutationReport(wrongObserved, ['scripts/lib/a.mjs'])).toThrow(
      /does not contain the exact files/i,
    );
  });

  it.each([
    [mutationReport({ files: ['a.mjs'], statuses: ['Pending'] }), /Pending.*not a final/i],
    [mutationReport({ files: ['a.mjs'], statuses: ['Novel'] }), /unknown mutation status.*Novel/i],
    [
      mutationReport({ files: ['a.mjs'], statuses: ['CompileError', 'RuntimeError', 'Ignored'] }),
      /zero valid mutants/i,
    ],
    [
      { ...mutationReport({ files: ['a.mjs'] }), files: { 'a.mjs': { mutants: null } } },
      /has no mutant array/i,
    ],
    [
      { ...mutationReport({ files: ['a.mjs'] }), files: { 'a.mjs': { mutants: [null] } } },
      /non-object mutant/i,
    ],
  ])('@spec:018 S3 fails closed on invalid mutant state %#', (report, expected) => {
    expect(() => evaluateMutationReport(report, ['a.mjs'])).toThrow(expected);
  });

  it.each([
    -1,
    101,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '70',
  ])('@spec:018 S3 rejects invalid scalar score %#', (score) => {
    expect(() => evaluateMutationScore(score)).toThrow(/finite number from 0 through 100/i);
  });

  it('@spec:018 S3 enforces all three exact stable thresholds', () => {
    expect(() =>
      assertMutationThresholds({ high: 70, low: 70, break: 70 }, 'config'),
    ).not.toThrow();
    expect(() => assertMutationThresholds({ high: 70, low: 70, break: 71 }, 'config')).toThrow(
      /config.*threshold at 70/i,
    );
  });
});
