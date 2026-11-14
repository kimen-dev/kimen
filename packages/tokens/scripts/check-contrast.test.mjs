import test from 'node:test';
import assert from 'node:assert/strict';

import {
  componentPairs,
  compositeOver,
  contrastRatio,
  controlBoundaryCells,
  currentMarkPairs,
  overlayRamps,
  pageGraphicMarks,
  parseColor,
  placeholderCells,
  ratioReadoutPairs,
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
    ['--ki-switch-unchecked-rest-track', '#ececf0'],
    // an indicator's extent is data-dependent and can be zero, so it must not
    // count as an edge — ki-progress at value=0 paints none of it
    ['--ki-progress-track-color', '#ececf0'],
    ['--ki-progress-indicator-color', '#845abe'],
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
    ['--ki-switch-unchecked-rest', ['--ki-switch-unchecked-rest-track']],
  ]);
});

test('readout pairs are derived from indicator/track siblings, not listed', () => {
  const declarations = new Map([
    // a bar-shaped readout: both members present → derived
    ['--ki-progress-indicator-color', '#845abe'],
    ['--ki-progress-track-color', '#ececf0'],
    // a track with no indicator is not a readout — the switch is a control,
    // measured by the boundary sweep instead
    ['--ki-switch-unchecked-rest-track', '#ececf0'],
    // an indicator with no track has no unfilled part to be read against
    ['--ki-indicator-dot-color', '#00000030'],
    // semantic layer, not a component
    ['--ki-surface-track', '#eeeeee'],
    ['--ki-surface-indicator', '#111111'],
  ]);

  assert.deepEqual(
    ratioReadoutPairs(declarations).map((pair) => [pair.stem, pair.indicator, pair.track]),
    [['--ki-progress', '--ki-progress-indicator-color', '--ki-progress-track-color']],
  );
});

test('overlay ramps pair hover with active and collect every fill they wash', () => {
  const declarations = new Map([
    // a complete ramp: both overlays present, three tones under the same stem
    ['--ki-button-secondary-hover-overlay', 'rgba(0, 0, 0, 0.03)'],
    ['--ki-button-secondary-active-overlay', 'rgba(0, 0, 0, 0.05)'],
    ['--ki-button-secondary-neutral-rest-bg', '#ffffff'],
    ['--ki-button-secondary-danger-rest-bg', '#fdecec'],
    // hover with no pressed sibling is not a ramp: nothing claims to be a step
    // beyond it (tertiary and ghost carry their state in the fill instead)
    ['--ki-button-tertiary-hover-overlay', 'rgba(0, 0, 0, 0.03)'],
    ['--ki-button-tertiary-neutral-rest-bg', 'rgba(0, 0, 0, 0)'],
  ]);

  assert.deepEqual(
    overlayRamps(declarations).map((ramp) => [ramp.stem, ramp.hover, ramp.active, ramp.fills]),
    [
      [
        '--ki-button-secondary',
        '--ki-button-secondary-hover-overlay',
        '--ki-button-secondary-active-overlay',
        ['--ki-button-secondary-neutral-rest-bg', '--ki-button-secondary-danger-rest-bg'],
      ],
    ],
  );
});

test('a stem is matched literally, so a metacharacter in it pools nothing extra', () => {
  // The stem is cut from a name the sweep read out of the stylesheet, not from
  // a list it controls. Built into a pattern, a `.` in it stops meaning itself
  // and starts matching any character — quietly washing a neighbouring stem's
  // fill with overlays that were never declared over it.
  const declarations = new Map([
    ['--ki-button-secondary.x-hover-overlay', 'rgba(0, 0, 0, 0.03)'],
    ['--ki-button-secondary.x-active-overlay', 'rgba(0, 0, 0, 0.05)'],
    ['--ki-button-secondary.x-neutral-rest-bg', '#ffffff'],
    // One character apart, and a different stem: it must not be collected.
    ['--ki-button-secondaryQx-neutral-rest-bg', '#000000'],
  ]);

  assert.deepEqual(overlayRamps(declarations)[0].fills, [
    '--ki-button-secondary.x-neutral-rest-bg',
  ]);
});

test('a rest fill whose name only overlaps the stem tail is not collected', () => {
  const declarations = new Map([
    ['--ki-a-rest-b-hover-overlay', 'rgba(0, 0, 0, 0.03)'],
    ['--ki-a-rest-b-active-overlay', 'rgba(0, 0, 0, 0.05)'],
    // Shorter than the stem plus the suffix: it cannot be a fill under it.
    ['--ki-a-rest-bg', '#ffffff'],
  ]);

  assert.deepEqual(overlayRamps(declarations)[0].fills, []);
});

test('a component whose name extends an empty-box name is not pooled into it', () => {
  // The component segment is matched on the first word, so `--ki-radio-group-*`
  // would be swept as `radio` and measured against a rule written for the
  // control itself. ki-radio-group publishes no colour cells today, which is
  // why nothing failed — a latent trap, not a live one.
  const declarations = new Map([
    ['--ki-radio-group-rest-bg', '#ffffff'],
    ['--ki-radio-group-rest-border', 'rgba(0, 0, 0, 0.08)'],
  ]);

  assert.deepEqual(controlBoundaryCells(declarations), []);
});

