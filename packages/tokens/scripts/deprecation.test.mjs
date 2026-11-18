// @spec:041-token-deprecation
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEPRECATION_EXTENSION,
  assertNoDeprecationDue,
  collectDeprecations,
  deprecationComment,
  deprecationNote,
  readDeprecation,
} from './deprecation.mjs';

const REASON = 'A focused field keeps its resting border and is marked by its focus ring.';

const deprecatedToken = (schedule = {}, overrides = {}) => ({
  $value: '{ki.outline.primary-high-em}',
  $description: 'color used by the input component for focus border.',
  $deprecated: REASON,
  $extensions: {
    [DEPRECATION_EXTENSION]: {
      since: '0.1.0',
      removal: '1.0.0',
      replacement: '--ki-input-focus-ring-color',
      ...schedule,
    },
  },
  ...overrides,
});

const withoutPart = (part) => {
  const token = deprecatedToken();
  const schedule = Object.fromEntries(
    Object.entries(token.$extensions[DEPRECATION_EXTENSION]).filter(([key]) => key !== part),
  );
  return { ...token, $extensions: { [DEPRECATION_EXTENSION]: schedule } };
};

/** A Style Dictionary platform token, as build.mjs receives it. */
const platformToken = (name, filePath, node = {}) => ({
  name,
  filePath,
  $value: '#000000',
  ...node,
});

test('S1 S3 a complete deprecation reads as its schedule, comment and reference note', () => {
  const { deprecation, problems } = readDeprecation(deprecatedToken());

  assert.deepEqual(problems, []);
  assert.deepEqual(deprecation, {
    reason: REASON,
    since: '0.1.0',
    removal: '1.0.0',
    replacement: '--ki-input-focus-ring-color',
  });
  assert.equal(
    deprecationComment(deprecation),
    'deprecated since 0.1.0, removed in 1.0.0: use --ki-input-focus-ring-color',
  );
  assert.equal(
    deprecationNote(deprecation),
    'Deprecated since 0.1.0, removed in 1.0.0. Use --ki-input-focus-ring-color.',
  );
});

test('a token that is not deprecated has no deprecation and no problem', () => {
  assert.deepEqual(readDeprecation({ $value: '#000000', $description: 'x' }), {
    deprecation: null,
    problems: [],
  });
});

for (const [part, field] of [
  ['replacement', 'replacement'],
  ['deprecation date', 'since'],
  ['removal version', 'removal'],
]) {
  test(`S4 a deprecation without a ${part} is rejected`, () => {
    const { deprecation, problems } = readDeprecation(withoutPart(field));

    assert.equal(deprecation, null);
    assert.deepEqual(problems, [`missing ${part}`]);
  });
}

test('S4 the build fails naming the token and its missing part', () => {
  const tokens = [
    platformToken('ki-input-focus-ring-color', 'tokens/component/input.tokens.json'),
    platformToken(
      'ki-input-focus-border',
      'tokens/component/input.tokens.json',
      withoutPart('removal'),
    ),
  ];

  assert.throws(
    () => collectDeprecations(tokens),
    /--ki-input-focus-border: missing removal version/u,
  );
});

test('S4 a deprecation needs both the DTCG flag with its reason and the Kimen schedule', () => {
  const flagOnly = deprecatedToken();
  delete flagOnly.$extensions;
  const scheduleOnly = deprecatedToken();
  delete scheduleOnly.$deprecated;

  assert.deepEqual(readDeprecation(flagOnly).problems, ['missing deprecation schedule']);
  assert.deepEqual(readDeprecation(scheduleOnly).problems, ['missing $deprecated reason']);
  assert.deepEqual(readDeprecation(deprecatedToken({}, { $deprecated: true })).problems, [
    'missing $deprecated reason',
  ]);
});

test('S4 a schedule must name SemVer versions, a later removal and a token replacement', () => {
  assert.deepEqual(readDeprecation(deprecatedToken({ since: 'soon' })).problems, [
    'deprecation date soon is not a version',
  ]);
  assert.deepEqual(readDeprecation(deprecatedToken({ removal: '0.2.0' })).problems, [
    'removal version 0.2.0 leaves no minor release between it and 0.1.0',
  ]);
  assert.deepEqual(readDeprecation(deprecatedToken({ replacement: 'focus ring' })).problems, [
    'replacement focus ring is not a --ki-* token name',
  ]);
  assert.deepEqual(readDeprecation(deprecatedToken({ removal: '0.3.0' })).problems, []);
});

test('S5 a replacement that is itself deprecated is rejected naming both tokens', () => {
  const tokens = [
    platformToken(
      'ki-input-focus-border',
      'tokens/component/input.tokens.json',
      deprecatedToken({ replacement: '--ki-button-primary-active-shadow' }),
    ),
    platformToken(
      'ki-button-primary-active-shadow',
      'tokens/component/button.tokens.json',
      deprecatedToken({ replacement: '--ki-button-primary-rest-shadow' }),
    ),
    platformToken('ki-button-primary-rest-shadow', 'tokens/component/button.tokens.json'),
  ];

  assert.throws(
    () => collectDeprecations(tokens),
    /--ki-input-focus-border: replacement --ki-button-primary-active-shadow is itself deprecated/u,
  );
});

test('S5 a replacement that is not a published token is rejected', () => {
  const tokens = [
    platformToken('ki-color-brand-500', 'tokens/primitive.tokens.json'),
    platformToken(
      'ki-input-focus-border',
      'tokens/component/input.tokens.json',
      deprecatedToken({ replacement: '--ki-color-brand-500' }),
    ),
  ];

  assert.throws(
    () => collectDeprecations(tokens),
    /--ki-input-focus-border: replacement --ki-color-brand-500 is not a published token/u,
  );
});

test('collects every valid deprecation by custom-property name', () => {
  const tokens = [
    platformToken('ki-input-focus-ring-color', 'tokens/component/input.tokens.json'),
    platformToken('ki-input-focus-border', 'tokens/component/input.tokens.json', deprecatedToken()),
  ];

  assert.deepEqual([...collectDeprecations(tokens).keys()], ['--ki-input-focus-border']);
});

test('S9 a deprecated token still present at its removal version fails the build', () => {
  const deprecations = new Map([
    ['--ki-input-focus-border', readDeprecation(deprecatedToken()).deprecation],
  ]);

  assert.doesNotThrow(() => assertNoDeprecationDue(deprecations, '0.0.0'));
  assert.doesNotThrow(() => assertNoDeprecationDue(deprecations, '0.9.4'));
  assert.throws(
    () => assertNoDeprecationDue(deprecations, '1.0.0'),
    /--ki-input-focus-border is due for removal in 1\.0\.0/u,
  );
  assert.throws(() => assertNoDeprecationDue(deprecations, '1.2.0'), /due for removal/u);
});
