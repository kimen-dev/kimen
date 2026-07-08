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
    pairs.map((pair) => [pair.text, pair.surface, pair.min]),
    [
      ['--ki-text-high-em', '--ki-surface-s0', 4.5],
      ['--ki-text-med-em', '--ki-surface-s0', 4.5],
      ['--ki-text-high-em', '--ki-surface-s1', 4.5],
      ['--ki-text-primary-on-primary', '--ki-surface-primary-med-em', 4.5],
    ],
  );
});

test('component sweep expands button and dialog pairs with per-pair minimums', () => {
  const pairs = componentPairs(
    new Map([
      ['--ki-button-primary-neutral-rest-bg', '#000000'],
      ['--ki-dialog-bg', '#ffffff'],
    ]),
  );

  assert.deepEqual(
    pairs.filter((pair) => !pair.missingPattern).map((pair) => [pair.text, pair.surface, pair.min]),
    [
      ['--ki-button-primary-neutral-rest-fg', '--ki-button-primary-neutral-rest-bg', 4.5],
      ['--ki-dialog-fg', '--ki-dialog-bg', 4.5],
      ['--ki-dialog-focus-ring-color', '--ki-dialog-bg', 3],
    ],
  );
});

test('component sweep reports every listed pattern with no matches', () => {
  const pairs = componentPairs(new Map());

  assert.deepEqual(
    pairs.map((pair) => pair.missingPattern),
    ['ki-button interactive text', 'ki-dialog text', 'ki-dialog focus ring'],
  );
});
