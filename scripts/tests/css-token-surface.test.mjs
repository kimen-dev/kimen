// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicStylesheetSurface } from '../lib/css-token-surface.mjs';

const publicExport = (target) => ({ target, deprecatedSince: null, replacement: null });

const publicExports = { './css': publicExport('./dist/css/tokens.css') };

const schemeContract = `
:where(:root) {
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
    /must declare, in order, :where\(:root\), \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\]/u,
  );
  assert.throws(
    () => build(stylesheet.replace('color-scheme: light dark;', 'color-scheme: light;')),
    /:where\(:root\) must declare exactly color-scheme: light dark/u,
  );
  assert.throws(
    () => build(stylesheet.replace('color-scheme: dark;', 'color-scheme: light;')),
    /\[data-ki-color-scheme='dark'\] must declare exactly color-scheme: dark/u,
  );
  // One published shape: the default first, then the two forced schemes.
  const [root, light, dark] = schemeContract.trim().split('\n\n');
  assert.throws(
    () => build(`${light}\n${root}\n${dark}\n${tokenRule}`),
    /must declare, in order, :where\(:root\), \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\]/u,
  );
});

test('[S10] the default colour scheme must stay at zero specificity so a host page can override it', () => {
  // `:root { color-scheme }` outranks the `html { color-scheme }` of a host
  // page whatever the order of the two stylesheets; `:where(:root)` loses to
  // it. The published default is the second and only the second.
  assert.throws(
    () => build(stylesheet.replace(':where(:root) {', ':root {')),
    /must declare, in order, :where\(:root\), \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\]/u,
  );
  assert.throws(
    () => build(stylesheet.replace(':where(:root) {', 'html {')),
    /must declare, in order, :where\(:root\)/u,
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

// Modes (specs 043/044): each mode is a media-query block and a declaration
// rule with the same declarations, after the token rule, in contract order.
const modeBlocks = (activation, media, declarations, theme) => {
  const preference = theme
    ? `:root[data-ki-theme='${theme}'],\n  [data-ki-theme='${theme}']`
    : ':root,\n  :where([data-ki-theme])';
  const declared = theme
    ? `:root[data-ki-theme='${theme}']:where(${activation}),\n[data-ki-theme='${theme}']:where(${activation}),\n[data-ki-theme='${theme}']:where(:is(:root, [data-ki-theme]):is(${activation}) *)`
    : `:root:where(${activation}),\n:where([data-ki-theme]:is(${activation})),\n:where(:is(:root, [data-ki-theme]):is(${activation}) [data-ki-theme])`;
  return `
@media ${media} {
  ${preference} {
    ${declarations}
  }
}

