# Feature Specification: ki-radio-group

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-radio-group` (spec `007-ki-radio-group`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Seventh Kimen component: a `<ki-radio-group>`
web component that models the radio GROUP as the form-associated unit — field
name, current value, required semantics and arrow-key navigation live on the
group, per the APG radio group pattern — with `<ki-radio>` children carrying
each option's value and label. Material 3 documents only the individual radio
button; Kimen abstracts the group so forms see one field and any theme
restyles the whole set through tokens alone. Batch conventions per the Fase 2
API charter (002-ki-button precedent)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below abstracts the patterns found in both reference designs so that
neither theme lacks expressive power (and future themes inherit the same
guarantee). Material 3 specifies the standalone radio button; the grouping
model comes from the platform (native radio semantics) and the APG radio
group pattern:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-radio-group |
|---|---|---|---|
| Unit modeled | No radio button or radio-group frame in MarsUI (full-file sweep verified 2026-07-08); the onmars token vocabulary covers it | Standalone radio button; grouping, field name and label are composition concerns left outside the component | The GROUP is the component and the form control (APG radio group): `name`, `value`, `required` and arrow-key navigation live on `ki-radio-group`; `ki-radio` children carry option `value` + label |
| Selection & interaction states | No MarsUI radio frame (verified 2026-07-08); the button state matrix (default/hover/focus/disabled, 002) is the file's closest state precedent | selected / unselected × enabled, hovered, focused, pressed, disabled state layers | CSS states (hover, focus-visible, active, disabled) styled through tokens, never props; selected state is owned by the group, never authored on the option |
| Size | onmars token vocabulary carries an xs–xl metric scale; MarsUI has no radio frame, so no radio scale exists (verified 2026-07-08) | Single fixed control size (icon + state-layer target); no size scale | No `size` attribute in v1 (charter-sanctioned subset); control metrics are per-theme component tokens, so a future scale is additive |
| Semantic intent | No MarsUI radio frame and no radio-level tone artifact (verified 2026-07-08) | No tone/error axis documented on the M3 radio button | No `tone` in v1 (Art. VII); additive later only if a design source demands it |
| Label anatomy | No MarsUI radio frame (verified 2026-07-08); the onmars text-emphasis token vocabulary (001) covers label styling | Label external to the control, paired at composition time | `ki-radio` default slot = option label and accessible-name source; a group-level `label` names the whole field |
| Group layout | No MarsUI radio frame, hence no group-layout artifact (verified 2026-07-08) | Not defined at component level | Vertical stack by default; spacing is a component token; no `orientation` attribute in v1 (open question for gate 1) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose exactly one option (Priority: P1)

A person using an application built with Kimen picks one option from a small
visible set — with a pointer, a keyboard, or assistive technology — and the
group guarantees that exactly one option is selected at a time. Disabled
options are skipped and clearly unavailable.

**Why this priority**: mutual exclusivity with native-radio parity is the
entire reason the component exists; everything else layers on top of it.

**Independent Test**: render one group with three labeled options, select
each option in turn through each input modality, observe that exactly one
option is ever selected; disable one option and observe it never selects.

**Acceptance Scenarios**:

1. **Given** a group with options "Email" (value "email"), "SMS" and
   "Phone", **When** the user selects "Email", **Then** "Email" is the only
   selected option, a change event is dispatched and the group's value reads
   "email".
2. **Given** the group with "Email" selected, **When** the user selects
   "SMS", **Then** "SMS" is selected and "Email" is not.
3. **Given** a group whose "Phone" option is disabled, **When** the user
   attempts to select it, **Then** no selection change is observed.

---

### User Story 2 - Operate the group from the keyboard (Priority: P1)

A keyboard user reaches the group as a single Tab stop, moves the selection
with the arrow keys — wrapping around the ends and skipping disabled
options — and leaves the group with a single Tab, exactly as native radios
behave.

**Why this priority**: the roving-tabindex keyboard model is what makes a
GROUP a group; without it the composite is just loose circles and fails
Art. V outright.

**Independent Test**: with the keyboard alone, Tab into the group (focus
lands on the selected or first enabled option), traverse all options with
arrows observing selection follow focus, and Tab out in one step.

**Acceptance Scenarios**:

1. **Given** a group with "SMS" selected, **When** the user presses Tab to
   enter the group, **Then** focus lands on "SMS" with visible indication.
2. **Given** focus on the selected "Email" option, **When** the user presses
   Arrow Down, **Then** the next option is focused and selected.
3. **Given** focus inside the group, **When** the user presses Tab, **Then**
   focus moves past the group in one step.

---

### User Story 3 - Participate in a form (Priority: P2)

A person filling in a form sees the group behave as one named field: the
selected option's value submits with the form, a required group with no
selection blocks submission, and resetting the form restores the initial
selection — without the application wiring any extra code.

**Why this priority**: the group being THE form control (not its children)
is this spec's core abstraction decision; it follows the ElementInternals
pattern established by 002.

**Independent Test**: place the group inside a native form; submit and
inspect the entry, mark it required with no selection and observe the
blocked submission, reset and observe the initial selection restored.

**Acceptance Scenarios**:

1. **Given** a form with a group named "contact" and the "Email" option
   (value "email") selected, **When** the user submits, **Then** the data
   contains "contact" with value "email".
2. **Given** a required group with no selection, **When** the user submits,
   **Then** the form does not submit and the group is reported invalid.

---

### User Story 4 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every radio group — controls, labels, all interaction states —
restyles from the token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001; every component must honor it.

**Independent Test**: render a group covering selected/unselected/disabled
states under onmars, declare the material3 theme, assert appearance resolves
from theme tokens; repeat for the forced dark scheme and an RTL document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the group takes material3 appearance with
   unchanged markup.
2. **Given** a right-to-left document, **When** the page renders, **Then**
   each option's control leads its label in the right-to-left direction.

---

### User Story 5 - An agent composes a valid group (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks the radio group when a person must choose exactly one of a few visible
options — not a select, not checkboxes — and produces valid usage on the
first try. Malformed values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a group whose value matches no option and observe
an unselected, fully operable group.

**Acceptance Scenarios**:

1. **Given** a group declared with a value matching none of its options,
   **When** the page renders, **Then** no option renders selected and the
   group remains operable.

### Edge Cases

- A group `value` that matches no option's value leaves every option
  unselected; the group stays operable and submits nothing (agent-generated
  markup is not trusted to be valid).
- Duplicate option values are tolerated: assigning the group's value
  programmatically selects the first matching option; a user's selection is
  tracked by option identity, so it always reflects the exact option chosen
  even when another option shares its value.
- All options disabled: the group is skipped in the tab order and submits
  nothing.
- A single-option group is still a group: Tab reaches it, Space selects it,
  arrow keys keep it selected (wrap onto itself).
- The selected option becomes disabled: the selection and the group's
  `value` are preserved, but the group submits no entry (native parity —
  disabled controls never submit); the preserved selection still satisfies
  `required`; the group's Tab stop — and focus, if it was on that option —
  moves to the first enabled option, and no `input`/`change` fires.
- The selected option is removed from the document: the group returns to no
  selection.
- Options inserted at runtime: when nothing is selected, an inserted option
  whose value matches the group's `value` becomes selected (selection
  re-derives from the value, first match wins); an existing selection of a
  concrete option survives insertions, even of a duplicate of its value.
- Reconciliation after a DOM mutation (insertion, removal, disabling) never
  dispatches `input` or `change` — those accompany user-driven changes only
  (FR-003).
- A group with no selection and no `required` submits no entry for its name
  (native parity), never an empty string.
- RTL documents: control/label order and group layout follow writing
  direction (logical properties only, Art. IV).
- Reduced motion: selection-state transitions show no non-essential motion
  when the user prefers reduced motion.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Radio group
  A radio group lets a person choose exactly one option from a visible set,
  reports the choice to forms and assistive technology as a single field,
  and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting an option makes it the group's single choice
    Given a radio group labeled "Contact preference" with options "Email" (value "email"), "SMS" and "Phone"
    When the user selects "Email"
    Then "Email" is the selected option
    And a change event is dispatched and the group's value reads "email"

  # S2
  Scenario: Selecting another option releases the previous one
    Given the "Contact preference" group with "Email" selected
    When the user selects "SMS"
    Then "SMS" is the selected option and "Email" is no longer selected

  # S3
  Scenario: A disabled option cannot be selected
    Given the "Contact preference" group where the "Phone" option is disabled
    When the user attempts to select "Phone"
    Then no selection change is observed

  # S4
  Scenario: A value matching no option leaves the group unselected
    Given a radio group declared with a value that matches none of its options
    When the page renders
    Then no option renders selected and the group remains operable

  # S19
  Scenario: A disabled group cannot change selection
    Given a disabled radio group labeled "Contact preference" with "Email" selected
    When the user attempts to select "SMS"
    Then no selection change is observed and the group is exposed as unavailable

  # Family: keyboard path
  # S5
  Scenario: Tab reaches the group as a single stop on the selected option
    Given a page whose "Contact preference" group has "SMS" selected
    When the user presses Tab to enter the group
    Then the "SMS" option is focused with visible focus indication

  # S6
  Scenario: Arrow keys move the selection to the next option
    Given a radio group with options "Email", "SMS" and "Phone" in that order, "Email" selected and focused
    When the user presses Arrow Down
    Then the "SMS" option is focused and selected

  # S7
  Scenario: Arrow navigation wraps and skips disabled options
    Given a radio group with options "Email", "SMS" and "Phone" in that order, where "Phone" is disabled and "SMS" is focused
    When the user presses Arrow Down
    Then focus wraps past "Phone" to "Email", which becomes selected

  # S8
  Scenario: Space selects the focused option when none is selected
    Given keyboard focus on the "Email" option of a group with no selection
    When the user presses Space
    Then "Email" is the selected option

  # S9
  Scenario: Tab leaves the group in a single step
    Given keyboard focus inside the "Contact preference" group
    When the user presses Tab
    Then focus moves to the next element after the group, visiting no other option

  # S20
  Scenario: Tab skips a disabled group entirely
    Given a page whose radio group is disabled
    When the user presses Tab
    Then focus moves past the group without visiting any option

  # S21
  Scenario: Horizontal arrows follow the writing direction
    Given a right-to-left document with a radio group of options "Email", "SMS" and "Phone" in that order
    And keyboard focus on the selected "Email" option
    When the user presses Arrow Left
    Then the "SMS" option is focused and selected

  # S25
  Scenario: Tab enters an unselected group on its first enabled option without selecting
    Given an unselected radio group with options "Email", "SMS" and "Phone" where "Email" is disabled
    When the user presses Tab to enter the group
    Then the first enabled option "SMS" is focused and no option becomes selected

  # Family: assistive-tech outcome
  # S10
  Scenario: The group exposes its name, role and the selected state
    Given a radio group labeled "Contact preference" with "Email" selected
    When the accessibility tree is queried
    Then it exposes a radio group named "Contact preference"
    And the "Email" option is exposed as a selected radio named "Email"

  # S11
  Scenario: A disabled option is exposed as unavailable
    Given the "Contact preference" group where the "Phone" option is disabled
    When the accessibility tree is queried
    Then the "Phone" option is exposed as an unavailable radio

  # S22
  Scenario: The required state is exposed to assistive technology
    Given a required radio group labeled "Contact preference" with no selection
    When the accessibility tree is queried
    Then the group is exposed as required

  # S23
  Scenario: The invalid state is exposed after a blocked submission
    Given a required radio group whose form submission was just blocked for lack of selection
    When the accessibility tree is queried
    Then the group is exposed as invalid

  # Family: form participation
  # S12
  Scenario: The selected option's value submits with the form
    Given a form holding a radio group named "contact" with the "Email" option (value "email") selected
    When the user submits the form
    Then the submitted form data contains "contact" with value "email"

  # S13
  Scenario: A required group with no selection blocks submission
    Given a form whose required radio group "contact" has no selection
    When the user submits the form
    Then the form does not submit and the group is reported as invalid

  # S14
  Scenario: Resetting the form restores the initial selection
    Given the "contact" group loaded with "Email" selected and now showing "SMS" selected
    When the user resets the form
    Then "Email" is the selected option again

  # S15
  Scenario: A disabled fieldset makes the whole group inert
    Given a radio group inside a disabled fieldset
    When the user attempts to select an option
    Then no selection change is observed and the group is exposed as unavailable

  # S24
  Scenario: Disabling the selected option withholds its entry without blocking submission
    Given a form whose required group named "contact" had "Email" (value "email") selected before that option became disabled
    When the user submits the form
    Then the form submits and the data contains no "contact" entry

  # Family: theming
  # S16
  Scenario: A second theme restyles the radio group through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the radio group's appearance resolves from material3 token values

  # S17
  Scenario: The radio group honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the radio group's appearance resolves from the dark token values

  # S18
  Scenario: Option layout follows the document's writing direction
    Given a right-to-left document containing the "Contact preference" group
    When the page renders
    Then each option's control leads its label in the right-to-left direction
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S19 | |
| Keyboard path | S5, S6, S7, S8, S9, S20, S21, S25 | |
| Assistive-tech outcome | S10, S11, S22, S23 | |
| Form participation | S12, S13, S14, S15, S24 | |
| Theming | S16, S17, S18 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST ship as a composite of two elements:
  `ki-radio-group` (the form control) exposing `name`, `value`, `label`,
  `required` and `disabled` attributes, and `ki-radio` (the option) exposing
  `value` and `disabled` attributes with its label in the default slot.
  Options are valid only inside a group.
- **FR-002**: The group MUST enforce single selection: at most one option is
  selected at any time; selecting an option deselects the previous one. The
  group tracks the selected option, and its `value` is a projection of that
  selection: always equal to the selected option's value, or empty when none
  is selected. Selected state is never authored on an option directly;
  assigning the group's `value` programmatically selects the first option
  whose value matches, or none.
- **FR-003**: A user-driven selection change MUST dispatch composed `input`
  and `change` events (native-radio parity), with the new value readable
  from the group.
- **FR-004**: The group MUST occupy exactly one Tab stop (roving tabindex):
  entering the group focuses the selected option, or the first enabled
  option when none is selected; Tab from inside the group moves focus past
  the group in a single step.
- **FR-005**: Arrow keys MUST move focus to the adjacent enabled option —
  wrapping at both ends and skipping disabled options — and select it
  (selection follows focus, APG radio group): Up = previous and Down = next
  always; Left/Right follow the document's writing direction (LTR: Left =
  previous, Right = next; RTL: Right = previous, Left = next — native-radio
  parity). Space MUST select a focused unselected option.
- **FR-006**: A disabled option MUST NOT be selectable or focusable and MUST
  be exposed as unavailable. A disabled group — via its own attribute, a
  disabled fieldset, or its form's disabled association — MUST make every
  option inert and be exposed as unavailable. Disabling the selected option
  preserves the selection (the group's `value` is unchanged) but moves the
  group's single Tab stop — and focus, if it was on that option — to the
  first enabled option, dispatching no `input`/`change`.
- **FR-007**: The group MUST participate in native forms (form-associated):
  it submits its `name` with the selected option's value; it submits no
  entry when nothing is selected or when the selected option is disabled
  (native parity — disabled controls never submit), and a selection
  preserved on a disabled option still satisfies `required`; `required`
  participates in constraint validation, blocking submission and reporting
  the group invalid while no selection exists; form reset restores the
  initial selection.
- **FR-008**: A group `value` matching no option MUST leave every option
  unselected without breaking rendering or operability (documented default
  fallback; agent-generated markup is not trusted to be valid).
- **FR-009**: Assistive technology MUST perceive the group as a radio group
  whose accessible name comes from `label`, and each option as a radio named
  by its slotted label, exposing selected/unselected, disabled and the
  group's required/invalid states.
- **FR-010**: Every visual property (control geometry, spacing, typography,
  color, state styling) MUST resolve from `--ki-radio-*` /
  `--ki-radio-group-*` component tokens layered over the semantic token
  layer; zero hardcoded visual values. Interaction states are CSS states
  styled through tokens, never attributes/props.
- **FR-011**: Focus MUST be clearly visible in every theme; each option's
  pointer target MUST be at least 24×24 px in every theme.
- **FR-012**: The group MUST expose a `label` part; each option MUST expose
  `control` and `label` parts for the customization ladder (tokens first,
  then parts, then slots).
- **FR-013**: Control/label order within an option and the group's layout
  MUST follow the document's writing direction (logical properties only,
  Art. IV).
- **FR-014**: Selection-state transitions MUST respect
  `prefers-reduced-motion`: no non-essential motion when reduction is
  requested.
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (few visible exclusive options here;
  many options → select; independent on/off → checkbox/switch).

### Key Entities

- **Radio group**: the single form field — field name, current value,
  visible group label, required and disabled semantics; owns the selection
  invariant and the keyboard navigation model.
- **Radio option**: one candidate choice — submission value, slotted label
  (accessible-name source), disabled flag; its selected state is owned by
  the group and is never authored directly.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-radio-group` (attributes:
  `name`, `value`, `label`, `required`, `disabled`; events: `input`,
  `change` — composed, native names per charter; slot: default for
  `ki-radio` children; part: `label`) and new sub-element `ki-radio`
  (attributes: `value`, `disabled`; slot: default for the option label;
  parts: `control`, `label`). Component tokens `--ki-radio-*` and
  `--ki-radio-group-*`. Additive MINOR; catalog and llms.txt regenerate with
  both new tags.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost for the
  composite pair (two tags sharing group logic); no new runtime dependency
  ("none").
