// @spec:018-project-integrity-hardening#S10
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicStylesheetSurface } from '../lib/css-token-surface.mjs';

const publicExports = {
  './css': {
    target: './dist/css/tokens.css',
    deprecatedSince: null,
    replacement: null,
  },
};

const stylesheet = `
:root {
  --ki-zero: 0px;
  --ki-color: rgb(0, 0, 0);
  --ki-shadow: 0px 1px 2px var(--ki-color);
  --ki-easing: linear;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-ki-color-scheme='light']) {
    --ki-color: rgb(255, 255, 255);
  }
}

:root[data-ki-color-scheme='dark'] {
  --ki-color: rgb(255, 255, 255);
}
`;

const build = (css = stylesheet) =>
  buildPublicStylesheetSurface({
    packageExports: publicExports,
    publicTokenNames: ['--ki-zero', '--ki-color', '--ki-shadow', '--ki-easing'],
    stylesheetSources: { './css': css },
  });

test('[S10] stylesheet surface resolves aliases in light and equivalent dark contexts', () => {
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

test('[S10] stylesheet surface supports a themed public CSS export', () => {
  const themed = stylesheet.replaceAll(':root', ":root[data-ki-theme='material3']");
  const surface = buildPublicStylesheetSurface({
    packageExports: {
      './css/material3': {
        target: './dist/css/tokens.material3.css',
        deprecatedSince: null,
        replacement: null,
      },
    },
    publicTokenNames: ['--ki-zero', '--ki-color', '--ki-shadow', '--ki-easing'],
    stylesheetSources: { './css/material3': themed },
  });

  assert.equal(surface['./css/material3'].contexts.dark['--ki-color'], 'rgb(255,255,255)');
});

test('[S10] stylesheet surface rejects divergent automatic and forced dark values', () => {
  const divergent = stylesheet.replace(
    ":root[data-ki-color-scheme='dark'] {\n  --ki-color: rgb(255, 255, 255);\n}",
    ":root[data-ki-color-scheme='dark'] {\n  --ki-color: rgb(4, 5, 6);\n}",
  );
  assert.throws(() => build(divergent), /automatic.*forced|forced.*automatic|dark.*diverge/iu);
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
