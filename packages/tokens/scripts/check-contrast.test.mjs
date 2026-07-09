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
  assert.deepEqual(
    pairs.map((pair) => pair.minimum),
    [4.5, 4.5, 4.5, 4.5],
  );
});

test('component pair patterns cover button text and tab label cells', () => {
  const declarations = new Map([
    ['--ki-button-primary-neutral-rest-bg', '#000000'],
    ['--ki-tab-selected-rest-bg', '#ffffff'],
    ['--ki-tab-unselected-hover-bg', '#ffffff'],
  ]);

  assert.deepEqual(
    componentPairs(declarations).filter((pair) => !pair.error),
    [
      {
        text: '--ki-button-primary-neutral-rest-fg',
        surface: '--ki-button-primary-neutral-rest-bg',
        minimum: 4.5,
      },
      {
        text: '--ki-tab-selected-rest-fg',
        surface: '--ki-tab-selected-rest-bg',
        minimum: 4.5,
      },
      {
        text: '--ki-tab-unselected-hover-fg',
        surface: '--ki-tab-unselected-hover-bg',
        minimum: 4.5,
      },
      {
        text: '--ki-tab-indicator-color',
        surface: '--ki-tab-selected-rest-bg',
        minimum: 3,
      },
    ],
  );
});

test('component pair patterns report zero-match drift per component family', () => {
  const pairs = componentPairs(new Map([['--ki-button-primary-neutral-rest-bg', '#000000']]));

  assert.deepEqual(
    pairs.filter((pair) => pair.error).map((pair) => pair.error),
    [
      'no component-layer pairs matched for ki-tab interactive label cells — the sweep pattern drifted from the token names',
    ],
  );
});
