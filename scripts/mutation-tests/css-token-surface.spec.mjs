import { describe, expect, it } from 'vitest';

import { buildPublicStylesheetSurface } from '../lib/css-token-surface.mjs';

// @spec:018-project-integrity-hardening#S10

const publicExport = (target) => ({
  target,
  deprecatedSince: null,
  replacement: null,
});

const publicTokenNames = [
  '--ki-color-base',
  '--ki-fallback-size',
  '--ki-card-shadow',
  '--ki-motion-easing',
  '--ki-space-zero',
];

const rootScheme = ':root { color-scheme: light dark; }';
const lightScheme = "[data-ki-color-scheme='light'] { color-scheme: light; }";
// Double quotes on purpose: selectors are compared after quote normalization.
const darkScheme = '[data-ki-color-scheme="dark"] { color-scheme: dark; }';
const tokenSelector = ':root, :where([data-ki-theme]) {';

const onmars = `
    /* Generated token contract. */
    ${rootScheme}
    ${lightScheme}
    ${darkScheme}
    ${tokenSelector}
      --ki-palette-base: light-dark(rgb(1, 2, 3), rgb(250, 251, 252));
      --ki-color-base: var(--ki-palette-base);
      --ki-fallback-size: var(--ki-not-shipped, calc(1rem + 0px));
      --ki-card-shadow: 0px 1px 2px var(--ki-color-base);
      --ki-motion-easing: linear;
      --ki-space-zero: 0rem;
    }
  `;

const material3Selector = `:root[data-ki-theme='material3'], [data-ki-theme="material3"] {`;
const material3 = `
    ${material3Selector}
      --ki-palette-base: light-dark(rgb(10, 20, 30), rgb(220, 230, 240));
    }
  `;

const oneExportInput = (css = onmars) => ({
  packageExports: { './css': publicExport('./dist/css/tokens.css') },
  publicTokenNames,
  stylesheetSources: { './css': css },
});

const themedInput = ({ base = onmars, theme = material3 } = {}) => ({
  packageExports: {
    './css/material3': publicExport('./dist/css/tokens.material3.css'),
    './css': publicExport('./dist/css/tokens.css'),
  },
  publicTokenNames,
  stylesheetSources: { './css/material3': theme, './css': base },
});

const pageContract = `
    :root {
      background-color: var(--ki-color-base);
      font-family: var(--ki-motion-easing);
    }
  `;

const pageContractInput = (css = pageContract) => ({
  packageExports: {
    './css': publicExport('./dist/css/tokens.css'),
    './css/base': publicExport('./dist/css/base.css'),
  },
  publicTokenNames,
  stylesheetSources: { './css': onmars, './css/base': css },
});