- **Accessibility** (Art. V): APG Radio Group pattern (roving tabindex,
  selection follows focus). First roving-tabindex composite in the repo →
  new interaction pattern → manual APG walkthrough documented in the PR.
  axe zero violations across selected/unselected/disabled/required states
  in all four theme × scheme contexts.
- **Tokens** (Art. VI): new component token family `--ki-radio-*` (control
  size, control/label gap, label typography, selected/unselected state
  colors for rest/hover/active/disabled, focus ring color/width/offset)
  plus group-level structure tokens (`--ki-radio-group-gap`, group-label
  typography), resolving from the semantic layer; both shipped themes
  (onmars, material3) get component token files. No semantic-layer deltas
  anticipated; any contrast finding at implementation follows the 002
  escalation route with explicit founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — a person must choose
  exactly one of a small set of mutually exclusive options that should all
  be visible at once (typically 2–5). When NOT to use — many options or
  constrained space (use ki-select), an independent on/off setting (use
  ki-checkbox or ki-switch), multiple selection (use a checkbox group).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: after any sequence of user interactions, exactly one option
  (or none, before first selection) is selected — never two — in 100% of
  pointer and keyboard runs.
- **SC-002**: keyboard-only operation covers 100% of the behavior available
  to pointer users, and the group occupies exactly one Tab stop regardless
  of option count.
