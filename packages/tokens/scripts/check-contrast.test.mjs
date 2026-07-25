import test from 'node:test';
import assert from 'node:assert/strict';

import {
  componentPairs,
  compositeOver,
  contrastRatio,
  controlBoundaryCells,
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

test('non-text control cells (radio ring/dot, checkbox mark) require 3:1, text cells 4.5:1', () => {
  const declarations = new Map([
    ['--ki-radio-selected-rest-bg', '#ffffff'],
    ['--ki-radio-selected-rest-fg', '#767676'],
    // the checkbox `-fg` is inherited by the stroked `.mark` SVG, not by text
    ['--ki-checkbox-checked-rest-bg', '#845abe'],
    ['--ki-checkbox-checked-rest-fg', '#ffffff'],
    ['--ki-input-rest-bg', '#ffffff'],
    ['--ki-input-rest-fg', '#111111'],
  ]);

  const byComponent = Object.fromEntries(
    componentPairs(declarations).map((pair) => [pair.component, pair.minRatio]),
  );

  assert.equal(byComponent.radio, 3);
  assert.equal(byComponent.checkbox, 3);
  assert.equal(byComponent.input, 4.5);
});

test('control-boundary sweep groups an empty-box control by cell and needs an edge', () => {
  const declarations = new Map([
    // a field cell: fill + boundary group under one stem
    ['--ki-input-rest-bg', '#ffffff'],
    ['--ki-input-rest-border', 'rgba(0, 0, 0, 0.08)'],
    // a track IS the control's own box, so it qualifies without a border
    ['--ki-progress-track-color', '#ececf0'],
    // a floating surface with no edge of its own → elevation identifies it,
    // not a boundary; must not be swept here
    ['--ki-select-listbox-bg', '#f9f9fa'],
    // disabled → exempt
    ['--ki-input-disabled-bg', '#fafafa'],
    ['--ki-input-disabled-border', 'rgba(0, 0, 0, 0.08)'],
    // a label-bearing component is out of scope entirely
    ['--ki-button-ghost-neutral-rest-bg', 'rgba(0, 0, 0, 0)'],
    ['--ki-button-ghost-neutral-rest-border', 'rgba(0, 0, 0, 0)'],
  ]);

  const cells = controlBoundaryCells(declarations)
    .map((cell) => [cell.stem, [...cell.members].sort()])
    .sort();

  assert.deepEqual(cells, [
    ['--ki-input-rest', ['--ki-input-rest-bg', '--ki-input-rest-border']],
    ['--ki-progress', ['--ki-progress-track-color']],
  ]);
});
