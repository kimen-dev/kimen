# Public contract: `<ki-select>` + `<ki-option>`

The behavior contract is `specs/005-ki-select/feature.feature` (S1–S25).
This document freezes the public API surface the scenarios observe — for
BOTH elements of the composite (the sub-component belongs to the parent's
spec per the batch charter). Any deviation discovered during
implementation re-enters through the spec, not through code (Art. II).

## Elements

`<ki-select>` — form-associated custom element (participates in native
forms through ElementInternals, 002 pattern; sibling of 003/006/007/008
under the Fase 2 charter). THE control of the composite: label,
placeholder, field name, value, required/disabled semantics, the popup,
the APG select-only combobox keyboard model and the selection invariant
all live here. Registered by `@kimen/elements`; per-component export
`dist/components/ki-select.js`.

`<ki-option>` — one selectable choice, expressed as DATA: a machine-facing
`value`, a human-facing label (its text content) and availability
(`disabled`). NOT form-associated, NOT valid standalone, and NOT
self-rendering: like a native `<option>`, its markup declares the choice
and the select renders it (mirror rows in the select's shadow — research
D1). Documented as usable only inside a `ki-select`
(when-NOT-to-use). Per-component export `dist/components/ki-option.js`;
consumers importing the select must import both.

## Attributes / properties — `ki-select`

TypeScript exposes them as typed properties with complete JSDoc (Art. I:
an undocumented member is a build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `label` | `string` | — | The select's visible label and accessible-name source (S11, FR-002). Rendered as text in `part="label"`, associated to the trigger via native `<label for>` (click focuses the trigger). A11y-required: an unlabeled select is misuse and fails the a11y gate. |
| `placeholder` | `string` | — | Rendered in `part="value"` while no selection exists (S2, S5, FR-003). Application-provided — no hardcoded user-visible strings. |
| `name` | `string` | — | Form-data key for the selected option's value (S13). Omitted → no entry. |
| `value` | `string` | `""` | PROJECTION of the selection: always equals the selected option's value, or `""` when none is selected (FR-004). The attribute declares the initial selection (first option whose value matches). Assigning the property selects the first matching option, or none, SILENTLY (no `input`/`change`; FR-005). A value matching no option — declared, assigned, or left dangling after `ki-option` children change — falls back to no selection and the placeholder (S5, S25); reading then returns `""`. Not reflected: serialized markup keeps the initial declaration; live state is read from the property. With duplicate option values, user selection is tracked by option identity; value resolution is first-match (spec edge case). |
| `disabled` | `boolean` | `false` | The select never opens, is unreachable in the tab order and is exposed as unavailable (S3); excluded from form data; `fieldset[disabled]` honored identically (S16). Disabling while the popup is open closes it without committing (edge). Boolean presence semantics. |
| `required` | `boolean` | `false` | The select is invalid exactly when the value it would submit is `""` — no selection, or a selected option carrying an empty-string value (native placeholder-option parity, FR-009). Blocks form submission via constraint validation with a platform-computed, platform-localized message (research D7); reported invalid (`aria-invalid` on the trigger) only after a blocked submission attempt, never on first render (S14). Boolean presence semantics. |

## Attributes / properties — `ki-option`

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `string` | the option's trimmed label text (native `<option>` parity, FR-002) | The submission/selection value the SELECT projects when this option is selected (S1, S13). |
| `disabled` | `boolean` | `false` | Not selectable (S4), skipped by the keyboard highlight (S22), exposed as unavailable in the popup (FR-008). Boolean presence semantics; reflected (the select's roster observer watches it). |

`ki-option` has NO selected/checked member. Selection is owned by the
select and is never authored on an option (spec assumption) — an agent or
app that wants a pre-selected option sets the SELECT's `value`.

## Slots

| Element | Slot | Contract |
|---|---|---|
| `ki-select` | (default) | The `ki-option` choices, as children; document order is list order. The children are DATA — they never paint; the select renders them as popup rows (research D1). Options inserted/removed/mutated at runtime reconcile silently (S25, spec edge cases). |
| `ki-option` | (default) | The option label — TEXT content in v1 (rich markup is not part of the v1 contract): the human-facing label shown in the popup and in the trigger when selected (S1), and the `value` fallback (FR-002). Mandatory for valid usage. |

No named slots in v1. The dropdown indicator is component-rendered (a
part), not a slot (spec assumption; `start`/`end` trigger slots are
post-v1 additive).

## Parts

| Element | Part | Contract |
|---|---|---|
| `ki-select` | `trigger` | The combobox button: enclosure (bg/border/radius per state), focus ring. |
| `ki-select` | `label` | The rendered visible label (typography from `--ki-select-label-*`). |
| `ki-select` | `value` | The displayed selection or placeholder inside the trigger. |
| `ki-select` | `indicator` | The component-rendered dropdown indicator (token-drawn, decorative). |
| `ki-select` | `listbox` | The popup surface: background, elevation, radius, padding, max block size. |
| `ki-select` | `option` | Each rendered option row (repeats once per option). **Addressing note, flagged at gate 1**: the spec's FR-013 places this part "on ki-option", but the mirror architecture (research D1 — forced by `aria-activedescendant`'s same-tree IDREF constraint) hosts the rendered rows in ki-select's shadow, so the part is addressed as `ki-select::part(option)`. The part NAME and its customization role are exactly as specified. |

`ki-option` exposes no rendered part in v1 (it does not render — see
Elements). If gate 1 amends FR-013's letter, this table follows the spec.

## Events

No custom events (charter: platform names, no `ki-*` re-emission). Both
are observed on `ki-select` (the form control):

| Event | Semantics |
|---|---|
| `input` | Composed + bubbling, dispatched from the host on each user COMMIT (option click, Enter/Space on the highlight) before `change` (S1). Synthesized by the component — there is no native inner control (research D6); native-select event order is preserved. |
| `change` | Composed + bubbling, dispatched from the host immediately after `input` on each user commit (S1). Never fired for programmatic `value` assignment, reconciliation after DOM mutation (S25), form reset, abandonment (Escape/Tab/outside-click — S9, S21, S20), or attempts on disabled selects/options (S3, S4). Exactly one per commit; committing the already-selected option fires nothing (native parity). |

Keyboard (all select-owned, FR-007 — APG select-only combobox, approved
subset): closed — Enter, Space, Arrow Down, Arrow Up open with the
highlight on the selected option, else the first enabled (S7, S23);
Home/End open with the first/last enabled highlighted. Open — arrows move
the highlight over enabled options without wrapping (S22), Home/End jump
(S10), Enter/Space commit and close (S8), Escape closes discarding (S9),
Tab closes discarding and moves focus on (S21 — spec default reading,
gate-1 pending). Printable-character typeahead, Alt+Arrow shortcuts and
PageUp/PageDown are NOT part of the v1 contract (charter exclusion /
Art. II).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of trigger, popup and option rows in every state
  resolves from `--ki-select-*` / `--ki-option-*`; those resolve from the
  semantic layer (Art. VI, FR-011). Filled-vs-outlined trigger enclosure,
  popup elevation and radius are theme token decisions, never attributes
  (per-logical-side border-width tokens make both M3 enclosures
  expressible — 003 D8 mechanism).
- Interaction states (hover, focus-visible, disabled, open, highlighted,
  selected) are CSS states styled through tokens, never attributes/props
  (FR-012).
- The dropdown indicator is token-drawn (no SVG asset, no icon font); any
  theme-added open/close motion is suppressed under
  `prefers-reduced-motion` (FR-015).
- Focus is clearly visible in every theme via `--ki-select-focus-ring-*`;
  the trigger and every option row meet the ≥ 24×24 px pointer target via
  `--ki-select-min-target` / `--ki-option-min-target` (FR-016).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract). Switching the theme declaration restyles trigger, popup
  and options — closed and open — with zero markup changes (S17, S18).

