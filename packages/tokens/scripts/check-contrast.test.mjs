import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compositeOver,
  componentBgPatterns,
  contrastRatio,
  parseColor,
  relativeLuminance,
  resolveContrastPairs,
} from './check-contrast.mjs';

test('relative luminance matches WCAG anchors', () => {
  assert.equal(relativeLuminance(parseColor('#000000')), 0);
  assert.equal(relativeLuminance(parseColor('#ffffff')), 1);
});

test('component sweep covers button and checkbox matrices independently', () => {
  const patterns = componentBgPatterns();

  assert.ok(
    patterns.some((pattern) => pattern.test('--ki-button-primary-neutral-rest-bg')),
    'button matrix must be swept',
  );
  assert.ok(
    patterns.some((pattern) => pattern.test('--ki-checkbox-checked-rest-bg')),
    'checkbox checked matrix must be swept',
  );
  assert.ok(
    patterns.some((pattern) => pattern.test('--ki-checkbox-indeterminate-hover-bg')),
    'checkbox indeterminate matrix must be swept',
  );
  assert.equal(
    patterns.some((pattern) => pattern.test('--ki-checkbox-unchecked-rest-bg')),
    false,
    'unchecked has no rendered mark ink and stays out of the text sweep',
  );
  assert.equal(
    patterns.some((pattern) => pattern.test('--ki-checkbox-checked-disabled-bg')),
    false,
    'disabled cells stay exempt from WCAG 1.4.3 text contrast',
  );
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
