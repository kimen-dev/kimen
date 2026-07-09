# Public contract: `<ki-switch>`

The behavior contract is `specs/008-ki-switch/feature.feature` (S1–S21).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-switch>` — form-associated custom element (participates in native
forms through ElementInternals, 002 pattern). Registered by
`@kimen/elements`; per-component export `dist/components/ki-switch.js`
(tree-shakable custom element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect; `checked` reflects
live state (see its row).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `checked` | `boolean` | `false` (off) | On/off state, applied immediately. Boolean presence semantics: ANY attribute value — including malformed ones like `"maybe"` or `"false"` — means on; rendering never breaks (S4, FR-001). Reflects live state (a user toggle updates the attribute), so the serialized markup always agrees with the visual state; the reset default is a snapshot taken at form association, NOT the attribute (FR-005). Programmatic changes update state and presentation without dispatching events (FR-002). |
| `disabled` | `boolean` | `false` | No toggle (S3), out of the tab order (S20), no form contribution, exposed as unavailable to AT (S9); `fieldset[disabled]` honored (S13). |
| `name` | `string` | — | Form-data key contributed while on (S10). Omitted → no entry. |
| `value` | `string` | — (submits `"on"`) | Replaces the default submitted value `"on"` (S18, native checkbox parity). An off switch never contributes any value, custom or not (S11). |

No `size`, `variant`, `tone`, `required` or `indeterminate` in v1 (spec
Assumptions, Art. VII). Deferred additive candidates recorded by the spec:
`size` (if M3 frame verification finds scaled switches), thumb icons (as
slots or theme-token glyphs).

## Slots

| Slot | Contract |
|---|---|
| default | The label — the accessible-name source (FR-007). Required content: usage without it has no accessible name and is invalid (flagged by audits, documented in the catalog). Activating the slotted label toggles the switch (S17). Order relative to the control follows the writing direction (S16). |

## Parts

| Part | Contract |
|---|---|
| `track` | The on/off channel: background, border, radius; hosts the focus ring. Second rung of the customization ladder (after tokens, before slots). |
| `thumb` | The traveling handle. Its position conveys the state; in RTL the on-state thumb rests at the track's inline end (S16). Travel animation suppressed under reduced motion (S19). |
| `label` | Wrapper around the slotted label content. |

The internal native input is not a part: the customization surface is
exactly these three names (spec API delta).

## Events

No custom events (charter: platform names, no `ki-*` re-emission).

| Event | Semantics |
|---|---|
| `input` | Native, composed — fires exactly once per user toggle (S1). Passes through the shadow boundary retargeted to the host. No `detail`; read `checked` off the element. |
| `change` | Re-dispatched from the host as composed+bubbling, exactly once per user toggle (S1, S17) — the native event is not composed and would die at the shadow root. Never fired for programmatic `checked` changes (FR-002). |

Keyboard: Space toggles the focused switch (S6, APG switch pattern). Enter
does nothing — native checkbox parity, no implicit form submission from a
toggle (research D1/D5; the approved contract mandates Space only).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every checkedness × interaction state resolves
  from `--ki-switch-*`; those resolve from the semantic layer (Art. VI,
  FR-008). Both shipped themes (onmars, material3) fill the full matrix.
- Interaction states (hover, focus-visible, active, disabled) are CSS
  states styled through tokens; states are never attributes/props (FR-009).
- Thumb travel uses logical positioning only — RTL mirrors by construction
  (FR-012) — and its transition exists only under
  `prefers-reduced-motion: no-preference` (FR-011, S19).
- The pointer target keeps ≥ 24×24 px in every theme via
  `--ki-switch-min-target` (FR-013).
- Thumb-on-track state indication clears WCAG 1.4.11 non-text contrast
  (3:1) in every theme × scheme — CI-gated by the extended component sweep
  (research D8).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: a binary setting whose change takes effect immediately
  (enable notifications, toggle dark mode), always with a slotted label.
- **When NOT to use**: a selection collected for later form submission —
  use ki-checkbox (the classic confusion: switch = immediate effect,
  checkbox = recorded choice); mutually exclusive choices — use
  ki-radio-group; triggering an action — use ki-button; unlabeled usage
  (no accessible name). Boolean usage note: `checked` follows presence
  semantics — `checked="false"` still renders on; omit the attribute to
  express off.

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec: a
`size` axis (pending M3 frame verification), thumb icons, motion tokens.
