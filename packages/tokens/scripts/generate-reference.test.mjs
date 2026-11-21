// @spec:041-token-deprecation
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEPRECATION_EXTENSION } from './deprecation.mjs';
import { renderReference } from './generate-reference.mjs';

const componentToken = (name, extra = {}) => ({
  name,
  filePath: 'tokens/component/input.tokens.json',
  path: ['ki', ...name.replace(/^ki-/u, '').split('-')],
  $value: '#6750a4',
  $description: `color used by ${name}.`,
  ...extra,
});

const tokens = [
  componentToken('ki-input-focus-ring-color'),
  componentToken('ki-input-focus-border', {
    $deprecated: 'A focused field keeps its resting border and is marked by its focus ring.',
    $extensions: {
      [DEPRECATION_EXTENSION]: {
        since: '0.1.0',
        removal: '1.0.0',
        replacement: '--ki-input-focus-ring-color',
      },
    },
  }),
  {
    name: 'ki-surface-s0',
    filePath: 'tokens/semantic.tokens.json',
    path: ['ki', 'surface', 's0'],
    $value: '#ffffff',
    $description: 'Base surface.',
  },
];

test('S3 the token reference shows the deprecation next to the token', () => {
  const mdx = renderReference(tokens);

  assert.match(
    mdx,
    /^\| `--ki-input-focus-border` \| `#6750a4` \| Deprecated since 0\.1\.0, removed in 1\.0\.0\. Use --ki-input-focus-ring-color\. color used by ki-input-focus-border\. \|$/mu,
  );
  assert.match(
    mdx,
    /^\| `--ki-input-focus-ring-color` \| `#6750a4` \| color used by ki-input-focus-ring-color\. \|$/mu,
  );
});

test('S3 the token reference lists every deprecated token with its replacement and schedule', () => {
  const mdx = renderReference(tokens);
  const section = mdx.slice(mdx.indexOf('## Deprecated tokens'));

  assert.ok(mdx.includes('## Deprecated tokens'), 'the reference has a deprecated-tokens section');
  assert.match(
    section,
    /^\| `--ki-input-focus-border` \| `--ki-input-focus-ring-color` \| 0\.1\.0 \| 1\.0\.0 \| A focused field keeps its resting border and is marked by its focus ring\. \|$/mu,
  );
  assert.doesNotMatch(section, /--ki-surface-s0/u);
});

test('a reference without deprecated tokens has no deprecated-tokens section', () => {
  assert.doesNotMatch(renderReference([tokens[0], tokens[2]]), /Deprecated tokens/u);
});

// The list a theme restates under each mode (spec 043): generated from the
// mode the stylesheet emits, so it cannot drift from it.
test('the token reference lists every token each preference mode reassigns, with its mode value', () => {
  const mdx = renderReference(tokens, {
    modes: [
      {
        mode: {
          name: 'contrast-more',
          media: '(prefers-contrast: more)',
          activations: ["[data-ki-contrast='more']"],
        },
        declarations: new Map([
          ['--ki-outline-control', 'var(--ki-inverse-white-alpha-64)'],
          ['--ki-focus-ring-width', 'var(--ki-shadow-ring)'],
        ]),
      },
    ],
  });
  const section = mdx.slice(
    mdx.indexOf('## Preference modes'),
    mdx.indexOf('## Deprecated tokens'),
  );

  assert.match(section, /^### contrast-more$/mu);
  assert.match(section, /`@media \(prefers-contrast: more\)`/u);
  assert.match(section, /^\| `--ki-outline-control` \| `var\(--ki-inverse-white-alpha-64\)` \|$/mu);
  assert.ok(
    section.indexOf('--ki-focus-ring-width') < section.indexOf('--ki-outline-control'),
    'tokens are sorted by name',
  );
});

test('a reference rendered without modes has no preference-modes section', () => {
  assert.doesNotMatch(renderReference(tokens), /Preference modes/u);
});
