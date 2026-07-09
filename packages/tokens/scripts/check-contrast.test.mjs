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
      ['--ki-select-placeholder-fg', '--ki-select-rest-bg'],
      ['--ki-select-rest-label-fg', '--ki-surface-s0'],
      ['--ki-select-hover-label-fg', '--ki-surface-s0'],
      ['--ki-select-focus-label-fg', '--ki-surface-s0'],
    ],
  );
});

test('component sweep covers button, select and option foreground-background matrices', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-button-primary-neutral-rest-fg', '#ffffff'],
    ['--ki-select-focus-bg', '#000000'],
    ['--ki-select-focus-fg', '#ffffff'],
    ['--ki-option-highlight-bg', '#000000'],
    ['--ki-option-highlight-fg', '#ffffff'],
  ]);
  const swept = componentPairs(declarations);

  assert.deepEqual(
    swept.pairs.map((pair) => [pair.text, pair.surface]),
    [
      ['--ki-button-primary-neutral-rest-fg', '--ki-button-primary-neutral-rest-bg'],
      ['--ki-select-focus-fg', '--ki-select-focus-bg'],
      ['--ki-option-highlight-fg', '--ki-option-highlight-bg'],
    ],
  );
  assert.equal(swept.counts.get('ki-button'), 1);
  assert.equal(swept.counts.get('ki-select'), 1);
  assert.equal(swept.counts.get('ki-option'), 1);
});

test('component sweep reports zero matches per component family', () => {
  const swept = componentPairs(new Map([['--ki-select-rest-bg', '#ffffff']]));

  assert.equal(swept.counts.get('ki-button'), 0);
  assert.equal(swept.counts.get('ki-select'), 1);
  assert.equal(swept.counts.get('ki-option'), 0);
});
