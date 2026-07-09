# Public contract: `<ki-progress>`

The behavior contract is `specs/015-ki-progress/feature.feature` (S1–S15).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-progress>` — non-interactive, output-only progress indicator. Not
form-associated, never focusable, no activation behavior, no live-region
semantics (announced completion feedback belongs to ki-alert / the host
application). Registered by `@kimen/elements`; per-component export
`dist/components/ki-progress.js` (tree-shakable custom element build).

## Attributes / properties

All attributes reflect; TypeScript exposes them with complete JSDoc
(Art. I: an undocumented member is a build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `number` | `0` | Completed amount. Presented and exposed clamped to `0..max` (S4); non-numeric declarations fall back to `0` (S14, FR-001). The attribute keeps the consumer's declared value; normalization applies to presentation and ARIA only. Ignored for presentation while `indeterminate` is set (S15). |
| `max` | `number` | `100` | Total amount. Non-numeric, zero or negative declarations fall back to `100` so the fraction is always computable (S14, FR-002). |
| `indeterminate` | `boolean` | `false` | Explicit unknown-duration mode (a bare `<ki-progress>` is determinate at 0 — the deliberate divergence from native `<progress>`, spec Assumptions). When set: no completed fraction is presented, no current value is exposed to assistive technology (S3, S9, S15, FR-003), and the indicator carries the component's only animation — declared exclusively under `prefers-reduced-motion: no-preference` (S6, FR-009). |
| `shape` | `linear \| circular` | `linear` | Structural presentation axis chosen per layout context (an attribute, not a token — spec Assumptions). Both shapes render both modes (FR-004). Unrecognized values render the linear presentation (S5 — resolved by the pure `resolveShape`, research D2). |
| `label` | `string` | — | The accessible name: WHAT is progressing ("Uploading report.pdf"). Applied as an internal `aria-label` on the progressbar node; not visually rendered in v1 (FR-005). Without it the element still renders but exposes no accessible name and fails the accessibility audit — `label` is documented as REQUIRED for accessible usage; no fallback string ships (Art. IV). |

No other attribute is observed: anything else — including vocabulary copied
from other design systems (`buffer`, `paused`, `size`, `tone`) — is ignored.

## Slots

None. The progress renders no consumer content; visible captions or
percentage readouts compose in the host layout (spec Assumptions).

## Parts

Customization ladder: tokens first, then parts (no slots exist).

| Part | Contract |
|---|---|
| `track` | The full channel (linear) or ring (circular): track ink, radius/stroke geometry. |
| `indicator` | The advancing fill (linear) or arc (circular): indicator ink; carries the indeterminate animation. |

Exactly two parts in both shapes. The internal ARIA node and the circular
`svg` carry no part — implementation vehicles, not customization surfaces.

## Events

None. The progress emits nothing and intercepts nothing (FR-007). Observers
read `value`/`max`/`indeterminate` off the element.

## Accessibility contract

- Role `progressbar` with the accessible name from `label`, exposed from a
  single stable node in both shapes (S8; research D1).
- Determinate: `aria-valuemin="0"`, `aria-valuemax` = normalized max,
  `aria-valuenow` = clamped value, updated on runtime `value` changes
  (S8, S13). Indeterminate: `aria-valuenow` is omitted entirely — no
  fabricated value (S9, S15).
- Zero tab stops, no pointer affordance, no events: a keyboard user tabs
  straight past (S7, FR-007).
- No live region: value ticks are never announced (spec-approved);
  completion feedback that must be announced belongs to ki-alert (011).
- The only motion is the indeterminate animation; with
  `prefers-reduced-motion` active, zero indefinitely-running animations are
  observable in the indicator's animation state (S6, FR-009's oracle). The
  stilled presentation remains visible; its distinguishability from a
  determinate bar is theme design guidance, not a gated criterion.
- Indicator-on-track meets WCAG 1.4.11 non-text contrast (≥ 3:1) in all
  four theme × scheme contexts, CI-gated (FR-012, research D7).

## CSS custom properties (component token layer)

```text
# Geometry per shape
--ki-progress-linear-thickness        bar block-size
--ki-progress-linear-radius           bar corner radius
--ki-progress-circular-size           ring diameter
--ki-progress-circular-track-width    ring stroke width

# Color per anatomy part (both shapes, both modes)
--ki-progress-track-color             track ink
--ki-progress-indicator-color         indicator ink

# Motion
--ki-progress-indeterminate-duration  indeterminate sweep cycle duration
```

Guarantees:

- Every visual property resolves from `--ki-progress-*`; colors and metrics
  resolve from the 001 semantic layer (Art. VI). Zero hardcoded visual
  values in component CSS; the runtime fill fraction is state, not
  appearance (research D3).
- `--ki-progress-indeterminate-duration` is the system's FIRST motion
  token; its value is a component-layer literal because no semantic motion
  family exists (declared deviation, research D6 — a `ki.motion.*` family
  arrives only when a third consumer justifies it, Art. VII).
- **No interaction-state segments and no focus-ring tokens exist** — the
  progress is static output and never focusable; this is the documented
  deviation from the 002 button naming template (spec Art. VI echo; 010
  precedent).
- Keyframe internals (sweep fractions, easing) are animation structure, not
  tokens (008 position); only the cycle duration is themable in v1.
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs)

- **When to use**: communicate the advancement of an ongoing task (upload,
  download, installation, multi-step processing) with `value`/`max` when
  the fraction is known, or ongoing activity of unknown duration with
  `indeterminate` (including the M3 loading-indicator use). `shape` follows
  the layout context: `linear` in page flows and lists, `circular` in
  compact or centered placements. Always set `label` to WHAT is progressing.
- **When NOT to use**: static measurements within a known range (disk
  usage, scores — a gauge/meter concern, not a task), step-by-step wizard
  navigation (a stepper concern), skeleton placeholders while content
  loads, or operations that finish in under about one second, where a flash
  of progress is noise.

## Compatibility

First release of the element (pre-1.0 line): additive MINOR. Removing or
renaming anything above after first publish is MAJOR per Art. IX.
