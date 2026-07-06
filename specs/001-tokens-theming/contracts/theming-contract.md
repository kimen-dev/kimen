# Public Contract: Kimen theming

The interface this feature exposes to consumers (pre-1.0; additive; Art. IX).

## 1. Stylesheet exports (`@kimen/tokens`)

| Export | File | Contents |
|---|---|---|
| `@kimen/tokens/css` | `dist/css/tokens.css` | onmars light (`:root`) + onmars dark (media + attribute blocks) |
| `@kimen/tokens/css/material3` | `dist/css/tokens.material3.css` | material3 light + dark, scoped to `data-ki-theme='material3'` |

Loading `@kimen/tokens/css` is the only requirement; theme stylesheets are
opt-in additions loaded alongside it.

## 2. Document-level attributes

| Attribute | Values | Effect |
|---|---|---|
| `data-ki-theme` | `material3` (this feature); future theme names | Selects the theme. Unknown value or missing theme stylesheet → onmars (safe fallback, FR-007/S7) |
| `data-ki-color-scheme` | `light` \| `dark` | Forces the scheme, winning over `prefers-color-scheme` (FR-003/S3-S4). Absent → follow the system (FR-002/S2) |

Both are read on the document root (`<html>`). Subtree scoping is not part of
this contract (spec assumption).

## 3. Token name contract

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
| `--ki-typography-*` | `--ki-typography-size-body-1` (aliases of `--ki-font-*`) | semantic |

Deprecated compat aliases (kept until a formal deprecation cycle):
`--ki-surface-base`, `--ki-surface-raised`, `--ki-text-base`,
`--ki-text-muted`, `--ki-text-danger`, `--ki-spacing-inline`,
`--ki-spacing-block`, `--ki-corner-control`,
`--ki-typography-family-base`, `--ki-typography-size-body`.

## 4. Guarantees

1. Zero configuration → onmars light (S1).
2. Scheme follows the system unless forced (S2-S4).
3. One attribute (+ stylesheet) switches theme (S5); unknown themes are
   inert (S7).
4. Identical name contract across themes (S6) — a consumer theme built by
   reassigning theme/semantic layers restyles everything that consumes
   tokens.
5. Default text-on-surface pairs meet WCAG AA 4.5:1 in every theme × scheme.
