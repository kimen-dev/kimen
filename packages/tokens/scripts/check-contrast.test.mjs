import test from 'node:test';
import assert from 'node:assert/strict';

import {
  componentPairs,
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  resolveContrastPairs,
} from './check-contrast.mjs';

test('relative luminance matches WCAG anchors', () => {
  assert.equal(relativeLuminance(parseColor('#000000')), 0);
  assert.equal(relativeLuminance(parseColor('#ffffff')), 1);
});

test('contrast ratio matches WCAG anchors', () => {
  assert.equal(contrastRatio(parseColor('#000000'), parseColor('#ffffff')), 21);
  assert.ok(contrastRatio(parseColor('#767676'), parseColor('#ffffff')) >= 4.5);
});

test('alpha colors composite over an opaque surface before contrast', () => {
  assert.deepEqual(compositeOver(parseColor('rgba(0, 0, 0, 0.5)'), parseColor('#ffffff')), {
    r: 128,
    g: 128,
    b: 128,
    a: 1,
  });
});

test('contrast pair table covers the declared data-model pairs', () => {
  const pairs = resolveContrastPairs();

  assert.deepEqual(
    pairs.map((pair) => [pair.text, pair.surface]),
    [
      ['--ki-text-high-em', '--ki-surface-s0'],
      ['--ki-text-med-em', '--ki-surface-s0'],
      ['--ki-text-high-em', '--ki-surface-s1'],
      ['--ki-text-primary-on-primary', '--ki-surface-primary-med-em'],
    ],
  );
});

test('component sweep is generic: any component bg/fg pair, semantic layers and disabled cells excluded', () => {
  const declarations = new Map([
    // a non-button component with a matching fg → swept
    ['--ki-input-rest-bg', '#ffffff'],
    ['--ki-input-rest-fg', '#111111'],
    // a bare component pair with no state segment (e.g. ki-card) → swept
    ['--ki-card-bg', '#ffffff'],
    ['--ki-card-fg', '#111111'],
    // button canary → swept
    ['--ki-button-neutral-rest-bg', '#eeeeee'],
    ['--ki-button-neutral-rest-fg', '#222222'],
    // disabled cell → excluded (WCAG 1.4.3 exempt)
    ['--ki-input-disabled-bg', '#fafafa'],
    ['--ki-input-disabled-fg', '#cccccc'],
    // bg without an fg sibling → skipped (non-text affordance, not a text pair)
    ['--ki-checkbox-checked-rest-bg', '#0066ff'],
    // semantic layer, not a component → excluded even with an fg sibling
    ['--ki-surface-raised-bg', '#0066ff'],
    ['--ki-surface-raised-fg', '#ffffff'],
  ]);

  const swept = componentPairs(declarations)
    .map((pair) => [pair.component, pair.text, pair.surface])
    .sort();

  assert.deepEqual(swept, [
    ['button', '--ki-button-neutral-rest-fg', '--ki-button-neutral-rest-bg'],
    ['card', '--ki-card-fg', '--ki-card-bg'],
    ['input', '--ki-input-rest-fg', '--ki-input-rest-bg'],
  ]);
});
