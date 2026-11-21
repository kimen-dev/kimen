import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import {
  CONTEXTS,
  chroma,
  collectSchemeDeclarations,
  componentPairs,
  compositeOver,
  contrastRatio,
  controlBoundaryCells,
  currentMarkPairs,
  evaluateCss,
  overlayRamps,
  pageGraphicMarks,
  parseColor,
  placeholderCells,
  ratioReadoutPairs,
  relativeLuminance,
  resolveContrastPairs,
  splitToneFamilies,
  toneFamilies,
  toneInks,
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
      ['--ki-text-med-em', '--ki-surface-s1'],
      ['--ki-text-danger-high-em', '--ki-surface-s1'],
      ['--ki-text-danger', '--ki-surface-s0'],
      ['--ki-text-danger', '--ki-surface-s1'],
      ['--ki-text-primary-on-primary', '--ki-surface-primary-med-em'],
      ['--ki-text-secondary-on-success', '--ki-surface-success-high-em'],
      ...['--ki-surface-s0', '--ki-surface-s1', '--ki-surface-s2'].map((surface) => [
        '--ki-text-low-em',
        surface,
      ]),
      ...['primary', 'info', 'success', 'warning', 'danger'].flatMap((tone) =>
        ['med-em', 'low-em'].flatMap((emphasis) =>
          ['--ki-surface-s0', '--ki-surface-s1', '--ki-surface-s2'].map((surface) => [
            `--ki-text-${tone}-${emphasis}`,
            surface,
          ]),
        ),
      ),
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

test('Stat checks every text ink against its single card surface', () => {
  const names = [
    '--ki-stat-label-fg',
    '--ki-stat-value-fg',
    '--ki-stat-delta-neutral-fg',
    '--ki-stat-delta-success-fg',
    '--ki-stat-delta-danger-fg',
  ];
  const declarations = new Map(names.map((name) => [name, '#111111']));
  declarations.set('--ki-stat-bg', '#ffffff');

  assert.deepEqual(
    componentPairs(declarations),
    names.map((text) => ({ component: 'stat', text, surface: '--ki-stat-bg', minRatio: 4.5 })),
  );
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
    // The isolated hover override has no pressed sibling under the same stem.
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

test('tone-ink sweep derives every high-emphasis tone ink and nothing else', () => {
  const declarations = new Map([
    ['--ki-text-danger-high-em', '#cd2118'],
    // a tone added later is swept the day it appears
    ['--ki-text-warning-high-em', '#945b05'],
    ['--ki-text-primary-high-em', '#5f3d92'],
    // the neutral ink is in the fixed pair table already
    ['--ki-text-high-em', '#0a0c11'],
    // lower emphasis steps are decoration ramps, not a readable-ink promise
    ['--ki-text-warning-med-em', '#f8ac3a'],
    ['--ki-text-warning-base-em', '#fdeace'],
    // a fill and an edge are not ink
    ['--ki-surface-warning-high-em', '#f29408'],
    ['--ki-outline-warning-high-em', '#f8ac3a'],
  ]);

  assert.deepEqual(toneInks(declarations), [
    '--ki-text-danger-high-em',
    '--ki-text-warning-high-em',
    '--ki-text-primary-high-em',
  ]);
});

test('tone-family sweep groups the text cells that differ only in their tone', () => {
  const declarations = new Map([
    ['--ki-badge-neutral-bg', '#f5f5f6'],
    ['--ki-badge-neutral-fg', '#0a0c11'],
    ['--ki-badge-info-bg', '#e3f7fd'],
    ['--ki-badge-info-fg', '#085268'],
    // each state of a toned control is its own family
    ['--ki-button-primary-neutral-rest-bg', '#845abe'],
    ['--ki-button-primary-neutral-rest-fg', '#ffffff'],
    ['--ki-button-primary-danger-rest-bg', '#cd2118'],
    ['--ki-button-primary-danger-rest-fg', '#ffffff'],
    ['--ki-button-primary-neutral-hover-bg', '#7648b7'],
    ['--ki-button-primary-neutral-hover-fg', '#ffffff'],
    // a single tone is not a family
    ['--ki-alert-success-bg', '#e8f3e8'],
    ['--ki-alert-success-fg', '#2c6a2b'],
    // a cell with no tone in its name has no siblings to agree with
    ['--ki-card-bg', '#ffffff'],
    ['--ki-card-fg', '#0a0c11'],
    // disabled cells are exempt, as they are for the text sweep
    ['--ki-button-primary-danger-disabled-bg', '#eeeeee'],
    ['--ki-button-primary-danger-disabled-fg', '#aaaaaa'],
    ['--ki-button-primary-neutral-disabled-bg', '#eeeeee'],
    ['--ki-button-primary-neutral-disabled-fg', '#aaaaaa'],
  ]);

  assert.deepEqual(toneFamilies(declarations), [
    {
      stem: '--ki-badge-*-bg',
      cells: [
        { tone: 'neutral', text: '--ki-badge-neutral-fg', surface: '--ki-badge-neutral-bg' },
        { tone: 'info', text: '--ki-badge-info-fg', surface: '--ki-badge-info-bg' },
      ],
    },
    {
      stem: '--ki-button-primary-*-rest-bg',
      cells: [
        {
          tone: 'neutral',
          text: '--ki-button-primary-neutral-rest-fg',
          surface: '--ki-button-primary-neutral-rest-bg',
        },
        {
          tone: 'danger',
          text: '--ki-button-primary-danger-rest-fg',
          surface: '--ki-button-primary-danger-rest-bg',
        },
      ],
    },
  ]);
});

test('a tone family is split when one tone paints the other polarity', () => {
  const page = ['--ki-surface-s0', '#141218'];
  // The material3 dark badge as it shipped: three dark chips with light ink,
  // and two tones still resolved in the light scheme. Every pair clears 4.5:1.
  const leaked = new Map([
    page,
    ['--ki-badge-neutral-bg', '#211f26'],
    ['--ki-badge-neutral-fg', '#e6e0e9'],
    ['--ki-badge-success-bg', '#0d260e'],
    ['--ki-badge-success-fg', '#9cda9b'],
    ['--ki-badge-info-bg', '#d0f1fb'],
    ['--ki-badge-info-fg', '#085268'],
    ['--ki-badge-warning-bg', '#fffeea'],
    ['--ki-badge-warning-fg', '#945b05'],
  ]);
  const coherent = new Map([
    ...leaked,
    ['--ki-badge-info-bg', '#032630'],
    ['--ki-badge-info-fg', '#71d5f4'],
    ['--ki-badge-warning-bg', '#321f01'],
    ['--ki-badge-warning-fg', '#fbcb84'],
  ]);
  // A translucent tint is whatever it is painted over: dark on a dark page.
  const tinted = new Map([
    page,
    ['--ki-alert-neutral-bg', '#1d1b20'],
    ['--ki-alert-neutral-fg', '#e6e0e9'],
    ['--ki-alert-info-bg', 'rgba(19, 185, 236, 0.24)'],
    ['--ki-alert-info-fg', 'var(--ki-ink)'],
    ['--ki-ink', '#71d5f4'],
  ]);

  assert.deepEqual(splitToneFamilies(leaked), [
    {
      stem: '--ki-badge-*-bg',
      lightFill: ['info', 'warning'],
      darkFill: ['neutral', 'success'],
    },
  ]);
  assert.deepEqual(splitToneFamilies(coherent), []);
  assert.deepEqual(splitToneFamilies(tinted), []);
});

test('each scheme reads its own branch of every light-dark() declaration', () => {
  const { light, dark } = collectSchemeDeclarations(`
    :where(:root) { color-scheme: light dark; }
    :root,
    :where([data-ki-theme]) {
      --ki-color-white: #ffffff;
      --ki-surface-s0: light-dark(var(--ki-color-white), var(--ki-color-dark));
      --ki-shadow: 0px 1px 2px 0px light-dark(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), 0px 2px 6px 2px light-dark(var(--ki-a), var(--ki-b));
    }
  `);

  assert.equal(light.get('--ki-color-white'), '#ffffff');
  assert.equal(dark.get('--ki-color-white'), '#ffffff');
  assert.equal(light.get('--ki-surface-s0'), 'var(--ki-color-white)');
  assert.equal(dark.get('--ki-surface-s0'), 'var(--ki-color-dark)');
  assert.equal(
    light.get('--ki-shadow'),
    '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px var(--ki-a)',
  );
  assert.equal(
    dark.get('--ki-shadow'),
    '0px 1px 2px 0px rgba(0, 0, 0, 0.5), 0px 2px 6px 2px var(--ki-b)',
  );
  assert.equal(light.has('color-scheme'), false);
});

test('a theme stylesheet overrides the default one it is loaded after', () => {
  const { light, dark } = collectSchemeDeclarations(`
    :root, :where([data-ki-theme]) {
      --ki-brand: #845abe;
      --ki-surface-s0: light-dark(#ffffff, #0a0a0a);
    }
    :root[data-ki-theme='material3'], [data-ki-theme='material3'] {
      --ki-brand: light-dark(#6750a4, #d0bcff);
    }
  `);

  assert.equal(light.get('--ki-brand'), '#6750a4');
  assert.equal(dark.get('--ki-brand'), '#d0bcff');
  assert.equal(dark.get('--ki-surface-s0'), '#0a0a0a');
});

// Modes (specs 043/044): the standard appearance never sees a mode's values;
// each mode context sees every rule its declaration activates, in order.
const MODE_CSS = `
  :root, :where([data-ki-theme]) { --ki-a: #000000; --ki-b: #111111; }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    :root, :where([data-ki-theme]) { --ki-a: #222222; }
  }
  :root:where([data-ki-transparency='reduce'], [data-ki-contrast='more']) { --ki-a: #222222; }
  @media (prefers-contrast: more) { :root, :where([data-ki-theme]) { --ki-b: #333333; } }
  :root:where([data-ki-contrast='more']) { --ki-b: #333333; }
`;

test('the standard context reads no mode rule, not even inside a media query', () => {
  const { light } = collectSchemeDeclarations(MODE_CSS);
  assert.equal(light.get('--ki-a'), '#000000');
  assert.equal(light.get('--ki-b'), '#111111');
});

test('a mode context reads the rules its declaration activates, and only those', () => {
  const transparency = collectSchemeDeclarations(MODE_CSS, "[data-ki-transparency='reduce']").light;
  assert.equal(transparency.get('--ki-a'), '#222222');
  assert.equal(transparency.get('--ki-b'), '#111111');

  // More contrast activates reduced transparency too.
  const contrast = collectSchemeDeclarations(MODE_CSS, "[data-ki-contrast='more']").light;
  assert.equal(contrast.get('--ki-a'), '#222222');
  assert.equal(contrast.get('--ki-b'), '#333333');
});

test('every theme is swept in the standard appearance and in each mode', () => {
  assert.deepEqual(
    CONTEXTS.map(({ name, activation }) => [name, activation]),
    [
      ['standard', null],
      ['reduced-transparency', "[data-ki-transparency='reduce']"],
      ['contrast-more', "[data-ki-contrast='more']"],
    ],
  );
});

test('chroma separates neutral inks and surfaces from brand and tone colours', () => {
  assert.equal(chroma(parseColor('#474747')), 0);
  assert.ok(chroma(parseColor('#49454f')) <= 0.075, 'material3 neutral variant');
  assert.ok(chroma(parseColor('#845abe')) > 0.075, 'onmars brand');
});

// Against the built stylesheets: a regression in a mode file must surface as
// a named failure of that mode, and only of that mode.
const built = (name) => readFileSync(new URL(`../dist/css/${name}`, import.meta.url), 'utf8');

// @spec:060-onmars-v2
test('S5 the built stylesheets pass every sweep in every context', () => {
  assert.deepEqual(evaluateCss('onmars', built('tokens.css')), []);
  assert.deepEqual(
    evaluateCss('material3', `${built('tokens.css')}\n${built('tokens.material3.css')}`),
    [],
  );
});

test('dark onmars requires the inverse neutral primary button in every mode', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root {
      --ki-button-primary-neutral-rest-bg: light-dark(var(--ki-surface-primary-med-em), var(--ki-surface-success-high-em));
      --ki-button-primary-neutral-rest-fg: light-dark(var(--ki-text-primary-on-primary), var(--ki-text-primary-on-success));
    }`,
  );
  for (const context of ['onmars', 'onmars+reduced-transparency', 'onmars+contrast-more']) {
    assert.ok(
      failures.some((failure) =>
        failure.startsWith(
          `${context}/dark --ki-button-primary-*-rest-bg: the onmars primary neutral`,
        ),
      ),
      failures.join('\n'),
    );
  }
});

test('switch glyph contrast sweeps visible checked and unchecked glyphs against each thumb state', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root {
      --ki-switch-glyph-checked: var(--ki-text-primary-on-primary-light);
      --ki-switch-checked-active-thumb: var(--ki-text-primary-on-primary-light);
    }
    :root:where([data-ki-transparency='reduce']) {
      --ki-switch-glyph-unchecked: rgba(255, 255, 255, 0.95);
    }`,
  ).filter((failure) => failure.includes('--ki-switch-glyph-'));

  assert.deepEqual(
    failures.filter((failure) => failure.includes('onmars/light')),
    ['onmars/light --ki-switch-glyph-checked on --ki-switch-checked-active-thumb: 1 (min 3)'],
  );
  assert.deepEqual(
    failures.filter((failure) => failure.includes('--ki-switch-glyph-unchecked')),
    ['rest', 'hover', 'active'].map(
      (state) =>
        `onmars+reduced-transparency/light --ki-switch-glyph-unchecked on --ki-switch-unchecked-${state}-thumb: 1 (min 3)`,
    ),
  );
});

test('toggle button fills must distinguish both states on every page surface', () => {
  const failures = evaluateCss(
    'material3',
    `${built('tokens.css')}\n${built('tokens.material3.css')}
    :root:where([data-ki-contrast='more']) {
      --ki-button-ghost-selected-bg: var(--ki-button-toggle-quiet-bg);
      --ki-button-ghost-selected-fg: var(--ki-button-toggle-quiet-fg);
      --ki-icon-button-outline-selected-bg: var(--ki-icon-button-outline-rest-bg);
      --ki-icon-button-outline-selected-fg: var(--ki-icon-button-outline-rest-fg);
    }`,
  );

  assert.equal(failures.length, 12);
  assert.ok(failures.every((failure) => failure.startsWith('material3+contrast-more/')));
  assert.ok(
    failures.includes(
      'material3+contrast-more/light --ki-button-ghost-selected-bg against --ki-button-toggle-quiet-bg over --ki-surface-s0: 1 (min 3)',
    ),
  );
  assert.ok(
    failures.includes(
      'material3+contrast-more/dark --ki-icon-button-outline-selected-bg against --ki-icon-button-outline-rest-bg over --ki-surface-s2: 1 (min 3)',
    ),
  );
});

test('more contrast holds neutral text to 7:1 and neutral boundaries to 4.5:1', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root:where([data-ki-contrast='more']) {
      --ki-text-supporting: #6e6e6e;
      --ki-outline-control: rgba(0, 0, 0, 0.48);
    }`,
  );
  assert.ok(
    failures.some((failure) =>
      /contrast-more\/light --ki-input-rest-placeholder-fg .*min 7/u.test(failure),
    ),
  );
  assert.ok(
    failures.some((failure) => /contrast-more\/light .*min 7 for neutral text/u.test(failure)),
  );
  assert.ok(
    failures.some((failure) =>
      /contrast-more\/light --ki-input-rest on .*min 4.5 for a neutral boundary/u.test(failure),
    ),
  );
  assert.ok(
    failures.every((failure) => failure.startsWith('onmars+contrast-more/')),
    failures.join('\n'),
  );
});

test('more contrast keeps a brand or tone boundary at the standard 3:1', () => {
  // The danger edge of an invalid field measures 3.51:1 on the page: above the
  // standard floor, below the neutral 4.5:1, and not a failure.
  assert.deepEqual(evaluateCss('onmars', built('tokens.css')), []);
  const { light } = collectSchemeDeclarations(built('tokens.css'), "[data-ki-contrast='more']");
  const resolve = (name) => {
    const value = light.get(name);
    const reference = /^var\((--[a-z0-9-]+)\)$/u.exec(value);
    return reference === null ? value : resolve(reference[1]);
  };
  const edge = compositeOver(
    parseColor(resolve('--ki-input-invalid-border')),
    parseColor('#ffffff'),
  );
  assert.ok(chroma(edge) > 0.075);
});

test('reduced transparency holds every content surface opaque and leaves state washes translucent', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root:where([data-ki-transparency='reduce'], [data-ki-contrast='more']) {
      --ki-badge-neutral-bg: rgba(242, 242, 244, 0.8);
      --ki-button-secondary-neutral-hover-bg: rgba(242, 242, 244, 0.8);
    }`,
  );
  assert.ok(
    failures.some((failure) =>
      /onmars\+reduced-transparency\/light --ki-badge-neutral-bg: alpha 0.8/u.test(failure),
    ),
    failures.join('\n'),
  );
  // Glass is glass in every state; a light tint while hovered is a wash.
  assert.ok(
    failures.some((failure) => /--ki-button-secondary-neutral-hover-bg: alpha 0.8/u.test(failure)),
  );
  assert.ok(
    !failures.some((failure) =>
      /--ki-(?:button-ghost-neutral|option)-hover-bg: alpha/u.test(failure),
    ),
  );
});