${declared} {
  ${declarations}
}
`;
};
const TRANSPARENCY = [
  "[data-ki-transparency='reduce'], [data-ki-contrast='more']",
  '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
];
const CONTRAST = ["[data-ki-contrast='more']", '(prefers-contrast: more)'];
const withModes = `${stylesheet}${modeBlocks(...TRANSPARENCY, '--ki-zero: 1px;')}${modeBlocks(...CONTRAST, '--ki-color: rgb(9, 9, 9);')}`;

test('[S10] a stylesheet publishes each mode as its own context, more contrast over reduced transparency', () => {
  const { contexts } = build(withModes)['./css'];
  assert.deepEqual(Object.keys(contexts).sort(), [
    'contrast-more/dark',
    'contrast-more/light',
    'dark',
    'light',
    'reduced-transparency/dark',
    'reduced-transparency/light',
  ]);
  assert.equal(contexts.light['--ki-zero'], '0');
  assert.equal(contexts['reduced-transparency/light']['--ki-zero'], '1px');
  assert.equal(contexts['reduced-transparency/light']['--ki-color'], 'rgb(0,0,0)');
  assert.equal(contexts['contrast-more/dark']['--ki-zero'], '1px');
  assert.equal(contexts['contrast-more/dark']['--ki-color'], 'rgb(9,9,9)');
  assert.equal(contexts['contrast-more/dark']['--ki-shadow'], '0 1px 2px 0 rgb(9,9,9)');
});

test('[S10] a themed export re-asserts its mode values over its own overrides', () => {
  const theme = `${material3}${modeBlocks(...CONTRAST, '--ki-color: rgb(7, 7, 7);', 'material3')}`;
  const { contexts } = buildThemed({ base: withModes, theme })['./css/material3'];
  assert.equal(contexts.light['--ki-color'], 'rgb(10,20,30)');
  assert.equal(contexts['reduced-transparency/light']['--ki-color'], 'rgb(10,20,30)');
  assert.equal(contexts['reduced-transparency/light']['--ki-zero'], '1px');
  assert.equal(contexts['contrast-more/light']['--ki-color'], 'rgb(7,7,7)');
});

test('[S10] a mode must declare the same tokens under its preference and under its declaration', () => {
  // The declaration rule is the last block: change its value, not the
  // preference block's.
  const at = withModes.lastIndexOf('--ki-color: rgb(9, 9, 9);');
  const diverging = `${withModes.slice(0, at)}--ki-color: rgb(8, 8, 8);${withModes.slice(at + 25)}`;
  assert.notEqual(diverging, withModes);
  assert.throws(
    () => build(diverging),
    /declares different tokens under its preference and its declaration/u,
  );
});

test('[S10] modes follow the token rule in contract order, each with its exact selectors', () => {
  const reversed = `${stylesheet}${modeBlocks(...CONTRAST, '--ki-zero: 1px;')}${modeBlocks(...TRANSPARENCY, '--ki-zero: 1px;')}`;
  assert.throws(
    () => build(reversed),
    /contains an unsupported public rule|unsupported conditional rule/u,
  );
  const compound = withModes.replace(
    ":is([data-ki-contrast='more']) [data-ki-theme])",
    ":is([data-ki-contrast='more'])[data-ki-theme])",
  );
  assert.throws(() => build(compound), /contains an unsupported public rule/u);
  assert.throws(
    () => build(`${stylesheet}${modeBlocks(...CONTRAST, '--ki-unknown: 1px;')}`),
    /declares --ki-unknown, which the token rule does not/u,
  );
});

// Density (spec 045): the document-inherited tokens in one :root rule after
// the token rule, then one rule per level, published as the compact and touch
// contexts (touch: 045 Amendment A1).
const densityRules = `
:root {
  --ki-zero: 0px;
}

[data-ki-density='compact'] {
  --ki-zero: -8px;
}

[data-ki-density='touch'] {
  --ki-zero: 4px;
}

[data-ki-density='default'] {
  --ki-zero: 0px;
}
`;
const densityTokenRule = tokenRule.replace('  --ki-zero: 0px;\n', '');
const withDensity = `${schemeContract}${densityTokenRule}${densityRules}`;

test('[S10] document-inherited tokens and density levels publish the compact and touch contexts', () => {
  const { contexts } = build(withDensity)['./css'];
  assert.deepEqual(Object.keys(contexts).sort(), [
    'compact/dark',
    'compact/light',
    'dark',
    'light',
    'touch/dark',
    'touch/light',
  ]);
  assert.equal(contexts.light['--ki-zero'], '0');
  assert.equal(contexts['compact/light']['--ki-zero'], '-8px');
  assert.equal(contexts['compact/dark']['--ki-color'], 'rgb(255,255,255)');
  assert.equal(contexts['touch/light']['--ki-zero'], '4px');
});

test('[S10] a themed export publishes the compact contexts of the default stylesheet', () => {
  const { contexts } = buildThemed({ base: withDensity })['./css/material3'];
  assert.equal(contexts['compact/light']['--ki-zero'], '-8px');
  assert.equal(contexts['compact/light']['--ki-color'], 'rgb(10,20,30)');
});

test('[S10] density rules may only reassign document-inherited tokens, and default must restore them', () => {
  assert.throws(
    () =>
      build(
        withDensity.replace(
          "[data-ki-density='compact'] {\n  --ki-zero: -8px;",
          "[data-ki-density='compact'] {\n  --ki-color: rgb(1, 1, 1);",
        ),
      ),
    /density compact reassigns --ki-color, which is not inherited from the document/u,
  );
  assert.throws(
    () =>
      build(
        withDensity.replace(
          "[data-ki-density='default'] {\n  --ki-zero: 0px;",
          "[data-ki-density='default'] {\n  --ki-zero: 1px;",
        ),
      ),
    /density default must restore every inherited token/u,
  );
  assert.throws(
    () => build(`${schemeContract}${tokenRule}${densityRules}`),
    /declares --ki-zero both on its theme roots and as inherited from the document/u,
  );
});
