// @spec:060-onmars-v2
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildPublicStylesheetSurface } from '../../../scripts/lib/css-token-surface.mjs';

const base = await readFile(new URL('../dist/css/tokens.css', import.meta.url), 'utf8');
const material3 = await readFile(
  new URL('../dist/css/tokens.material3.css', import.meta.url),
  'utf8',
);

const name = (token) => `--ki-${token}`;
const published = [
  'surface-base',
  'surface-primary-med-em',
  'surface-info-tint',
  'text-high-em',
  'focus-ring-color',
  'typography-family-body',
  'typography-family-display',
  'button-md-radius',
  'card-border-width',
  'card-elevation',
  'dialog-radius',
  'tooltip-fg',
  'tooltip-bg',
  'tooltip-padding-block',
  'duration-fast',
  'duration-moderate',
  'duration-slow',
  'motion-easing-spring',
];
if (base.includes('--ki-motion-easing-emphasized-out:')) {
  published.push('motion-easing-emphasized-out');
}
const sheets = buildPublicStylesheetSurface({
  packageExports: {
    './css': { target: './dist/css/tokens.css' },
    './css/material3': { target: './dist/css/tokens.material3.css' },
  },
  publicTokenNames: published.map(name),
  stylesheetSources: { './css': base, './css/material3': material3 },
});

function assertValues(theme, scheme, values) {
  const contexts = sheets[theme].contexts;
  for (const [token, expected] of Object.entries(values)) {
    assert.equal(contexts[scheme][name(token)], expected, `${theme} ${scheme} ${token}`);
  }
}

test('S1 onmars resolves its paper, charcoal, ink, tints, accent and type stacks', () => {
  assertValues('./css', 'light', {
    'surface-base': '#f9f7f4',
    'surface-primary-med-em': '#1d1a16',
    'surface-info-tint': '#e6f1fb',
    'text-high-em': '#181613',
    'focus-ring-color': '#bb4e2a',
    'typography-family-body': "'Instrument Sans',system-ui,sans-serif",
    'typography-family-display': "'Newsreader',Georgia,serif",
  });
  assertValues('./css', 'dark', {
    'surface-base': '#1b1916',
    'surface-primary-med-em': '#edebe7',
    'surface-info-tint': '#13283a',
    'text-high-em': '#edebe7',
    'focus-ring-color': '#c5735a',
  });
});

test('S2 onmars resolves the new corner, card and tooltip roles', () => {
  assertValues('./css', 'light', {
    'button-md-radius': '10px',
    'card-border-width': '1px',
    'card-elevation': 'none',
    'dialog-radius': '18px',
    'tooltip-fg': '#f9f7f4',
    'tooltip-bg': '#2e2b26',
    'tooltip-padding-block': '0.375rem',
  });
  assertValues('./css', 'dark', {
    'tooltip-fg': '#181613',
    'tooltip-bg': '#f3f0eb',
  });
});

test('S3 renamed onmars easing and spring compatibility resolve to the same curve', () => {
  const curve = 'cubic-bezier(0.22,1,0.36,1)';
  assertValues('./css', 'light', {
    'duration-fast': '150ms',
    'duration-moderate': '260ms',
    'duration-slow': '380ms',
    'motion-easing-spring': curve,
    'motion-easing-emphasized-out': curve,
  });
  assert.match(
    base,
    /--ki-motion-easing-spring:[^;]+; \/\* deprecated since 0\.1\.0, removed in 1\.0\.0: use --ki-motion-easing-emphasized-out \*\//u,
  );
  assert.equal(
    sheets['./css/material3'].contexts.dark[name('motion-easing-emphasized-out')],
    sheets['./css/material3'].contexts.dark[name('motion-easing-spring')],
  );
});