test('placeholder sweep reads each placeholder against the fills its field can show', () => {
  const declarations = new Map([
    // a state-scoped placeholder is painted on its own cell, and only there
    ['--ki-input-rest-bg', '#f2f2f4'],
    ['--ki-input-rest-fg', '#0a0c11'],
    ['--ki-input-rest-placeholder-fg', '#8c929c'],
    ['--ki-input-focus-bg', '#ffffff'],
    ['--ki-input-focus-fg', '#0a0c11'],
    ['--ki-input-focus-placeholder-fg', '#8c929c'],
    // a component-wide placeholder (ki-select) stands in for the value text,
    // so it is read against every cell that text is painted on
    ['--ki-select-rest-bg', '#f2f2f4'],
    ['--ki-select-rest-fg', '#0a0c11'],
    ['--ki-select-hover-bg', '#ececf0'],
    ['--ki-select-hover-fg', '#0a0c11'],
    ['--ki-select-placeholder-fg', '#5b616d'],
    // a floating surface carries no value text, so no placeholder either
    ['--ki-select-listbox-bg', '#f9f9fa'],
    // disabled → exempt, exactly like the text sweep
    ['--ki-input-disabled-bg', '#fafafa'],
    ['--ki-input-disabled-fg', '#cccccc'],
    ['--ki-input-disabled-placeholder-fg', '#cccccc'],
    ['--ki-select-disabled-bg', '#fafafa'],
    ['--ki-select-disabled-fg', '#cccccc'],
  ]);

  assert.deepEqual(
    placeholderCells(declarations).map((cell) => [cell.placeholder, cell.fills]),
    [
      ['--ki-input-rest-placeholder-fg', ['--ki-input-rest-bg']],
      ['--ki-input-focus-placeholder-fg', ['--ki-input-focus-bg']],
      ['--ki-select-placeholder-fg', ['--ki-select-rest-bg', '--ki-select-hover-bg']],
    ],
  );
});

test('a placeholder with no field fill under its stem is reported, not dropped', () => {
  // A renamed `-bg` must surface as a named failure. Dropping the pair in
  // silence is how the placeholder stayed outside every sweep to begin with.
  const declarations = new Map([['--ki-input-rest-placeholder-fg', '#8c929c']]);

  assert.deepEqual(placeholderCells(declarations), [
    { placeholder: '--ki-input-rest-placeholder-fg', fills: [] },
  ]);
});

test('page-graphic sweep derives every painted mark and leaves the grounds out', () => {
  const declarations = new Map([
    // every tone of the status dot is a mark, including ones added later
    ['--ki-status-neutral-color', '#afb3bb'],
    ['--ki-status-warning-color', '#f8ac3a'],
    // the ring is a separator that takes the page's own colour on purpose
    ['--ki-status-ring-color', '#ffffff'],
    // not a colour at all
    ['--ki-status-size', '0.25rem'],
    ['--ki-indicator-dot-color', 'rgba(0, 0, 0, 0.18)'],
    ['--ki-indicator-dot-current-color', 'rgba(0, 0, 0, 0.18)'],
    ['--ki-scroller-thumb-color', 'rgba(0, 0, 0, 0.05)'],
    // the ground a thumb moves over, and a focus ring measured elsewhere
    ['--ki-scroller-track-color', 'rgba(0, 0, 0, 0)'],
    ['--ki-scroller-focus-ring-color', '#845abe'],
    // a component that carries its own label is out of scope entirely
    ['--ki-progress-indicator-color', '#845abe'],
  ]);

  assert.deepEqual(pageGraphicMarks(declarations), [
    '--ki-status-neutral-color',
    '--ki-status-warning-color',
    '--ki-indicator-dot-color',
    '--ki-indicator-dot-current-color',
    '--ki-scroller-thumb-color',
  ]);
});

test('a current mark is paired with its resting mark, and knows when colour is all that tells them apart', () => {
  const elongated = new Map([
    // onmars: the current dot is a 32x16 pill among 8x8 dots — shape speaks
    ['--ki-indicator-dot-color', 'rgba(0, 0, 0, 0.48)'],
    ['--ki-indicator-dot-inline-size', '0.5rem'],
    ['--ki-indicator-dot-block-size', '0.5rem'],
    ['--ki-indicator-dot-current-color', 'rgba(0, 0, 0, 0.48)'],
    ['--ki-indicator-dot-current-inline-size', '2rem'],
    ['--ki-indicator-dot-current-block-size', '1rem'],
  ]);
  const uniform = new Map([
    // material3: uniform circles — nothing but colour marks the current one
    ['--ki-indicator-dot-color', '#79747e'],
    ['--ki-indicator-dot-inline-size', '0.5rem'],
    ['--ki-indicator-dot-block-size', '0.5rem'],
    ['--ki-indicator-dot-current-color', '#000000'],
    ['--ki-indicator-dot-current-inline-size', '0.5rem'],
    ['--ki-indicator-dot-current-block-size', '0.5rem'],
    // a tone is not a "current" state and has no resting sibling to pair with
    ['--ki-status-neutral-color', '#79747e'],
  ]);

  assert.deepEqual(currentMarkPairs(elongated), [
    {
      current: '--ki-indicator-dot-current-color',
      resting: '--ki-indicator-dot-color',
      colourAlone: false,
    },
  ]);
  assert.deepEqual(currentMarkPairs(uniform), [
    {
      current: '--ki-indicator-dot-current-color',
      resting: '--ki-indicator-dot-color',
      colourAlone: true,
    },
  ]);
});
