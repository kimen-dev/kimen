# Public contract: `<ki-tooltip>`

The behavior contract is `specs/013-ki-tooltip/feature.feature` (S1–S17).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-tooltip>` — supplementary-text overlay wrapping its trigger. NOT
form-associated (transient descriptive overlay; form family N/A-justified
in the spec). Registered by `@kimen/elements`; per-component export
`dist/components/ki-tooltip.js` (tree-shakable custom element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `label` | `string` | — | The ENTIRE tooltip content, text-only by construction (FR-001). Exposed as the trigger's accessible description; the trigger's name never changes (S7). Empty or whitespace-only: the tooltip never shows and no description is exposed (S13). |
| `placement` | `'top' \| 'bottom' \| 'start' \| 'end'` | `'top'` | Position PREFERENCE (FR-007): the component repositions to keep the tooltip fully inside the viewport (S14, SC-005). `start`/`end` follow the document writing direction (S11). Unknown values fall back to `top` (S3, FR-008). Reflected. |

## Slots

| Slot | Contract |
|---|---|
| *(default)* | THE trigger: exactly one interactive, focusable element. The component attaches reveal behavior and description semantics to it without altering its behavior; annotating it with `aria-description` is part of attaching those semantics (FR-002). Additional slotted content is outside the contract (documented usage constraint). |

## Parts

| Part | Contract |
|---|---|
| `tooltip` | The tooltip bubble (`role="tooltip"`). Second rung of the customization ladder (after tokens). Never focusable, never interactive (FR-006). |

## Events

No custom events in v1. Reveal/dismiss is observable through visibility and
the accessibility tree; `ki-show`/`ki-hide` would be additive MINOR
(Art. VII/IX, spec Assumptions).

## Behavior contract (what the scenarios pin)

- Shows on pointer hover (short tokenized hover-intent delay permitted) AND
  on keyboard focus (always without delay) — FR-003, S1/S4, SC-001.
- Hides on pointer leave (of trigger AND tooltip — the pointer may rest on
  the tooltip, WCAG 1.4.13 hoverable), on focus loss, and on Escape —
  FR-004/FR-005, S2/S5/S6/S12.
- Escape dismisses without moving focus and without activating the trigger
  (SC-002) and is CONSUMED: with a tooltip open inside an open dialog, the
  first Escape hides only the tooltip; the dialog stays open — FR-013,
  S15/S16 (cross-spec precedence recorded for 012-ki-dialog in research D5).
- Description semantics: the component sets `aria-description` (never
  `aria-describedby`, never the name) on the slotted trigger while `label`
  is non-blank — S7/S8/S13; the association is static, independent of
  visibility. Consumer-authored `aria-describedby` on the trigger outranks
  it (accname computation) — do not wrap triggers that carry their own
  description machinery.
- No touch gesture in v1 (spec open question for gate 1); tooltip content
  is never essential, so nothing is lost.

## CSS custom properties (component token layer)

The full vocabulary in [data-model.md](../data-model.md#token-vocabulary-component-layer-research-d8).
Guarantees:

- Every visual property (surface, text, radius, spacing, typography,
  elevation, offset, max width) AND the show/hide delays resolve from
  `--ki-tooltip-*`; those resolve from the semantic layer (Art. VI).
- A theme restyles the tooltip by reassigning semantic tokens and, where
  needed, component-layer overrides — never markup or component code
  (S9, S10).
- Label/background contrast ≥ 4.5:1 is CI-gated in every theme × scheme.
- Placement is behavior, not appearance: themes cannot change it.

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: a brief text hint that clarifies a control — icon-only
  buttons, abbreviations, truncated labels; the same information must be
  discoverable elsewhere in the interface.
- **When NOT to use**: essential or unique information (put it in the
  layout), interactive or rich content — title, body, actions (future
  popover component), form validation messages (the field's own validation
  display), disabled controls (unreachable by keyboard and AT — the hint
  would be lost exactly when needed), touch-primary flows (no touch
  gesture in v1).

## Compatibility

First release of the element (pre-1.0 line). Removing or renaming anything
above after first publish is MAJOR per Art. IX. Named additive futures
(MINOR): `arrow` part, `ki-show`/`ki-hide` events, touch long-press,
opacity fade behind `prefers-reduced-motion`, popover/anchor-positioning
upgrade of the positioning mechanism (observable contract unchanged).
