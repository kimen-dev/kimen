# Phase 1 Data Model: ki-progress

No persistent data. The model is the normalization pipeline, the mode
precedence and the ARIA exposure the scenarios assert. The normative API
contract lives in
[contracts/progress-contract.md](./contracts/progress-contract.md); this
file models values, defaults and derivations. (010 omitted its data model
because a badge has no logic; ki-progress keeps one precisely because the
normalization arithmetic and mode precedence ARE logic — plan.md Summary.)

## Attribute model

| Attribute | Type | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | number | `0` | yes | non-numeric (NaN after Stencil coercion) → `0`; `< 0` → `0`; `> max` → `max` (S4, S14, FR-001). The ATTRIBUTE keeps what the consumer declared; normalization applies to presentation and ARIA only |
| `max` | number | `100` | yes | non-numeric, `0` or negative → `100`, so the fraction is always computable (S14, FR-002) |
| `indeterminate` | boolean (presence) | `false` | yes | when present, wins over any declared `value`: no fraction presented, no `aria-valuenow` exposed (S15, FR-003) |
| `shape` | `linear \| circular` | `linear` | yes | unrecognized → the linear markup and presentation (S5, FR-004 — resolved in render via the pure `resolveShape`, research D2) |
| `label` | string | — | yes | absent → NO `aria-label` rendered (never empty-string); the element exposes no accessible name and fails the audit; documented as required (FR-005) |

No `size`, `tone`, buffer/secondary value, `paused`/`error` states, live
region or visible-label rendering — the spec's Assumptions exclude each
explicitly (Art. VII).

## Normalization pipeline (pure, `ki-progress.math.ts` — research D2)

```text
raw max  ──▶ normalizeMax(raw):  finite && > 0 ? raw : 100
raw value ─▶ clampValue(raw, max): finite ? min(max, max(0, raw)) : 0
raw shape ─▶ resolveShape(raw): raw === 'circular' ? 'circular' : 'linear'

fraction = clampValue / normalizeMax        (always computable: max > 0)
```

S14 table verbatim (the unit suite's cases, the mutation-gap compensating
control):

| declared value | declared max | fill | exposed value of 100 |
|---|---|---|---|
| -10 | 100 | 0% | 0 |
| abc | 100 | 0% | 0 |
| 40 | 0 | 40% | 40 |
| 40 | -5 | 40% | 40 |
| 40 | abc | 40% | 40 |

Plus S4: 250 of 100 → fill 100%, exposed 100.

## Mode precedence and derived render state

```text
                     indeterminate present?
                    ┌────────── yes ──────────┐        ┌───── no ─────┐
 fraction            none presented (S15)               value ÷ max (S1, S2)
 aria-valuenow       OMITTED (S9, S15)                  clamped value (S8, S13)
 indicator           keyframe animation, declared        static geometry from
                     ONLY under prefers-reduced-motion:  --_ki-progress-fraction
                     no-preference (S3 / S6, FR-009)     (no transition in v1)
```

- Runtime `value` changes re-derive fraction and `aria-valuenow` (S13); no
  live region exists — announcing ticks is noise; announced completion
  belongs to ki-alert (spec edge case).
- FR-009 oracles: S3 = ≥1 running, infinitely-iterating animation on the
  indicator (`getAnimations()`); S6 = zero. The reduced-motion stilled
  presentation is the keyframes' resting geometry — visual
  distinguishability from a determinate bar is theme design guidance, not
  gated (spec Assumptions).

## ARIA exposure model (single stable node, research D1)

| Surface | Determinate | Indeterminate |
|---|---|---|
| role | `progressbar` | `progressbar` |
| name | `aria-label` = `label` (absent attribute when no label) | same |
| `aria-valuemin` | `"0"` | `"0"` |
| `aria-valuemax` | normalized max | normalized max |
| `aria-valuenow` | clamped value (S8) | **omitted** (S9, S15) |
| tab order | never — generic div, no tabindex (S7) | same |
| events | none | none |

## Shape → anatomy branch (render-time, `resolveShape`)

| Shape | Anatomy inside `.base` | Fill mechanism |
|---|---|---|
| `linear` | `div[part=track]` > `div[part=indicator]` | `inline-size: calc(var(--_ki-progress-fraction) * 100%)` — logical, so RTL fills from the right edge (S12, FR-014) |
| `circular` | `svg[aria-hidden]` > `circle[part=track]` + `circle[part=indicator]`, both `pathLength="100"` | `stroke-dasharray: calc(var(--_ki-progress-fraction) * 100) 100` — size/stroke tokens never touch the dash math; ring starts at top, sweeps clockwise in both directions (spec assumption) |

`--_ki-progress-fraction` is runtime state on the host style, not a visual
token (research D3); every color/metric/duration resolves through the
`--_ki-progress-*` indirection from `--ki-progress-*` (002 pattern).

## Token vocabulary (component layer — 7 per theme, research D6)

```text
--ki-progress-linear-thickness        bar block-size          → ki.space.*
--ki-progress-linear-radius           bar corner radius       → ki.radius.*
--ki-progress-circular-size           ring diameter           → ki.space.*
--ki-progress-circular-track-width    ring stroke width       → ki.space.*
--ki-progress-track-color             track ink, both shapes  → ki.surface.* (neutral ramp)
--ki-progress-indicator-color         indicator ink, both shapes → ki.surface.* (primary ramp)
--ki-progress-indeterminate-duration  sweep cycle duration    → LITERAL (first motion token;
                                                                no semantic motion family exists — research D6)
```

- No interaction-state segments, no focus-ring tokens (static output, never
  focusable — documented deviation from the button template, spec Art. VI
  echo).
- Gate note: `indicator-color` over `track-color` joins the contrast sweep
  at the WCAG 1.4.11 non-text 3:1 minimum in all four theme × scheme
  contexts (FR-012, research D7; per-pair minimum mechanism coordinated
  with 008).
- material3 overrides the same names in `progress.material3.tokens.json`;
  missing theme values fall back through the cascade to onmars (001
  contract).

## Parts (no slots)

| Surface | Name | Purpose |
|---|---|---|
| part | `track` | the full channel/ring (background ink, radius/stroke geometry) |
| part | `indicator` | the advancing fill/arc (indicator ink; carries the indeterminate animation) |

The `.base` node and the circular `svg` carry no part: the contract exposes
exactly two parts (spec API delta); the ARIA node and the svg are
implementation vehicles, not customization surfaces.
