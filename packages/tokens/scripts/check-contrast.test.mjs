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

test('component contrast sweep pairs switch thumbs over tracks at 3:1', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-switch-unchecked-rest-track', '#ffffff'],
    ['--ki-switch-checked-hover-track', '#000000'],
  ]);

  const result = componentPairs(declarations);

  assert.deepEqual(result.failures, []);
  assert.deepEqual(
    result.pairs.filter((pair) => pair.surface.startsWith('--ki-switch')),
    [
      {
        text: '--ki-switch-unchecked-rest-thumb',
        surface: '--ki-switch-unchecked-rest-track',
        minRatio: 3,
      },
      {
        text: '--ki-switch-checked-hover-thumb',
        surface: '--ki-switch-checked-hover-track',
        minRatio: 3,
      },
    ],
  );
});

test('component contrast sweep keeps button text pairs at 4.5:1', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-switch-unchecked-rest-track', '#ffffff'],
  ]);

  const result = componentPairs(declarations);

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.pairs[0], {
    text: '--ki-button-primary-neutral-rest-fg',
    surface: '--ki-button-primary-neutral-rest-bg',
    minRatio: 4.5,
  });
});

test('component contrast sweep reports zero matches per component pattern', () => {
  const result = componentPairs(new Map([['--ki-button-primary-neutral-rest-bg', '#000000']]));

  assert.deepEqual(result.failures, [
    'no ki-switch thumb/track pairs matched — the sweep pattern drifted from the token names',
  ]);
});
