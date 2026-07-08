# Public contract: `<ki-input>`

The behavior contract is `specs/003-ki-input/feature.feature` (S1–S28).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-input>` — form-associated custom element (participates in native forms
through ElementInternals, 002 pattern). Registered by `@kimen/elements`;
per-component export `dist/components/ki-input.js` (tree-shakable custom
element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect except `value` (see its
row).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `type` | `'text' \| 'email' \| 'password' \| 'url' \| 'tel' \| 'search'` | `'text'` | Entry kind with native semantics preserved per kind (password masking — S5; email/url native validity — S28). Unknown → behaves as `text` (S6). `number` is NOT a v1 value. |
| `label` | `string` | — | Rendered as the visible on-screen label AND the accessible name (S9, S19). Mandatory for valid usage; a missing label is misuse and fails the a11y gate. |
| `placeholder` | `string` | — | Hint shown while empty; never the accessible name (S23), never a label substitute. |
| `value` | `string` | `''` | Property = live current value (S1, S20). Attribute = declared default only; never rewritten by typing; restored on form reset (S13). Programmatic assignment replaces the display and emits NO events (S20). NOT reflected. |
| `name` | `string` | — | Form-data key for the submitted entry (S12). Omitted → no entry. |
| `required` | `boolean` | `false` | Empty field blocks submission and reports invalid (S14); exposed to AT (S10); readonly exempts (S27). |
| `readonly` | `boolean` | `false` | Focusable and selectable, rejects edits (S4, S22), still submits (S26), exempt from `required` (S27), exposed as read-only to AT (S24). |
| `disabled` | `boolean` | `false` | No entry (S3), out of tab order, no form contribution (with `fieldset[disabled]` honored — S15), exposed as unavailable to AT (S11). |
| `autocomplete` | `string` | — | Forwarded verbatim to the internal entry control so the entry purpose is programmatically exposed (S25; WCAG 2.2 SC 1.3.5). |

## Slots

| Slot | Contract |
|---|---|
| `start` | Leading icon or text affix inside the field. Follows writing direction (RTL-safe, S18). |
| `end` | Trailing icon or text affix. Follows writing direction. |

No default slot: the label is an attribute, guaranteeing accessible-name
wiring by construction.

## Parts

| Part | Contract |
|---|---|
| `field` | The enclosure wrapper (background, border, radius, focus ring). Second rung of the customization ladder (after tokens, before slots). |
| `input` | The internal native input (entry text, caret, selection). |
| `label` | The rendered visible label. |

## Events

No custom events (charter: platform names, no `ki-*` re-emission).

| Event | Semantics |
|---|---|
| `input` | Native, composed — fires per user edit during entry (S1). Passes through the shadow boundary retargeted to the host. |
| `change` | Re-dispatched from the host as composed+bubbling when the user commits an edit (S2) — the native event is not composed and would die at the shadow root. Never fired for programmatic assignments (S20). |

Form lifecycle observes native `submit`/`reset`/`invalid` events on the
form/host. Pressing Enter in the field performs implicit submission with
constraint validation (S8).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every type × state combination resolves from
  `--ki-input-*`; those resolve from the semantic layer (Art. VI, FR-010).
- The enclosure style (M3 filled vs outlined) is a per-theme token decision
  expressed through the per-logical-side border-width tokens — never an
  attribute (S16, FR-010).
- Interaction states (hover, focus, disabled, readonly, invalid) are CSS
  states styled through tokens; the invalid appearance surfaces only after
  interaction or a submission attempt (`:state(user-invalid)`, S21,
  FR-011).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: collecting one line of free text from a person (name,
  email, password, URL, phone, search query), always with a visible
  `label`; pick the `type` matching the entry purpose and pair it with the
  matching `autocomplete` value.
- **When NOT to use**: multiline text (future ki-textarea), choosing among
  predefined options (future ki-select / ki-radio-group), boolean state
  (future ki-checkbox / ki-switch), numeric stepper entry (`type="number"`
  is post-v1); the placeholder is never a label substitute.

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec:
helper/supporting text, on-screen validation messages, `type="number"`,
size axis, slotted rich label.

## Declared deviation (review round 1, Important-4)

Programmatically assigning the `value` ATTRIBUTE after a user edit replaces
the displayed value (silently — no `input`/`change`); a native input would
keep the user's dirty value. Deliberate (research D2, Art. VII): Stencil
syncs attribute to prop unconditionally, and no approved scenario observes
the native nuance. Form reset restores the attribute's current value.
