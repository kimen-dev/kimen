# Theming

All themes reassign the same `--ki-*` custom properties, so switching themes
restyles every component with no code changes. Two attributes on the document
root drive selection:

- `data-ki-color-scheme`: `light` or `dark` forces a color scheme for any
  theme, overriding the OS preference. Without it, stylesheets follow
  `prefers-color-scheme`.
- `data-ki-theme`: opts into a non-default theme. Unknown theme names match no
  selector and fall back to onmars through the cascade.

Preference modes, more contrast and reduced transparency, follow
`prefers-contrast: more` and `prefers-reduced-transparency: reduce`, or
`data-ki-contrast="more"` and `data-ki-transparency="reduce"` on the root or
a theme root, and apply over any theme. A theme that wants its own value for
a token under a mode sets its mode token, `--ki-<mode>-<token>` (for example
`--ki-contrast-more-outline-control`), never the token under a media query.

To use the bundled Material 3 reference theme, side-effect import its
stylesheet (exported as `@kimen/tokens/css/material3`) in addition to
`@kimen/tokens/css`, then select it on the document root:

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```
