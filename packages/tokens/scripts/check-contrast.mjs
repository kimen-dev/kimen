import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIN_RATIO = 4.5;
// WCAG 1.4.11: a non-text UI graphic needs only 3:1, not the 4.5:1 text bar.
const NON_TEXT_MIN_RATIO = 3;
// Components whose `-fg`/`-bg` cells paint a non-text control indicator (a
// radio's ring and selected dot), NOT label text — the label uses semantic
// --ki-text-* tokens, checked separately via CONTRAST_PAIRS. Holding these to
// 4.5:1 is wrong; the original per-component checker set radio's dot cells to
// 3:1 for exactly this reason (Codex review of 007).
//
// checkbox joins for the same reason, and it was always misclassified: its
// `-fg` is consumed by exactly one rule — `[part="control"] { color }` — which
// the `.mark` SVG inherits (`fill: none`, stroked path). It is a graphical
// object under WCAG 1.4.11, never text under 1.4.3. It passed at 4.5:1 only
// because the fill happened to be dark enough, and that accident is what hid
// the checked fill sitting at 2.35:1 against a dark page.
const NON_TEXT_COMPONENTS = new Set(['checkbox', 'radio']);
// A theme is the default stylesheet plus, for an opt-in theme, the stylesheet of
// its overrides loaded after it — exactly what a consumer page loads.
const DEFAULT_STYLESHEET = new URL('../dist/css/tokens.css', import.meta.url);
const THEMES = [
  { name: 'onmars', stylesheets: [DEFAULT_STYLESHEET] },
  {
    name: 'material3',
    stylesheets: [DEFAULT_STYLESHEET, new URL('../dist/css/tokens.material3.css', import.meta.url)],
  },
];
const CONTRAST_PAIRS = [
  { text: '--ki-text-high-em', surface: '--ki-surface-s0' },
  { text: '--ki-text-med-em', surface: '--ki-surface-s0' },
  { text: '--ki-text-high-em', surface: '--ki-surface-s1' },
  // Help and error lines under a form control (spec 042 FR-011) sit on the
  // raised surface too, not only on the page; the tone-ink sweep below reads
  // the danger ink against s0 alone.
  { text: '--ki-text-med-em', surface: '--ki-surface-s1' },
  { text: '--ki-text-danger-high-em', surface: '--ki-surface-s1' },
  // The deprecated `--ki-text-danger` reads as "the error colour": whoever
  // still uses it sets text in it, so it must read as text.
  { text: '--ki-text-danger', surface: '--ki-surface-s0' },
  { text: '--ki-text-danger', surface: '--ki-surface-s1' },
  { text: '--ki-text-primary-on-primary', surface: '--ki-surface-primary-med-em' },
];

export function parseColor(value) {
  const color = value.trim().toLowerCase();
  if (color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/u);

  if (hex) {
    const raw = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1];
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = color.match(/^rgba?\(([^)]+)\)$/u);

  if (rgb) {
    const parts = rgb[1].split(',').map((part) => part.trim());
    return {
      r: Number(parts[0]),
      g: Number(parts[1]),
      b: Number(parts[2]),
      a: parts[3] === undefined ? 1 : Number(parts[3]),
    };
  }

  throw new Error(`Unsupported color value: ${value}`);
}

export function compositeOver(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);

  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: Math.round(
      (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    ),
    g: Math.round(
      (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    ),
    b: Math.round(
      (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    ),
    a: Number(alpha.toFixed(4)),
  };
}

export function relativeLuminance(color) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const opaqueForeground = foreground.a < 1 ? compositeOver(foreground, background) : foreground;
  const lighter = Math.max(relativeLuminance(opaqueForeground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(opaqueForeground), relativeLuminance(background));

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function resolveContrastPairs() {
  return CONTRAST_PAIRS;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//gu, '');
}

function mergeDeclarations(target, declarations) {
  for (const [name, value] of declarations) {
    target.set(name, value);
  }
}

function declarationsFromBlock(block) {
  const declarations = new Map();
  const declarationPattern = /(--ki-[\w-]+)\s*:\s*([^;]+);/gu;

  for (const match of block.matchAll(declarationPattern)) {
    declarations.set(match[1], match[2].trim());
  }

  return declarations;
}

// Replace every `light-dark(a, b)` in a value with the branch of one scheme
// (0 = light, 1 = dark). Parenthesis-aware: the branches are themselves
// `var()` and `rgba()` calls, and a composite value can carry several.
function selectScheme(value, branch) {
  const opener = 'light-dark(';
  const start = value.indexOf(opener);

  if (start === -1) {
    return value;
  }

  let depth = 1;
  let comma = -1;
  let end = start + opener.length;

  for (; end < value.length; end += 1) {
    if (value[end] === '(') {
      depth += 1;
    } else if (value[end] === ')') {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    } else if (value[end] === ',' && depth === 1 && comma === -1) {
      comma = end;
    }
  }

  if (depth !== 0 || comma === -1) {
    throw new Error(`Malformed light-dark() in: ${value}`);
  }

  const selected =
    branch === 0 ? value.slice(start + opener.length, comma) : value.slice(comma + 1, end);

  return (
    value.slice(0, start) +
    selectScheme(selected.trim(), branch) +
    selectScheme(value.slice(end + 1), branch)
  );
}

// Every token is declared once and a scheme-dependent one carries both values
// in `light-dark()`. Rules merge in source order, so a theme stylesheet
// concatenated after the default one overrides it, as it does in the cascade.
//
// Only TOP-LEVEL rules are read, and a mode rule (specs 043/044) only for the
// context it belongs to: the standard appearance never sees a mode's values,
// and a mode context (`activation`, the declaration that switches it on) sees
// every rule that declaration activates, in cascade order. The `@media` copy
// of each mode carries the same declarations as its declaration rule — the
// public token-surface gate holds the two equal — so it is skipped here.
// Density rules (spec 045) reassign only document-inherited sizes, never a
// colour: no context reads them.
const MODE_DECLARATION = /data-ki-(?:contrast|transparency|density)/u;

function topLevelRules(css) {
  const rules = [];
  let depth = 0;
  let start = 0;
  let opening = -1;
  for (let index = 0; index < css.length; index += 1) {
    if (css[index] === '{') {
      if (depth === 0) opening = index;
      depth += 1;
    } else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push({
          prelude: css.slice(start, opening).trim(),
          body: css.slice(opening + 1, index),
        });
        start = index + 1;
      }
    }
  }
  return rules;
}