describe('public stylesheet mutation boundary', () => {
  it('S10 inventories effective OnMars and Material3 values with canonical normalization', () => {
    const surface = buildPublicStylesheetSurface({
      packageExports: {
        './css/material3': publicExport('./dist/css/tokens.material3.css'),
        '.': publicExport('./dist/index.js'),
        './css': publicExport('./dist/css/tokens.css'),
      },
      publicTokenNames: [...publicTokenNames].reverse(),
      stylesheetSources: { './css/material3': material3, './css': onmars },
    });

    expect(surface).toEqual({
      './css': {
        target: './dist/css/tokens.css',
        contexts: {
          light: {
            '--ki-card-shadow': '0 1px 2px 0 rgb(1,2,3)',
            '--ki-color-base': 'rgb(1,2,3)',
            '--ki-fallback-size': 'calc(1rem + 0)',
            '--ki-motion-easing': 'cubic-bezier(0,0,1,1)',
            '--ki-space-zero': '0',
          },
          dark: {
            '--ki-card-shadow': '0 1px 2px 0 rgb(250,251,252)',
            '--ki-color-base': 'rgb(250,251,252)',
            '--ki-fallback-size': 'calc(1rem + 0)',
            '--ki-motion-easing': 'cubic-bezier(0,0,1,1)',
            '--ki-space-zero': '0',
          },
        },
      },
      './css/material3': {
        target: './dist/css/tokens.material3.css',
        contexts: {
          light: {
            '--ki-card-shadow': '0 1px 2px 0 rgb(10,20,30)',
            '--ki-color-base': 'rgb(10,20,30)',
            '--ki-fallback-size': 'calc(1rem + 0)',
            '--ki-motion-easing': 'cubic-bezier(0,0,1,1)',
            '--ki-space-zero': '0',
          },
          dark: {
            '--ki-card-shadow': '0 1px 2px 0 rgb(220,230,240)',
            '--ki-color-base': 'rgb(220,230,240)',
            '--ki-fallback-size': 'calc(1rem + 0)',
            '--ki-motion-easing': 'cubic-bezier(0,0,1,1)',
            '--ki-space-zero': '0',
          },
        },
      },
    });
  });

  it('S10 resolves a nested fallback and rejects missing or cyclic aliases', () => {
    const nestedFallback = onmars.replace(
      'var(--ki-not-shipped, calc(1rem + 0px))',
      'var(--ki-not-shipped, var(--ki-space-zero))',
    );
    const missing = onmars.replace('0rem;', 'var(--ki-absent);');
    const cyclic = onmars.replace(
      '--ki-space-zero: 0rem;',
      '--ki-space-zero: var(--ki-cycle); --ki-cycle: var(--ki-space-zero);',
    );

    expect(
      buildPublicStylesheetSurface(oneExportInput(nestedFallback))['./css'].contexts.light[
        '--ki-fallback-size'
      ],
    ).toBe('0');
    expect(() => buildPublicStylesheetSurface(oneExportInput(missing))).toThrow(
      /missing custom property --ki-absent/iu,
    );
    expect(() => buildPublicStylesheetSurface(oneExportInput(cyclic))).toThrow(
      /cycle: --ki-space-zero -> --ki-cycle -> --ki-space-zero/iu,
    );
  });

  it('S10 picks the scheme branch of every light-dark(), nested and inside a composite', () => {
    const composite = onmars.replace(
      '--ki-card-shadow: 0px 1px 2px var(--ki-color-base);',
      '--ki-card-shadow: 0px 1px 2px light-dark(var(--ki-color-base), light-dark(rgb(7, 7, 7), rgb(8, 8, 8))), 0px 2px 4px LIGHT-DARK (rgb(5, 5, 5), var(--ki-color-base));',
    );
    const { light, dark } = buildPublicStylesheetSurface(oneExportInput(composite))['./css']
      .contexts;

    expect(light['--ki-card-shadow']).toBe('0 1px 2px 0 rgb(1,2,3),0 2px 4px 0 rgb(5,5,5)');
    expect(dark['--ki-card-shadow']).toBe('0 1px 2px 0 rgb(8,8,8),0 2px 4px 0 rgb(250,251,252)');
  });

  it.each([
    ['one value', 'light-dark(rgb(1, 2, 3))'],
    ['three values', 'light-dark(rgb(1, 2, 3), rgb(4, 5, 6), rgb(7, 8, 9))'],
    ['an empty value', 'light-dark(rgb(1, 2, 3), )'],
  ])('S10 rejects a light-dark() with %s', (_label, value) => {
    const malformed = onmars.replace('light-dark(rgb(1, 2, 3), rgb(250, 251, 252))', value);

    expect(() => buildPublicStylesheetSurface(oneExportInput(malformed))).toThrow(
      /--ki-palette-base contains a light-dark\(\) that does not take exactly two values/u,
    );
  });

  it.each([
    [
      'a different token selector',
      onmars.replace(tokenSelector, ':host {'),
      /must declare its tokens in one :root,:where\(\[data-ki-theme\]\) rule/u,
    ],
    [
      'a token rule that does not reach themed subtrees',
      onmars.replace(tokenSelector, ':root {'),
      /must declare its tokens in one :root,:where\(\[data-ki-theme\]\) rule/u,
    ],
    [
      'a missing token rule',
      `${rootScheme}\n${lightScheme}\n${darkScheme}`,
      /must declare its tokens in one/u,
    ],
    [
      'a missing colour-scheme rule',
      onmars.replace(darkScheme, ''),
      /must declare, in order, :root, \[data-ki-color-scheme='light'\], \[data-ki-color-scheme='dark'\] before its tokens/u,
    ],
    [
      'colour-scheme rules out of order',
      onmars.replace(rootScheme, '').replace(lightScheme, `${lightScheme}\n${rootScheme}`),
      /must declare, in order/u,
    ],
    [
      'a wrong colour-scheme value',
      onmars.replace('color-scheme: dark;', 'color-scheme: light;'),
      /\[data-ki-color-scheme='dark'\] must declare exactly color-scheme: dark/u,
    ],
    [
      'a colour-scheme rule that declares something else',
      onmars.replace('color-scheme: light dark;', 'color: red;'),
      /:root must declare exactly color-scheme: light dark/u,
    ],
    [
      'a colour-scheme rule with an extra declaration',
      onmars.replace('color-scheme: light dark;', 'color-scheme: light dark; color: red;'),
      /:root must declare exactly color-scheme: light dark/u,
    ],
    [
      'a conditional rule',
      `${onmars}\n@media (prefers-color-scheme: dark) { :root { --ki-palette-base: red; } }`,
      /unsupported conditional rule @media \(prefers-color-scheme: dark\)/u,
    ],
    [
      'an additional public selector',
      `${onmars}\n.consumer { --ki-color-base: red; }`,
      /unsupported public rule/iu,
    ],
    [
      'a non-custom-property declaration',
      onmars.replace('--ki-space-zero: 0rem;', 'color: red;'),
      /unsupported declaration color/iu,
    ],
    [
      'an empty custom property',
      onmars.replace('--ki-space-zero: 0rem;', '--ki-space-zero: ;'),
      /unsupported declaration --ki-space-zero/iu,
    ],
    [
      'a declaration without a property',
      onmars.replace('--ki-space-zero: 0rem;', ': 0rem;'),
      /invalid declaration/iu,
    ],
    [
      'a nested rule',
      onmars.replace('--ki-space-zero: 0rem;', '--ki-space-zero: 0rem; & { --ki-nested: 1px; }'),
      /unexpected nested rule/iu,
    ],
    [
      'a duplicate custom property',
      onmars.replace('--ki-space-zero: 0rem;', '--ki-space-zero: 0rem; --ki-space-zero: 1rem;'),
      /declares --ki-space-zero more than once/iu,
    ],
    ['trailing CSS outside a block', `${onmars}\ninvalid`, /trailing CSS outside a block/iu],
    ['a block without a prelude', `${onmars}\n{ --ki-a: 1px; }`, /block without a prelude/iu],
    ['an unterminated comment', `${onmars}\n/* broken`, /unterminated CSS comment/iu],
  ])('S10 fails closed for %s', (_label, css, error) => {
    expect(() => buildPublicStylesheetSurface(oneExportInput(css))).toThrow(error);
  });

  it('S10 requires a token rule that declares at least one Kimen custom property', () => {
    const empty = `${rootScheme}\n${lightScheme}\n${darkScheme}\n${tokenSelector} }`;

    expect(() => buildPublicStylesheetSurface(oneExportInput(empty))).toThrow(
      /contains no Kimen custom properties/u,
    );
  });

  it.each([
    [
      'a theme scoped to another name',
      themedInput({ theme: material3.replaceAll('material3', 'other') }),
      /\.\/css\/material3 stylesheet must contain exactly the rule :root\[data-ki-theme='material3'\],\[data-ki-theme='material3'\]/u,
    ],
    [
      'a theme that does not reach themed subtrees',
      themedInput({
        theme: material3.replace(material3Selector, ":root[data-ki-theme='material3'] {"),
      }),
      /must contain exactly the rule/u,
    ],
    [
      'a theme with a second rule',
      themedInput({ theme: `${material3}\n${material3}` }),
      /must contain exactly the rule/u,
    ],
    [
      'a theme with no rule',
      themedInput({ theme: '/* nothing */' }),
      /must contain exactly the rule/u,
    ],
    [
      'a theme that adds a token name',
      themedInput({ theme: material3.replace('--ki-palette-base:', '--ki-brand-new:') }),
      /\.\/css\/material3 stylesheet declares --ki-brand-new, which the \.\/css stylesheet does not/u,
    ],
    [
      'a theme with a conditional rule',
      themedInput({ theme: `@media (prefers-color-scheme: dark) { ${material3} }` }),
      /unsupported conditional rule/u,
    ],
    [
      'a theme without the default stylesheet it overrides',
      {
        packageExports: { './css/material3': publicExport('./dist/css/tokens.material3.css') },
        publicTokenNames,
        stylesheetSources: { './css/material3': material3 },
      },
      /\.\/css\/material3 stylesheet overrides the \.\/css stylesheet, which is not exported/u,
    ],
    [
      'a theme over an invalid default stylesheet',
      themedInput({ base: onmars.replace(darkScheme, '') }),
      /\.\/css stylesheet must declare, in order/u,
    ],
  ])('S10 fails closed for %s', (_label, input, error) => {
    expect(() => buildPublicStylesheetSurface(input)).toThrow(error);
  });

  it('S10 resolves a theme from the default declarations it does not override', () => {
    const surface = buildPublicStylesheetSurface(themedInput());

    // The theme overrides one primitive; the alias and the composite that read
    // it are declared by the default stylesheet only and still follow it.
    expect(surface['./css/material3'].contexts.dark['--ki-card-shadow']).toBe(
      '0 1px 2px 0 rgb(220,230,240)',
    );
    expect(surface['./css/material3'].contexts.light['--ki-space-zero']).toBe('0');
    // …and the default stylesheet's own contexts are untouched by the theme.
    expect(surface['./css'].contexts.dark['--ki-card-shadow']).toBe('0 1px 2px 0 rgb(250,251,252)');
  });

  it('S10 publishes the page contract as a token-free stylesheet', () => {
    expect(buildPublicStylesheetSurface(pageContractInput())['./css/base']).toEqual({
      target: './dist/css/base.css',
      pageContract: true,
    });
  });

  it.each([
    [
      'a published token',
      pageContract.replace('font-family: var(--ki-motion-easing);', '--ki-new: 1px;'),
      /\.\/css\/base stylesheet must not publish token --ki-new/u,
    ],
    [
      'a hardcoded value',
      pageContract.replace('var(--ki-color-base);', '#ffffff;'),
      /declares the hardcoded value background-color: #ffffff/u,
    ],
    [
      'a colour-scheme declaration',
      pageContract.replace('font-family: var(--ki-motion-easing);', 'color-scheme: light dark;'),
      /declares the hardcoded value color-scheme: light dark/u,
    ],
    [
      'a non-public custom property',
      pageContract.replace('var(--ki-color-base);', 'var(--private);'),
      /references non-public custom property --private/u,
    ],
    [
      'an empty declaration value',
      pageContract.replace('var(--ki-color-base);', ';'),
      /contains unsupported declaration background-color/u,
    ],
    [
      'a conditional rule',
      `@media (prefers-color-scheme: dark) { ${pageContract} }`,
      /unsupported conditional rule/u,
    ],
    ['no rule at all', '/* empty */', /declares no page contract/u],
  ])('S10 rejects a page contract with %s', (_label, css, error) => {
    expect(() => buildPublicStylesheetSurface(pageContractInput(css))).toThrow(error);
  });

  it.each([
    ['null exports', { ...oneExportInput(), packageExports: null }, /exports must be an object/iu],
    ['array exports', { ...oneExportInput(), packageExports: [] }, /exports must be an object/iu],
    [
      'null sources',
      { ...oneExportInput(), stylesheetSources: null },
      /sources must be an object/iu,
    ],
    [
      'array sources',
      { ...oneExportInput(), stylesheetSources: [] },
      /sources must be an object/iu,
    ],
    ['empty token names', { ...oneExportInput(), publicTokenNames: [] }, /non-empty array/iu],
    ['non-array token names', { ...oneExportInput(), publicTokenNames: {} }, /non-empty array/iu],
    [
      'duplicate token names',
      { ...oneExportInput(), publicTokenNames: ['--ki-color-base', '--ki-color-base'] },
      /unique --ki-/iu,
    ],
    [
      'invalid token name',
      { ...oneExportInput(), publicTokenNames: ['--other-color'] },
      /unique --ki-/iu,
    ],
    [
      'missing source',
      { ...oneExportInput(), stylesheetSources: {} },
      /source.*non-empty string/iu,
    ],
    [
      'empty source',
      { ...oneExportInput(), stylesheetSources: { './css': '  ' } },
      /source must be a non-empty string/iu,
    ],
    [
      'unexported source',
      { ...oneExportInput(), stylesheetSources: { './css': onmars, './css/material3': material3 } },
      /source \.\/css\/material3 is not exported/iu,
    ],
    [
      'unsupported CSS subpath',
      {
        ...oneExportInput(),
        packageExports: { './styles': publicExport('./dist/css/tokens.css') },
        stylesheetSources: { './styles': onmars },
      },
      /\.\/styles is not a supported public CSS export/iu,
    ],
  ])('S10 rejects %s input', (_label, input, error) => {
    expect(() => buildPublicStylesheetSurface(input)).toThrow(error);
  });

  it('S10 ignores non-CSS exports but rejects a public token absent from the stylesheet', () => {
    expect(
      buildPublicStylesheetSurface({
        packageExports: { '.': publicExport('./dist/index.js') },
        publicTokenNames: ['--ki-color-base'],
        stylesheetSources: {},
      }),
    ).toEqual({});
    expect(() =>
      buildPublicStylesheetSurface({
        ...oneExportInput(),
        publicTokenNames: [...publicTokenNames, '--ki-public-missing'],
      }),
    ).toThrow(/missing public token --ki-public-missing/iu);
  });
});
