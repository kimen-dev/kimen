# Theming

All themes reassign the same `--ki-*` custom properties, so switching themes
restyles every component with no code changes. Two attributes on the document
root drive selection:

- `data-ki-color-scheme`: `light` or `dark` forces a color scheme for any
  theme, overriding the OS preference. Without it, stylesheets follow
  `prefers-color-scheme`.
- `data-ki-theme`: opts into a non-default theme. Unknown theme names match no
  selector and fall back to onmars through the cascade.

To use the bundled Material 3 reference theme, side-effect import its
stylesheet (exported as `@kimen/tokens/css/material3`) in addition to
`@kimen/tokens/css`, then select it on the document root:

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```
