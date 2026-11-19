// @spec:060-onmars-v2
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// eslint-disable-next-line @nx/enforce-module-boundaries -- Use the API gate's resolver to check the published CSS.
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
  'focus-danger',
  'focus-ring-color',
  'typography-family-body',
  'typography-family-display',
  'button-md-radius',
  'card-border-width',
  'card-elevation',
  'dialog-radius',
  'elevation-e4',
  'tooltip-fg',
  'tooltip-bg',
  'tooltip-padding-block',
  'tooltip-shadow',
  'duration-fast',
  'duration-moderate',
  'duration-slow',
  'motion-easing-spring',
  'motion-easing-emphasized-out',
];
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
    'focus-danger': '0 0 0 3px rgba(239,78,105,0.2)',
    'focus-ring-color': '#bb4e2a',
    'typography-family-body': "'Instrument Sans',system-ui,sans-serif",
    'typography-family-display': "'Newsreader',Georgia,serif",
  });
  assertValues('./css', 'dark', {
    'surface-base': '#1b1916',
    'surface-primary-med-em': '#edebe7',
    'surface-info-tint': '#13283a',
    'text-high-em': '#edebe7',
    'focus-danger': '0 0 0 3px rgba(239,78,105,0.4)',
    'focus-ring-color': '#c5735a',
  });
});

test('S2 the Calma elevation paints only the shadow layers for the active scheme', () => {
  assertValues('./css', 'light', {
    'elevation-e4':
      '0 4px 12px 0 rgba(24,22,19,0.07),0 20px 44px 0 rgba(24,22,19,0.12),0 18px 40px 0 transparent',
  });
  assertValues('./css', 'dark', {
    'elevation-e4':
      '0 4px 12px 0 rgba(0,0,0,0.45),0 20px 44px 0 transparent,0 18px 40px 0 rgba(0,0,0,0.55)',
  });
});

test('S2 onmars resolves the new corner, card and tooltip roles', () => {
  assertValues('./css', 'light', {
    'button-md-radius': '10px',
    'card-border-width': '1px',
    // A typed shadow at none is emitted as a transparent layer (#349).
    'card-elevation': '0 0 #0000',
    'dialog-radius': '18px',
    'tooltip-fg': '#f9f7f4',
    'tooltip-bg': '#2e2b26',
    'tooltip-padding-block': '0.375rem',
    'tooltip-shadow':
      '0 2px 6px 0 rgba(24,22,19,0.05),0 12px 28px 0 rgba(24,22,19,0.09),0 10px 24px 0 transparent',
  });
  assertValues('./css', 'dark', {
    'tooltip-fg': '#181613',
    'tooltip-bg': '#f3f0eb',
    'tooltip-shadow':
      '0 2px 6px 0 rgba(0,0,0,0.4),0 12px 28px 0 transparent,0 10px 24px 0 rgba(0,0,0,0.45)',
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

test('S4 Material 3 keeps its page, font, corner and motion values in every context', () => {
  const theme = './css/material3';
  for (const context of Object.keys(sheets[theme].contexts)) {
    const dark = context.endsWith('dark');
    assertValues(theme, context, {
      'surface-base': dark ? '#141218' : '#fef7ff',
      'typography-family-body': 'Roboto,system-ui,sans-serif',
      'dialog-radius': '28px',
      'motion-easing-spring': 'cubic-bezier(0.34,1.56,0.64,1)',
    });
  }
});