export function collectSchemeDeclarations(css, activation = null) {
  const declarations = new Map();

  for (const { prelude, body } of topLevelRules(stripComments(css))) {
    if (prelude.startsWith('@')) continue;
    if (MODE_DECLARATION.test(prelude) && (activation === null || !prelude.includes(activation))) {
      continue;
    }
    mergeDeclarations(declarations, declarationsFromBlock(body));
  }

  const forScheme = (branch) =>
    new Map([...declarations].map(([name, value]) => [name, selectScheme(value, branch)]));

  return {
    light: forScheme(0),
    dark: forScheme(1),
  };
}

function resolveCustomProperty(name, declarations, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Circular token reference: ${[...seen, name].join(' -> ')}`);
  }

  const raw = declarations.get(name);

  if (!raw) {
    throw new Error(`Missing token ${name}`);
  }

  const reference = raw.match(/^var\((--ki-[\w-]+)\)$/u);

  if (!reference) {
    return raw;
  }

  return resolveCustomProperty(reference[1], declarations, new Set([...seen, name]));
}

// Component-layer sweep: every interactive fg/bg cell of a component matrix
// must clear AA in every theme x scheme. Disabled cells are exempt
// (WCAG 1.4.3). Added after the 002-ki-button clean-context review found
// dark-scheme failures the 4 hardcoded pairs could not see (incident-to-gate
// rule).
//
// GENERIC by construction (was per-component and silently ignored every new
// matrix — Codex review of 003/016): any `--ki-<component>-…-bg` whose name is
// NOT a semantic/primitive layer, paired with its `-fg` sibling when one
// exists. New components are swept automatically, with no regex to extend.
// Disabled cells are excluded (exempt), as are `-bg` tokens with no `-fg`
// counterpart (non-text affordances measured elsewhere, not a text pair).
const SEMANTIC_LAYERS = new Set([
  'color',
  'surface',
  'text',
  'outline',
  'elevation',
  'shadow',
  'space',
  'typography',
  'radius',
  'motion',
  'duration',
  'ease',
  'opacity',
  'size',
  'border',
  'z',
]);
// The state/variant segment is OPTIONAL so a bare `--ki-<component>-bg` (e.g.
// ki-card's single surface pair) is swept too — a required middle segment
// silently dropped every component that names its base pair without a state
// (Codex review of 009).
const COMPONENT_BG_PATTERN = /^--ki-([a-z][a-z0-9]*)(?:-[\w-]+)?-bg$/u;
// The canary: button is the foundational component and is always present, so a
// zero-button sweep means the naming convention drifted (the old zero-length
// guard is defeated once any other component contributes a pair).
const CANARY_COMPONENT = 'button';

export function componentPairs(declarations) {
  const pairs = [];

  for (const name of declarations.keys()) {
    const match = name.match(COMPONENT_BG_PATTERN);
    if (!match || SEMANTIC_LAYERS.has(match[1]) || /-disabled-/u.test(name)) {
      continue;
    }
    const fg = name.replace(/-bg$/u, '-fg');
    if (declarations.has(fg)) {
      pairs.push({
        component: match[1],
        text: fg,
        surface: name,
        minRatio: NON_TEXT_COMPONENTS.has(match[1]) ? NON_TEXT_MIN_RATIO : MIN_RATIO,
      });
    }
  }

  return pairs;
}

// WCAG 1.4.3 — the placeholder sweep.
//
// A placeholder is text. It is not the accessible name, and that is the one
// thing it is excused from: the example it shows ("name@example.com") still
// has to be readable by the person it was written for. It sat outside every
// sweep because its token is neither a `-bg` nor the `-fg` sibling of one, and
// shipped at 2.66-3.13:1 on the onmars light fills for exactly that reason.
//
// DERIVED, like every sweep here. A placeholder stands in for the value text,
// so it is read against the fills that text is painted on: the cells of
// componentPairs() under the placeholder's own stem. A state-scoped token
// (`--ki-input-rest-placeholder-fg`) resolves to its one cell; a component-wide
// one (`--ki-select-placeholder-fg`) to every state of the trigger. Disabled
// cells stay exempt, exactly as they are for the value text.
const PLACEHOLDER_ROLE = '-placeholder-fg';

export function placeholderCells(declarations) {
  const textFills = componentPairs(declarations).map((pair) => pair.surface);

  return [...declarations.keys()]
    .filter((name) => name.endsWith(PLACEHOLDER_ROLE) && !/-disabled-/u.test(name))
    .map((name) => {
      const stem = name.slice(0, name.length - PLACEHOLDER_ROLE.length);
      return { placeholder: name, fills: textFills.filter((fill) => fill.startsWith(`${stem}-`)) };
    });
}

function sweepPlaceholders(theme, scheme, declarations, minRatio = MIN_RATIO) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const cells = placeholderCells(declarations);

  // The canary: ki-input is always present and always has a placeholder, so a
  // zero-length derivation means the naming convention drifted.
  if (cells.length === 0) {
    failures.push(
      `${theme}/${scheme}: no placeholder cells derived — the token naming convention drifted`,
    );
  }

  for (const cell of cells) {
    if (cell.fills.length === 0) {
      failures.push(
        `${theme}/${scheme} ${cell.placeholder}: a placeholder with no field fill to be read against`,
      );
      continue;
    }

    const text = parseColor(resolveCustomProperty(cell.placeholder, declarations));

    for (const fillName of cell.fills) {
      const rawFill = parseColor(resolveCustomProperty(fillName, declarations));
      const fill = rawFill.a < 1 ? compositeOver(rawFill, page) : rawFill;
      const ratio = contrastRatio(text, fill);

      if (ratio < minRatio) {
        failures.push(
          `${theme}/${scheme} ${cell.placeholder} on ${fillName}: ${ratio} (min ${minRatio})`,
        );
      }
    }
  }

  return failures;
}

// WCAG 1.4.11 — the control-boundary sweep.
//
// A control that can be EMPTY carries no label inside its own box, so the box
// IS the only thing that identifies the component: an unfilled text field with
// no visible edge is not perceivable as a text field. For those components the
// strongest of {fill, boundary} must clear 3:1 against every page surface the
// control can sit on.
//
// Components whose identity is carried by their own label — button, badge,
// tab, alert, tooltip — are deliberately out of scope. A ghost button is
// *supposed* to be invisible until hover; its `-fg`/`-bg` pair is already
// swept at 4.5:1 by componentPairs() above.
const EMPTY_BOX_COMPONENTS = new Set([
  'checkbox',
  'input',
  'radio',
  'select',
  'switch',
  'textarea',
]);
// ki-progress is deliberately NOT here, and not because it has a label — it
// renders none (`label` becomes aria-label only), so at value=0 the only
// painted thing really is its rail. It is excluded because "the rail must
// clear 3:1 against the page" is provably self-defeating: on a white page the
// rail would need luminance <= 0.30, while keeping the brand indicator
// readable against that rail needs >= 0.578 or <= 0.0198. The only rail
// satisfying both is near-black. A progress bar is identified by the ratio
// between indicator and track — that is where the information is — so that is
// what PROGRESS_CONTRAST_PAIRS asserts instead.
// The component segment is matched on the FIRST word, so a component whose
// name extends an empty-box name would be pooled into it and measured against
// a rule written for the control itself — the same defect that silently files
// every --ki-icon-button-* pair under `icon` in the text sweep above. ki-radio-
// group is the only such name in the current inventory, and it publishes no
// colour cells today, so the trap is latent rather than live. It is guarded
// here rather than resolved from the component inventory because that module
// lives in scripts/lib, is async and pulls in typescript; this script is a
// synchronous, self-contained part of @kimen/tokens. Resolving it properly is
// the same change as replacing the `button` canary with an inventory-equality
// assertion, and belongs with it.
const SHADOWED_BY_EMPTY_BOX = new Set(['radio-group']);
// Literal transcription of the Figma frames assumed a single #ffffff canvas,
// which is how --ki-input-rest-border shipped at 1.19:1 against a fill
// identical to the page. A control must survive the surfaces it is actually
// dropped onto, not the one it was drawn on.
const CONTROL_PAGE_SURFACES = ['--ki-surface-s0', '--ki-surface-s1', '--ki-surface-s2'];
// A cell qualifies only if it declares an edge of its own — a `-border` or a
// `-track`. A `-bg` alone is a floating surface (ki-select's listbox), which is
// identified by elevation, not by a boundary, and is measured elsewhere.
const BOUNDARY_ROLE = /-(?:border|track)(?:-color)?$/u;
// A cell counts only the members painted WHENEVER that cell is active. A
// switch's `-thumb` qualifies; an `-indicator`, `-bar` or `-dot` does not,
// because its extent is data- or selection-dependent and can be zero. Counting
// those let a control certify itself with something nobody can see: with
// ki-progress at its default value=0 the indicator has zero width, yet it
// measured 4.49-5.02:1 and carried the cell while the rail a user actually
// sees sat at 1.05-1.18:1 (Codex review of #64).
const CELL_ROLE = /-(?:bg|border|track|thumb)(?:-color)?$/u;

export function controlBoundaryCells(declarations) {
  const cells = new Map();

  for (const name of declarations.keys()) {
    const component = name.match(/^--ki-([a-z][a-z0-9]*)-/u);
    if (component === null || !EMPTY_BOX_COMPONENTS.has(component[1])) {
      continue;
    }
    if ([...SHADOWED_BY_EMPTY_BOX].some((longer) => name.startsWith(`--ki-${longer}-`))) {
      continue;
    }
    // Disabled cells are exempt (WCAG 1.4.3 and 1.4.11 both exclude inactive
    // controls), exactly as the text sweep exempts them.
    if (/-disabled/u.test(name)) {
      continue;
    }
    const role = name.match(CELL_ROLE);
    if (role === null) {
      continue;
    }
    const stem = name.slice(0, name.length - role[0].length);
    const cell = cells.get(stem) ?? { stem, members: [], hasEdge: false };
    cell.members.push(name);
    cell.hasEdge ||= BOUNDARY_ROLE.test(name);
    cells.set(stem, cell);
  }

  return [...cells.values()].filter((cell) => cell.hasEdge);
}

// The assertion a bar-shaped readout actually needs: its filled part must be
// readable against its unfilled part, because the boundary between them IS the
// value. Held to 1.4.11's 3:1, like any other non-text state indicator.
//
// DERIVED, not listed. A hardcoded per-component table is precisely what this
// file was rescued from twice (see componentPairs above: "was per-component and
// silently ignored every new matrix"). Any component publishing BOTH an
// indicator and a track is a bar-shaped readout and is swept automatically.
// Today that derives to --ki-progress alone, so the measured set is unchanged —
// but a renamed token becomes a named canary failure instead of an obscure
// `Missing token` throw, and the next slider or meter arrives already covered.
const READOUT_ROLE = /-(indicator|track)(?:-color)?$/u;

export function ratioReadoutPairs(declarations) {
  const stems = new Map();

  for (const name of declarations.keys()) {
    const role = name.match(READOUT_ROLE);
    const component = name.match(/^--ki-([a-z][a-z0-9]*)-/u);
    if (role === null || component === null || SEMANTIC_LAYERS.has(component[1])) {
      continue;
    }
    const stem = name.slice(0, name.length - role[0].length);
    const entry = stems.get(stem) ?? { stem };
    entry[role[1]] = name;
    stems.set(stem, entry);
  }

  return [...stems.values()].filter(
    (entry) => entry.indicator !== undefined && entry.track !== undefined,
  );
}

function sweepRatioReadouts(theme, scheme, declarations) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const pairs = ratioReadoutPairs(declarations);

  // The canary: ki-progress is the only bar-shaped readout in the inventory and
  // is always present, so a zero-length derivation means the naming convention
  // drifted, not that the library stopped having one.
  if (pairs.length === 0) {
    failures.push(
      `${theme}/${scheme}: no indicator/track readout pairs derived — the token naming convention drifted`,
    );
  }

  for (const pair of pairs) {
    const rawTrack = parseColor(resolveCustomProperty(pair.track, declarations));
    const rawIndicator = parseColor(resolveCustomProperty(pair.indicator, declarations));
    const track = rawTrack.a < 1 ? compositeOver(rawTrack, page) : rawTrack;
    const indicator = rawIndicator.a < 1 ? compositeOver(rawIndicator, track) : rawIndicator;
    const ratio = contrastRatio(indicator, track);

    if (ratio < NON_TEXT_MIN_RATIO) {
      failures.push(
        `${theme}/${scheme} ${pair.indicator} on ${pair.track}: ${ratio} (min ${NON_TEXT_MIN_RATIO})`,
      );
    }
  }

  return failures;
}

// WCAG 1.4.11 — the page-graphic sweep.
//
// Some components ARE a single non-text mark painted straight onto the page:
// a status dot, a pager dot, a scroll thumb. Nothing is written inside them and
// nothing is drawn around them, so neither the text sweep nor the
// control-boundary sweep ever looked at them, and literal transcriptions
// shipped at 1.1-2.3:1 — the scroll thumb at black 5%, the pager dots at black
// 18%, the info and warning dots at their 500 step on white. Each mark must
// clear 3:1 against the page it is painted on.
//
// The component set is listed — it states what a component IS, exactly like
// EMPTY_BOX_COMPONENTS — but the marks inside it are derived: every colour the
// component publishes, minus the roles that are ground rather than mark. A
// tone added to ki-status tomorrow is swept the day it appears.
const PAGE_GRAPHIC_COMPONENTS = new Set(['indicator', 'scroller', 'status']);
// A ring is either the status cutout, which takes the page's own colour on
// purpose, or a focus ring; a track is the ground a thumb moves over. None of
// them is the mark.
const GROUND_ROLE = /-(?:ring|track)-color$/u;
const MARK_ROLE = '-color';

export function pageGraphicMarks(declarations) {
  return [...declarations.keys()].filter((name) => {
    const component = name.match(/^--ki-([a-z][a-z0-9]*)-/u);
    return (
      component !== null &&
      PAGE_GRAPHIC_COMPONENTS.has(component[1]) &&
      name.endsWith(MARK_ROLE) &&
      !GROUND_ROLE.test(name)
    );
  });
}

// A mark with a "current" state — the pager dot of the slide on screen — must
// stay distinguishable from its resting siblings. Where a theme changes its
// shape (the onmars elongated pill) the shape carries the state. Where a theme
// draws it in the resting mark's own box (material3's uniform circles) colour
// is all that is left, and two colours tell a state apart only when they are
// 3:1 from each other (WCAG 1.4.1; spec 024 FR-012 names this gate for it).
const CURRENT_ROLE = '-current-color';
const BOX_AXES = ['inline-size', 'block-size'];

export function currentMarkPairs(declarations) {
  return pageGraphicMarks(declarations)
    .filter((name) => name.endsWith(CURRENT_ROLE))
    .map((current) => {
      const stem = current.slice(0, current.length - CURRENT_ROLE.length);
      return {
        current,
        resting: `${stem}${MARK_ROLE}`,
        colourAlone: BOX_AXES.every(
          (axis) =>
            resolveCustomProperty(`${stem}-current-${axis}`, declarations) ===
            resolveCustomProperty(`${stem}-${axis}`, declarations),
        ),
      };
    });
}

function sweepPageGraphics(theme, scheme, declarations) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const painted = (name) => {
    const raw = parseColor(resolveCustomProperty(name, declarations));
    return raw.a < 1 ? compositeOver(raw, page) : raw;
  };
  const marks = pageGraphicMarks(declarations);

  // The canary: ki-status is always present, so a zero-length derivation means
  // the naming convention drifted, not that the library stopped having marks.
  if (marks.length === 0) {
    failures.push(
      `${theme}/${scheme}: no page-graphic marks derived — the token naming convention drifted`,
    );
  }

  for (const mark of marks) {
    const ratio = contrastRatio(painted(mark), page);

    if (ratio < NON_TEXT_MIN_RATIO) {
      failures.push(
        `${theme}/${scheme} ${mark} on --ki-surface-s0: ${ratio} (min ${NON_TEXT_MIN_RATIO})`,
      );
    }
  }

  for (const pair of currentMarkPairs(declarations)) {
    if (!pair.colourAlone) {
      continue;
    }
    const ratio = contrastRatio(painted(pair.current), painted(pair.resting));

    if (ratio < NON_TEXT_MIN_RATIO) {
      failures.push(
        `${theme}/${scheme} ${pair.current} against ${pair.resting}: ${ratio} (min ${NON_TEXT_MIN_RATIO}; colour is all that marks the current one)`,
      );
    }
  }

  return failures;
}

// WCAG 1.4.3 — the tone-ink sweep.
//
// `--ki-text-<tone>-high-em` is text: the ink a tone is written in on the page
// (the message under an invalid field) and the ink a component borrows for a
// tone mark (the ki-status warning dot). The fixed table above only ever listed
// the neutral ink, so nothing read the others against the page. A theme whose
// dark mode never chose its info and warning inks kept the light scheme's dark
// ones — 2.14:1 and 3.33:1 on the material3 dark page — and the gate was green.
//
// DERIVED from the names, like every sweep here: every high-emphasis ink the
// semantic layer publishes. A tone added tomorrow is swept the day it appears.
const TONE_INK = /^--ki-text-[a-z]+-high-em$/u;

export function toneInks(declarations) {
  return [...declarations.keys()].filter((name) => TONE_INK.test(name));
}

function sweepToneInks(theme, scheme, declarations) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const inks = toneInks(declarations);

  // The canary: the danger ink is always present, so a zero-length derivation
  // means the naming convention drifted.
  if (inks.length === 0) {
    failures.push(`${theme}/${scheme}: no tone inks derived — the token naming convention drifted`);
  }

  for (const ink of inks) {
    const ratio = contrastRatio(parseColor(resolveCustomProperty(ink, declarations)), page);

    if (ratio < MIN_RATIO) {
      failures.push(`${theme}/${scheme} ${ink} on --ki-surface-s0: ${ratio} (min ${MIN_RATIO})`);
    }
  }

  return failures;
}

// The tone family.
//
// A component that comes in tones — a badge, an alert, a button — is ONE
// surface in several colours. Within a scheme its tones normally share a
// polarity: light ink on a dark fill, or dark ink on a light one. The
// material3 dark badge kept light info and warning chips (15.6:1 and 18.3:1
// against the page) beside dark neutral, success and danger ones; each pair
// cleared 4.5:1 on its own, so the text sweep had nothing to say.
//
// DERIVED from the text cells of componentPairs(): cells whose names differ
// only in the tone segment are siblings. The tone vocabulary is the one thing
// listed — it states what a tone IS, the `tone` prop's own values.
const TONE_SEGMENTS = new Set(['neutral', 'success', 'danger', 'info', 'warning']);
const ONMARS_DARK_PRIMARY_SPLITS = ['rest', 'hover', 'active'].map(
  (state) => `--ki-button-primary-*-${state}-bg`,
);

export function toneFamilies(declarations) {
  const families = new Map();

  for (const pair of componentPairs(declarations)) {
    const segments = pair.surface.split('-');
    const index = segments.findIndex((segment) => TONE_SEGMENTS.has(segment));
    if (index === -1) {
      continue;
    }
    const stem = segments.with(index, '*').join('-');
    const family = families.get(stem) ?? { stem, cells: [] };
    family.cells.push({ tone: segments[index], text: pair.text, surface: pair.surface });
    families.set(stem, family);
  }

  return [...families.values()].filter((family) => family.cells.length > 1);
}

/** The tone families whose tones do not all paint the same polarity. */
export function splitToneFamilies(declarations) {
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));

  return toneFamilies(declarations)
    .map((family) => {
      const lightFill = [];
      const darkFill = [];
      for (const cell of family.cells) {
        // A translucent fill is whatever it is painted over, and translucent
        // ink whatever it is written on: composite both before comparing.
        const rawFill = parseColor(resolveCustomProperty(cell.surface, declarations));
        const fill = rawFill.a < 1 ? compositeOver(rawFill, page) : rawFill;
        const rawInk = parseColor(resolveCustomProperty(cell.text, declarations));
        const ink = rawInk.a < 1 ? compositeOver(rawInk, fill) : rawInk;
        (relativeLuminance(fill) > relativeLuminance(ink) ? lightFill : darkFill).push(cell.tone);
      }
      return { stem: family.stem, lightFill, darkFill };
    })
    .filter((family) => family.lightFill.length > 0 && family.darkFill.length > 0);
}

function sweepToneFamilies(theme, scheme, declarations) {
  const failures = [];
  // Calma intentionally uses an inverse neutral primary and keeps both
  // chromatic tones dark. Require that exact pairing in every dark mode.
  const requiredSplits = new Set(
    theme.split('+', 1)[0] === 'onmars' && scheme === 'dark' ? ONMARS_DARK_PRIMARY_SPLITS : [],
  );

  // The canary: ki-badge always comes in tones, so a zero-length derivation
  // means the naming convention drifted.
  if (toneFamilies(declarations).length === 0) {
    failures.push(
      `${theme}/${scheme}: no tone families derived — the token naming convention drifted`,
    );
  }

  for (const family of splitToneFamilies(declarations)) {
    if (
      requiredSplits.has(family.stem) &&
      family.lightFill.length === 1 &&
      family.lightFill.includes('neutral') &&
      family.darkFill.length === 2 &&
      family.darkFill.includes('success') &&
      family.darkFill.includes('danger')
    ) {
      requiredSplits.delete(family.stem);
      continue;
    }
    failures.push(
      `${theme}/${scheme} ${family.stem}: ${family.lightFill.join(', ')} paint dark ink on a light fill where ${family.darkFill.join(', ')} paint light ink on a dark one — a tone resolved in the other colour scheme`,
    );
  }
  for (const stem of requiredSplits) {
    failures.push(
      `${theme}/${scheme} ${stem}: the onmars primary neutral must have a light fill while success and danger have dark fills`,
    );
  }

  return failures;
}

// The interaction ramp.
//
// Pressed has one job: to read as MORE engaged than hover. A pressed wash
// weaker than the hover wash — or washing the other way — is the "un-hover on
// press" that the onmars theme carried until the pressed rederivation, and it
// survived in the alternate theme because a theme that overrides hover and not
// active inherits the two halves from different places. Derived from the token
// names, so a variant that grows an overlay pair is swept the day it appears.
const OVERLAY_ROLE = /-(hover|active)-overlay$/u;

const REST_FILL_SUFFIX = '-rest-bg';
const TONE_SEGMENT = /^[a-z0-9]+$/u;

/**
 * Is `name` a rest fill under `stem` — the stem's own, or one tone segment
 * below it?
 *
 * Compared as strings rather than through a pattern built from `stem`. The
 * stem is cut from a name the sweep read out of the stylesheet, so it is not
 * a shape this file gets to choose: a regex metacharacter in it would stop
 * meaning itself and start matching any character, pooling a neighbouring
 * stem's fill into a ramp that never washed it.
 */
function isRestFillOf(stem, name) {
  if (name.length < stem.length + REST_FILL_SUFFIX.length) {
    return false;
  }
  if (!name.startsWith(stem) || !name.endsWith(REST_FILL_SUFFIX)) {
    return false;
  }
  const tone = name.slice(stem.length, name.length - REST_FILL_SUFFIX.length);
  return tone === '' || (tone.startsWith('-') && TONE_SEGMENT.test(tone.slice(1)));
}

export function overlayRamps(declarations) {
  const stems = new Map();

  for (const name of declarations.keys()) {
    const role = name.match(OVERLAY_ROLE);
    const component = name.match(/^--ki-([a-z][a-z0-9-]*?)-/u);
    if (role === null || component === null) {
      continue;
    }
    const stem = name.slice(0, name.length - role[0].length);
    const entry = stems.get(stem) ?? { stem };
    entry[role[1]] = name;
    stems.set(stem, entry);
  }

  return [...stems.values()]
    .filter((entry) => entry.hover !== undefined && entry.active !== undefined)
    .map((entry) => ({
      ...entry,
      // The overlay is tone-independent; the fill it washes is not. Every rest
      // fill under the same stem is a surface this pair has to work over.
      fills: [...declarations.keys()].filter((name) => isRestFillOf(entry.stem, name)),
    }));
}

function sweepOverlayRamps(theme, scheme, declarations) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const ramps = overlayRamps(declarations);

  if (ramps.length === 0) {
    failures.push(
      `${theme}/${scheme}: no hover/active overlay pairs derived — the token naming convention drifted`,
    );
  }

  for (const ramp of ramps) {
    const hover = parseColor(resolveCustomProperty(ramp.hover, declarations));
    const active = parseColor(resolveCustomProperty(ramp.active, declarations));

    if (ramp.fills.length === 0) {
      failures.push(`${theme}/${scheme} ${ramp.stem}: an overlay pair with no rest fill to wash`);
      continue;
    }

    for (const fillName of ramp.fills) {
      const rawFill = parseColor(resolveCustomProperty(fillName, declarations));
      const fill = rawFill.a < 1 ? compositeOver(rawFill, page) : rawFill;
      const rest = relativeLuminance(fill);
      const hovered = relativeLuminance(compositeOver(hover, fill)) - rest;
      const pressed = relativeLuminance(compositeOver(active, fill)) - rest;

      if (hovered !== 0 && Math.sign(pressed) !== Math.sign(hovered)) {
        failures.push(
          `${theme}/${scheme} ${ramp.active} over ${fillName}: washes ${pressed > 0 ? 'lighter' : 'darker'} where ${ramp.hover} washes ${hovered > 0 ? 'lighter' : 'darker'} — pressed reverses hover`,
        );
        continue;
      }
      if (Math.abs(pressed) <= Math.abs(hovered)) {
        failures.push(
          `${theme}/${scheme} ${ramp.active} over ${fillName}: moves the fill by ${Math.abs(pressed).toFixed(4)} where ${ramp.hover} moves it by ${Math.abs(hovered).toFixed(4)} — pressed is not a step beyond hover`,
        );
      }
    }
  }

  return failures;
}

function sweepControlBoundaries(theme, scheme, declarations, minRatio = NON_TEXT_MIN_RATIO) {
  const failures = [];

  for (const surfaceName of CONTROL_PAGE_SURFACES) {
    const page = parseColor(resolveCustomProperty(surfaceName, declarations));

    for (const cell of controlBoundaryCells(declarations)) {
      let best = 0;
      let via = null;

      for (const member of cell.members) {
        const raw = parseColor(resolveCustomProperty(member, declarations));
        const opaque = raw.a < 1 ? compositeOver(raw, page) : raw;
        const ratio = contrastRatio(opaque, page);
        if (ratio > best) {
          best = ratio;
          via = member;
        }
      }

      if (best < minRatio) {
        failures.push(
          `${theme}/${scheme} ${cell.stem} on ${surfaceName}: ${best} (min ${minRatio}, strongest edge ${via})`,
        );
      }
    }
  }

  return failures;
}

function sweepSwitchGlyphs(theme, scheme, declarations) {
  const failures = [];
  const resolveColor = (name) => parseColor(resolveCustomProperty(name, declarations));
  const pages = CONTROL_PAGE_SURFACES.map(resolveColor);

  // WCAG 1.4.11 exempts inactive controls. A transparent glyph paints no mark.
  for (const state of ['checked', 'unchecked']) {
    const glyphName = `--ki-switch-glyph-${state}`;
    const glyph = resolveColor(glyphName);
    if (glyph.a === 0) continue;

    for (const interaction of ['rest', 'hover', 'active']) {
      const stem = `--ki-switch-${state}-${interaction}`;
      const thumbName = `${stem}-thumb`;
      const thumb = resolveColor(thumbName);
      const track = resolveColor(`${stem}-track`);
      const ratio = Math.min(
        ...pages.map((page) =>
          contrastRatio(glyph, compositeOver(thumb, compositeOver(track, page))),
        ),
      );
      if (ratio < NON_TEXT_MIN_RATIO) {
        failures.push(
          `${theme}/${scheme} ${glyphName} on ${thumbName}: ${ratio} (min ${NON_TEXT_MIN_RATIO})`,
        );
      }
    }
  }
  return failures;
}

// The contexts every theme is swept in: the standard appearance, then each
// mode, identified by the declaration that switches it on (specs 043/044).
// Every sweep above runs in every context — a mode may strengthen the
// standard appearance, never weaken it — and each mode adds its own.
export const CONTEXTS = [
  { name: 'standard', activation: null },
  { name: 'reduced-transparency', activation: "[data-ki-transparency='reduce']" },
  { name: 'contrast-more', activation: "[data-ki-contrast='more']" },
];

const ENHANCED_TEXT_PAIRS = ['--ki-surface-s0', '--ki-surface-s1', '--ki-surface-s2'].flatMap(
  (surface) => [
    { text: '--ki-text-high-em', surface },
    { text: '--ki-text-supporting', surface },
  ],
);

// Spec 043 D1 — the more-contrast thresholds.
export const ENHANCED_TEXT_RATIO = 7;
export const ENHANCED_BOUNDARY_RATIO = 4.5;
export const SEPARATOR_RATIO = 3;
export const ENHANCED_FOCUS_RING_WIDTH_PX = 3;
// A colour is neutral when its channels stay this close together. Measured on
// the shipped themes: the neutral inks and surfaces of both reach at most 0.06
// (material3's neutrals carry a violet cast), the weakest tone tint over the
// page 0.09, the brand fills 0.3 and more.
const NEUTRAL_CHROMA = 0.075;
// Separators and container edges: the rule a divider paints and the edge a
// container draws. DERIVED from the token roles, never listed per component:
// a `-divider-color`, the divider's own `-color`, a container's
// `-border-color`, an alert tone's `-border`, the dialog's border shorthand.
// Controls are excluded: their boundaries are swept above at their own,
// stronger threshold. The edge must also be drawn: `-border-width` and
// `-divider-width` of the containers must be non-zero, except where a theme
// draws no divider at all (a list or a tab row without one has nothing to
// separate visually).
const SEPARATOR_ROLE =
  /^--ki-(?:divider-color|[a-z-]+-divider-color|(?:card|tooltip)-border-color|alert-[a-z]+-border|dialog-border)$/u;
const DRAWN_EDGE_WIDTHS = ['--ki-card-border-width', '--ki-alert-border-width'];

export function separatorTokens(declarations) {
  return [...declarations.keys()].filter((name) => SEPARATOR_ROLE.test(name));
}

const SEPARATOR_SURFACES = ['--ki-surface-s0', '--ki-surface-s1'];
// A state wash only exists while a pointer or a key acts on the control, and
// is translucent on purpose: a light tint over the page or the cell beneath it
// (spec 044 D1). Glass in a hover or active state is still glass: a state
// cell is a wash only while it stays a tint, never a panel.
const STATE_WASH = /-(?:hover|active|pressed|highlight|focus)-/u;
const WASH_MAX_ALPHA = 0.5;

export function chroma({ r, g, b }) {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

function isNeutral(color) {
  return chroma(color) <= NEUTRAL_CHROMA;
}

function lengthInPx(value) {
  const match = /^(-?[\d.]+)(px|rem)$/u.exec(value.trim());
  if (match === null) throw new Error(`Unsupported length ${value}`);
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}

// Spec 044 — every content cell is opaque, or paints nothing at all (a ghost
// cell at rest shows the page, which is not a translucent layer).
function sweepOpaqueSurfaces(theme, scheme, declarations) {
  const failures = [];
  for (const pair of componentPairs(declarations)) {
    const alpha = parseColor(resolveCustomProperty(pair.surface, declarations)).a;
    if (STATE_WASH.test(pair.surface) && alpha <= WASH_MAX_ALPHA) continue;
    if (alpha > 0 && alpha < 1) {
      failures.push(
        `${theme}/${scheme} ${pair.surface}: alpha ${alpha} (a content surface must be opaque)`,
      );
    }
  }
  return failures;
}

// Spec 043 — the enhanced thresholds on top of the standard sweeps.
function sweepEnhancedContrast(theme, scheme, declarations) {
  const failures = [];
  const page = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));
  const painted = (name, under = page) => {
    const raw = parseColor(resolveCustomProperty(name, declarations));
    return raw.a < 1 ? compositeOver(raw, under) : raw;
  };

  // The semantic pairs this mode strengthens: high-emphasis text and enabled
  // supporting text. The med-em emphasis step itself is not one of them: the
  // disabled ink draws from it and stays as it is.
  const textPairs = [
    ...ENHANCED_TEXT_PAIRS,
    ...componentPairs(declarations).filter((pair) => pair.minRatio === MIN_RATIO),
  ];
  for (const pair of textPairs) {
    const surface = painted(pair.surface);
    const text = painted(pair.text, surface);
    if (!isNeutral(surface) || !isNeutral(text)) continue;
    const ratio = contrastRatio(text, surface);
    if (ratio < ENHANCED_TEXT_RATIO) {
      failures.push(
        `${theme}/${scheme} ${pair.text} on ${pair.surface}: ${ratio} (min ${ENHANCED_TEXT_RATIO} for neutral text)`,
      );
    }
  }

  failures.push(...sweepPlaceholders(theme, scheme, declarations, ENHANCED_TEXT_RATIO));

  // A neutral boundary rises to 4.5:1. A boundary drawn in a brand or tone
  // colour — a checked box, an invalid field's danger edge, a focused field's
  // brand edge — keeps the standard 3:1, exactly as text on brand and tone
  // fills keeps 4.5:1 (spec 043 D2): raising it is a palette decision.
  for (const surfaceName of CONTROL_PAGE_SURFACES) {
    const surface = painted(surfaceName);
    for (const cell of controlBoundaryCells(declarations)) {
      let best = { ratio: 0, member: null, color: null };
      for (const member of cell.members) {
        const color = painted(member, surface);
        const ratio = contrastRatio(color, surface);
        if (ratio > best.ratio) best = { ratio, member, color };
      }
      if (best.color === null || !isNeutral(best.color)) continue;
      if (best.ratio < ENHANCED_BOUNDARY_RATIO) {
        failures.push(
          `${theme}/${scheme} ${cell.stem} on ${surfaceName}: ${best.ratio} (min ${ENHANCED_BOUNDARY_RATIO} for a neutral boundary, strongest edge ${best.member})`,
        );
      }
    }
  }

  const separators = separatorTokens(declarations);
  if (!separators.includes('--ki-divider-color')) {
    failures.push(
      `${theme}/${scheme}: no separator tokens derived — the token naming convention drifted`,
    );
  }
  for (const width of DRAWN_EDGE_WIDTHS) {
    if (lengthInPx(resolveCustomProperty(width, declarations)) <= 0) {
      failures.push(`${theme}/${scheme} ${width}: the container edge is not drawn`);
    }
  }
  const edgeColour = (name) => {
    const value = resolveCustomProperty(name, declarations);
    if (value === 'none') return null;
    const colour = /(?:#[0-9a-f]{3,8}|rgba?\([^()]*\))\s*$/iu.exec(
      value.replaceAll(/var\((--[a-z0-9-]+)\)/gu, (_, reference) =>
        resolveCustomProperty(reference, declarations),
      ),
    );
    if (colour === null) throw new Error(`${name} has no edge colour: ${value}`);
    return parseColor(colour[0]);
  };
  for (const surfaceName of SEPARATOR_SURFACES) {
    const surface = painted(surfaceName);
    for (const separator of separators) {
      const colour = edgeColour(separator);
      if (colour === null) {
        failures.push(`${theme}/${scheme} ${separator}: none (a container edge must be drawn)`);
        continue;
      }
      const ratio = contrastRatio(colour.a < 1 ? compositeOver(colour, surface) : colour, surface);
      if (ratio < SEPARATOR_RATIO) {
        failures.push(
          `${theme}/${scheme} ${separator} on ${surfaceName}: ${ratio} (min ${SEPARATOR_RATIO} for a separator)`,
        );
      }
    }
  }

  const ringWidth = lengthInPx(resolveCustomProperty('--ki-focus-ring-width', declarations));
  if (ringWidth < ENHANCED_FOCUS_RING_WIDTH_PX) {
    failures.push(
      `${theme}/${scheme} --ki-focus-ring-width: ${ringWidth}px (min ${ENHANCED_FOCUS_RING_WIDTH_PX}px)`,
    );
  }
  for (const surfaceName of SEPARATOR_SURFACES) {
    const surface = painted(surfaceName);
    const ratio = contrastRatio(painted('--ki-focus-ring-color', surface), surface);
    if (ratio < ENHANCED_BOUNDARY_RATIO) {
      failures.push(
        `${theme}/${scheme} --ki-focus-ring-color on ${surfaceName}: ${ratio} (min ${ENHANCED_BOUNDARY_RATIO})`,
      );
    }
  }

  return failures;
}

function evaluateContext(theme, scheme, declarations) {
  const failures = [];
  const swept = componentPairs(declarations);
  failures.push(...sweepControlBoundaries(theme, scheme, declarations));
  failures.push(...sweepSwitchGlyphs(theme, scheme, declarations));
  failures.push(...sweepRatioReadouts(theme, scheme, declarations));
  failures.push(...sweepOverlayRamps(theme, scheme, declarations));
  failures.push(...sweepPlaceholders(theme, scheme, declarations));
  failures.push(...sweepPageGraphics(theme, scheme, declarations));
  failures.push(...sweepToneInks(theme, scheme, declarations));
  failures.push(...sweepToneFamilies(theme, scheme, declarations));

  if (!swept.some((pair) => pair.component === CANARY_COMPONENT)) {
    failures.push(
      `${theme}/${scheme}: no ${CANARY_COMPONENT}-layer pairs matched — the component sweep pattern drifted from the token names`,
    );
  }

  // Component cells may be translucent (ghost/quaternary): composite the
  // cell background over the page surface before measuring.
  const pageSurface = parseColor(resolveCustomProperty('--ki-surface-s0', declarations));

  const icons = swept.flatMap(({ surface }) => {
    const ink = surface.replace(/-bg$/u, '-icon');
    return declarations.has(ink) ? [{ text: ink, surface, minRatio: NON_TEXT_MIN_RATIO }] : [];
  });
  for (const pair of [...CONTRAST_PAIRS, ...swept, ...icons]) {
    const text = parseColor(resolveCustomProperty(pair.text, declarations));
    const rawSurface = parseColor(resolveCustomProperty(pair.surface, declarations));
    const surface = rawSurface.a < 1 ? compositeOver(rawSurface, pageSurface) : rawSurface;
    const ratio = contrastRatio(text, surface);
    const min = pair.minRatio ?? MIN_RATIO;

    if (ratio < min) {
      failures.push(`${theme}/${scheme} ${pair.text} on ${pair.surface}: ${ratio} (min ${min})`);
    }
  }

  return failures;
}

// A mode never touches a disabled control (spec 043 D1, spec 044 D1): every
// disabled cell resolves exactly as it does in the standard appearance. A
// disabled ink raised to enabled-like contrast reads as operable.
const DISABLED_CELL = /-disabled-/u;

function sweepDisabledUnchanged(theme, scheme, declarations, standard) {
  const failures = [];
  for (const name of declarations.keys()) {
    if (!name.startsWith('--ki-') || !DISABLED_CELL.test(name)) continue;
    const moded = resolveCustomProperty(name, declarations);
    const unchanged = resolveCustomProperty(name, standard);
    if (moded !== unchanged) {
      failures.push(
        `${theme}/${scheme} ${name}: ${moded} (a mode must leave disabled cells at ${unchanged})`,
      );
    }
  }
  return failures;
}

// Every component's focus ring follows the mode, whichever theme painted it:
// a theme override of one component's ring width would keep the standard 2px.
const FOCUS_RING_WIDTH = /^--ki-[a-z0-9-]+-focus-ring-width$/u;

function sweepFocusRingWidths(theme, scheme, declarations) {
  return [...declarations.keys()]
    .filter((name) => FOCUS_RING_WIDTH.test(name))
    .map((name) => [name, lengthInPx(resolveCustomProperty(name, declarations))])
    .filter(([, width]) => width < ENHANCED_FOCUS_RING_WIDTH_PX)
    .map(
      ([name, width]) =>
        `${theme}/${scheme} ${name}: ${width}px (min ${ENHANCED_FOCUS_RING_WIDTH_PX}px)`,
    );
}

export function evaluateCss(theme, css) {
  const failures = [];
  const standard = collectSchemeDeclarations(css);

  for (const context of CONTEXTS) {
    const label = context.activation === null ? theme : `${theme}+${context.name}`;
    const schemes = collectSchemeDeclarations(css, context.activation);

    for (const [scheme, declarations] of Object.entries(schemes)) {
      failures.push(...evaluateContext(label, scheme, declarations));
      if (context.activation !== null) {
        failures.push(...sweepOpaqueSurfaces(label, scheme, declarations));
        failures.push(...sweepDisabledUnchanged(label, scheme, declarations, standard[scheme]));
      }
      if (context.name === 'contrast-more') {
        failures.push(...sweepEnhancedContrast(label, scheme, declarations));
        failures.push(...sweepFocusRingWidths(label, scheme, declarations));
      }
    }
  }

  return failures;
}

function evaluateStylesheet(theme, stylesheets) {
  return evaluateCss(
    theme,
    stylesheets.map((stylesheet) => readFileSync(stylesheet, 'utf8')).join('\n'),
  );
}

export function checkContrast() {
  const failures = [];

  for (const theme of THEMES) {
    const missing = theme.stylesheets.find((stylesheet) => !existsSync(stylesheet));

    if (missing !== undefined) {
      // A missing stylesheet is a failure, never a skip: FR-009 requires
      // every theme × scheme to be verified (clean-context review, round 1).
      failures.push(`${theme.name}: stylesheet missing at ${missing} — run the build first`);
      continue;
    }

    failures.push(...evaluateStylesheet(theme.name, theme.stylesheets));
  }

  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = checkContrast();

  if (failures.length > 0) {
    console.error(
      `Contrast check failed. Text ${MIN_RATIO}:1, non-text control ${NON_TEXT_MIN_RATIO}:1 (WCAG 1.4.3/1.4.11); under more contrast neutral text ${ENHANCED_TEXT_RATIO}:1, control boundary ${ENHANCED_BOUNDARY_RATIO}:1, separator ${SEPARATOR_RATIO}:1.`,
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Contrast check passed in ${CONTEXTS.map((context) => context.name).join(', ')}. Text ${MIN_RATIO}:1, non-text control ${NON_TEXT_MIN_RATIO}:1 (WCAG 1.4.3/1.4.11); under more contrast neutral text ${ENHANCED_TEXT_RATIO}:1, control boundary ${ENHANCED_BOUNDARY_RATIO}:1, separator ${SEPARATOR_RATIO}:1.`,
  );
}
