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

test('component sweep derives textarea text placeholder and label pairs per state', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-textarea-rest-bg', '#ffffff'],
    ['--ki-textarea-focus-bg', '#ffffff'],
  ]);

  assert.deepEqual(
    componentPairs(declarations).filter((pair) => pair.text.startsWith('--ki-textarea')),
    [
      { text: '--ki-textarea-rest-fg', surface: '--ki-textarea-rest-bg' },
      { text: '--ki-textarea-rest-placeholder-fg', surface: '--ki-textarea-rest-bg' },
      { text: '--ki-textarea-rest-label-fg', surface: '--ki-surface-s0' },
      { text: '--ki-textarea-focus-fg', surface: '--ki-textarea-focus-bg' },
      { text: '--ki-textarea-focus-placeholder-fg', surface: '--ki-textarea-focus-bg' },
      { text: '--ki-textarea-focus-label-fg', surface: '--ki-surface-s0' },
    ],
  );
});

test('component sweep reports missing patterns per component', () => {
  assert.deepEqual(componentPairs(new Map()), [
    {
      text: '__missing_component_sweep__:ki-button',
      surface: '__missing_component_sweep__:ki-button',
    },
    {
      text: '__missing_component_sweep__:ki-textarea',
      surface: '__missing_component_sweep__:ki-textarea',
    },
  ]);
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
