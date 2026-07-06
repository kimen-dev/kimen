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

## Theme authoring

A complete theme reassigns theme-layer tokens and semantic-layer tokens while
sharing primitives. The public contract is the `--ki-*` custom-property name
set; every theme must expose the same names in light and dark schemes.

The approved public contract for this feature is documented in
`../../specs/001-tokens-theming/contracts/theming-contract.md`.
