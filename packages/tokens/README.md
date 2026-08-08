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
| `@kimen/tokens/css` | The onmars default theme: every `--ki-*` token, light and dark schemes |
| `@kimen/tokens/css/base` | The page contract: `color-scheme`, page background/foreground, body font |
| `@kimen/tokens/css/material3` | The Material 3 reference theme, opt-in via `data-ki-theme` |

Load the theme and the page contract once per page:

```ts
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';
```

### The page contract

A token stylesheet can only carry custom properties, so it cannot declare
`color-scheme`. Without that declaration the tokens flip to their dark values
for a visitor who prefers dark while the browser keeps painting a light
canvas, light scrollbars and light autofill. `@kimen/tokens/css/base` closes
that gap: it declares `color-scheme`, paints the page from `--ki-surface-s0`
/ `--ki-text-high-em`, and sets the body family. It publishes no tokens of
its own — it only consumes them, so it never widens the token surface.

Skipping it is supported in the light scheme. In the dark scheme the cost is
measured, not estimated: on a page loading only the token stylesheet, with
the visitor's OS set to dark, **14 of 29 components render text below 4.5:1
contrast** — the components correctly paint their dark-scheme foreground;
the user agent simply keeps a light canvas. Load the page contract, or pin
the page with `data-ki-color-scheme="light"`. Doing neither is the one
combination the library cannot render legibly.

## Theme and scheme selection

Two attributes on the document root drive everything:

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

- `data-ki-color-scheme`: `light` or `dark` forces a scheme for any theme.
  Without it, stylesheets follow `prefers-color-scheme`.
- `data-ki-theme`: opts into a non-default theme. Unknown theme names and
  missing theme stylesheets fall back to onmars through the cascade. No
  runtime code is involved anywhere.

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
  (`--ki-motion-easing-standard`, `-emphasized`, `-spring` and their
  accelerate/decelerate variants), and micro-motion offsets
  (`--ki-motion-distance-xs/sm/md`).
- **Glass** — translucent surfaces built from gradient pairs plus a backdrop
  blur: `--ki-dialog-bg-start`/`--ki-dialog-bg-end` with
  `--ki-dialog-backdrop-blur`, and the same pattern for tooltip, card and
  other overlay surfaces.
- **Elevation** — the `--ki-elevation-e1`…`--ki-elevation-e6` shadow scale,
  plus effect shadows (`--ki-effect-*`) for component-specific depth.
- **Bevels** — edge tokens such as `--ki-button-tertiary-rest-border-bottom`
  that give controls their machined bottom edge.

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
set; every theme must expose the same names in light and dark schemes.

The approved public contract for this feature is documented in the
[theming contract](https://github.com/kimen-dev/kimen/blob/main/specs/001-tokens-theming/contracts/theming-contract.md).

## When not to use

Do not import token source JSON from application code. Do not patch generated
files under `dist/`. Do not create a theme by overriding component CSS first;
reassign the theme and semantic token layers instead.

## License

[Apache-2.0](https://github.com/kimen-dev/kimen/blob/main/LICENSE)
