# @kimen/tokens

Kimen design tokens: DTCG JSON sources compiled to CSS custom properties
(`--ki-*`). Part of [Kimen](https://github.com/kimen-dev/kimen), an AI-first
Web Components foundation for generative UI.

**Status**: pre-v1, not published to npm yet. The instructions below are the
contract the first release ships with; they are validated in CI against
packed tarballs on every release dry run.

## Install

```sh
pnpm add @kimen/tokens
# or: npm install @kimen/tokens
```

## Stylesheets

The package exports three stylesheets and nothing else:

| Export | What it is |
| --- | --- |
| `@kimen/tokens/css` | The onmars default theme: every `--ki-*` token, both schemes, plus the `color-scheme` contract they resolve from |
| `@kimen/tokens/css/base` | The page contract: page background/foreground and body font, painted from tokens |
| `@kimen/tokens/css/material3` | The Material 3 reference theme: its overrides of the default theme, opt-in via `data-ki-theme` |

Load the default theme once per page. It is the only requirement; the other
two are additions loaded alongside it:

```ts
import '@kimen/tokens/css';
import '@kimen/tokens/css/base'; // optional: paint the page from tokens
import '@kimen/tokens/css/material3'; // optional: a second theme
```

A theme stylesheet declares only the tokens it changes, so it does nothing on
its own: `@kimen/tokens/css` must be loaded too.

### The page contract

Tokens are custom properties: loading them paints nothing. `@kimen/tokens/css/base`
paints the page from them — background from `--ki-surface-base`, text from
`--ki-text-high-em`, body family from `--ki-typography-family-body`. It
publishes no tokens of its own — it only consumes them, so it never widens the
token surface — and it declares no colour scheme: the token stylesheet owns
that.

Skipping it is supported in both schemes: the page keeps the browser's own
canvas and text colour for the active scheme, and every component stays
legible on it (measured over all 29 components under a dark system preference
by `bare-page.browser.spec.ts`).

## Theme and scheme selection

Two attributes drive everything, on the document root or on any element:

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

- `data-ki-color-scheme`: `light` or `dark` forces a scheme for any theme.
  Without it the page follows the system preference: the token stylesheet
  declares `color-scheme: light dark` on the root as a default, and the
  attribute pins it.
- `data-ki-theme`: opts into a non-default theme. Unknown theme names and
  missing theme stylesheets fall back to onmars through the cascade. No
  runtime code is involved anywhere.

### How the scheme works

The scheme is a single declaration, `color-scheme`, and every
scheme-dependent token is a single `light-dark()` value that resolves from it:

```css
:where(:root) {
  color-scheme: light dark;
}

[data-ki-color-scheme='dark'] {
  color-scheme: dark;
}

:root,
:where([data-ki-theme]) {
  --ki-surface-s0: light-dark(var(--ki-color-white-100), var(--ki-color-dark-950));
}
```

The same declaration tells the browser which canvas, scrollbars, native
controls and autofill to paint, so the two cannot disagree. Consequences:

- Kimen follows the page's `color-scheme`, not `prefers-color-scheme`
  directly. The default is declared with `:where()`, at zero specificity, so
  any `color-scheme` your own CSS declares for the document wins —
  `html { color-scheme: light }` is enough, before or after the token
  stylesheet — and the tokens follow it. It has to be CSS: a
  `<meta name="color-scheme">` alone does not pin the page once a stylesheet
  declares the property on the root.
- `data-ki-color-scheme` is the explicit declaration: on the root it wins
  over an `html { color-scheme }` rule of the page.
- Reassign a scheme-dependent token with both values
  (`light-dark(#fff, #111)`); a single value applies to both schemes.
- A scheme-dependent token only becomes a colour where it is used. Script
  reading one with `getPropertyValue()` gets the `light-dark()` pair; read
  the computed `color` of an element that uses the token instead.

`light-dark()` is Baseline (Chrome 123, Firefox 120, Safari 17.5), inside the
library's browser baseline.

### Subtrees

Both attributes work on any element — an island of generated UI embedded in a
page it does not own can carry its own theme and scheme:

```html
<section data-ki-theme="material3" data-ki-color-scheme="dark">…</section>
<section data-ki-theme="onmars">…</section> <!-- back to the default theme -->
```

A scheme subtree redeclares nothing (`light-dark()` resolves where a token is
used). A themed subtree redeclares every token on its own root so that every
alias is recomputed there; that is also the element to reassign tokens on —
`[data-ki-theme='acme'] { --ki-color-brand-500: … }` — because a reassignment
on a plain element does not reach the tokens that alias it. Neither attribute
paints the element that carries it: give a region its surface with
`background-color: var(--ki-surface-s0); color: var(--ki-text-high-em)`.

### Preference modes

Two modes reassign part of the token set on top of whatever theme and scheme
are active (specs 043 and 044):

| Mode | Activated by | What changes |
|---|---|---|
| more contrast | `prefers-contrast: more`, `data-ki-contrast="more"` | neutral text ≥ 7:1, neutral control boundaries ≥ 4.5:1, separators and container edges ≥ 3:1, a 3px focus ring; implies reduced transparency |
| reduced transparency | `prefers-reduced-transparency: reduce`, `data-ki-transparency="reduce"`, more contrast | every content surface opaque (`surface-special-*` glass, `surface-*-tint`), no backdrop blur; state washes and the modal scrim keep their alpha |

Each mode is one file of references in `tokens/modes/` (`contrast-more`,
`reduced-transparency`), so it serves every theme and scheme. The build
composes it with each theme and emits only the differences, twice: under the
media query and under the declaration, on the root and on every theme root.
A theme re-asserts, after its own rule, the mode values its overrides
displaced, so precedence never depends on the order the stylesheets load.
The declarations only switch a mode on; they take effect on the root and on
theme roots, because those are the elements that redeclare every alias.

`pnpm --filter @kimen/tokens contrast` sweeps every theme × scheme in the
standard appearance and in each mode, with the stronger thresholds under more
contrast. The public token surface publishes each mode as its own context
(`contrast-more/light`, `reduced-transparency/dark`, …).

### Density

`data-ki-density="compact"` on any element makes its region compact,
`data-ki-density="touch"` gives it 44 × 44 pointer targets, and
`data-ki-density="default"` restores the default inside it (spec 045 and its
Amendment A1). Three tokens carry the level and are **inherited from the
document**: declared once in their own `:root` rule, never redeclared on a
theme root, and read by component CSS where a size is used — so the
declaration reaches every component inside the element, in any theme, and
the nearest declaration wins by plain inheritance. Every level's rule
declares all three, so a level nested in another is that level through and
through:

| Token | Default | Compact | Touch | Used for |
|---|---|---|---|---|
| `--ki-density-control-offset` | `0` | `-0.5rem` | `0.25rem` | added to the block size of buttons, fields, selects, options, list items, tabs; icon buttons take a negative step only |
| `--ki-density-space-scale` | `1` | `0.75` | `1` | multiplies the padding and gaps of cards, dialogs, alerts, lists, listboxes, tab panels, tooltips |
| `--ki-density-target-min` | `24px` | `24px` | `44px` | the pointer target every interactive control reaches (WCAG 2.5.8; 2.5.5 in touch): a control painted smaller extends its target without painting more |

The build marks the inherited tokens with
`$extensions["dev.kimen"].inherit = "document"` and fails if a token aliases
them or a theme or mode reassigns them or what they reference. The levels
live in `tokens/modes/compact.tokens.json` and `tokens/modes/touch.tokens.json`.

Touch is opt-in: no Kimen stylesheet applies it under a coarse pointer. A
page that wants that writes it in its own stylesheet, after Kimen's:

```css
@media (pointer: coarse) {
  :root {
    --ki-density-control-offset: var(--ki-space-xs);
    --ki-density-space-scale: var(--ki-scale-unit);
    --ki-density-target-min: var(--ki-size-target-touch);
  }
}
```

## Layer model

The token graph is layered **primitive → theme → semantic → component**:

1. **Primitive** — raw ramps (`--ki-color-brand-500`, `--ki-space-md`).
   Never consumed by components directly.
2. **Theme** — a brand's choices over the primitives: palette, typography and
   shape decisions that distinguish onmars from material3.
3. **Semantic** — meaning, not appearance (`--ki-surface-s0`…`s5`,
   `--ki-text-high-em`, `--ki-outline-low-em`). The layer a brand reassigns
   to re-theme everything.
4. **Component** — the public styling contract of each element
   (`--ki-button-primary-neutral-rest-bg`, `--ki-button-md-height`…).

onmars is the default theme; material3 is a reference second theme that
proves in CI, on every commit, that reassigning the theme and semantic layers
alone restyles every component with zero component changes.

## Motion, glass, elevation and bevels

Beyond color, space and type, the token set carries the families that give
Kimen surfaces their physical character. The narrative below is the map; the
complete tables are generated into the token reference
(`packages/elements/docs/tokens-reference.mdx`) from the same DTCG sources —
never transcribed by hand.

- **Motion** — durations from `--ki-motion-duration-instant` and
  `--ki-motion-duration-fast` through the `short`/`medium`/`long` ramps
  (`--ki-motion-duration-short-1`…`long-4`), easing curves
  (`--ki-motion-easing-standard`, `-emphasized`, `-emphasized-out` and their
  accelerate/decelerate variants), and micro-motion offsets
  (`--ki-motion-distance-xs/sm/md`).
- **Glass** — translucent surfaces built from gradient pairs plus a backdrop
  blur: `--ki-dialog-bg-start`/`--ki-dialog-bg-end` with
  `--ki-dialog-backdrop-blur`, the same pattern for tooltip, and a backdrop
  blur token for the other glass surfaces (the select listbox, the video
  controls, the glass button variants).
- **Elevation** — the `--ki-elevation-e1`…`--ki-elevation-e6` shadow scale,
  plus effect shadows (`--ki-effect-*`) for component-specific depth.
- **Bevels** — edge tokens such as `--ki-button-tertiary-rest-border-bottom`
  that give controls their machined bottom edge.

## Onmars color and type

Calma uses paper ivory in light mode, warm charcoal in dark mode, ink for
primary surfaces and terracotta for links and focus. Crimson marks errors.
Surfaces are flat and opaque, with hairline borders and soft shadows.

The UI and body stack starts with Instrument Sans. The display and serif
stacks start with Newsreader. Load these faces in your app to use them.

## Material 3 theme fonts

The material3 theme resolves its font stacks to `Roboto` (body/display),
`Roboto Mono` (mono) and `Roboto Slab` (serif), but the stylesheet does not
load any webfont — a deliberate decision: tokens never trigger network
requests. If Roboto is not installed or loaded, the stacks fall back to
`system-ui` / `ui-monospace` / `Georgia`, which keeps the theme usable with
metric-compatible defaults.

To get the authentic Material 3 look, load Roboto yourself, for example from
Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap"
  rel="stylesheet"
/>
```

Add `family=Roboto+Mono` or `family=Roboto+Slab` to the query only if your
page uses the mono/serif token families.

## Theme authoring

A complete theme reassigns theme-layer tokens and semantic-layer tokens while
sharing primitives. The public contract is the `--ki-*` custom-property name
set: a theme reassigns names of that set and never adds one, and its
stylesheet ships only the tokens whose value differs from the default theme.
Only colours may depend on the colour scheme — a token whose light and dark
values differ in anything else fails the build.

The approved public contract for this feature is documented in the
[theming contract](https://github.com/kimen-dev/kimen/blob/main/specs/001-tokens-theming/contracts/theming-contract.md).

## Deprecated tokens

A token that no component paints is deprecated before it is removed: it keeps
its value, its declaration in the stylesheet is followed by a
`/* deprecated since …, removed in …: use --ki-… */` comment, and the token
reference lists it with its replacement. It is removed at the next major, and
only after a later minor has shipped the deprecation. See the
[deprecated tokens migration guide](https://github.com/kimen-dev/kimen/blob/main/docs/migrations/deprecated-tokens.md).

## When not to use

Do not import token source JSON from application code. Do not patch generated
files under `dist/`. Do not create a theme by overriding component CSS first;
reassign the theme and semantic token layers instead.

## License

[Apache-2.0](https://github.com/kimen-dev/kimen/blob/main/LICENSE)
