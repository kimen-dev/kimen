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

test('component contrast sweep covers button matrix cells and list text pairs', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-list-bg', '#ffffff'],
    ['--ki-list-item-primary-fg', '#000000'],
    ['--ki-list-item-secondary-fg', '#333333'],
  ]);

  assert.deepEqual(componentPairs(declarations), [
    {
      text: '--ki-button-primary-neutral-rest-fg',
      surface: '--ki-button-primary-neutral-rest-bg',
    },
    { text: '--ki-list-item-primary-fg', surface: '--ki-list-bg' },
    { text: '--ki-list-item-secondary-fg', surface: '--ki-list-bg' },
  ]);
});
