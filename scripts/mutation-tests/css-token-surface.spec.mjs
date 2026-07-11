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

const stylesheet = ({ theme, light, dark }) => {
  const root = theme === undefined ? ':root' : `:root[data-ki-theme='${theme}']`;
  return `
    /* Generated token contract. */
    ${root} {
      --ki-palette-base: ${light};
      --ki-color-base: var(--ki-palette-base);
      --ki-fallback-size: var(--ki-not-shipped, calc(1rem + 0px));
      --ki-card-shadow: 0px 1px 2px var(--ki-color-base);
      --ki-motion-easing: linear;
      --ki-space-zero: 0rem;
    }

    @media (prefers-color-scheme: dark) {
      ${root}:not([data-ki-color-scheme='light']) {
        --ki-palette-base: ${dark};
      }
    }

    ${root}[data-ki-color-scheme='dark'] {
      --ki-palette-base: ${dark};
    }
  `;
};

const onmars = stylesheet({ light: 'rgb(1, 2, 3)', dark: 'rgb(250, 251, 252)' });
const material3 = stylesheet({
  theme: 'material3',
  light: 'rgb(10, 20, 30)',
  dark: 'rgb(220, 230, 240)',
});

const oneExportInput = (css = onmars) => ({
  packageExports: { './css': publicExport('./dist/css/tokens.css') },
  publicTokenNames,
  stylesheetSources: { './css': css },
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

  it('S10 requires automatic and forced dark contexts to resolve identically', () => {
    const divergent = onmars.replace(
      ":root[data-ki-color-scheme='dark'] {\n      --ki-palette-base: rgb(250, 251, 252);",
      ":root[data-ki-color-scheme='dark'] {\n      --ki-palette-base: rgb(7, 8, 9);",
    );

    expect(() => buildPublicStylesheetSurface(oneExportInput(divergent))).toThrow(
      /automatic and forced dark contexts diverge/iu,
    );
  });

  it.each([
    [
      'a different light selector',
      onmars.replace(':root {', ':host {'),
      /exactly one :root rule in light context/iu,
    ],
    [
      'a missing automatic-dark rule',
      onmars.replace('@media (prefers-color-scheme: dark)', '@media (prefers-contrast: more)'),
      /unsupported conditional rule/iu,
    ],
    [
      'a nested dark conditional',
      onmars.replace(
        ":root:not([data-ki-color-scheme='light']) {",
        "@media (prefers-color-scheme: dark) { :root:not([data-ki-color-scheme='light']) {",
      ),
      /unsupported conditional rule|unclosed CSS block/iu,
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
      'a duplicate custom property',
      onmars.replace('--ki-space-zero: 0rem;', '--ki-space-zero: 0rem; --ki-space-zero: 1rem;'),
      /declares --ki-space-zero more than once/iu,
    ],
    ['trailing CSS outside a block', `${onmars}\ninvalid`, /trailing CSS outside a block/iu],
    ['an unterminated comment', `${onmars}\n/* broken`, /unterminated CSS comment/iu],
  ])('S10 fails closed for %s', (_label, css, error) => {
    expect(() => buildPublicStylesheetSurface(oneExportInput(css))).toThrow(error);
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