test('a mode leaves every disabled cell exactly as the standard appearance paints it', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root:where([data-ki-contrast='more']) { --ki-text-muted: #000000; }`,
  );
  assert.ok(
    failures.some((failure) =>
      /contrast-more\/light --ki-button-primary-neutral-disabled-fg: #000000 \(a mode must leave disabled cells/u.test(
        failure,
      ),
    ),
    failures.join('\n'),
  );
});

test("more contrast thickens every component's focus ring, whichever theme overrides it", () => {
  const failures = evaluateCss(
    'material3',
    `${built('tokens.css')}\n${built('tokens.material3.css')}\n:root[data-ki-theme='material3'] { --ki-input-focus-ring-width: var(--ki-space-xxs); }`,
  );
  assert.ok(
    failures.some((failure) =>
      /material3\+contrast-more\/light --ki-input-focus-ring-width: 2px \(min 3px\)/u.test(failure),
    ),
    failures.join('\n'),
  );
});

test('transparent link ink is checked on raised page surfaces', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root { --ki-link-bg: transparent; --ki-link-fg: #707070; }`,
  );
  assert.ok(failures.some((failure) => failure.includes('--ki-link-bg over --ki-surface-s2')));
});

test('component icon ink is checked against its adjacent component background at 3:1', () => {
  const failures = evaluateCss(
    'onmars',
    `${built('tokens.css')}\n:root {
      --ki-note-warning-bg: #ffffff;
      --ki-note-warning-fg: #111111;
      --ki-note-warning-icon: #dddddd;
      --ki-note-info-bg: #ffffff;
      --ki-note-info-fg: #111111;
      --ki-note-info-icon: #888888;
    }`,
  ).filter((failure) => failure.includes('--ki-note-') && failure.includes('-icon on'));

  assert.equal(failures.length, 6);
  assert.ok(failures.every((failure) => /--ki-note-warning-icon on .* \(min 3\)/u.test(failure)));
});
