# Feature Specification: ki-textarea

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-textarea` (spec `004-ki-textarea`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Multiline form control of the Fase 2 batch: a
`<ki-textarea>` web component, the multiline sibling of ki-input, that
captures long-form text with native form semantics. Material 3 treats
multi-line as a configuration of its text field; Kimen ships a separate
element because the underlying native control and its form semantics (Enter
inserts a line, height expressed in rows, content as text rather than a value
attribute) differ from the single-line input. v1 scope per the batch API
charter: visible `label`, `placeholder`, `readonly`, `required`, `disabled`,
`name`, `value`, `rows`; no auto-grow; form-associated via ElementInternals
following the 002 pattern; themed through tokens alone (onmars default,
material3 reference)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below abstracts what both reference designs need, so that neither
theme lacks expressive power (and future themes inherit the same guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-textarea |
|---|---|---|---|
| Component split | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | No separate textarea component: multi-line is a configuration of the text field | A dedicated `ki-textarea` element: the underlying native control and its form semantics (Enter inserts a line, height in `rows`, content as text not attribute) differ from single-line input |
| Container style | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Filled and outlined text-field styles | Surface treatment (filled vs outlined) is a theme decision expressed in component tokens, never a prop (002 shape precedent) |
| Label | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Label floats between placeholder position and the field's edge | Visible `label` prop rendered statically by the component and sourcing the accessible name; M3's floating-label motion is not reproduced in v1 (the component has no motion, so no reduced-motion surface) |
| Supporting text / counter | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Supporting text and character counter below the field | Out of v1 scope, post-v1 additive (charter alignment with ki-input); constraint validation itself still participates natively |
| Height / size | The onmars token layer ships an xs–xl metrics vocabulary; textarea-specific usage (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | The multi-line field's height comes from its configured lines, not a size ramp | `rows` attribute sets the visible line count (default 2, native parity); no `size` axis in v1; all metrics resolve from component tokens |
| Interaction states | Tone ramps and text-emphasis levels exist in the onmars token vocabulary (001 extraction); the textarea state matrix (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | enabled, hovered, focused, error, disabled | CSS states (hover, focus-visible, disabled, readonly, invalid), token-styled, never props (state vocabulary aligned with ki-input 003); on-screen validation-message display remains post-v1 |
| Auto-grow | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Multi-line field may grow as the user types | Out of v1 (charter): height is fixed by `rows`; auto-grow is a possible future additive feature |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture long-form text (Priority: P1)

A person writes multiline text — delivery instructions, feedback, a message —
into a clearly labeled field. Line breaks are part of the text: Enter starts a
new line and never submits the surrounding form. What they typed, line breaks
included, is exactly what the page observes.

**Why this priority**: multiline capture with line-break fidelity is the
entire reason this component exists apart from ki-input; everything else
layers on top of it.

**Independent Test**: render one labeled textarea, enter text containing line
breaks with the keyboard, read the value back and observe input as it
changes; press Enter inside a form and observe that no submission occurs.

**Acceptance Scenarios**:

1. **Given** a textarea labeled "Delivery notes", **When** the user enters
   two lines of text, **Then** the value preserves both lines separated by a
   line break.
2. **Given** a focused textarea inside a form, **When** the user presses
   Enter, **Then** a new line starts and the form does not submit.

---

### User Story 2 - Participate in a form (Priority: P2)

A person fills a form containing the textarea and submits or resets it
exactly as with a native multiline field: the text travels under the field's
name, reset restores the initial text, an empty required field blocks
submission, and disabling the enclosing fieldset disables the field — all
without the application wiring any extra code.

**Why this priority**: ki-textarea follows the form-association pattern
established by ki-button (002) and extends it to a value-carrying control;
form fidelity is what makes the component usable in real products.

**Independent Test**: place the textarea inside a native form; observe the
submitted data, the effect of reset, the blocked submission when required and
empty, and the disabled propagation from a fieldset.

**Acceptance Scenarios**:

1. **Given** a form holding a textarea named "comments" with text, **When**
   the user submits the form, **Then** the submitted data carries "comments"
   with that exact text.
2. **Given** a form whose required textarea is empty, **When** the user
   attempts to submit, **Then** the form does not submit and the field
   reports a missing value.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every textarea — every state, light and dark — restyles from the
token layer alone. No markup change, no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; every new component must honor it.

**Independent Test**: render the textarea in its state matrix (rest, focus,
disabled, readonly, required-invalid) under onmars, declare the material3
theme, assert appearance resolves from theme tokens; repeat for the forced
dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the textarea takes material3 appearance with
   unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the textarea uses the dark token values.

---

### User Story 4 - An agent places the right field (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
chooses ki-textarea for long-form text and ki-input for single-line values,
always provides a label, and produces valid usage on the first try. Malformed
attribute values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a textarea with an unrecognized `rows` value and
observe default rendering.

**Acceptance Scenarios**:

1. **Given** a textarea with an unrecognized `rows` value, **When** the page
   renders, **Then** the field renders at the default height.

### Edge Cases

- A non-numeric or missing `rows` value falls back to the default height
  (agent-generated markup is not trusted to be valid).
- Text content placed between the component's tags is ignored: the initial
  value is declared only through the `value` attribute (API parity with
  ki-input). The catalog documents this as an agent note — preloading text as
  element content is not supported usage and never breaks rendering.
- Form reset restores the value the field was declared with, discarding user
  edits (native dirty-value semantics). After the user has edited, mutating
  the declared `value` attribute does not overwrite the user's text;
  assigning the `value` property replaces it (native parity).
- Enter inside the textarea never submits the enclosing form — the exact
  opposite of the single-line input convention; both components document this
  in the catalog.
- Pasted text containing line breaks is preserved through the value and into
  the submitted data.
- Readonly vs disabled: a readonly textarea stays focusable, selectable and
  submits its value; a disabled one is skipped by focus and excluded from the
  submitted data.
- Disabled state applied while the textarea has focus: focus moves on, no
  further input is accepted (002 precedent).
- Content longer than the visible rows scrolls inside the field; the page
  layout does not shift (no auto-grow in v1).
- A textarea declared without a label is invalid usage: the label is the
  accessible-name source and the catalog marks it as required.
- RTL documents: label and entered text follow the writing direction (logical
  properties only, Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Textarea
  A multiline text field that captures long-form text with native form
  semantics — line breaks included — and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Typing fills the textarea and the page observes the input
    Given a textarea labeled "Delivery notes"
    When the user types "Leave the package at the back door"
    Then the textarea holds "Leave the package at the back door"
    And the page observes the value changing as the user types

  # S2
  Scenario: Line breaks are part of the value
    Given a textarea labeled "Delivery notes"
    When the user enters "Ring twice" and "Leave at the back door" on separate lines
    Then the textarea's value preserves the two lines separated by a line break

  # S3
  Scenario: Rows set the visible height of the field
    Given a textarea declared with 6 rows
    When the page renders
    Then the field is six text lines tall

  # S4
  Scenario: A readonly textarea preserves its text
    Given a readonly textarea labeled "Terms" holding "No refunds after 30 days"
    When the user attempts to edit the text
    Then the text remains "No refunds after 30 days"

  # S5
  Scenario: A disabled textarea accepts no input
    Given a disabled textarea labeled "Delivery notes"
    When the user attempts to type into it
    Then the textarea stays empty
    And focus never lands on it

  # S6
  Scenario: An unrecognized rows value falls back to the default height
    Given a textarea declared with a rows value of "tall"
    When the page renders
    Then the field renders at the default height

  # S19
  Scenario: The placeholder shows only while the field is empty
    Given an empty textarea labeled "Delivery notes" showing its placeholder "Add any special instructions"
    When the user types "Ring twice"
    Then the placeholder is no longer shown

  # S20
  Scenario: Committing an edit reports a change
    Given a textarea labeled "Delivery notes" whose text was edited to "Leave at the back door"
    When the user leaves the field
    Then a change event reports the value "Leave at the back door"

  # Family: keyboard path
  # S7
  Scenario: The keyboard reaches the textarea with visible focus
    Given a page whose first interactive element is a textarea
    When the user presses Tab
    Then the textarea is focused and its focus indication is visible

  # S8
  Scenario: Enter starts a new line instead of submitting the form
    Given a focused textarea inside a form
    When the user presses Enter
    Then a new line starts in the textarea
    And the form does not submit

  # S21
  Scenario: Tab moves focus onward instead of inserting a character
    Given a focused textarea holding "Ring twice", followed by another interactive element
    When the user presses Tab
    Then focus moves to the next interactive element
    And the textarea still holds "Ring twice"

  # Family: assistive-tech outcome
  # S9
  Scenario: The textarea is exposed as a named multiline text field
    Given a textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then it exposes a multiline text field whose accessible name is "Delivery notes"

  # S10
  Scenario: The required state is exposed to assistive technology
    Given a required textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then the field is exposed as required

  # S11
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled textarea labeled "Delivery notes"
    When the accessibility tree is queried
    Then the field is exposed as unavailable

  # S22
  Scenario: The readonly state is exposed to assistive technology
    Given a readonly textarea labeled "Terms"
    When the accessibility tree is queried
    Then the field is exposed as read-only

  # S25
  Scenario: The textarea identifies its entry purpose for autofill
    Given a textarea labeled "Shipping address" declaring autocomplete "street-address"
    When the page renders
    Then the field's entry purpose is programmatically exposed as "street-address"

  # Family: form participation
  # S12
  Scenario: The textarea submits its text with the form
    Given a form holding a textarea named "comments" with the text "Great service"
    When the user submits the form
    Then the submitted data contains "comments" with the text "Great service"

  # S13
  Scenario: Resetting the form restores the initial text
    Given a textarea whose initial text "Call on arrival" was edited away
    When the user resets the form
    Then the textarea holds "Call on arrival" again

  # S14
  Scenario: An empty required textarea blocks submission
    Given a form whose required textarea "Delivery notes" is empty
    When the user attempts to submit the form
    Then the form does not submit
    And the textarea reports that a value is missing

  # S15
  Scenario: Disabling the enclosing fieldset disables the textarea
    Given a textarea inside a disabled fieldset
    When the user attempts to type into it
    Then the textarea's text is unchanged

  # S16
  Scenario: A disabled textarea is left out of the submitted data
    Given a form holding a disabled textarea named "comments" with the text "Call first"
    When the user submits the form
    Then the submitted data does not contain "comments"

  # S23
  Scenario: A readonly textarea submits its text with the form
    Given a form holding a readonly textarea named "terms" with the text "No refunds after 30 days"
    When the user submits the form
    Then the submitted data contains "terms" with the text "No refunds after 30 days"

  # Family: theming
  # S17
  Scenario: A second theme restyles the textarea through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the textarea's appearance resolves from material3 token values

  # S18
  Scenario: The textarea honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the textarea's appearance resolves from the dark token values

  # S24
  Scenario: The label and entered text follow the document's writing direction
    Given a right-to-left document with a labeled textarea holding text
    When the page renders
    Then the label starts at the inline start edge
    And the entered text follows the right-to-left direction
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S19, S20 | |
| Keyboard path | S7, S8, S21 | |
| Assistive-tech outcome | S9, S10, S11, S22, S25 | |
| Form participation | S12, S13, S14, S15, S16, S23 | |
| Theming | S17, S18, S24 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The textarea MUST expose a visible `label` prop that renders as
  the field's label and is the source of its accessible name. Labeling is
  mandatory usage: the catalog marks `label` as required (a11y by
  construction).
- **FR-002**: The textarea MUST expose `name` and `value`: typing updates the
  field's `value`, and the value the field was declared with is what form
  reset restores. Native dirty-value semantics apply to programmatic changes:
  after the user has edited, mutating the declared `value` attribute does not
  overwrite the user's text, while assigning the `value` property replaces it.
- **FR-003**: The textarea MUST expose a `rows` attribute (positive integer,
  default 2 — native parity) that fixes the visible line count. Unrecognized
  or invalid values fall back to the default. Height is fixed by `rows`: no
  auto-grow and no user resize handle in v1.
- **FR-004**: Multiline semantics MUST match the native control: Enter
  inserts a line break and never submits the enclosing form; line breaks are
  preserved through the value and into the submitted data.
- **FR-005**: The textarea MUST expose a `placeholder` shown only while the
  field is empty; the placeholder is never a substitute for the label.
- **FR-006**: A readonly textarea MUST remain focusable and selectable, MUST
  reject edits, MUST still contribute its value to the submitted data, MUST
  be exempt from `required` validation (native parity, mirror of ki-input 003
  FR-006), and MUST expose its read-only state to assistive technology.
- **FR-007**: A disabled textarea MUST follow native semantics: not reachable
  in the tab order, accepts no input, is excluded from the submitted data,
  and exposes its unavailable state to assistive technology.
- **FR-008**: The textarea MUST participate in native forms
  (form-associated): its text submits under its `name`, form reset restores
  the initial text, and disabling an enclosing fieldset or form disables the
  field.
- **FR-009**: The textarea MUST support the `required` constraint: an empty
  required editable field blocks form submission and reports a missing value
  through native constraint validation. A readonly textarea is exempt from
  `required` validation (FR-006, native parity).
- **FR-010**: Editing MUST be observable to the page through the standard
  platform events for text entry (value changes as the user types, a commit
  notification on leaving the field after edits); no re-invented event names.
- **FR-011**: Every visual property (color, radius, spacing, typography,
  state styling) MUST resolve from `--ki-textarea-*` component tokens layered
  over the semantic token layer; zero hardcoded visual values. Both shipped
  themes (onmars, material3) MUST resolve the full state matrix.
- **FR-012**: Interaction states (hover, focus-visible, disabled, readonly,
  invalid) MUST be styled exclusively through tokens and CSS states; states
  are never attributes/props.
- **FR-013**: Focus MUST be clearly visible in every theme, in both color
  schemes.
- **FR-014**: The component MUST expose `field` (the container carrying the
  theme's surface treatment), `textarea` and `label` parts for the
  customization ladder (tokens first, then parts; part vocabulary aligned
  with ki-input 003).
- **FR-015**: Layout MUST use logical properties only, so RTL documents
  render the label and the entered text following the writing direction
  (Art. IV).
- **FR-016**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (long-form text here; single-line
  values, constrained choices and rich text are documented as
  when-NOT-to-use).
- **FR-017**: The textarea MUST expose an `autocomplete` attribute forwarded
  to the multiline entry control inside the shadow root, so the field's
  purpose (e.g. `street-address`) is programmatically identifiable by
  browsers and assistive technology (WCAG 2.2 SC 1.3.5 Identify Input
  Purpose; EN 301 549 §9.1.3.5). Without the forward, host-level
  autocomplete never reaches the entry control and no consumer of
  ki-textarea could reach AA (exact mirror of ki-input 003 FR-017).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-textarea` (attributes:
  `label`, `name`, `value`, `placeholder`, `rows`, `required`, `readonly`,
  `disabled`, `autocomplete`; slots: none in v1 — the label is a prop and affix slots are
  deliberately excluded, see Assumptions; light-DOM text content is ignored
  (the initial value is declared via `value`, see Edge Cases); parts:
  `field`, `textarea`, `label`; events:
  standard composed text-entry events (`input`, `change`), no `ki-*` events;
  component tokens: `--ki-textarea-*`). Additive MINOR. Catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): native multiline-textbox semantics (labeled
  form control); no new composite interaction pattern, so no manual APG
  walkthrough is required for this component (the charter reserves that flag
  for dialog, tooltip, tabs and select's listbox). axe zero violations across
  the state matrix (rest, focus, disabled, readonly, required-invalid) in
  both themes and both schemes. WCAG 2.2 SC 1.3.5 (Identify Input Purpose)
  is met through the forwarded `autocomplete` attribute (FR-017, S25) — a
  gap axe cannot detect, so it is contract-covered rather than
  gate-covered (mirror of ki-input 003).
- **Tokens** (Art. VI): new component token family `--ki-textarea-*` in the
  component layer, resolving from the semantic layer — structure
  (padding, gap, radius, font, line metrics that make `rows` meaningful) and
  color per state (`rest`/`hover`/`focus`/`disabled`/`readonly`/`invalid` ×
  `bg`/`fg`/`border`, placeholder foreground, label foreground — state keys
  aligned with `--ki-input-*`) plus
  `--ki-textarea-focus-ring-{color|width|offset}`. Both shipped themes get
  component token files. No semantic-layer deltas are anticipated; if the
  contrast gate demands any, they will be declared for explicit founder
  sign-off at the merge gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — free-form text longer
  than one line: comments, descriptions, messages, delivery notes. When NOT
  to use — single-line values (ki-input), constrained choices (ki-select,
  ki-checkbox, ki-radio-group), rich or formatted text editing (no Kimen
  component; out of scope), search boxes (ki-input type search). Agent note
  in the catalog: the initial text is declared through the `value`
  attribute; element text content is ignored (unlike the native multiline
  control).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can enter, edit and submit multiline text using
  pointer or keyboard alone; line breaks survive into the submitted data in
  100% of attempts.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles the
  textarea across its full state matrix with zero markup or component changes
  — only the theme declaration differs.
- **SC-003**: zero accessibility violations in automated auditing across the
  state matrix (rest, focus, disabled, readonly, required-invalid) in both
  themes and both color schemes.
- **SC-004**: form participation is indistinguishable from a native multiline
  field for submit, reset, required blocking and fieldset disabling —
  observed submitted data and reset outcomes match native behavior in 100% of
  the covered scenarios.
- **SC-005**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-006**: keyboard-only operation covers 100% of the behavior available
  to pointer users.

## Assumptions

- Default `rows` is 2, matching the native multiline control (Art. IV, least
  surprise); themes may still size line metrics through tokens.
  [NEEDS CLARIFICATION: default row count rests on native parity, not on the
  unverified MarsUI textarea frames — founder to confirm or override at
  gate 1.]
- No `size` axis in v1: Material 3's multi-line field takes its height from
  its configured lines rather than a size ramp; adding `size` later is an
  additive MINOR change (charter allows subsets with justification).
  [NEEDS CLARIFICATION: the MarsUI textarea frames are unverified — if they
  carry a size ramp, the founder decides at gate 1 whether `size` enters v1
  or lands as the additive MINOR.]
- No slots in v1 (deviation from ki-input's `start`/`end` affix slots,
  justified per charter): the label is a prop, and leading/trailing affixes
  on a multiline field are awkward in M3's multi-line configuration.
  Simplest design that satisfies the scenarios (Art. VII); affix slots would
  be additive MINOR later. [NEEDS CLARIFICATION: the MarsUI textarea frames
  are unverified — if they show affixes on the multiline field, the founder
  decides at gate 1 whether `start`/`end` slots enter v1.]
- The initial value is declared through the `value` attribute, never through
  element text content (API parity with ki-input, one uniform authoring
  contract for agents across the batch). The Input section's contrast with
  the native control ("content as text rather than a value attribute")
  describes the underlying native form semantics the component wraps, not
  its authoring surface: light-DOM text children are ignored (see Edge
  Cases).
- Readonly textareas being exempt from `required` validation follows native
  semantics deliberately (least surprise, Art. IV; exact mirror of ki-input
  003 FR-006).
- `autocomplete` is a deliberate, recorded deviation from the charter's 004
  attribute list (charter rule: deviations are justified here), the exact
  mirror of ki-input 003 FR-017. WCAG 2.2 SC 1.3.5 (Identify Input Purpose)
  is a NON-NEGOTIABLE Art. V target; autofill purposes apply to multiline
  fields too (`street-address` is inherently multiline and the native
  multiline control accepts the attribute), and with shadow DOM an
  autocomplete set on the host never reaches the entry control — without
  FR-017 no consumer of ki-textarea could reach AA, and axe does not detect
  the gap. Constitution > charter on conflict; the addition is additive and
  dependency-free.
- Supporting/helper text, validation-message display and the character
  counter are out of v1 scope (post-v1 additive, aligned with ki-input);
  constraint validation itself participates natively, so an empty required
  field still blocks submission and reports through the platform's own UI.
- `maxlength` is deferred together with the character counter so length
  limiting and its feedback ship as one coherent feature (open question for
  the founder at gate 1).
- Height is fixed by `rows` in v1: no auto-grow (charter) and no user resize
  handle, keeping layout predictable for agents composing views (open
  question for the founder at gate 1).
- M3's floating-label motion is not reproduced: the label renders statically.
  The component therefore has no motion of its own and needs no
  `prefers-reduced-motion` scenario; if a future theme adds label motion, the
  reduced-motion obligation lands with that feature.
- The invalid state ships in v1 as a token-styled CSS state with its own
  `invalid-{bg|fg|border}` token keys, aligned with ki-input (003): same
  charter, same batch, same answer, so required-invalid is part of the state
  matrix both themes must resolve (US3, SC-003, FR-011). On-screen
  validation-message display and supporting text remain post-v1; validity
  itself is reported through native constraint validation and the
  accessibility tree.
- MarsUI cells marked pending in the design-source table are to be confirmed
  at gate 1 (Figma connector unavailable 2026-07-08, per the batch honesty
  rule); the API is defensible from the M3 inventory plus the batch charter
  regardless of the outcome, and the three MarsUI-dependent scope decisions
  above carry explicit [NEEDS CLARIFICATION] markers so the founder approves
  them as open questions, not settled defaults.
