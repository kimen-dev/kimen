// @spec:041-token-deprecation
import assert from 'node:assert/strict';
import test from 'node:test';

import { collectCssIssues } from '../gates/check-tokens.mjs';
import { createPublicApiSnapshot, evaluatePublicApiChange } from '../lib/public-api.mjs';
import {
  createOrderedTokenInventory,
  deriveConsumedPublicCssProperties,
  parseTokenComposition,
} from '../lib/token-inventory.mjs';

const EXTENSION = 'dev.kimen.deprecation';
const REASON = 'A focused field keeps its resting border and is marked by its focus ring.';
const SCHEDULE = {
  since: '0.1.0',
  removal: '1.0.0',
  replacement: '--ki-input-focus-ring-color',
};

const deprecated = (value, description, schedule = SCHEDULE) => ({
  $value: value,
  $description: description,
  $deprecated: REASON,
  $extensions: { [EXTENSION]: schedule },
});

const inputTokens = (focusBorder) => ({
  ki: {
    input: {
      $type: 'color',
      'focus-ring-color': { $value: '{ki.color.brand}', $description: 'Focus ring colour.' },
      'focus-border': focusBorder,
    },
  },
});

const primitives = {
  filePath: 'packages/tokens/tokens/primitive.tokens.json',
  layer: 'primitive',
  contents: {
    ki: {
      color: { $type: 'color', brand: { $value: '#6750a4' }, ink: { $value: '#4f378b' } },
    },
  },
};

const parse = (sources) =>
  parseTokenComposition({
    id: 'onmars-light',
    theme: 'onmars',
    scheme: 'light',
    sources: [primitives, ...sources],
  });

const componentSource = (contents, options = {}) => ({
  filePath: 'packages/tokens/tokens/component/input.tokens.json',
  layer: 'component',
  component: 'ki-input',
  contents,
  ...options,
});

const issueCodes = (composition) => composition.issues.map(({ code, path }) => `${code} ${path}`);

test('S2 the token inventory carries the deprecation as part of the public contract', () => {
  const composition = parse([
    componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy focus border.'))),
  ]);
  const inventory = createOrderedTokenInventory([composition]);

  assert.deepEqual(composition.issues, []);
  assert.deepEqual(
    inventory.publicTokens.find(({ cssName }) => cssName === '--ki-input-focus-border')
      ?.deprecation,
    { reason: REASON, ...SCHEDULE },
  );
  assert.equal(
    inventory.publicTokens.find(({ cssName }) => cssName === '--ki-input-focus-ring-color')
      ?.deprecation,
    null,
  );
});

test('S4 an incomplete deprecation is a token contract issue naming the token', () => {
  const { removal, ...withoutRemoval } = SCHEDULE;
  assert.equal(removal, '1.0.0');
  const composition = parse([
    componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy.', withoutRemoval))),
  ]);

  assert.deepEqual(issueCodes(composition), ['invalid-deprecation ki.input.focus-border']);
  assert.deepEqual(composition.issues[0].related, ['missing removal version']);
});

test('a deprecation is declared on the token, never on a group or in an overlay', () => {
  const onGroup = parse([
    componentSource({
      ki: {
        input: {
          $type: 'color',
          $deprecated: REASON,
          'focus-border': { $value: '{ki.color.brand}', $description: 'Legacy.' },
        },
      },
    }),
  ]);
  const inOverlay = parse([
    componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy.'))),
    componentSource(inputTokens(deprecated('{ki.color.ink}', 'Material 3 legacy.')), {
      filePath: 'packages/tokens/tokens/component/input.material3.tokens.json',
      overlay: true,
    }),
  ]);
  const overlayValueOnly = parse([
    componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy.'))),
    componentSource(inputTokens({ $value: '{ki.color.ink}', $description: 'Material 3.' }), {
      filePath: 'packages/tokens/tokens/component/input.material3.tokens.json',
      overlay: true,
    }),
  ]);

  assert.deepEqual(issueCodes(onGroup), ['group-deprecation ki.input']);
  assert.deepEqual(issueCodes(inOverlay), ['overlay-deprecation ki.input.focus-border']);
  assert.deepEqual(overlayValueOnly.issues, []);
  assert.deepEqual(
    overlayValueOnly.records.find(({ path }) => path === 'ki.input.focus-border')?.deprecation,
    { reason: REASON, ...SCHEDULE },
  );
});

test('S5 the inventory rejects a replacement that is not a live published token', () => {
  const missing = parse([
    componentSource(
      inputTokens(
        deprecated('{ki.color.brand}', 'Legacy.', { ...SCHEDULE, replacement: '--ki-nope' }),
      ),
    ),
  ]);
  const chained = parse([
    componentSource({
      ki: {
        input: {
          $type: 'color',
          'focus-ring-color': deprecated('{ki.color.brand}', 'Old ring.', {
            ...SCHEDULE,
            replacement: '--ki-input-focus-border',
          }),
          'focus-border': deprecated('{ki.color.brand}', 'Old border.', {
            ...SCHEDULE,
            replacement: '--ki-input-focus-ring-color',
          }),
        },
      },
    }),
  ]);

  assert.throws(
    () => createOrderedTokenInventory([missing]),
    /--ki-input-focus-border: replacement --ki-nope is not a published token/u,
  );
  assert.throws(
    () => createOrderedTokenInventory([chained]),
    /--ki-input-focus-border: replacement --ki-input-focus-ring-color is itself deprecated/u,
  );
});

