# Data Model: 001-tokens-theming

Phase 1 output. The "data" of this feature is the token graph and its
compilation products.

## Entities

### Token

A named design decision with a typed value.

| Field | Description | Validation |
|---|---|---|
| name | Dot-path (e.g. `ki.surface.s0`) → CSS custom property `--ki-surface-s0` | Unique within a theme × scheme resolution; kebab-case segments |
| type | DTCG `$type`: color, dimension, fontFamily, fontWeight | Required (directly or via group inheritance) |
| value | Literal (`#845abe`, `0.5rem`) or reference (`{ki.color.gray.50}`) | References must resolve within the same build (Style Dictionary fails otherwise) |
| layer | primitive · theme · semantic | Derived from source file location |
| description | Optional `$description`; mandatory for deprecated aliases | — |

### Layer

| Layer | Contents | May reference | Forked per theme? |
|---|---|---|---|
| primitive | Color ramps (gray, dark, info, success, warning, danger, white/black alphas, transparent), spacing scale, radius scale | nothing (literals only) | **Never** (shared) |
| theme | Brand ramp + em aliases, font families, type scale, weights, letter-spacing | primitive | Yes — one file per theme |
| semantic | surface, text, outline, inverse-white/black, overlay, elevation, typography aliases, deprecated compat aliases | primitive, theme, semantic (same layer allowed for special aliases) | Base file shared; per-theme override file allowed (FR-005) |

### Theme

A named, complete assignment of theme + semantic layers.

| Theme | Sources | Output | Activation |
|---|---|---|---|
| onmars (default) | `themes/onmars.tokens.json` + `semantic.tokens.json` + `modes/dark.tokens.json` | `dist/css/tokens.css` (also `tokens.light.css`, `tokens.dark.css`) | none — `:root` |
| material3 | onmars sources overridden by `themes/material3.tokens.json` + `semantic/material3.tokens.json` + `modes/material3.dark.tokens.json` | `dist/css/tokens.material3.css` | `data-ki-theme='material3'` on the document root + stylesheet loaded |

**Invariant (FR-005/FR-006, S6)**: for every theme × scheme, the set of
defined custom-property names is exactly equal to the onmars set. Enforced in
the browser suite by set comparison of both compiled stylesheets.

### Scheme

Light or dark variant within a theme.

| Scheme | Selector strategy (research.md D1) |
|---|---|
| light (default) | `:root` (onmars) / `:root[data-ki-theme='material3']` |
| dark, via system | `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-ki-color-scheme='light'])` (and the material3-scoped equivalent) |
| dark, forced | `:root[data-ki-color-scheme='dark']` (and material3-scoped equivalent) |
| light, forced | absence of dark match — the media block excludes `[data-ki-color-scheme='light']` |

## State transitions

Theme/scheme resolution is pure CSS cascade — no runtime state. Transitions
(user flips OS scheme, page sets/removes attributes) re-resolve instantly and
require no reload (spec edge case 3).

## Validation rules (enforced by gates)

1. Every reference resolves — Style Dictionary build fails on broken refs.
2. Contract equality across themes and schemes — browser test (S6).
3. Declared default text/surface pairs ≥ 4.5:1 per theme × scheme —
   `check-contrast.mjs` gate (FR-009): pairs = (text.high-em, surface.s0),
   (text.med-em, surface.s0), (text.high-em, surface.s1),
   (text.primary-on-primary, surface.primary-med-em).
4. Stylesheet ≤ 9 KB gzipped per theme — size-limit gate.
5. Scenario-to-test traceability — every S1-S7 ID appears in the browser
   suite (existing traceability gate).
