# Public Contract: Kimen theming

The interface this feature exposes to consumers (pre-1.0; additive; Art. IX).

## 1. Stylesheet exports (`@kimen/tokens`)

| Export | File | Contents |
|---|---|---|
| `@kimen/tokens/css` | `dist/css/tokens.css` | The colour-scheme contract (a zero-specificity `color-scheme` default on the root, pinned by `data-ki-color-scheme`) and every onmars token, declared once on `:root` and on any themed subtree |
| `@kimen/tokens/css/material3` | `dist/css/tokens.material3.css` | The tokens material3 changes over onmars, scoped to `data-ki-theme='material3'` on the root or on any element |
| `@kimen/tokens/css/base` | `dist/css/base.css` | The opt-in page contract: page background, text colour and body typeface painted from tokens. Declares no `color-scheme` |

Loading `@kimen/tokens/css` is the only requirement. Theme stylesheets are
opt-in additions loaded **alongside** it: a theme stylesheet carries only its
overrides and is inert on its own.

## 2. Declarations

| Attribute | Values | Effect |
|---|---|---|
| `data-ki-theme` | `material3`; `onmars` (the default theme); future theme names | Selects the theme. Unknown value or missing theme stylesheet → onmars (safe fallback, FR-007/S7) |
| `data-ki-color-scheme` | `light` \| `dark` | Forces the scheme (FR-003/S3-S4). Absent → follow the page's `color-scheme`: the system preference (FR-002/S2) unless the host page declares one (FR-016/S14) |

Both are read on the document root (`<html>`) **and on any element**
(FR-010-FR-012, S8-S12):

- On an element, a declaration applies to that element's subtree, shadow
  trees included. The nearest declaration wins, independently for theme and
  for scheme.
- A scheme declaration redeclares nothing: scheme-dependent tokens are
  `light-dark()` values and resolve where they are used.
- A theme declaration redeclares every token on the element that carries it,
  so every alias is recomputed there. Consequences a consumer can rely on:
  `data-ki-theme="onmars"` (or any name with no loaded stylesheet) returns a
  subtree to the default theme; token reassignments made on `:root` do not
  flow into a themed subtree; and a themed element is where a consumer
  reassigns tokens for a subtree (`[data-ki-theme='acme'] { … }`).
- A declaration restyles what consumes tokens. It paints nothing on the
  element that carries it.

## 3. Colour-scheme contract

`@kimen/tokens/css` declares `color-scheme: light dark` on the root, and
`color-scheme: light` / `dark` on any element carrying
`data-ki-color-scheme`. The tokens resolve from that declaration, and so does
the browser: page canvas, scrollbars, native controls, autofill (FR-013/S13).

- The root declaration is a default, emitted at zero specificity
  (`:where(:root)`). A page that declares its own `color-scheme` for its
  document takes the tokens with it — `html { color-scheme: light }` is
  enough, before or after the tokens stylesheet (FR-016/S14). Kimen follows
  the page's `color-scheme`, not `prefers-color-scheme` directly.
- The page's declaration has to be CSS. A `<meta name="color-scheme">` alone
  does not pin the page: it applies only while the root's `color-scheme` is
  `normal`, and the tokens stylesheet declares one.
- `data-ki-color-scheme` is an explicit declaration and keeps its attribute
  specificity: on the root it wins over a host `html { color-scheme }` rule,
  and ties with a host `:root { color-scheme }` rule, where the later
  stylesheet wins.
- A scheme-dependent token is one declaration. A consumer reassigning it
  supplies both values (`light-dark(a, b)`); a single value applies to both
  schemes.
- Only colours depend on the scheme (FR-015).
- A scheme-dependent token becomes a colour where it is used. Its custom
  property holds the `light-dark()` pair, so script reading it with
  `getPropertyValue()` gets the pair, not a colour.

## 4. Token name contract

All custom properties are prefixed `--ki-`. Families (names identical in
every theme and scheme — the invariant S6 enforces):

