# Feature Specification: ki-select

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-select` (spec `005-ki-select`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Phase 2 form-control batch (API charter,
003–016): a `<ki-select>` web component that lets a person choose exactly one
option from its `<ki-option>` children — closed by default, APG select-only
combobox keyboard path, form-associated via ElementInternals following the
002 pattern. Material 3 maps it to the exposed dropdown menu (a menu anchored
to a text field); MarsUI maps through the onmars token layer. Out of v1 scope
per charter: multiselect, typeahead search box, autocomplete."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-select |
|---|---|---|---|
| Component identity | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | No select component; the equivalent is the exposed dropdown menu — a menu anchored to a text field | One `ki-select` trigger plus a popup list of `ki-option` children; each theme styles trigger and popup through component tokens (material3 via its text-field + menu roles) |
| Trigger anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Text field container in filled or outlined style, with a label and a trailing dropdown icon | Visible `label` attribute, displayed value or placeholder, component-rendered dropdown indicator. Filled vs outlined is a token-layer decision, NOT a prop (002 shape precedent) |
| Popup surface | The extracted onmars token vocabulary ships surface levels s0–s5 for elevated surfaces (001); select-frame specifics pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1 | Menu container elevated over the surface role | Popup background, elevation, radius and padding are `--ki-select-*` component tokens resolving from each theme's surface roles |
| Option states | The onmars vocabulary carries text-emphasis levels (001); select-frame specifics pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1 | Menu list items with enabled, hovered, focused, disabled and selected states | Option states styled via option state tokens and CSS states, never props; the selected option is exposed as selected to assistive technology |
| Size | The onmars vocabulary carries an xs–xl metric ramp (001); whether the select scales is pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1 | Single text-field height; no size scale for menus in the kit | No `size` attribute in v1 (charter: only where the sources scale the control); heights and metrics are per-theme component tokens. A size axis would be an additive MINOR if the MarsUI frames confirm one |
| Interaction states (trigger) | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | enabled, hovered, focused, disabled | CSS states (hover, focus-visible, disabled), token-styled, never props |
| Semantic intent | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Text field error state exists; validation-message display is a separate text-field concern | No `tone` axis; constraint validation (`required`) participates natively, validation-message display is post-v1 (003 precedent) |

**Verification risk (gate 1)**: every MarsUI cell above is pending, so the
"union of both reference designs" guarantee is currently one-sided — the API
below is effectively derived from Material 3 plus the onmars token vocabulary
(001/002). Decisions the MarsUI frames could invalidate NON-additively if
verification contradicts them: the trigger anatomy and the parts list
(`trigger`, `label`, `value`, `indicator`, `listbox` — a MarsUI select
demanding a different trigger anatomy, an error/tone visual, or a mandatory
secondary text line in options would reshape parts and markup expectations),
and the shape of the `--ki-select-*`/`--ki-option-*` token families. Purely additive risks (a
confirmed `size` axis) are already scoped in the table. The founder approves
at gate 1 with this asymmetry explicit; verifying the MarsUI select frames is
a gate-1 action item.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose one option from a closed list (Priority: P1)

A person filling in an application built with Kimen opens the select, sees
the available options, and picks exactly one. The trigger then shows the
choice; until a choice is made it shows a placeholder. Disabled selects and
disabled options are clearly unavailable and never change the selection.

**Why this priority**: single selection from a closed list is the entire
reason the component exists; every other capability layers on top of it.

**Independent Test**: render one select with three options, open it, pick
one, observe the displayed selection and a change notification; repeat
against a disabled select and a disabled option and observe no change.

**Acceptance Scenarios**:

1. **Given** a select labeled "Country" with options "Spain", "France" and
   "Portugal", **When** the user selects "France", **Then** the trigger
   shows "France" and the page observes one change with that value.
2. **Given** a disabled select, **When** the user attempts to open it,
   **Then** the options stay hidden and no selection change is observed.

---

### User Story 2 - Operate the select with the keyboard alone (Priority: P1)

A keyboard user reaches the select with Tab, opens it, moves the highlight
through the options with the arrow keys, jumps with Home/End, commits with
Enter or Space, or backs out with Escape — the full pointer behavior with
keys alone,
with visible focus at every step (APG select-only combobox pattern).

**Why this priority**: this is Kimen's first popup-based control; the APG
combobox keyboard contract is a constitutional obligation (Art. V) and
cannot be bolted on later.

**Independent Test**: complete a full selection round-trip (reach, open,
navigate, commit) and a full abandonment round-trip (open, navigate, Escape)
using only the keyboard, asserting outcome parity with the pointer path.

**Acceptance Scenarios**:

1. **Given** a focused closed select, **When** the user presses Arrow Down,
   **Then** the list opens with the current option highlighted.
2. **Given** an open select with "France" highlighted, **When** the user
   presses Enter, **Then** "France" is selected and the list closes.
3. **Given** an open select with an uncommitted highlight, **When** the user
   presses Escape, **Then** the list closes and the selection is unchanged.

---

### User Story 3 - Participate in a form (Priority: P2)

A person submits a native form containing the select: the chosen option's
value travels with the form data under the select's name, an empty required
select blocks submission, and resetting the form restores the initially
declared selection — with no extra wiring by the application.

**Why this priority**: ki-select follows the form-associated pattern
established by 002/003; without it the component cannot replace a native
select in real forms.

**Independent Test**: place the select in a native form; submit and inspect
the form data; submit with a required empty select and observe the block;
reset and observe the initial selection restored; disable an ancestor
fieldset and observe the select become inert.

**Acceptance Scenarios**:

1. **Given** a form with a select named "country" whose selected option
   carries value "fr", **When** the user submits the form, **Then** the
   submitted data contains "country" = "fr".
2. **Given** a required select with no selection, **When** the user submits
   the form, **Then** the form does not submit and the select is reported
   invalid.

---

### User Story 4 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and the select — trigger, popup, options and all their states —
restyles from the token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001; the select is the first component
whose popup surface must honor it too.

**Independent Test**: render the select closed and open under onmars,
declare the material3 theme, assert trigger and popup resolve appearance
from theme tokens; repeat for the forced dark scheme and an RTL document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the select takes material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the select uses the dark token values.

---

### User Story 5 - An agent generates a valid select (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
produces a select with options on the first try and knows when a select is
the wrong control (few options, on/off choices, free text). Malformed values
do not break rendering: a value matching no option falls back to no
selection.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a select whose `value` matches no option and
observe the placeholder fallback.

**Acceptance Scenarios**:

1. **Given** a select declared with a value matching no option, **When** the
   page renders, **Then** no option is selected and the trigger shows the
   placeholder.

### Edge Cases

- A `value` that matches no `ki-option` falls back to no selection and the
  placeholder (agent-generated markup is not trusted to be valid).
- A select with zero options renders, opens to an empty list, and submits no
  entry (no selection, native parity); nothing can be committed.
- Duplicate option values: the first matching option wins when resolving
  `value` to a selection.
- Keyboard highlight skips disabled options; Home/End land on the first/last
  enabled option.
- Options added or removed after render (agent-driven UI): the selection
  re-resolves against the current children; a selection whose option
  disappears falls back to no selection without dispatching `input` or
  `change`, and `value` then reads the empty string (FR-004, FR-005).
- Disabling the select (directly or via an ancestor disabled fieldset) while
  its popup is open closes the popup without committing.
- Interacting outside the open popup closes it without changing the
  selection (light dismiss).
- RTL documents: the displayed value leads and the dropdown indicator trails
  the writing direction (logical properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Select
  A select lets a person choose exactly one option from a closed list,
  reports the choice to forms and assistive technology, and restyles
  through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting an option updates the select's value
    Given a select labeled "Country" offering "Spain", "France" and "Portugal"
    When the user selects "France"
    Then the select shows "France" as its selection
    And a change event reports the value "France"

  # S2
  Scenario: The select renders closed showing its placeholder
    Given a select labeled "Country" with placeholder "Choose a country" and no selection
    When the page renders
    Then the options are hidden and the trigger shows "Choose a country"

  # S3
  Scenario: A disabled select never opens
    Given a disabled select labeled "Country"
    When the user attempts to open it
    Then the options remain hidden and no selection change is observed

  # S4
  Scenario: A disabled option cannot be selected
    Given an open select "Country" whose option "France" is disabled
    When the user attempts to select "France"
    Then the selection does not change

  # S5
  Scenario: A value matching no option falls back to no selection
    Given a select "Country" declared with value "Atlantis" that matches no option
    When the page renders
    Then no option is selected and the trigger shows the placeholder

  # S20
  Scenario: Interacting outside the open popup closes it without committing
    Given the open "Country" select with "Spain" selected
    When the user interacts outside the popup
    Then the options close and "Spain" remains selected

  # S25
  Scenario: Removing the selected option falls back to no selection
    Given a select "Country" with "France" selected
    When the application removes the "France" option
    Then no option is selected and the trigger shows the placeholder
    And no change event is observed

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches the select with visible focus
    Given a page whose first interactive element is a select
    When the user presses Tab
    Then the select is focused and its focus indication is visible

  # S7
  Scenario: Arrow Down opens the list and highlights the current option
    Given a focused closed select "Country" with "Spain" selected
    When the user presses Arrow Down
    Then the options open with "Spain" highlighted

  # S8
  Scenario: The keyboard commits the highlighted option and closes the list
    Given the open "Country" select with "France" highlighted
    When the user commits the highlighted option from the keyboard
    Then "France" is selected and the options close

  # S9
  Scenario: Escape closes the list without changing the selection
    Given the open "Country" select where "Spain" is selected and "France" is highlighted
    When the user presses Escape
    Then the options close and "Spain" remains selected

  # S10
  Scenario Outline: Home and End jump the highlight to the ends of the list
    Given the open "Country" select listing "Spain", "France" and "Portugal"
    When the user presses <key>
    Then <option> is highlighted

    Examples:
      | key  | option     |
      | Home | "Spain"    |
      | End  | "Portugal" |

  # S21
  Scenario: Tab closes the open popup discarding the uncommitted highlight
    Given the open "Country" select where "Spain" is selected and "France" is highlighted
    When the user presses Tab
    Then the options close and "Spain" remains selected

  # S22
  Scenario: The keyboard highlight skips a disabled option
    Given an open select "Country" whose option "France" is disabled and "Spain" is highlighted
    When the user presses Arrow Down
    Then "Portugal" is highlighted

  # S23
  Scenario: Opening with no selection highlights the first enabled option
    Given a focused closed select "Country" offering "Spain", "France" and "Portugal" with no selection
    When the user opens it from the keyboard
    Then the options open with "Spain" highlighted

  # Family: assistive-tech outcome
  # S11
  Scenario: The select is exposed as a named combobox with its value
    Given a select labeled "Country" with "France" selected
    When the accessibility tree is queried
    Then it exposes a collapsed combobox named "Country" whose value is "France"

  # S12
  Scenario: The open list is exposed as a listbox with the selected option
    Given the open select labeled "Country" with "France" selected
    When the accessibility tree is queried
    Then it exposes an expanded combobox and a listbox where "France" is marked selected

  # Family: form participation
  # S13
  Scenario: The select submits its value with the form
    Given a form containing a select named "country"
    And its option labeled "France" carrying value "fr" is selected
    When the user submits the form
    Then the submitted form data contains "country" with value "fr"

  # S14
  Scenario: A required select without a selection blocks submission
    Given a form containing a required select "Country" with no selection
    When the user submits the form
    Then the form does not submit and the select is reported invalid

  # S15
  Scenario: Resetting the form restores the select's initial selection
    Given the "country" select loaded with "France" selected and now shows "Portugal"
    When the user resets the form
    Then "France" is selected

  # S16
  Scenario: A disabled fieldset makes the select inert
    Given a select "Country" inside a disabled fieldset
    When the user attempts to open it
    Then the options remain hidden and the select is exposed as unavailable

  # S24
  Scenario: A select with no selection submits no entry
    Given a form containing a select named "country" with no selection
    When the user submits the form
    Then the submitted form data contains no entry for "country"

  # Family: theming
  # S17
  Scenario: A second theme restyles the select through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the select's appearance resolves from material3 token values

  # S18
  Scenario: The select honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the select's appearance resolves from the dark token values

  # S19
  Scenario: The select follows the document's writing direction
    Given a right-to-left document with a select showing "France"
    When the page renders
    Then the value leads and the dropdown indicator trails the writing direction
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S20, S25 | |
| Keyboard path | S6, S7, S8, S9, S10, S21, S22, S23 | |
| Assistive-tech outcome | S11, S12 | |
| Form participation | S13, S14, S15, S16, S24 | |
| Theming | S17, S18, S19 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The select MUST render a trigger plus a popup list built from
  its `ki-option` children, hold at most one selection at a time, and stay
  closed until deliberately opened. Multiselect, typeahead search box and
  autocomplete are out of v1 scope (charter).
- **FR-002**: The select MUST expose a visible `label` attribute that
  provides its accessible name. A `ki-option`'s label is its slotted
  content; an option without an explicit `value` uses its label text as its
  value (native option parity).
- **FR-003**: The select MUST expose a `placeholder` attribute rendered in
  the trigger while no option is selected. There are no hardcoded
  user-visible strings; label and placeholder are application-provided.
- **FR-004**: The select MUST expose a `value` attribute/property: reading
  returns the selected option's value, or the empty string when there is no
  selection; writing selects the first matching option. A value matching no
  option — whether declared, written programmatically, or left dangling
  after `ki-option` children change — MUST fall back to no selection (the
  placeholder state) without breaking rendering; after the fallback,
  reading `value` returns the empty string.
- **FR-005**: A user commit MUST dispatch composed `input` and `change`
  events that cross the shadow boundary, with native-select parity;
  no component-specific `ki-` events are introduced in v1. Only user
  commits dispatch these events: programmatic `value` writes and selection
  changes caused by `ki-option` children being added or removed dispatch
  no `input`/`change` (native parity — programmatic mutation is silent).
- **FR-006**: Pointer path: activating the trigger toggles the popup;
  activating an enabled option selects it and closes the popup; interacting
  outside the open popup closes it without changing the selection (light
  dismiss).
- **FR-007**: Keyboard path MUST follow the APG select-only combobox
  pattern, EXCEPT printable-character type-ahead, which v1 excludes under
  the charter's typeahead exclusion (open question for the founder at
  gate 1; if type-ahead is included, a new appended scenario ID lands in
  the Gherkin before implementation). Concretely: Enter, Space, Arrow Down
  and Arrow Up open the popup; Home and End on the closed select open the
  popup with the first/last enabled option highlighted (APG); on opening,
  the highlight lands on the selected option or, with no selection, on the
  first enabled option; while open, Arrow Down/Up move the highlight over
  enabled options without wrapping at either end, Home/End jump to the
  first/last enabled option, Enter and Space commit the highlight and
  close, Escape closes without committing, and Tab closes the popup
  discarding an uncommitted highlight before moving focus on — the
  discard-on-Tab model is the default reading pending founder confirmation
  at gate 1 (the APG also admits commit-on-Tab; see Assumptions). The
  highlight is always visible.
- **FR-008**: A disabled select MUST NOT open, MUST NOT be reachable in the
  tab order, and MUST expose its unavailable state; a select disabled
  through an ancestor disabled fieldset or form behaves identically. A
  disabled `ki-option` MUST NOT be selectable, MUST be skipped by the
  keyboard highlight, and MUST be exposed as unavailable.
- **FR-009**: The select MUST participate in native forms (form-associated):
  submitted data carries `name` with the selected option's value; with no
  selection the select contributes NO entry to the submitted data, and a
  disabled select (directly or via an ancestor disabled fieldset or form)
  submits nothing (native parity, 003 precedent); form reset restores the
  initially declared selection; `required` validity is evaluated on the
  value the select would submit: the control is invalid and blocks
  submission via constraint validation when that value is empty — whether
  because no option is selected or because the selected option carries an
  empty-string `value` (native placeholder-option parity).
  Validation-message display is out of v1 scope (003 precedent).
- **FR-010**: Assistive technology MUST perceive: a combobox named by the
  label, with collapsed/expanded state and the selected option's label as
  its value; the popup as a listbox; each choice as an option, the chosen
  one marked selected and disabled ones marked unavailable.
- **FR-011**: Every visual property (trigger, popup surface and elevation,
  option states, indicator, typography, spacing) MUST resolve from
  component tokens layered over the semantic layer — `--ki-select-*` for
  the select's own surfaces and `--ki-option-*` for option states (each
  published tag owns its own `--ki-<tag>-*` family); zero
  hardcoded visual values. Filled-vs-outlined trigger style, popup elevation
  and radius are theme token decisions, never attributes.
- **FR-012**: Interaction states (hover, focus-visible, disabled, open,
  highlighted, selected) MUST be styled exclusively through tokens and CSS
  states; states are never attributes/props.
- **FR-013**: The component MUST expose parts for the customization ladder:
  `trigger`, `label`, `value`, `indicator`, `listbox` on `ki-select` and
  `option` on `ki-option`.
- **FR-014**: Layout MUST use logical properties only; in RTL documents the
  displayed value leads and the dropdown indicator trails the writing
  direction.
- **FR-015**: Any popup open/close motion a theme adds MUST be suppressed
  under a reduced-motion preference.
- **FR-016**: Focus MUST be clearly visible in every theme; the trigger and
  each option row MUST meet the 24×24 px minimum pointer target in every
  theme.
- **FR-017**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (see Constitutional Surface).

### Key Entities

- **Option** (`ki-option`): one selectable choice — a machine-facing
  `value`, a human-facing label (slotted content), and availability
  (`disabled`). Belongs to this spec: the composite is one feature (charter).
- **Selection**: the at-most-one chosen option, driven by the select's
  `value`; when empty, the trigger shows the placeholder, `value` reads the
  empty string, the form receives no entry (native parity), and unmatched
  values resolve here.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): two new elements. `ki-select` (attributes:
  `label`, `placeholder`, `name`, `value`, `disabled`, `required`; slot:
  default, accepting `ki-option` children; parts: `trigger`, `label`,
  `value`, `indicator`, `listbox`; events: composed `input` and `change`;
  component tokens `--ki-select-*`) and the sub-component `ki-option`
  (attributes: `value`, `disabled`; slot: default label; part: `option`;
  component tokens `--ki-option-*`).
  Both tags are declared here — the composite is one feature (charter).
  Catalog and llms.txt regenerate with both entries.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost,
  expected at the upper end of the form-control batch (popup + highlight
  machinery); no new runtime dependency ("none" — positioning stays CSS-only
  in v1, see Assumptions).
- **Accessibility** (Art. V): APG combobox pattern, select-only variant with
  listbox popup. NEW interaction pattern in the repo → manual APG
  walkthrough REQUIRED and documented in the PR (charter flags select's
  listbox explicitly). axe zero violations across closed, open, disabled and
  required-invalid states in both themes, both schemes. WCAG 2.2 SC 1.3.5
  (Identify Input Purpose) — the Art. V obligation 003 established for form
  controls — is a recorded v1 deferral for this component: several 1.3.5
  purposes are select-shaped (country, country-name, language, bday-month,
  tel-country-code), but a custom select-only combobox has no native entry
  control to forward `autocomplete` to and no established machine-consumed
  exposure mechanism exists for custom widgets (see Assumptions for the full
  justification and the additive path back).
- **Tokens** (Art. VI): new component token family `--ki-select-*` in the
  component layer, resolving from the semantic layer: trigger structure
  (`height`, `padding-inline`, `gap`, `radius`, `border-width`,
  `font-size`), trigger colors
  (`--ki-select-{rest|hover|focus|disabled}-{bg|fg|border}`), popup surface
  (`--ki-select-listbox-{bg|radius|elevation|padding}`) and
  `--ki-select-focus-ring-{color|width|offset}`; plus the sub-component
  family `--ki-option-*` for option states
  (`--ki-option-{rest|hover|highlight|selected|disabled}-{bg|fg}`) — each
  published tag owns its own `--ki-<tag>-*` family, so `ki-option` carries
  its own (radio/list-item precedent), reusable if `ki-option` later serves
  other hosts. Both shipped themes
  (onmars, material3) get component token files; exact values land in
  implementation.
- **Catalog/agent legibility** (Art. I): when-to-use — a person must pick
  exactly one value from a closed list of known options, especially when the
  options are too many to show at once (roughly five or more) or space is
  limited. When NOT to use — two to four always-visible choices (use
  ki-radio-group), on/off decisions (ki-switch or ki-checkbox), free or
  searchable text entry (ki-input; this select has no typeahead in v1),
  multiple selection (out of v1), command menus or navigation (not a menu
  component).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can open the select, review every option and commit a
  selection with a pointer alone and with the keyboard alone, with identical
  outcomes in 100% of attempts.
- **SC-002**: the selected option's value is carried in the submitted form
  data in 100% of submissions, and a required select with no selection
  blocks submission in 100% of attempts.
- **SC-003**: switching the document theme (onmars ↔ material3) restyles
  trigger, popup and options — closed and open, light and dark — with zero
  markup or component changes; only the theme declaration differs.
- **SC-004**: zero accessibility violations across closed, open, disabled
  and invalid states in automated auditing, plus a documented manual
  walkthrough of the combobox pattern.
- **SC-005**: the component pair's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-006**: keyboard-only operation covers 100% of the behavior available
  to pointer users.

## Assumptions

- No `size`, `variant` or `tone` axes in v1: the M3 exposed dropdown menu
  offers no such scales and the MarsUI select frames are unverified
  (charter allows a subset with justification); any confirmed axis later is
  an additive MINOR.
- The selection's single source of truth is `ki-select`'s `value`;
  `ki-option` carries no `selected` attribute in v1 (avoids a dual source of
  truth; native-`selected` sugar could be additive later).
- An option without an explicit `value` uses its label text as its value
  (native option parity, least surprise Art. IV).
- The dropdown indicator is component-rendered (a part, themable via
  tokens), not a slot; `start`/`end` trigger slots for icons are post-v1
  additive (Art. VII — no scenario needs them).
- Popup placement in v1 is below the trigger with CSS-only positioning;
  viewport collision handling (flipping) is a post-v1 concern, keeping the
  bundle free of positioning dependencies.
- Printable-character type-ahead (first-letter jump to an option) is read as
  part of the charter's "NO typeahead" exclusion and left out of v1, even
  though the APG lists it for the pattern — FR-007 states this exception
  explicitly; flagged as an open question for the founder at gate 1. If the
  founder includes it, the decision folds back into FR-007 and a new
  appended scenario ID lands in the Gherkin before implementation.
- While the popup is open, Tab closes it and discards an uncommitted
  highlight (Escape parity, contracted as S21); the APG also admits a
  commit-on-Tab model — the discard model is the default reading stated in
  FR-007, pending founder confirmation at gate 1. If the founder picks
  commit-on-Tab, FR-007 and S21 are updated before implementation.
- There is no deselection gesture: once an option is committed, the only
  route back to an empty submission value is an application-provided option
  with an empty-string `value` (the native placeholder-option pattern), so
  the required-invalid state normally occurs only before the first
  selection or while such a placeholder option is selected.
- WCAG 2.2 SC 1.3.5 (Identify Input Purpose) is a documented v1 deferral,
  not an omission. The SC applies to controls collecting information about
  the user whose purpose maps to the HTML autofill field names, several of
  which are select-shaped (country, country-name, language, bday-month,
  tel-country-code), and 003 elevated it to a non-negotiable Art. V target
  for form controls. The mechanics differ here, though: 003 met the SC by
  forwarding `autocomplete` to the native input inside the shadow root,
  but ki-select renders no native form control — its trigger is a custom
  combobox, the HTML `autocomplete` attribute is defined only for
  input/select/textarea, and browser autofill does not consume ARIA — so
  there is today no established, machine-consumed mechanism through which
  a custom combobox can programmatically expose an input purpose. An
  `autocomplete` surface with no consumer would be a dead attribute
  contradicting Art. VII (no scenario can observe it). If a workable
  mechanism emerges (e.g. a visually hidden native `select` mirror for
  autofill, or platform support for autocomplete on form-associated custom
  elements), adding the surface is an additive MINOR; the gap is flagged
  for the founder at gate 1 alongside the other open questions.
- Validation-message display is out of v1 (003 precedent): constraint
  validation participates natively and the platform reports validity.
- Option grouping (an optgroup analog) and a `ki-` prefixed open/close event
  are out of v1 scope (Art. VII — no scenario requires them).
