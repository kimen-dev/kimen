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
| onmars (default) | `themes/onmars.tokens.json` + `semantic.tokens.json` + `modes/dark.tokens.json` | `dist/css/tokens.css`: every token, once | none — `:root`; any element carrying `data-ki-theme` starts from it |
| material3 | onmars sources overridden by `themes/material3.tokens.json` + `semantic/material3.tokens.json` + `modes/material3.dark.tokens.json` | `dist/css/tokens.material3.css`: only the tokens whose expression differs from onmars | `data-ki-theme='material3'` on the root or on any element + both stylesheets loaded |

A theme is four **compositions** in the build (theme × scheme), each resolved
by Style Dictionary on its own; the two schemes of a theme are merged into
one expression per token, and a theme is emitted as its difference from the
default theme (research.md D8-D10).

**Invariant (FR-005/FR-006/FR-014, S6)**: for every theme × scheme, the set
of defined custom-property names is exactly the onmars set — under any theme
every name resolves, and a theme stylesheet declares names of that set only.
Enforced by the build (both compositions of a theme and every theme must
expose the same names), by the public-API surface gate and by the browser
suite.

### Scheme

Light or dark variant within a theme. The scheme is the `color-scheme`
property; tokens follow it through `light-dark()`.

| Scheme | Mechanism (research.md D8) |
|---|---|
| follow the system (default) | `:root { color-scheme: light dark }` in `tokens.css` |
| dark, forced | `[data-ki-color-scheme='dark'] { color-scheme: dark }` on the root or on any element |
| light, forced | `[data-ki-color-scheme='light'] { color-scheme: light }` on the root or on any element |

A scheme-dependent token is declared once, as
`light-dark(<light expression>, <dark expression>)`. Only colours can depend
on the scheme (FR-015); a composite (border, shadow) wraps each colour
component and must keep its geometry identical between schemes.

### Subtree

An element carrying `data-ki-theme` and/or `data-ki-color-scheme`.

| Declaration on an element | What the stylesheet does there |
|---|---|
| `data-ki-color-scheme` | Sets `color-scheme`; redeclares nothing (`light-dark()` resolves at the point of use) |
| `data-ki-theme` | Redeclares every default-theme token at zero specificity (`:where([data-ki-theme])`), so every alias is recomputed on that element; the named theme's overrides apply on top |

## State transitions

Theme/scheme resolution is pure CSS cascade — no runtime state. Transitions
(user flips OS scheme, page sets/removes attributes) re-resolve instantly and
require no reload (spec edge case 3).

## Validation rules (enforced by gates)

1. Every reference resolves — Style Dictionary build fails on broken refs.
2. Contract equality across themes and schemes — build (name sets), public-API
   surface gate and browser test (S6).
3. Declared default text/surface pairs ≥ 4.5:1 per theme × scheme —
   `check-contrast.mjs` gate (FR-009): pairs = (text.high-em, surface.s0),
   (text.med-em, surface.s0), (text.high-em, surface.s1),
   (text.primary-on-primary, surface.primary-med-em).
4. Stylesheet within its gzip budget per theme — size-limit gate.
5. Scenario-to-test traceability — every S1-S13 ID appears in the browser
   suite (existing traceability gate).
6. Only colours depend on the scheme, and a composite keeps its geometry —
   the build fails by token name (FR-015).
7. The emitted grammar is closed — the public-API surface gate accepts
   exactly: the three colour-scheme rules in order, one
   `:root, :where([data-ki-theme])` token rule, and for a theme one
   `:root[data-ki-theme='x'], [data-ki-theme='x']` rule; no conditional
   rules, no comments needed, nothing else.
8. The emitted sheets resolve to Style Dictionary's own value for every token
   in every theme × scheme — unit test over the real sources.
