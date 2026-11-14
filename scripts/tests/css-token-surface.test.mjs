// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicStylesheetSurface } from '../lib/css-token-surface.mjs';

const publicExport = (target) => ({ target, deprecatedSince: null, replacement: null });

const publicExports = { './css': publicExport('./dist/css/tokens.css') };

const schemeContract = `
:root {
  color-scheme: light dark;
}

[data-ki-color-scheme='light'] {
  color-scheme: light;
}

[data-ki-color-scheme='dark'] {
  color-scheme: dark;
}
`;

const tokenRule = `
:root,
:where([data-ki-theme]) {
  --ki-zero: 0px;
  --ki-color: light-dark(rgb(0, 0, 0), rgb(255, 255, 255));
  --ki-shadow: 0px 1px 2px var(--ki-color);
  --ki-easing: linear;
}
`;

const stylesheet = `${schemeContract}${tokenRule}`;

const material3 = `
:root[data-ki-theme='material3'],
[data-ki-theme='material3'] {
  --ki-color: light-dark(rgb(10, 20, 30), rgb(220, 230, 240));
}
`;

const publicTokenNames = ['--ki-zero', '--ki-color', '--ki-shadow', '--ki-easing'];

const build = (css = stylesheet) =>
  buildPublicStylesheetSurface({
    packageExports: publicExports,
    publicTokenNames,
    stylesheetSources: { './css': css },
  });

const buildThemed = ({ base = stylesheet, theme = material3 } = {}) =>
  buildPublicStylesheetSurface({
    packageExports: {
      ...publicExports,
      './css/material3': publicExport('./dist/css/tokens.material3.css'),
    },
    publicTokenNames,
    stylesheetSources: { './css': base, './css/material3': theme },
  });

test('[S10] stylesheet surface resolves aliases and light-dark() in the light and dark contexts', () => {
  assert.deepEqual(build(), {
    './css': {
      contexts: {
        dark: {
          '--ki-color': 'rgb(255,255,255)',
          '--ki-easing': 'cubic-bezier(0,0,1,1)',
          '--ki-shadow': '0 1px 2px 0 rgb(255,255,255)',
          '--ki-zero': '0',
        },
        light: {
          '--ki-color': 'rgb(0,0,0)',
          '--ki-easing': 'cubic-bezier(0,0,1,1)',
          '--ki-shadow': '0 1px 2px 0 rgb(0,0,0)',
          '--ki-zero': '0',
        },
      },
      target: './dist/css/tokens.css',
    },
  });
});

test('[S10] stylesheet surface resolves light-dark() inside a composite and across aliases', () => {
  const surface = build(
    stylesheet.replace(
      '--ki-shadow: 0px 1px 2px var(--ki-color);',
      '--ki-shadow: 0px 1px 2px light-dark(var(--ki-color), rgb(9, 9, 9)), 0px 2px 4px light-dark(rgb(1, 1, 1), var(--ki-color));',
    ),
  );

  assert.equal(
    surface['./css'].contexts.light['--ki-shadow'],
    '0 1px 2px 0 rgb(0,0,0),0 2px 4px 0 rgb(1,1,1)',
  );
  assert.equal(
    surface['./css'].contexts.dark['--ki-shadow'],
    '0 1px 2px 0 rgb(9,9,9),0 2px 4px 0 rgb(255,255,255)',
  );
});

test('[S10] a themed export publishes its overrides resolved over the default stylesheet', () => {
  const surface = buildThemed();

  assert.deepEqual(surface['./css/material3'], {
    contexts: {
      dark: {
        '--ki-color': 'rgb(220,230,240)',
        '--ki-easing': 'cubic-bezier(0,0,1,1)',
        // Not overridden by the theme: an alias the base declares, recomputed
        // from the theme's colour.
        '--ki-shadow': '0 1px 2px 0 rgb(220,230,240)',
        '--ki-zero': '0',
      },
      light: {
        '--ki-color': 'rgb(10,20,30)',
        '--ki-easing': 'cubic-bezier(0,0,1,1)',
        '--ki-shadow': '0 1px 2px 0 rgb(10,20,30)',
        '--ki-zero': '0',
      },
    },
    target: './dist/css/tokens.material3.css',
  });
  assert.equal(surface['./css'].contexts.dark['--ki-color'], 'rgb(255,255,255)');
});

test('[S10] a themed export cannot be published without the default stylesheet it overrides', () => {
  assert.throws(
    () =>
      buildPublicStylesheetSurface({
        packageExports: { './css/material3': publicExport('./dist/css/tokens.material3.css') },
        publicTokenNames,
        stylesheetSources: { './css/material3': material3 },
      }),
    /\.\/css\/material3 stylesheet overrides the \.\/css stylesheet, which is not exported/u,
  );
});

test('[S10] a themed export may only reassign tokens the default stylesheet declares', () => {
  assert.throws(
    () => buildThemed({ theme: material3.replace('--ki-color:', '--ki-brand-new:') }),
    /\.\/css\/material3 stylesheet declares --ki-brand-new, which the \.\/css stylesheet does not/u,
  );
});