- **SC-003**: switching the document theme (onmars ↔ material3) restyles
  every group state with zero markup or component changes — only the theme
  declaration differs; the forced dark scheme and RTL rendering hold the
  same guarantee.
- **SC-004**: zero accessibility violations across all option states in
  automated auditing, and a documented manual walkthrough of the APG radio
  group pattern.
- **SC-005**: 100% of form submissions carry the selected option's
  name/value; a required group with no selection blocks 100% of submission
  attempts; reset restores the initial selection every time.
- **SC-006**: the composite's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- No `size` attribute in v1: the M3 radio button is single-size and MarsUI
  verification 2026-07-08 found no radio frame at all (charter-sanctioned
  subset). Control metrics are per-theme component tokens, so a future size
  scale is an additive MINOR.
- No `tone` attribute in v1: neither grounded design source shows a
  semantic-intent axis on the radio control (Art. VII — no speculative
  props).
- No `orientation` attribute in v1: options stack vertically; all four
  arrow keys navigate per APG and horizontal arrows follow the writing
  direction (FR-005), so a horizontally laid-out group (theme or
  composition concern) keeps full keyboard parity in both LTR and RTL. An
  orientation attribute would be an additive MINOR (open question for
  gate 1).
- Selection follows focus on arrow navigation (APG radio group
  recommendation and native-radio parity, Art. IV least surprise); the
  group triggers no expensive side effects that would justify decoupling
  focus from selection.
- The group's `label` is the accessible-name source and is expected on
  every group (a11y-required, following 003 ki-input's visible-label
  precedent); there are no other built-in user-visible strings — the
  required-validation message is the platform's native message, so no
  hardcoded strings ship (Art. IV).
- Native parity governs edge semantics: a disabled selected option keeps
  the selection and satisfies `required` but does not contribute to
  submission; an unselected non-required group submits no entry; duplicate
  option values are tolerated with first-match-wins for programmatic value
  assignment, while user selection is tracked by option identity.
- `ki-radio` is documented as valid only inside `ki-radio-group`
  (sub-component belongs to the parent's spec per the batch charter);
  standalone usage is unsupported.
- Validation-message display UI is out of v1 scope batch-wide (003
  precedent); constraint validation itself participates natively.
