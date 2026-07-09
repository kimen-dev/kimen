# Public contract: `<ki-textarea>`

The behavior contract is `specs/004-ki-textarea/feature.feature` (S1–S25).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-textarea>` — form-associated custom element (participates in native
forms through ElementInternals, 002/003 pattern). Registered by
`@kimen/elements`; per-component export `dist/components/ki-textarea.js`
(tree-shakable custom element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect except `value` (see
its row).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `label` | `string` | — | Rendered as the visible on-screen label AND the accessible name (S9). Mandatory for valid usage; a missing label is misuse and fails the a11y gate. |
| `placeholder` | `string` | — | Hint shown only while the field is empty (S19); never the accessible name, never a label substitute. |
| `value` | `string` | `''` | Property = live current text, line breaks included (S1, S2). Attribute = declared default only; never rewritten by typing; restored on form reset (S13). Programmatic assignment replaces the display and emits NO events. NOT reflected. Light-DOM text content is IGNORED — the initial text is declared through this attribute (agent note, spec Edge Cases). |
| `name` | `string` | — | Form-data key for the submitted text (S12). Omitted → no entry. |
| `rows` | `number` (positive integer) | `2` | Fixes the visible line count and therefore the field height (S3): no auto-grow, no user resize handle in v1 (founder-approved 2026-07-08). Non-numeric or invalid values fall back to the default (S6). |
| `required` | `boolean` | `false` | Empty field blocks submission and reports a missing value (S14); exposed to AT (S10); readonly exempts (FR-006). |
| `readonly` | `boolean` | `false` | Focusable and selectable, rejects edits (S4), still submits (S23), exempt from `required` (FR-006), exposed as read-only to AT (S22). |
| `disabled` | `boolean` | `false` | No entry, never focused (S5), no form contribution (S16), `fieldset[disabled]` honored (S15), exposed as unavailable to AT (S11). |
| `autocomplete` | `string` | — | Forwarded verbatim to the internal entry control so the entry purpose is programmatically exposed (S25; WCAG 2.2 SC 1.3.5). |

## Slots

NONE in v1 — deliberate (spec Assumptions): the label is an attribute and
affix slots on a multiline field are excluded; adding them later is
additive MINOR. There is no default slot, so element text content never
renders (see `value` row).

## Parts

| Part | Contract |
|---|---|
| `field` | The enclosure wrapper (background, border, radius, focus ring). Second rung of the customization ladder (after tokens). |
| `textarea` | The internal native multiline control (entered text, caret, selection, internal scrolling; native resize handle neutralized). |
| `label` | The rendered visible label. |

## Events

No custom events (charter: platform names, no `ki-*` re-emission).

| Event | Semantics |
|---|---|
| `input` | Native, composed — fires per user edit during entry (S1). Passes through the shadow boundary retargeted to the host. |
| `change` | Re-dispatched from the host as composed+bubbling when the user commits an edit (S20) — the native event is not composed and would die at the shadow root. Never fired for programmatic assignments. |

Keyboard contract: Enter inserts a line break and NEVER submits the
enclosing form (S8) — the exact inverse of `<ki-input>`; both catalogs
document the contrast. Tab exits the field without inserting a character
(S21). Form lifecycle observes native `submit`/`reset`/`invalid` events.

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every state resolves from `--ki-textarea-*`;
  those resolve from the semantic layer (Art. VI, FR-011). State keys are
  aligned with `--ki-input-*` (same batch, same vocabulary).
- The field height is `rows × --ki-textarea-line-height` plus
  `--ki-textarea-padding-block` — the line unit is a token, the count is
  the attribute; there is no height token and no resize handle (research
  D7).
- The enclosure style (M3 filled vs outlined) is a per-theme token
  decision expressed through the per-logical-side border-width tokens —
  never an attribute (S17, FR-011).
- Interaction states (hover, focus, disabled, readonly, invalid) are CSS
  states styled through tokens; the invalid appearance surfaces only after
  interaction or a submission attempt (`:state(user-invalid)`, FR-012).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).
- The contrast gate sweeps this matrix (entered text, placeholder and
  label inks; disabled exempt — research D10).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: free-form text longer than one line — comments,
  descriptions, messages, delivery notes — always with a visible `label`;
  pair with the matching `autocomplete` purpose (e.g. `street-address`)
  when one exists.
- **When NOT to use**: single-line values (ki-input), constrained choices
  (future ki-select / ki-checkbox / ki-radio-group), rich or formatted
  text editing (no Kimen component; out of scope), search boxes (ki-input
  `type="search"`).
- **Agent notes**: (1) the initial text is declared through the `value`
  attribute — element text content is ignored, unlike the native multiline
  control; (2) Enter inserts a line break and never submits — the inverse
  of ki-input's implicit submission.

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec:
auto-grow, user resize handle, `maxlength` + character counter (deferred
together, gate-1 question), helper/supporting text, on-screen validation
messages, affix slots, size axis.
