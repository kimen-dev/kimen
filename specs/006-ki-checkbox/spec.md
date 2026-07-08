# Feature Specification: ki-checkbox

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-checkbox` (spec `006-ki-checkbox`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Fase 2 form control: a `<ki-checkbox>` web
component for selecting independent options. Binary value plus an
`indeterminate` presentation state (the Material 3 tri-state visual;
indeterminate is presentation-only, the value stays binary). Label composes
as the default slot. Form-associated via ElementInternals following the
002-ki-button pattern, themed by MarsUI (onmars, default) and the Material 3
Design Kit (material3, reference) through tokens alone. Scope and shared
conventions fixed by the Fase 2 API charter for the 003–016 batch."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is derived from the Material 3 Design Kit: the MarsUI file was
verified page by page on 2026-07-08 and contains no checkbox component at
all (its component inventory covers buttons, avatars, icons, feature icons,
media and miscellaneous artifacts), so the MarsUI column records that
verified absence and the onmars theme styles ki-checkbox from the 001 token
vocabulary alone. The formerly at-risk decisions (`size` axis, error visual,
label anatomy) are resolved by the verification: MarsUI shows none of them,
and any future MarsUI checkbox artifact would re-enter through this spec as
additive MINOR:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-checkbox |
|---|---|---|---|
| Selection states | No checkbox frame in MarsUI (full-file sweep verified 2026-07-08); the file's only tick artifacts are icon glyphs (Check, Tick, Verification_tick) | Unselected / selected / indeterminate: tri-state visual, the value stays binary | `checked` boolean + `indeterminate` boolean presentation flag; the submitted value follows `checked` alone |
| Interaction states | No MarsUI checkbox frame (verified 2026-07-08); the button state matrix (default/hover/focus/disabled, 002) is the file's closest state precedent | enabled, hovered, focused, pressed, disabled | CSS states (hover, focus-visible, active, disabled), never props; all token-styled (002 precedent) |
| Error / validity | No MarsUI checkbox frame and no checkbox-level error artifact (verified 2026-07-08); tone ramps exist only at the token layer (001) | Error configuration of the checkbox | Constraint validation via `required`; the invalid presentation is a CSS state resolved from tokens, never a prop |
| Label & anatomy | No MarsUI checkbox frame (verified 2026-07-08); the onmars text-emphasis token vocabulary (001 extraction) covers label styling | Control paired with a label; the label names the control | Default slot is the label and the accessible-name source; activating the label toggles the control |
| Size & shape | No MarsUI checkbox frame (verified 2026-07-08); onmars ships an xs–xl metric vocabulary (001) with no checkbox-specific usage | Single fixed control size inside a larger touch target; fixed radius | No `size` attribute in v1; control size, radius and gap are per-theme component tokens (a size axis would be an additive MINOR later) |
| Grouping ("select all") | No MarsUI checkbox frame, hence no grouping artifact (verified 2026-07-08) | Parent/child selection illustrated with the indeterminate state | Application-level composition; no checkbox-group element in v1 (Art. VII) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose an option (Priority: P1)

A person selecting preferences toggles a checkbox — with a pointer, a
keyboard, or assistive technology — and its state flips exactly once per
attempt. A disabled checkbox is skipped and clearly unavailable.

**Why this priority**: toggle parity with the native checkbox is the entire
reason the component exists; everything else layers on top of it.

**Independent Test**: render one checkbox with a label, toggle it through
each input modality, observe exactly one state flip per attempt; disable it
and observe none.

**Acceptance Scenarios**:

1. **Given** an unchecked checkbox labeled "Email notifications", **When**
   the user selects it, **Then** the checkbox is checked and a change event
   reports the new state.
2. **Given** a disabled checkbox, **When** the user attempts to select it,
   **Then** its state does not change and focus never lands on it.

---

### User Story 2 - Participate in a form (Priority: P2)

A person filling in a form ticks checkboxes and submits: checked boxes
contribute their name/value, unchecked ones contribute nothing — exactly as
a native checkbox would, without the application wiring any extra code.

**Why this priority**: ki-checkbox extends the ElementInternals pattern
established by 002 to Kimen's first selection control; the
absent-when-unchecked submit semantics are load-bearing for every backend
that consumes the form.

**Independent Test**: place the checkbox inside a native form; submit with
it checked and unchecked, reset the form, require it, and disable its
ancestor fieldset — observing native-parity form data each time.

**Acceptance Scenarios**:

1. **Given** a form containing a checked checkbox named "newsletter",
   **When** the user submits the form, **Then** the submitted data contains
   "newsletter" with value "on".
2. **Given** the same form with the checkbox unchecked, **When** the user
   submits the form, **Then** the submitted data has no "newsletter" entry.
3. **Given** a form with a required unchecked checkbox, **When** the user
   submits the form, **Then** the form does not submit.

---

### User Story 3 - Represent a partial selection (Priority: P2)

A person managing a list with a "Select all" parent checkbox sees the parent
as partially selected (mixed) while only some children are checked.
Activating the parent clears the mixed presentation and inverts the
underlying checked state (native parity), and the form never receives a
"mixed" value.

**Why this priority**: the indeterminate presentation is the capability that
justifies a checkbox component beyond a bare toggle, and its
presentation-only contract (value stays binary) must be explicit before
implementation.

**Independent Test**: display a checkbox as indeterminate; observe the mixed
presentation and the "mixed" assistive-technology state; toggle it and
observe a binary result; submit and observe a binary value.

**Acceptance Scenarios**:

1. **Given** a "Select all" checkbox displayed as partially selected,
   **When** the accessibility tree is queried, **Then** the checkbox is
   exposed in the mixed state.
2. **Given** an unchecked "Select all" checkbox displayed as partially
   selected, **When** the user selects it, **Then** it is checked and no
   longer partially selected.
3. **Given** a checked "Select all" checkbox displayed as partially
   selected, **When** the user selects it, **Then** it is unchecked and no
   longer partially selected.

---

### User Story 4 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every checkbox — every selection, interaction and validity state
— restyles from the token layer alone. No markup change, no component
change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every component must honor it.

**Independent Test**: render the selection × interaction state matrix under
onmars, declare the material3 theme, assert every checkbox resolves its
appearance from theme tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** checkboxes take material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** checkboxes use the dark token values.

---

### User Story 5 - An agent generates valid checkbox markup (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks the checkbox for independent options — not the switch (immediate
effect) or the radio group (mutually exclusive choice) — and malformed
attribute values never break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a checkbox with non-canonical boolean markup and
observe predictable rendering.

**Acceptance Scenarios**:

1. **Given** a checkbox declared with `checked="false"`, **When** the page
   renders, **Then** the checkbox renders checked — boolean attributes
   follow presence semantics; unchecked is expressed by omitting the
   attribute.

### Edge Cases

- `checked` and `indeterminate` both set: the mixed presentation wins
  visually and assistive technology exposes "mixed"; the submitted value
  follows `checked` alone, and a user toggle resolves the control to
  unchecked — toggling inverts `checked` (native parity).
- Toggling always clears the indeterminate presentation and removes the
  reflected `indeterminate` attribute while inverting `checked` — a user
  action never leaves the control mixed, and the serialized markup always
  agrees with the visual state.
- No slotted label: the checkbox has no accessible name and fails the axe
  gate; the catalog documents the label as mandatory (unlabeled checkboxes
  are when-NOT-to-use).
- Disabled applied while the checkbox has focus: focus moves on; no change
  event fires afterwards.
- `value` attribute absent: a checked checkbox submits "on" (native parity).
- Non-canonical boolean markup from agents (`checked="true"`,
  `checked="yes"`, and the misleading `checked="false"`): boolean-attribute
  presence semantics — any present value renders checked, never breaks;
  unchecked is expressed only by omitting the attribute (ki-checkbox has no
  enum attributes in v1, so the 002 S11 fallback contract maps to boolean
  robustness; see Assumptions).
- RTL documents: control/label order and gap follow the writing direction
  (logical properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).
- Form reset after a toggle cleared a mixed presentation: reset restores
  only the checked baseline; it never re-applies the indeterminate
  presentation (native parity — reset does not touch indeterminate).
- Reduced motion: the mark state-change animation is suppressed when the
  user prefers reduced motion — state changes apply instantly (FR-014,
  S21).
- Rapid repeated toggling: exactly one change event per state flip, no lost
  or duplicated events.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Checkbox
  A checkbox lets a person select independent options for a form — including
  a mixed partial-selection presentation — with full input-modality parity,
  and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting the checkbox checks it
    Given an unchecked checkbox labeled "Email notifications"
    When the user selects the checkbox
    Then the checkbox is checked
    And a change event reports the checked state
    And an input event precedes the change event

  # S2
  Scenario: A disabled checkbox does not change
    Given a disabled unchecked checkbox labeled "Email notifications"
    When the user attempts to select it
    Then the checkbox remains unchecked
    And no change event is observed

  # S3
  Scenario: Selecting an unchecked partially selected checkbox resolves it to checked
    Given an unchecked "Select all" checkbox displayed as partially selected
    When the user selects the checkbox
    Then the checkbox is checked and no longer partially selected

  # S19
  Scenario: Selecting a checked partially selected checkbox resolves it to unchecked
    Given a checked "Select all" checkbox displayed as partially selected
    When the user selects the checkbox
    Then the checkbox is unchecked and no longer partially selected

  # S20
  Scenario: Activating the label toggles the checkbox
    Given an unchecked checkbox labeled "Email notifications"
    When the user activates the label
    Then the checkbox is checked

  # S4
  Scenario: Non-canonical boolean values never break rendering
    Given a checkbox declared with checked="false"
    When the page renders
    Then the checkbox renders checked

  # Family: keyboard path
  # S5
  Scenario: The keyboard reaches the checkbox with visible focus
    Given a page whose first interactive element is a checkbox
    When the user presses Tab
    Then the checkbox is focused and its focus indication is visible

  # S6
  Scenario: Space toggles the focused checkbox
    Given a focused unchecked checkbox labeled "Email notifications"
    When the user presses Space
    Then the checkbox is checked

  # Family: assistive-tech outcome
  # S7
  Scenario: The checkbox exposes its name, role and state
    Given a checked checkbox labeled "Email notifications"
    When the accessibility tree is queried
    Then it exposes a checkbox named "Email notifications" in the checked state

  # S8
  Scenario: A partial selection is exposed as mixed
    Given a "Select all" checkbox displayed as partially selected
    When the accessibility tree is queried
    Then the checkbox is exposed in the mixed state

  # S9
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled checkbox labeled "Email notifications"
    When the accessibility tree is queried
    Then the checkbox is exposed as unavailable

  # Family: form participation
  # S10
  Scenario: A checked checkbox submits its value with the form
    Given a form containing a checked checkbox named "newsletter"
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "on"

  # S11
  Scenario: An unchecked checkbox contributes nothing to the form
    Given a form containing an unchecked checkbox named "newsletter"
    When the user submits the form
    Then the submitted form data does not contain "newsletter"

  # S12
  Scenario: The partial-selection presentation never changes the submitted value
    Given a form whose checked checkbox named "select-all" is displayed as partially selected
    When the user submits the form
    Then the submitted form data contains "select-all" with value "on"

  # S13
  Scenario: Resetting the form restores the checkbox's initial state
    Given a form whose "newsletter" checkbox was checked when the page loaded and is now unchecked
    When the user resets the form
    Then the checkbox is checked

  # S14
  Scenario: A required unchecked checkbox blocks submission
    Given a form with a required unchecked checkbox labeled "Accept the terms"
    When the user submits the form
    Then the form does not submit
    And the checkbox is reported invalid

  # S15
  Scenario: A disabled fieldset disables the checkbox
    Given an unchecked checkbox named "newsletter" inside a disabled fieldset
    When the user attempts to select it
    Then the checkbox remains unchecked

  # Family: theming
  # S16
  Scenario: A second theme restyles the checkbox through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the checkbox's appearance resolves from material3 token values

  # S17
  Scenario: The checkbox honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the checkbox's appearance resolves from the dark token values

  # S18
  Scenario: Control and label follow the document's writing direction
    Given a right-to-left document containing a checkbox labeled "Notifications"
    When the page renders
    Then the control leads and the label trails in right-to-left order

  # S21
  Scenario: State changes apply without animation under reduced motion
    Given an unchecked checkbox and a user preference for reduced motion
    When the user selects the checkbox
    Then the checkbox is checked with no state-change animation
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S19, S20, S4 | |
| Keyboard path | S5, S6 | |
| Assistive-tech outcome | S7, S8, S9 | |
| Form participation | S10, S11, S12, S13, S14, S15 | |
| Theming | S16, S17, S18, S21 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The checkbox MUST expose a `checked` boolean attribute
  (default unchecked) representing its binary selection state; user
  activation (pointer on control or label, Space on the focused control)
  toggles it with native-checkbox parity and dispatches composed `input`
  and `change` events, `input` preceding `change` (native ordering).
- **FR-002**: The checkbox MUST expose an `indeterminate` boolean attribute
  rendering the mixed (partially selected) presentation and exposing the
  "mixed" state to assistive technology. It is presentation-only — the
  submitted value follows `checked` alone. `indeterminate` is a reflected
  boolean whose property and attribute stay in sync; any user toggle clears
  the mixed presentation, removes the reflected attribute and inverts
  `checked` (native parity): an unchecked mixed control becomes checked, a
  checked mixed control becomes unchecked.
- **FR-003**: The label MUST compose through the default slot and be the
  accessible-name source; activating the slotted label toggles the control.
- **FR-004**: A disabled checkbox MUST NOT change state, MUST NOT be
  reachable in the tab order, and MUST expose its unavailable state to
  assistive technology (native semantics).
- **FR-005**: The checkbox MUST participate in native forms
  (form-associated): `name` and `value` attributes (value defaulting to
  "on"); when checked it contributes its name/value pair to the submitted
  data; when unchecked it contributes nothing; a disabled ancestor fieldset
  or form disables it.
- **FR-006**: Form reset MUST restore the checkbox's checked state to its
  reset baseline: the checked state the control had when it became
  form-associated (because `checked` reflects live state, the attribute
  cannot serve as a native `defaultChecked`; later changes — user or
  programmatic — move live state, never the baseline). Reset MUST NOT touch
  the indeterminate presentation (native parity): a mixed presentation
  cleared by a user toggle is not re-applied, and one still declared is not
  removed.
- **FR-007**: The checkbox MUST support constraint validation via
  `required`: a required unchecked checkbox is invalid and blocks form
  submission. Validation-message display is out of v1 scope (post-v1
  additive, aligned with 003-ki-input); validity itself participates
  natively.
- **FR-008**: Every visual property (color, control size, radius, gap,
  border, typography, state styling) MUST resolve from `--ki-checkbox-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values. Control size, radius and gap are tokens — no `size`
  attribute exists in v1.
