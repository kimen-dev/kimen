# Public contract: `<ki-radio-group>` + `<ki-radio>`

The behavior contract is `specs/007-ki-radio-group/feature.feature`
(S1–S25). This document freezes the public API surface the scenarios
observe — for BOTH elements of the composite (the sub-component belongs to
the parent's spec per the batch charter). Any deviation discovered during
implementation re-enters through the spec, not through code (Art. II).

## Elements

`<ki-radio-group>` — form-associated custom element (participates in
native forms through ElementInternals, 002 pattern; sibling of 003/006/008
under the Fase 2 charter). THE form control of the composite: field name,
value, group label, required/disabled semantics, keyboard model and
selection invariant all live here. Registered by `@kimen/elements`;
per-component export `dist/components/ki-radio-group.js`.

`<ki-radio>` — one option. NOT form-associated, NOT valid standalone:
documented as usable only inside a `ki-radio-group` (when-NOT-to-use).
Per-component export `dist/components/ki-radio.js`; consumers importing
the group must import both.

## Attributes / properties — `ki-radio-group`

TypeScript exposes them as typed properties with complete JSDoc (Art. I:
an undocumented member is a build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `name` | `string` | — | Form-data key for the selected option's value (S12). Omitted → no entry. |
| `value` | `string` | `""` | PROJECTION of the selection: always equals the selected option's value, or `""` when none is selected (FR-002). The attribute declares the initial selection (first option whose value matches; a value matching no option leaves the group unselected and operable — S4). Assigning the property selects the first matching option, or none, SILENTLY (no `input`/`change`; FR-003). Not reflected: serialized markup keeps the initial declaration; live state is read from the property. With duplicate option values, user selection is tracked by option identity; programmatic assignment is first-match (spec edge case). |
| `label` | `string` | — | The group's visible label and accessible-name source (S10, FR-009). Rendered as text in `part="label"`, wired to the internal `role="radiogroup"` via `aria-labelledby`. A11y-required: an unlabeled group is misuse and fails the a11y gate. |
| `required` | `boolean` | `false` | While no selection exists, the group is `valueMissing` (platform-computed and platform-localized — research D7), blocks form submission and is reported invalid (S13); exposed as required to AT (S22); invalid exposure appears only after a blocked submission attempt, never on first render (S23). A selection preserved on a disabled option still satisfies `required` (S24). Boolean presence semantics. |
| `disabled` | `boolean` | `false` | Every option inert and unfocusable, the group skipped by Tab (S20) and exposed as unavailable (S19); excluded from form data; `fieldset[disabled]` honored identically (S15). Boolean presence semantics. |

## Attributes / properties — `ki-radio`

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `string` | `"on"` | The submission value the GROUP projects when this option is selected (S1, S12). Defaults to `"on"` for native parity. |
| `disabled` | `boolean` | `false` | Not selectable (S3), not focusable, skipped by arrow navigation (S7), exposed as unavailable (S11). Disabling the SELECTED option preserves the selection and the group's value but withholds the form entry and moves the group's tab stop, dispatching no events (S24, FR-006). Boolean presence semantics; reflected (the group observes this attribute). |

`ki-radio` has NO checked/selected member. Selection is owned by the
group and is never authored on an option (FR-002) — an agent or app that
wants a pre-selected option sets the GROUP's `value`.

## Slots

| Element | Slot | Contract |
|---|---|---|
| `ki-radio-group` | (default) | The `ki-radio` options, as slotted children; document order is navigation order. Options inserted/removed at runtime reconcile silently (spec edge cases). |
| `ki-radio` | (default) | The option label: accessible-name source (S10) and native activation surface — clicking it selects the option (006 D1 anatomy). Mandatory for valid usage. Control leads, label trails, following the writing direction (S18, RTL-safe). |

No named slots in v1.

## Parts

| Element | Part | Contract |
|---|---|---|
| `ki-radio-group` | `label` | The rendered visible group label (typography from `--ki-radio-group-label-*`). |
| `ki-radio` | `control` | The visual ring and inner dot: background, border, radius, focus ring. Second rung of the customization ladder. |
| `ki-radio` | `label` | Wrapper around the default slot (label typography and gap). |

## Events

No custom events (charter: platform names, no `ki-*` re-emission). Both
are observed on `ki-radio-group` (the form control):

| Event | Semantics |
|---|---|
| `input` | Native, composed — fires on each user-driven selection change, before `change` (S1). It originates at the activated option's native input and bubbles through the group retargeted to the `ki-radio`; when a listener on the group observes it, the group's `value` already reads the new selection (capture-phase update, research D5). |
| `change` | Dispatched from the GROUP host as composed+bubbling on each user-driven selection change (S1) — the native event is not composed and would die at the option's shadow root; re-dispatching from the form-associated host is the sibling convergence (003 D5/006 D6/008 D4) applied to the composite. Never fired for programmatic `value` assignment, reconciliation after DOM mutation, or form reset (FR-003); never fired when the option or group is disabled (S3, S19). Exactly one per selection change; re-selecting the selected option fires nothing. |

Keyboard (all group-owned, FR-004/FR-005): the group is ONE tab stop —
Tab enters on the selected option, or the first enabled option without
selecting (S5, S25), and leaves in a single step (S9); Up/Down = previous/
next always, Left/Right follow the writing direction (S21); arrows wrap
and skip disabled options, and selection follows focus (S6, S7); Space
selects a focused unselected option (S8). Home/End are not part of the v1
contract.

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every selection × interaction state resolves
  from `--ki-radio-*` / `--ki-radio-group-*`; those resolve from the
  semantic layer (Art. VI, FR-010). Control geometry, gap and typography
  are tokens — no `size` attribute exists in v1.
- Interaction states (hover, active, disabled, focus) are CSS states
  styled through tokens, never attributes/props (FR-010); the selected
  presentation renders from the internal native input's checked state,
  never from an authored attribute.
- The inner dot is pure CSS drawn from token inks (no SVG, no icon font);
  selection-state transitions are suppressed under
  `prefers-reduced-motion` (FR-014).
- Focus is clearly visible in every theme via `--ki-radio-focus-ring-*`;
  each option's pointer target is ≥ 24×24 px via `--ki-radio-min-target`
  (FR-011).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract). Switching the theme declaration restyles every state
  with zero markup changes (S16, S17).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: a person must choose exactly one of a small set of
  mutually exclusive options that should all be visible at once
  (typically 2–5). Always with a group `label` and a slotted label per
  option.
- **When NOT to use**: many options or constrained space (use ki-select);
  an independent on/off setting (use ki-checkbox for later submission,
  ki-switch for immediate effect); multiple selection (use a checkbox
  group); `ki-radio` outside a `ki-radio-group` (unsupported); authoring
  selection on an option — there is no `checked` on `ki-radio`; set the
  group's `value` instead.

## Compatibility

First release of both elements (pre-1.0 line); purely additive — no
existing API changes. Removing or renaming anything above after first
publish is MAJOR per Art. IX. The group→option coordination mechanism is
an internal implementation detail, explicitly outside this contract.
Deferred additive candidates recorded by the spec: an `orientation`
attribute (gate-1 open question), a `size` axis (if a design source ever
demands one), an invalid visual treatment (custom state + tokens, aligned
with 006), validation-message display (batch-wide v1 exclusion, 003
precedent), Home/End navigation.