test('[S10] a themed export must be scoped to its own theme name, on the root and on a subtree', () => {
  assert.throws(
    () => buildThemed({ theme: material3.replaceAll('material3', 'other') }),
    /must contain exactly the rule :root\[data-ki-theme='material3'\],\[data-ki-theme='material3'\]/u,
  );
  assert.throws(
    () => buildThemed({ theme: material3.replace(",\n[data-ki-theme='material3']", '') }),
    /must contain exactly the rule/u,
  );
  assert.throws(
    () => buildThemed({ theme: `${material3}\n.consumer { --ki-color: red; }` }),
    /must contain exactly the rule/u,
  );
});

test('[S10] the default stylesheet must carry the colour-scheme contract its tokens resolve from', () => {
  // Without these three rules `light-dark()` never leaves its light branch.
  assert.throws(
    () => build(tokenRule),
    /must declare, in order, :root, \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\]/u,
  );
  assert.throws(
    () => build(stylesheet.replace('color-scheme: light dark;', 'color-scheme: light;')),
    /:root must declare exactly color-scheme: light dark/u,
  );
  assert.throws(
    () => build(stylesheet.replace('color-scheme: dark;', 'color-scheme: light;')),
    /\[data-ki-color-scheme='dark'\] must declare exactly color-scheme: dark/u,
  );
  // On the root the three selectors tie on specificity: the attribute rules
  // must come after the default or a forced scheme would lose to it.
  const [root, light, dark] = schemeContract.trim().split('\n\n');
  assert.throws(
    () => build(`${light}\n${root}\n${dark}\n${tokenRule}`),
    /must declare, in order, :root, \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\]/u,
  );
});

test('[S10] the default stylesheet must declare its tokens on the root and on any themed subtree', () => {
  assert.throws(
    () => build(stylesheet.replace(':root,\n:where([data-ki-theme])', ':root')),
    /must declare its tokens in one :root,:where\(\[data-ki-theme\]\) rule/u,
  );
  assert.throws(
    () => build(`${stylesheet}\n.consumer { --ki-color: red; }`),
    /contains an unsupported public rule/u,
  );
});

test('[S10] stylesheet surface rejects conditional rules: the scheme is not a media query any more', () => {
  assert.throws(
    () =>
      build(
        `${stylesheet}\n@media (prefers-color-scheme: dark) { :root { --ki-color: rgb(1, 1, 1); } }`,
      ),
    /unsupported conditional rule/u,
  );
});

test('[S10] stylesheet surface rejects a malformed light-dark()', () => {
  assert.throws(
    () =>
      build(stylesheet.replace('light-dark(rgb(0, 0, 0), rgb(255, 255, 255))', 'light-dark(red)')),
    /--ki-color contains a light-dark\(\) that does not take exactly two values/u,
  );
  assert.throws(
    () =>
      build(
        stylesheet.replace(
          'light-dark(rgb(0, 0, 0), rgb(255, 255, 255))',
          'light-dark(red, green, blue)',
        ),
      ),
    /does not take exactly two values/u,
  );
});

test('[S10] stylesheet surface rejects unresolved and cyclic public aliases', () => {
  assert.throws(
    () => build(stylesheet.replace('--ki-zero: 0px;', '--ki-zero: var(--ki-missing);')),
    /--ki-missing.*(?:missing|unresolved)|(?:missing|unresolved).*--ki-missing/iu,
  );
  assert.throws(
    () =>
      build(
        stylesheet.replace(
          '--ki-zero: 0px;',
          '--ki-zero: var(--ki-cycle);\n  --ki-cycle: var(--ki-zero);',
        ),
      ),
    /cycle/iu,
  );
});

test('[S10] stylesheet surface requires one source for every public CSS export', () => {
  assert.throws(
    () =>
      buildPublicStylesheetSurface({
        packageExports: publicExports,
        publicTokenNames: ['--ki-zero'],
        stylesheetSources: {},
      }),
    /\.\/css.*source|source.*\.\/css/iu,
  );
});

const pageContract = `
:root {
  background-color: var(--ki-color);
  font-family: var(--ki-easing);
}
`;

const buildPageContract = (css) =>
  buildPublicStylesheetSurface({
    packageExports: { ...publicExports, './css/base': publicExport('./dist/css/base.css') },
    publicTokenNames,
    stylesheetSources: { './css': stylesheet, './css/base': css },
  });

test('[S10] the page contract publishes no token contexts', () => {
  assert.deepEqual(buildPageContract(pageContract)['./css/base'], {
    pageContract: true,
    target: './dist/css/base.css',
  });
});

test('[S10] the page contract may only consume public tokens', () => {
  assert.throws(
    () =>
      buildPageContract(pageContract.replace('font-family: var(--ki-easing);', '--ki-new: 1px;')),
    /must not publish token --ki-new/u,
  );
  assert.throws(
    () => buildPageContract(pageContract.replace('var(--ki-color);', '#ffffff;')),
    /declares the hardcoded value background-color: #ffffff/u,
  );
  assert.throws(
    () => buildPageContract(pageContract.replace('var(--ki-color);', 'var(--private);')),
    /references non-public custom property --private/u,
  );
});

test('[S10] the page contract must not redeclare the colour scheme the token stylesheet owns', () => {
  // Loaded after the tokens, a `:root { color-scheme }` here ties with
  // `[data-ki-color-scheme]` on the root and wins by order: it would silently
  // undo a forced scheme.
  assert.throws(
    () =>
      buildPageContract(
        pageContract.replace('font-family: var(--ki-easing);', 'color-scheme: light dark;'),
      ),
    /declares the hardcoded value color-scheme: light dark/u,
  );
});
