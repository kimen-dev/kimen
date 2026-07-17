# @kimen/tokens

Kimen design tokens compiled from DTCG JSON sources to CSS custom properties.
The token graph is layered primitive -> theme -> semantic. onmars is the
default theme; material3 is a reference second theme that proves one-step
re-theming without component changes.

## When to use

Use `@kimen/tokens/css` in any app or component page that consumes Kimen
elements or Kimen token names. This stylesheet is enough for the default
onmars light/dark appearance.

Load `@kimen/tokens/css/material3` in addition to the default stylesheet when
you want to opt into the material3 reference theme with
`data-ki-theme="material3"` on the document root.

## When not to use

Do not import token source JSON from application code. Do not patch generated
files under `dist/`. Do not create a theme by overriding component CSS first;
reassign the theme and semantic token layers instead.

## Document attributes

Theme selection:

```html
<html data-ki-theme="material3">
```

Scheme override:

```html
<html data-ki-color-scheme="dark">
```

`data-ki-color-scheme="light"` forces light. Without the scheme attribute,
the stylesheet follows `prefers-color-scheme`. Unknown theme names and missing
theme stylesheets fall back to onmars through the cascade.

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