| Family | Examples | Layer |
|---|---|---|
| `--ki-color-{ramp}-{step}` | `--ki-color-gray-500`, `--ki-color-danger-500-alpha-2` | primitive |
| `--ki-space-*` | `--ki-space-md`, `--ki-space-26xl` | primitive |
| `--ki-radius-*` | `--ki-radius-md`, `--ki-radius-component-sm`, `--ki-radius-round` | primitive |
| `--ki-color-brand-*` | `--ki-color-brand-500`, `--ki-color-brand-high-em` | theme |
| `--ki-font-*` | `--ki-font-family-body`, `--ki-font-size-body-1`, `--ki-font-weight-display-bold`, `--ki-font-letter-spacing-md` | theme |
| `--ki-surface-*` | `--ki-surface-s0`…`s5`, `--ki-surface-primary-med-em`, `--ki-surface-special-*` | semantic |
| `--ki-text-*` | `--ki-text-high-em`, `--ki-text-danger-med-em` | semantic |
| `--ki-outline-*` | `--ki-outline-med-em`, `--ki-outline-primary-button-top` | semantic |
| `--ki-inverse-white-*` / `--ki-inverse-black-*` | `--ki-inverse-white-alpha-12` | semantic |
| `--ki-overlay-*`, `--ki-elevation-*` | `--ki-overlay-high-em`, `--ki-elevation-shadow` | semantic |
| `--ki-state-layer-*` | `--ki-state-layer-hover`, `--ki-state-layer-pressed` | semantic |
| `--ki-motion-*` | `--ki-motion-duration-medium-2`, `--ki-motion-easing-emphasized` | semantic |
| `--ki-typography-*` | `--ki-typography-size-body-1` (aliases of `--ki-font-*`) | semantic |

Deprecated compat aliases (kept until a formal deprecation cycle):
`--ki-surface-base`, `--ki-surface-raised`, `--ki-text-base`,
`--ki-text-muted`, `--ki-text-danger`, `--ki-spacing-inline`,
`--ki-spacing-block`, `--ki-corner-control`,
`--ki-typography-family-base`, `--ki-typography-size-body`.

## 5. Guarantees

1. Zero configuration → onmars light (S1).
2. Scheme follows the system unless forced (S2-S4) or declared by the host
   page for its own document (S14).
3. One attribute (+ stylesheet) switches theme (S5); unknown themes are
   inert (S7).
4. Identical name contract across themes (S6): under any theme every name of
   the default contract resolves, and a theme stylesheet reassigns names of
   that contract only — a consumer theme built by reassigning theme/semantic
   layers restyles everything that consumes tokens.
5. Default text-on-surface pairs meet WCAG AA 4.5:1 in every theme × scheme.
6. A theme or a scheme declared on an element applies to its subtree, and
   nested declarations compose (S8-S12).
7. The tokens stylesheet alone keeps the page coherent: the browser paints
   the scheme the tokens resolve to (S13).

## 6. Changes from the first publication of this contract

Token names and the effective value of every token in every theme × scheme
are unchanged. What changed is how the stylesheets carry them:

| Before | Now | Who notices |
|---|---|---|
| Subtree scoping excluded | Both attributes work on any element | Anyone who had the attributes on a non-root element: they were inert and now apply |
| Dark values in `@media (prefers-color-scheme: dark)` plus a `:root[data-ki-color-scheme='dark']` block | One `light-dark()` declaration per scheme-dependent token | A page that pins `color-scheme` itself now takes the tokens with it. A consumer `:root` reassignment of a scheme-dependent token now applies in both schemes instead of losing to the dark block. Script that read a scheme-dependent token with `getPropertyValue()` now receives the `light-dark()` pair instead of the active colour |
| `color-scheme` declared only by `@kimen/tokens/css/base` | Declared by `@kimen/tokens/css`, as a zero-specificity default on the root (`:where(:root)`) | A page loading only the tokens stylesheet: its canvas and native controls now follow the system preference. A page that declares `color-scheme` for its own document is not overridden: its declaration wins in either stylesheet order (S14) |
| `@kimen/tokens/css/material3` declared the full contract | It declares its overrides only | A page loading the material3 stylesheet without the default one (never supported, but it worked). A consumer `:root` reassignment under material3 used to lose for every token (the theme block redeclared all of them at higher specificity); it now loses only for the tokens material3 overrides |
| Per-scheme files `tokens.light.css`, `tokens.dark.css`, `tokens.material3.light.css`, `tokens.material3.dark.css` in `dist/css` | Not emitted | Nobody through the package exports: they were never exported |
| Token descriptions emitted as CSS comments | No comments in `dist` | Nobody: the token reference is generated from the sources |