## Positioning (documented v1 limitation)

The popup positions below the trigger with CSS alone, scrolling
internally beyond `--ki-select-listbox-max-block-size` (research D4). An
ancestor that clips overflow can clip the open popup; there is no
viewport-edge flipping in v1 (spec assumption). The recorded upgrade path
(popover/top-layer + CSS anchor positioning once baseline) is a rendering
implementation detail with no API impact.

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: a person must pick exactly one value from a closed
  list of known options, especially when the options are too many to show
  at once (roughly five or more) or space is limited. Always with a
  `label`; declare a pre-selection via the select's `value`.
- **When NOT to use**: two to four always-visible choices (use
  ki-radio-group); on/off decisions (ki-switch or ki-checkbox); free or
  searchable text entry (ki-input — this select has no typeahead in v1);
  multiple selection (out of v1); command menus or navigation (not a menu
  component); `ki-option` outside a `ki-select` (unsupported); authoring
  selection on an option — there is no `selected` on `ki-option`; set the
  select's `value` instead.

## Compatibility

First release of both elements (pre-1.0 line); purely additive — no
existing API changes. Removing or renaming anything above after first
publish is MAJOR per Art. IX. The option-mirroring mechanism, the roster
observers and the validity donor are internal implementation details,
explicitly outside this contract. Deferred additive candidates recorded
by the spec and research: printable-character typeahead (gate-1 open
question — FR-007 exception), commit-on-Tab (gate-1 open question — S21
default is discard), a `size` axis (if a design source ever demands one),
multiselect, option grouping (optgroup analog), rich option content (slot
projection into the rows — research D1), `start`/`end` trigger slots, a
`ki-` open/close event, an invalid visual treatment (custom state +
tokens, 003 alignment), validation-message display (batch-wide v1
exclusion, 003 precedent), an `autocomplete`/SC 1.3.5 surface (spec
Assumptions — deferral with recorded path back), and top-layer popup
positioning (research D4).