- **FR-009**: Interaction and validity states (hover, focus-visible,
  active, disabled, invalid) MUST be styled exclusively through tokens and
  CSS states; states are never attributes/props.
- **FR-010**: Boolean attributes MUST follow presence semantics: any
  present value renders as set and never breaks rendering — including the
  misleading `checked="false"`, which still renders checked; unchecked is
  expressed only by omitting the attribute (the 002 S11 robustness
  contract; ki-checkbox carries no enum attributes in v1). The catalog
  documents this explicitly for agents.
- **FR-011**: Focus MUST be clearly visible in every theme; the pointer
  target MUST be at least 24×24 px in every theme.
- **FR-012**: The component MUST expose `control` and `label` parts for the
  customization ladder (tokens first, then parts, then slots).
- **FR-013**: Control and label order and spacing MUST follow the
  document's writing direction (logical properties only, Art. IV).
- **FR-014**: When the user prefers reduced motion, state changes MUST
  apply without animation: the mark state-change animation v1 ships (per
  the Material 3 reference) is suppressed and the new state renders
  instantly.
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance distinguishing the checkbox from the
  switch (immediate effect) and the radio group (mutually exclusive
  choice).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-checkbox` (attributes:
  `checked`, `indeterminate`, `disabled`, `required`, `name`, `value`;
  events: `input`, `change` — composed, platform semantics, no `ki-*`
  events in v1; slot: default (label); parts: `control`, `label`; component
  tokens: `--ki-checkbox-*`). No sub-components. Additive MINOR. Catalog
  and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no
  new runtime dependency ("none").
- **Accessibility** (Art. V): APG checkbox pattern including its
  mixed-state variant. Not a new interaction pattern in this batch (the
  charter's manual-walkthrough list covers dialog, tooltip, tabs and
  select's listbox) → no manual APG walkthrough required; axe zero
  violations across selection × interaction × validity states in both
  themes and both schemes; mixed-state exposure verified by S8.
- **Tokens** (Art. VI): new component token family `--ki-checkbox-*` in the
  component layer, resolving from the semantic layer: structure
  (`control-size`, `gap`, `radius`, `border-width`), color per
  selection-state × interaction-state
  (`{unchecked|checked|indeterminate}-{rest|hover|active|disabled}-{bg|fg|border}`),
  an invalid treatment, and `focus-ring-{color|width|offset}`. Both shipped
  themes (onmars, material3) get component token files. No semantic-layer
  deltas anticipated; if the contrast gate reveals any, they will be
  declared for founder sign-off as in 002.
- **Catalog/agent legibility** (Art. I): when-to-use — selecting one or
  more independent options that a form submits later; a "select all" parent
  reflects partial selection through the indeterminate presentation. When
  NOT to use — a single mutually exclusive choice (ki-radio-group), an
  immediate on/off effect (ki-switch), triggering an action (ki-button),
  unlabeled/icon-only usage (no accessible name), and writing
  `checked="false"` to mean unchecked. Usage note for agents: boolean
  attributes follow presence semantics — `checked="false"` still renders
  checked; omit the attribute to express unchecked.
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can toggle the checkbox via pointer and keyboard,
  each attempt flipping the state exactly once, in 100% of selection and
  validity states.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every selection × interaction × validity state with zero markup or
  component changes — only the theme declaration differs.
- **SC-003**: zero accessibility violations across the full state matrix in
  automated auditing, with the partial selection exposed as "mixed" to
  assistive technology.
- **SC-004**: submitted form data matches the native checkbox in every
  form scenario: present with its value when checked, absent when
  unchecked, restored by reset, blocked when required and unchecked.
- **SC-005**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-006**: keyboard-only operation covers 100% of the behavior available
  to pointer users.

## Assumptions

- No `variant`, `tone` or `size` attributes in v1: the Material 3 checkbox
  is a single fixed-size control with no emphasis or intent axis, and
  MarsUI verification 2026-07-08 found no checkbox frame at all; metrics
  are per-theme component tokens. A size axis, should a design source ever
  demand one, would be an additive MINOR (charter allows a subset with
  justification).
- Because ki-checkbox carries no enum attributes, the charter-mandated
  unknown-value fallback scenario (002 S11 pattern) maps to
  boolean-attribute robustness: any present `checked` value — including
  the misleading `checked="false"` — renders as checked via presence
  semantics and never breaks rendering (S4); unchecked is expressed only
  by omitting the attribute.
- `value` defaults to "on" for native-checkbox parity (Art. IV, least
  surprise).
- `indeterminate` is a declarative attribute (unlike the native input,
  where it is a property only) so agent-generated markup can express
  partial selection without scripting; it remains presentation-only per the
  charter. It is a reflected boolean per the charter's style-driving-props
  rule: property and attribute stay in sync in both directions, so
  token-driven CSS selects on the attribute and a user toggle that clears
  the presentation also removes the attribute from the DOM.
- When `checked` and `indeterminate` are both set, the mixed presentation
  wins visually and assistive technology exposes "mixed"; the submitted
  value follows `checked` alone, and a user toggle inverts `checked` while
  clearing the mixed presentation (native parity: S3 resolves to checked,
  S19 to unchecked).
- Because `checked` reflects live state (charter rule), the attribute
  cannot play the native `defaultChecked` role; the reset baseline is the
  checked state captured when the control becomes form-associated, and
  reset never touches the indeterminate presentation (native parity —
  native reset does not touch indeterminate either).
- v1 ships a mark state-change animation following the Material 3
  reference; under `prefers-reduced-motion` every state change applies
  instantly (FR-014, S21). The animation itself is an implementation
  detail; the reduced-motion contract is the spec-level behavior.
- A visible label is required for the accessible name; unlabeled usage is
  documented as when-NOT-to-use (no icon-only checkbox exists or is
  planned).
- No checkbox-group element in v1: "select all" parent/child wiring is
  application logic (Art. VII — simplest design that satisfies the
  scenarios).
- Enter does not toggle the checkbox (native parity); Space is the keyboard
  activation.
- Disabled follows native semantics (not focusable), as decided in 002; the
  focusable-when-disabled pattern remains a possible future enhancement.
- MarsUI verification 2026-07-08 (full page sweep of the MarsUI Figma
  file): no checkbox component exists; the Design-source table records
  that verified absence and the onmars theme styles ki-checkbox from the
  001 token vocabulary. Any future MarsUI checkbox artifact re-enters
  through this spec as additive MINOR.
