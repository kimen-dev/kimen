# @kimen/tokens

Kimen design tokens: DTCG JSON sources compiled to CSS custom properties
(`--ki-*`). Part of [Kimen](https://github.com/kimen-dev/kimen), an AI-first
Web Components foundation for generative UI.

**Status**: pre-v1, published on npm. Before 1.0.0 a minor release may break
the public API. The instructions below are validated in CI against the
packed tarballs of every release run, dry runs included.

## Install

```sh
pnpm add @kimen/tokens
# or: npm install @kimen/tokens
```

## Stylesheets

The package exports these stylesheets:

| Export | What it is |
| --- | --- |
| `@kimen/tokens/css/core` | The onmars default theme without component tokens: every other `--ki-*` token, both schemes, the `color-scheme` contract they resolve from, densities and preference modes |
| `@kimen/tokens/css/ki-<tag>` | One sheet per `ki-*` tag: the component tokens that tag needs, including those of the components it renders |
| `@kimen/tokens/css/base` | The page contract: page background/foreground and body font, painted from tokens, and group items laid out as blocks until their tags register |
| `@kimen/tokens/css` | The full sheet, the simple alternative to the core and the tag sheets: every `--ki-*` token of the onmars default theme in one stylesheet |
| `@kimen/tokens/css/material3` | The Material 3 reference theme: its overrides of the default theme, opt-in via `data-ki-theme` |
| `@kimen/tokens/css/onmars-fonts.css` | Optional Instrument Sans and Newsreader for onmars v2 |
| `@kimen/tokens/css/material3-fonts.css` | Optional local metric-adjusted fallback for self-hosted Roboto |

Load the core and the page contract once per page. Then load one sheet for
every `ki-*` tag the page uses, named like the element import, and any other
stylesheet alongside them:

```ts
import '@kimen/tokens/css/core';
import '@kimen/tokens/css/ki-button'; // beside '@kimen/elements/ki-button'
import '@kimen/tokens/css/ki-input'; // beside '@kimen/elements/ki-input'
import '@kimen/tokens/css/base'; // page contract: paint the page, lay out items before registration
import '@kimen/tokens/css/material3'; // optional: a second theme
```

A theme stylesheet declares only the tokens it changes, so it does nothing on
its own: the core and the tag sheets (or the full sheet) must be loaded too.

- **One sheet per tag you use.** A tag's sheet already carries the tokens of
  every component that tag renders in its shadow tree: `css/ki-pagination`
  brings the icon and icon-button tokens it paints with. Your own markup is
  your own, though: a `ki-button` slotted into a `ki-card` needs
  `css/ki-button` too, and a `ki-tabs` needs `css/ki-tab` and
  `css/ki-tab-panel` for the tabs and panels you slot into it. A tag
  rendered without its sheet paints with undefined tokens.
- **Same values.** Every declaration in the core and the tag sheets is the
  full sheet's own. Loading the full sheet as well changes nothing.
- **Overrides keep working.** The core declares its tokens exactly as the
  full sheet does, so a page override of a core token comes after the core.
  A tag sheet declares its tokens at zero specificity
  (`:where(:root), :where([data-ki-theme])`). A page's `:root` or theme-root
  override of a component token therefore wins in any order, including when
  a bundler inserts a route's tag sheet after the page's stylesheet. Themes
  (`@kimen/tokens/css/material3`), preference modes and densities apply as
  with the full sheet.
- **No foundations.** The core and tag sheets omit the `--ki-foundation-*`
  tokens. material3 inlines the expressions it needs. The full sheet keeps
  only the four `--ki-foundation-onmars-v1-*` values for the legacy dialog
  and tooltip appearance until 1.0.0.
- Script that reads a component token on the root with `getPropertyValue()`
  gets an empty string while that tag's sheet is not loaded.

### The simple alternative: the full sheet

`@kimen/tokens/css` declares every public token in one stylesheet, in place
of the core and the tag sheets:

```ts
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';
```

There is nothing to keep in step with the page's markup, at the cost of
shipping the tokens of components the page never shows:

| Page | Core and tag sheets | Full sheet |
| --- | ---: | ---: |
| One `ki-button` | 8.1 KB | 18.9 KB |
| Ten components | 11.2 KB | 18.9 KB |

Sizes are minified and brotli-compressed, as a bundler ships them. Use the
full sheet when a page uses most of the catalog, where it is the smaller of
the two, or when the page cannot list its tags in advance: a generative UI
surface renders whatever catalog components the agent picks.

### The page contract

Tokens are custom properties: loading them paints nothing. `@kimen/tokens/css/base`
paints the page from them — background from `--ki-surface-base`, text from
`--ki-text-high-em`, body family from `--ki-typography-family-body`. It
publishes no tokens of its own — it only consumes them, so it never widens the
token surface — and it declares no colour scheme: the token stylesheet owns
that.

It also covers the time before the component scripts run. An unregistered
custom element is an inline box, so three `ki-segment` labels read as one
word. Until each tag registers, the page contract lays out the items of
Kimen groups as blocks: segments, radios, checkboxes, options, and menu,
list, tab, tree, step, timeline, sidebar and mobile-nav items. The rule is
`:where(…):where(:not(:defined)) { display: block }`: no paint, zero
specificity, nothing once the tag is defined.

Skipping it is supported in both schemes: the page keeps the browser's own
canvas and text colour for the active scheme, and every component stays
legible on it (measured over every component under a dark system preference
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
alias is recomputed there; that is also the element to reassign tokens on,
palette included — `[data-ki-theme='acme'] { --ki-color-brand-500: … }`
restyles every semantic token, tint and translucent variant built on that
step inside the region. A name without a theme stylesheet starts from
onmars, so on a page with its own theme a region that adjusts a few tokens
repeats that theme's name (`<section data-ki-theme="acme" class="sheet">`,
the `.sheet` rule after the theme rule); another name drops the page theme.
A reassignment on a plain element (`.acme`) changes that custom property and
none of the tokens that alias it, so the region keeps the page's semantic
values and component tokens such as `--ki-button-*`. Page aliases of Kimen
tokens follow the same rule: declare them on `:root, [data-ki-theme]`.
Neither attribute paints the element that carries it: give a region its
surface with
`background-color: var(--ki-surface-s0); color: var(--ki-text-high-em)`.

### Preference modes

Two modes reassign part of the token set on top of whatever theme and scheme
are active (specs 043 and 044):

| Mode | Activated by | What changes |
|---|---|---|
| more contrast | `prefers-contrast: more`, `data-ki-contrast="more"` | neutral text ≥ 7:1, neutral control boundaries ≥ 4.5:1, separators and container edges ≥ 3:1, a 3px focus ring; implies reduced transparency |
| reduced transparency | `prefers-reduced-transparency: reduce`, `data-ki-transparency="reduce"`, more contrast | every content surface opaque (`surface-special-*` glass, `surface-*-tint`), no backdrop blur; state washes and the modal scrim keep their alpha |

The value a token takes under a mode is a token of its own,
`--ki-<mode>-<token>`: `--ki-contrast-more-outline-control`,
`--ki-reduced-transparency-surface-primary-tint`. These mode tokens are
declared with every other token, next to the token they replace in the DTCG
sources (`ki.contrast-more.*`, `ki.reduced-transparency.*`), and a theme
overrides them like any other (material3 sets two). A deprecated token has
no mode token: its replacement carries the mode. Under the mode, on the
root and on every theme root, the stylesheet re-points each reassigned token
to its mode token with `!important`, under the media query and under the
declaration. An important declaration outranks every normal one, so the mode
applies over any theme, whatever its specificity or load order. The
declarations only switch a mode on; they take effect on the root and on
theme roots, because those are the elements that redeclare every alias.

A theme of your own needs nothing to follow the modes. To choose its own
mode values it sets the mode tokens, at normal priority; setting the token
itself under the mode has no effect any more. The token reference lists
every token each mode reassigns, its mode token and Kimen's value
(*Preference modes*):

```css
[data-ki-theme='acme'] {
  --ki-outline-control: #8c857c;
  --ki-contrast-more-outline-control: light-dark(#4a4540, #c4bdb4); /* only under more contrast */
}
```

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

1. **Primitive** — raw ramps (`--ki-color-gray-500`, `--ki-space-md`).
   Never consumed by components directly.
2. **Theme** — a brand's choices over the primitives: palette
   (`--ki-color-brand-*`), typography and shape decisions that distinguish
   onmars from material3.
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
- **Glass** — translucent surfaces can use `--ki-dialog-bg-image` with
  `--ki-dialog-backdrop-filter`. Set `--ki-effect-component-backdrop-filter`
  to `none` at a theme root to turn glass filtering off.
- **Elevation** — the `--ki-elevation-e1`…`--ki-elevation-e6` shadow scale,
  plus effect shadows (`--ki-effect-*`) for component-specific depth.
- **Bevels** — edge tokens such as `--ki-button-tertiary-rest-border-bottom`
  that give controls their machined bottom edge.

## Onmars color and type

Calma uses paper ivory in light mode, warm charcoal in dark mode, ink for
primary surfaces and terracotta for links and focus. Crimson marks errors.
Surfaces use hairline borders and soft shadows. Dialogs and tooltips have
opaque fills, and the select listbox uses a single translucent tint.

The UI and body stacks start with Instrument Sans. The display and serif
stacks start with Newsreader, including dialog headings.

## Optional theme fonts

The family tokens name fonts and set their fallback order. The token
stylesheets never fetch fonts by themselves. If your app already self-hosts
its theme fonts, keep its own `@font-face` rules and use the family tokens.

### onmars v2

```ts
import '@kimen/tokens/css/core'; // with your tag sheets, or '@kimen/tokens/css'
import '@kimen/tokens/css/onmars-fonts.css';
```

The font stylesheet bundles upright Latin Instrument Sans (body, weights
400–700) and Newsreader (display, weight 500). Newsreader retains automatic
optical sizing across its 6–72 axis. If your CSS requests a different weight,
the browser can use the weight-500 face, synthesize a heavier weight, or use a
fallback. Provide your own Newsreader faces if you need other designed weights.
Earlier onmars tokens name Inter and use their own fallback stack. Keep your
Inter source with those versions.

To use the bundled metric-adjusted faces, put the aliases after the web
fonts in your stack. Apply the overrides to the onmars theme root and load
them after the token stylesheets.

```css
[data-ki-theme='onmars'] {
  --ki-typography-family-body: 'Instrument Sans', 'Instrument Sans Fallback', system-ui, sans-serif;
  --ki-typography-family-display: 'Newsreader', 'Newsreader Fallback', Georgia, serif;
}
```

Instrument Sans uses a measured Arial alias where Arial is installed.
Newsreader uses a measured Georgia alias. The rest of each stack remains
available when the browser cannot use the local face.

### Material 3

Apply `data-ki-theme="material3"` and load `@kimen/tokens/css/material3`
alongside the default tokens. Host Roboto for the body and display families.
The optional `@kimen/tokens/css/material3-fonts.css` defines the local
`'Roboto Fallback'` alias. To use it, set the body and display families on
the theme root to `'Roboto', 'Roboto Fallback', system-ui, sans-serif`.
The CSS has no Roboto download URL. Roboto Mono and Roboto Slab use separate
font sources if your page needs them.

### Preloading

Preload only a face used in the initial viewport. Use the deployed URL
that the font stylesheet requests, including any filename hash added by
your build. For example, if your build serves Instrument Sans at this URL:

```html
<link rel="preload" href="/assets/InstrumentSansVariable.woff2" as="font" type="font/woff2" crossorigin />
```

The `crossorigin` attribute matches the browser's font request mode, even
for a same-origin URL. When copying the stylesheet as-is, keep its
`../fonts/` path relative to the stylesheet. The same preload pattern works
for a separately hosted Roboto file.

## Theme authoring

Give dimensions a unit, including zero (`0px`), and use keywords such as
`auto` where the token allows them. Components use tokens in `calc()`, and
`calc(8px - 0)` is invalid, so the browser silently drops the declaration
(`--ki-button-label-padding-inline: 0` drops the label-to-icon gap).
Catch this with `npx @kimen/tokens check-theme theme.css`.

Who reassigns which layer:

- **A theme** — a complete restyle, such as material3 or a brand's own — may
  redefine the palette (the primitive and theme `--ki-color-*` ramps) and the
  semantic tokens that do not fit it. material3 does both. The translucent
  variants `--ki-color-<ramp>-500-alpha-<n>` are
  `color-mix(in srgb, var(--ki-color-<ramp>-500) N%, transparent)`, so a theme
  that redefines the step gets matching variants without restating them.
- **An application** that uses a theme reassigns semantic tokens, and
  component tokens for one component. It leaves the palette to the theme:
  every semantic pair is contrast-checked against the theme's palette, and a
  palette step changed by an application is checked by nobody.

The public contract is the `--ki-*` custom-property name set: a theme
reassigns names of that set and never adds one, and its stylesheet ships
only the tokens whose value differs from the default theme. Only colours may
depend on the colour scheme — a token whose light and dark values differ in
anything else fails the build.

A theme declares on `:root` or on `[data-ki-theme='name']`, in a stylesheet
loaded after the core (or the full sheet). Two declarations need care:

- **Mode values.** A preference mode applies over the theme on its own. To
  choose its own value under a mode, a theme sets the mode token
  (`--ki-contrast-more-*`, `--ki-reduced-transparency-*`), not the token
  under the mode (see *Preference modes* above).
- **`color-scheme`.** `data-ki-color-scheme` pins the scheme with the
  specificity of one attribute. A theme rule that declares `color-scheme`
  with that specificity or more (`[data-ki-theme='acme']`,
  `:root[data-ki-theme='acme']`) overrides the attribute and breaks a
  light/dark toggle. A single-scheme theme declares its default at zero
  specificity: `:where([data-ki-theme='acme']) { color-scheme: dark; }`.

The approved public contract for this feature is documented in the
[theming contract](https://github.com/kimen-dev/kimen/blob/main/specs/001-tokens-theming/contracts/theming-contract.md).

### Turning off shadows

In token source files, any `$type: "shadow"` token can have a `$value` of
`"none"`. The build emits `0 0 #0000`, a transparent layer that is valid in
a comma-separated `box-shadow` list.

In a hand-written CSS theme, a token can be `none` when it supplies a whole
`box-shadow` declaration. This includes the four component effect tokens
`--ki-effect-component-primary-default-shadow`,
`--ki-effect-component-primary-hover-shadow`,
`--ki-effect-component-secondary-default-shadow`, and
`--ki-effect-component-secondary-hover-shadow`. For a token you use as one
layer in a comma-separated list, set its disabled value to `0 0 #0000`.
Kimen's remaining lists use `--ki-dialog-shadow`, `--ki-focus-primary`, and
`--ki-switch-focus-ring-shadow`.

`--ki-effect-video-hover-opacity` sets the opacity of the added video hover
shadow independently of the resting shadow. Material 3 sets it to zero.

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
reassign the palette and semantic token layers instead. In an application on
a theme, do not reassign palette steps: reassign semantic tokens.

## License

[Apache-2.0](https://github.com/kimen-dev/kimen/blob/main/LICENSE)