test('S6 a component that reads a deprecated token fails the elements build', () => {
  const inventory = createOrderedTokenInventory([
    parse([componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy focus border.')))]),
  ]);

  assert.throws(
    () =>
      deriveConsumedPublicCssProperties({
        inventory,
        cssByTag: { 'ki-input': ':host { border-color: var(--ki-input-focus-border); }' },
      }),
    /ki-input reads --ki-input-focus-border, which is deprecated since 0\.1\.0, removed in 1\.0\.0: use --ki-input-focus-ring-color/u,
  );
  assert.doesNotThrow(() =>
    deriveConsumedPublicCssProperties({
      inventory,
      cssByTag: { 'ki-input': ':host { outline-color: var(--ki-input-focus-ring-color); }' },
    }),
  );
});

test('S6 the token contract gate reports a component sheet that reads a deprecated token', () => {
  const [record] = parse([
    componentSource(inputTokens(deprecated('{ki.color.brand}', 'Legacy focus border.'))),
  ]).records.filter(({ cssName }) => cssName === '--ki-input-focus-border');
  const issues = collectCssIssues(
    '/repo/packages/elements/src/components/ki-input/ki-input.css',
    ':host { border-color: var(--ki-input-focus-border); }',
    new Map([[record.cssName, record]]),
    { workspaceRoot: '/repo' },
  );

  assert.deepEqual(issues, [
    'deprecated-css-consumption packages/elements/src/components/ki-input/ki-input.css --ki-input-focus-border',
  ]);
});

test('S6 a token that references a deprecated token is a contract issue', () => {
  const composition = parse([
    componentSource({
      ki: {
        input: {
          $type: 'color',
          'focus-ring-color': { $value: '{ki.color.brand}', $description: 'Focus ring colour.' },
          'focus-border': deprecated('{ki.color.brand}', 'Legacy.'),
          'invalid-border': { $value: '{ki.input.focus-border}', $description: 'Invalid.' },
        },
      },
    }),
  ]);

  assert.deepEqual(issueCodes(composition), ['deprecated-reference ki.input.invalid-border']);
});

// --- The public API snapshot and the removal schedule (S2, S7, S8) ---------

const tokensPackageName = '@kimen/tokens';
const tokenFacet = (overrides = {}) => ({
  type: 'color',
  default: '#6750a4',
  required: false,
  description: 'Legacy focus border.',
  deprecatedSince: null,
  replacement: null,
  ...overrides,
});

const tokenSurface = ({ version, tokens }) => ({
  packages: {
    [tokensPackageName]: {
      version,
      exports: {},
      modules: {},
      tokens,
    },
  },
  browserBaseline: ['chromium', 'firefox', 'webkit'],
});

const declarationFor = (baseline, candidate, release) => ({
  schemaVersion: 1,
  packages: [tokensPackageName],
  baselineVersion: baseline.surface.packages[tokensPackageName].version,
  baselineSha256: baseline.surfaceSha256,
  candidateSha256: candidate.surfaceSha256,
  release,
  reason: 'Exercise the token deprecation schedule.',
});

const deprecatedFacet = tokenFacet({
  deprecatedSince: '0.1.0',
  replacement: '--ki-input-focus-ring-color',
});

test('S2 the public API records a token deprecation as a minor change', () => {
  const baseline = createPublicApiSnapshot(
    tokenSurface({ version: '0.0.0', tokens: { '--ki-input-focus-border': tokenFacet() } }),
  );
  const candidate = createPublicApiSnapshot(
    tokenSurface({ version: '0.1.0', tokens: { '--ki-input-focus-border': deprecatedFacet } }),
  );

  const result = evaluatePublicApiChange({
    baseline,
    candidate,
    declaration: declarationFor(baseline, candidate, 'minor'),
  });

  assert.equal(result.release, 'minor');
  assert.equal(result.decision, 'passed');
});

test('S7 removing a deprecated token before a later minor has shipped it is blocked', () => {
  const baseline = createPublicApiSnapshot(
    tokenSurface({ version: '0.1.0', tokens: { '--ki-input-focus-border': deprecatedFacet } }),
  );
  const candidate = createPublicApiSnapshot(tokenSurface({ version: '1.0.0', tokens: {} }));

  const result = evaluatePublicApiChange({
    baseline,
    candidate,
    declaration: declarationFor(baseline, candidate, 'major'),
  });

  assert.equal(result.decision, 'blocked');
  assert.match(
    result.reasons.join('\n'),
    /--ki-input-focus-border deprecation must ship for at least one prior minor before removal/u,
  );
});

test('S8 removing a deprecated token after a later minor has shipped it passes', () => {
  const baseline = createPublicApiSnapshot(
    tokenSurface({ version: '0.2.0', tokens: { '--ki-input-focus-border': deprecatedFacet } }),
  );
  const candidate = createPublicApiSnapshot(tokenSurface({ version: '1.0.0', tokens: {} }));

  const result = evaluatePublicApiChange({
    baseline,
    candidate,
    declaration: declarationFor(baseline, candidate, 'major'),
  });

  assert.equal(result.release, 'major');
  assert.equal(result.decision, 'passed');
});

test('S8 a published token deprecation supplies history missing from the bootstrap snapshot', () => {
  const name = '--ki-input-focus-border';
  const baseline = createPublicApiSnapshot(
    tokenSurface({ version: '0.0.0', tokens: { [name]: tokenFacet() } }),
  );
  const candidate = createPublicApiSnapshot(tokenSurface({ version: '1.0.0', tokens: {} }));
  const declaration = declarationFor(baseline, candidate, 'major');
  const tokens = { [name]: deprecatedFacet };

  assert.equal(
    evaluatePublicApiChange({
      baseline,
      candidate,
      declaration,
      publishedTokens: {
        version: '0.1.0',
        tokens,
      },
    }).decision,
    'blocked',
  );
  assert.equal(
    evaluatePublicApiChange({
      baseline,
      candidate,
      declaration,
      publishedTokens: {
        version: '0.6.0',
        tokens,
      },
    }).decision,
    'passed',
  );
});
