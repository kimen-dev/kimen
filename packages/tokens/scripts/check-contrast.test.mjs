import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  resolveComponentContrastPairs,
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

test('component contrast patterns match alert text cells with a per-pair minimum', () => {
  const declarations = new Map([
    ['--ki-button-secondary-neutral-rest-bg', '#ffffff'],
    ['--ki-alert-neutral-bg', '#ffffff'],
    ['--ki-alert-success-bg', '#ffffff'],
    ['--ki-alert-danger-bg', '#ffffff'],
    ['--ki-alert-info-bg', '#ffffff'],
    ['--ki-alert-warning-bg', '#ffffff'],
  ]);

  const { pairs, unmatchedPatterns } = resolveComponentContrastPairs(declarations);

  assert.equal(unmatchedPatterns.length, 0);
  assert.deepEqual(
    pairs
      .filter((pair) => pair.text.startsWith('--ki-alert-') && !pair.text.includes('dismiss'))
      .map((pair) => [pair.text, pair.surface, pair.min]),
    [
      ['--ki-alert-neutral-fg', '--ki-alert-neutral-bg', 4.5],
      ['--ki-alert-success-fg', '--ki-alert-success-bg', 4.5],
      ['--ki-alert-danger-fg', '--ki-alert-danger-bg', 4.5],
      ['--ki-alert-info-fg', '--ki-alert-info-bg', 4.5],
      ['--ki-alert-warning-fg', '--ki-alert-warning-bg', 4.5],
    ],
  );
});

test('component contrast patterns cross-pair dismiss indicators across every alert tone', () => {
  const declarations = new Map([
    ['--ki-button-secondary-neutral-rest-bg', '#ffffff'],
    ['--ki-alert-neutral-bg', '#ffffff'],
    ['--ki-alert-success-bg', '#ffffff'],
    ['--ki-alert-danger-bg', '#ffffff'],
    ['--ki-alert-info-bg', '#ffffff'],
    ['--ki-alert-warning-bg', '#ffffff'],
  ]);

  const { pairs } = resolveComponentContrastPairs(declarations);
  const dismissPairs = pairs.filter((pair) => pair.text.includes('dismiss'));

  assert.equal(dismissPairs.length, 15);
  assert.ok(
    dismissPairs.every((pair) => pair.min === 3),
    'dismiss glyph is a non-text indicator with a 3:1 minimum',
  );
  assert.deepEqual(
    dismissPairs.slice(0, 3).map((pair) => [pair.text, pair.surface, pair.min]),
    [
      ['--ki-alert-dismiss-rest-fg', '--ki-alert-neutral-bg', 3],
      ['--ki-alert-dismiss-hover-fg', '--ki-alert-neutral-bg', 3],
      ['--ki-alert-dismiss-active-fg', '--ki-alert-neutral-bg', 3],
    ],
  );
});

test('component contrast patterns report zero-match drift per pattern', () => {
  const { unmatchedPatterns } = resolveComponentContrastPairs(new Map());

  assert.deepEqual(unmatchedPatterns, [
    'ki-button interactive cells',
    'ki-alert tone cells',
    'ki-alert dismiss indicators',
  ]);
});
