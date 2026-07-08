import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  resolveComponentPatterns,
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

test('component sweep includes button AA and radio non-text indicator patterns', () => {
  const patterns = resolveComponentPatterns();

  assert.deepEqual(
    patterns.map((pattern) => [pattern.name, pattern.minRatio]),
    [
      ['ki-button interactive cells', 4.5],
      ['ki-radio selected dot cells', 3],
    ],
  );
  assert.equal(patterns[1].bgPattern.test('--ki-radio-selected-rest-bg'), true);
  assert.equal(patterns[1].bgPattern.test('--ki-radio-selected-hover-bg'), true);
  assert.equal(patterns[1].bgPattern.test('--ki-radio-selected-active-bg'), true);
  assert.equal(patterns[1].bgPattern.test('--ki-radio-unselected-rest-bg'), false);
  assert.equal(patterns[1].bgPattern.test('--ki-radio-selected-disabled-bg'), false);
});
