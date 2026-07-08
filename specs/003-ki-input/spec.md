# Feature Specification: ki-input

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-input` (spec `003-ki-input`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Second Kimen component: a `<ki-input>` web
component — a single-line text field whose API abstracts the common patterns
of the two reference design systems (MarsUI/onmars as default theme, Material
3 Design Kit/material3 as reference theme) so any future theme maps through
tokens alone. Batch charter scope (Fase 2): `type` limited to text / email /
password / url / tel / search (number is post-v1); visible `label` prop
(a11y-required), `placeholder`, `readonly`, `required`, `disabled`, `name`,
`value`; `start`/`end` slots for icons and affixes; form-associated via the
002 ElementInternals pattern. Supporting/helper text and on-screen
validation-message display are OUT of v1 (additive later) — constraint
validation itself participates natively."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below abstracts the patterns of both reference designs so that
neither theme lacks expressive power. Per the batch honesty rule, the
Material 3 column is grounded in the M3 text-field inventory notes; MarsUI
cells state only what the 001 token extraction and the 002 button analysis
established — everything else carries the pending mark instead of invented
facts:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-input |
|---|---|---|---|
| Container style | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Two enclosure styles: filled and outlined | NOT a prop: the enclosure is a per-theme decision resolved by `--ki-input-*` tokens (002 precedent: pure-appearance axes are token-layer decisions); the family includes per-logical-side border-width tokens so both enclosures — outlined's full border and filled's bottom-only active indicator — are expressible |
| Anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Container, label, input text, leading icon, trailing icon, prefix/suffix, supporting text | Visible `label` attribute (the accessible-name source), the entry area, and `start`/`end` slots for icons and text affixes. Supporting text: OUT of v1, additive later |
| Validation display | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Error state surfaces through supporting text and container/label colors | Constraint validation participates natively (`required` plus the entry kind's own validity, e.g. a malformed email); the on-screen message line is deferred together with supporting text (post-v1 additive) |
| Interaction states | State ramps (rest/hover/focus/disabled) exist in the onmars token vocabulary and were proven for 002; input-specific state frames (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Enabled, hovered, focused, error, disabled | CSS states (hover, focus-visible, disabled, readonly, invalid) styled exclusively through tokens, never props |
| Size | xs–xl metric scale exists in the onmars token vocabulary (001 extraction); input-specific sizing (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | No size axis in the text-field inventory | No `size` attribute in v1 (charter scope); height, padding and typography are per-theme component tokens. A size axis would be an additive MINOR if the MarsUI frames confirm one |
| Value kinds | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Text fields are value-kind agnostic in the kit | `type`: text (default) / email / password / url / tel / search, preserving native entry semantics per kind. `number` excluded from v1 (spinner + locale complexity) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter text the page can read (Priority: P1)

A person filling in an application built with Kimen types into a labeled
field — with a keyboard, an IME or assistive technology — and the page
observes the value as it is entered and when the edit is committed. A
disabled field accepts no entry; a readonly field shows its value but
rejects edits.

**Why this priority**: capturing free text with native-input parity is the
entire reason the component exists; every other capability layers on top.

**Independent Test**: render one labeled input, type into it, observe the
value and the input/change events; set it disabled and observe no entry;
set it readonly and observe the value survives edit attempts.

**Acceptance Scenarios**:

1. **Given** an empty input labeled "Email", **When** the user types
   "ada@example.com", **Then** the field's value is "ada@example.com" and
   the page observes input events during entry.
2. **Given** a disabled input, **When** the user attempts to type into it,
   **Then** its value remains empty.

---

### User Story 2 - Participate in a form (Priority: P1)

A person completes and submits a native form containing the field, exactly
as with a native input, without the application wiring any extra code: the
name/value pair submits, Enter submits the form, reset restores the initial
value, and an empty required field blocks submission.

**Why this priority**: ki-input is the first value-carrying form control and
exercises the full ElementInternals pattern established by 002 (value
submission, reset, ancestor disabling, constraint validation).

**Independent Test**: place the input inside a native form; submit and
inspect the form data; reset after editing; attempt submission with an
empty required field.

**Acceptance Scenarios**:

1. **Given** a form holding an input named "email" with a value, **When**
   the user submits the form, **Then** the submitted data carries
   "email" with that value.
2. **Given** a form containing an empty required input, **When** the user
   attempts to submit, **Then** the form does not submit and the field
   reports itself as invalid.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every field — all types and all interaction states, including the
enclosure style — restyles from the token layer alone. No markup change, no
component change.

**Why this priority**: one-step re-theming is Kimen's visible
differentiator, proven in CI since 001 and honored by 002; the input extends
it to the first form control, where M3's filled/outlined enclosure must be a
theme decision, not an API axis.

**Independent Test**: render the type × state matrix under onmars, declare
the material3 theme, assert every field resolves its appearance from theme
tokens; repeat for the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** fields take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** fields use the dark token values.

---

### User Story 4 - An agent generates a valid field (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
produces a correctly labeled field of the right kind on the first try —
"label is mandatory, placeholder is a hint, use ki-textarea for multiline".
Malformed values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an input with an unknown `type` value and observe
plain-text behavior.

**Acceptance Scenarios**:

1. **Given** an input with an unrecognized type value, **When** the page
   renders, **Then** the field behaves as a plain text field.

### Edge Cases

- Unknown `type` values fall back to `text` (agent-generated markup is not
  trusted to be valid); rendering never breaks.
- A missing `label` leaves the field without an accessible name: the label
  is documented as mandatory in the catalog and its absence fails the
  accessibility gate — it is misuse, not a supported mode.
- The placeholder is a hint only: it never becomes the accessible name and
  never substitutes the label.
- Password masking is display-only: the form data carries the plain value.
- A readonly field is exempt from `required` validation and still submits
  its value (native parity); a disabled field submits nothing.
- Disabled applied while the field has focus: focus moves on, no further
  entry is observed.
- Form reset restores the value the field was declared with, discarding
  user edits (native dirty-value semantics).
- A freshly rendered untouched field never shows the invalid appearance,
  even when empty and required; the invalid state surfaces only after user
  interaction or an attempted submission (user-invalid semantics).
- RTL documents: `start`/`end` slots and paddings follow writing direction
  (logical properties only, Art. IV); the entry text direction follows the
  document.
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet
  falls back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Input
  A single-line text field that reports what a person types to the page,
  to native forms and to assistive technology, and lets any brand restyle
  it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Typing fills the field and the page observes it
    Given an empty input labeled "Email"
    When the user types "ada@example.com"
    Then the field's value is "ada@example.com"
    And the page observes input events as the text is entered

  # S2
  Scenario: Committing an edit reports a change
    Given an input labeled "Email" whose text was edited to "ada@example.com"
    When the user leaves the field
    Then a change event reports the value "ada@example.com"

  # S3
  Scenario: A disabled input accepts no entry
    Given a disabled input labeled "Email"
    When the user attempts to type into it
    Then the field's value remains empty

  # S4
  Scenario: A readonly input shows its value but rejects edits
    Given a readonly input labeled "Membership ID" with value "KMN-0042"
    When the user attempts to type into it
    Then the field's value remains "KMN-0042"

  # S5
  Scenario: A password field obscures what is typed
    Given an empty input labeled "Password" of type password
    When the user types "correct horse battery"
    Then the entered text is displayed obscured
    And the field's value is "correct horse battery"

  # S6
  Scenario: Unknown type values fall back to plain text
    Given an input declared with an unrecognized type value
    When the page renders
    Then the field behaves as a plain text field

  # S19
  Scenario: The label is rendered on screen
    Given an input labeled "Email"
    When the page renders
    Then the label "Email" is visible alongside the entry area

  # S20
  Scenario: Assigning the value programmatically replaces the displayed value
    Given an input labeled "Email" whose text the user edited to "draft"
    When the page assigns the value "ada@example.com" programmatically
    Then the field displays "ada@example.com"
    And no change event is observed

  # S21
  Scenario: The invalid appearance surfaces only after a submission attempt
    Given a form whose empty required input shows no invalid appearance on first render
    When the user attempts to submit the form
    Then the field shows the invalid state appearance

  # Family: keyboard path
  # S7
  Scenario: The keyboard reaches the field with visible focus
    Given a page whose first interactive element is an input labeled "Email"
    When the user presses Tab
    Then the field is focused and its focus indication is visible

  # S8
  Scenario: Enter in the field submits its form
    Given a form containing a focused input labeled "Email"
    When the user presses Enter
    Then the form submits

  # S22
  Scenario: The keyboard reaches a readonly field with visible focus
    Given a page whose first interactive element is a readonly input labeled "Membership ID"
    When the user presses Tab
    Then the field is focused and its focus indication is visible

  # Family: assistive-tech outcome
  # S9
  Scenario: The field is exposed as a labeled text entry
    Given an input labeled "Email"
    When the accessibility tree is queried
    Then it exposes a text field whose accessible name is "Email"

  # S10
  Scenario: The required state is exposed to assistive technology
    Given a required input labeled "Email"
    When the accessibility tree is queried
    Then the field is exposed as required

  # S11
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled input labeled "Email"
    When the accessibility tree is queried
    Then the field is exposed as unavailable

  # S23
  Scenario: The placeholder never becomes the accessible name
    Given an input labeled "Email" with placeholder "name@example.com"
    When the accessibility tree is queried
    Then the accessible name is "Email"

  # S24
  Scenario: The readonly state is exposed to assistive technology
    Given a readonly input labeled "Membership ID"
    When the accessibility tree is queried
    Then the field is exposed as read-only

  # S25
  Scenario: The field identifies its entry purpose for autofill
    Given an input labeled "Email" declaring autocomplete "email"
    When the page renders
    Then the field's entry purpose is programmatically exposed as "email"

  # Family: form participation
  # S12
  Scenario: The field submits its name and value with the form
    Given a form holding an input named "email" with value "ada@example.com"
    When the user submits the form
    Then the submitted form data contains "email" with value "ada@example.com"

  # S13
  Scenario: Resetting the form restores the field's initial value
    Given a form whose input labeled "Email" was edited away from its initial value
    When the user resets the form
    Then the field returns to its initial value

  # S14
  Scenario: An empty required field blocks submission
    Given a form containing an empty required input labeled "Email"
    When the user attempts to submit the form
    Then the form does not submit
    And the field reports itself as invalid

  # S15
  Scenario: A disabled enclosing group takes the field out of the form
    Given a form whose disabled fieldset contains an input named "email"
    When the user submits the form
    Then the submitted form data does not contain "email"

  # S26
  Scenario: A readonly field still submits its value
    Given a form holding a readonly input named "id" with value "KMN-0042"
    When the user submits the form
    Then the submitted form data contains "id" with value "KMN-0042"

  # S27
  Scenario: An empty readonly required field does not block submission
    Given a form containing an empty readonly required input labeled "Membership ID"
    When the user attempts to submit the form
    Then the form submits

  # S28
  Scenario: A value mismatching its declared kind blocks submission
    Given a form holding an email input with value "not-an-email"
    When the user attempts to submit the form
    Then the form does not submit
    And the field reports itself as invalid

  # Family: theming
  # S16
  Scenario: A second theme restyles the field through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the field's appearance resolves from material3 token values

  # S17
  Scenario: The field honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the field's appearance resolves from the dark token values

  # S18
  Scenario: Field adornments follow the document's writing direction
    Given a right-to-left document with icons in the input's start and end slots
    When the page renders
    Then the start content leads and the end content trails the entry area
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S19, S20, S21 | |
| Keyboard path | S7, S8, S22 | |
| Assistive-tech outcome | S9, S10, S11, S23, S24, S25 | |
| Form participation | S12, S13, S14, S15, S26, S27, S28 | |
| Theming | S16, S17, S18 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The input MUST expose a `type` attribute with exactly six
  values — `text` (default), `email`, `password`, `url`, `tel`, `search` —
  each preserving the native entry semantics of its kind (e.g. password
  entry is displayed obscured). `number` is excluded from v1.
- **FR-002**: The input MUST expose a visible `label` attribute that renders
  as the field's on-screen label AND is its accessible name. The label is
  mandatory for valid usage; the placeholder never substitutes it.
- **FR-003**: The input MUST expose a `placeholder` attribute shown as a
  hint while the field is empty; it MUST never be exposed as the accessible
  name.
- **FR-004**: Text entry MUST behave with native-input parity: typing
  updates the field's `value`; the page observes composed `input` events
  during entry and a composed `change` event when an edit is committed —
  platform event names, no `ki-`-prefixed re-emission (charter). Assigning
  the `value` property programmatically replaces the displayed value and
  emits no `input`/`change` events (native parity: events report user
  actions only); the `value` attribute declares the default and is never
  rewritten by typing.
- **FR-005**: A disabled input MUST NOT accept entry, MUST NOT be reachable
  in the tab order, MUST NOT contribute to submitted form data, and MUST
  expose its unavailable state to assistive technology.
- **FR-006**: A readonly input MUST remain focusable and its value
  selectable, MUST reject edits, MUST still submit its value, MUST be
  exempt from `required` validation, and MUST expose its read-only state
  to assistive technology (native parity).
- **FR-007**: The input MUST participate in native forms (form-associated,
  002 ElementInternals pattern): its `name`/`value` pair submits with the
  form, pressing Enter inside the field submits the form (implicit
  submission), form reset restores the declared initial value, and
  disabling an enclosing fieldset or form removes it from the submitted
  data.
- **FR-008**: The input MUST support constraint validation with full
  native parity: the entry control's native validity is mirrored to the
  form, so an empty `required` field and a value mismatching its declared
  kind (e.g. a malformed email or url) each block form submission and
  report the field as invalid, while a field satisfying its constraints
  never blocks. On-screen validation-message display is OUT of v1; native
  reporting is used.
- **FR-009**: Content MUST compose through `start` and `end` slots for
  icons and text affixes; their order and the field's padding MUST follow
  the document's writing direction (logical properties only, Art. IV).
- **FR-010**: Every visual property (color, radius, spacing, typography,
  enclosure style, state styling) MUST resolve from `--ki-input-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values. The filled/outlined enclosure is a theme/token decision,
  never an attribute.
- **FR-011**: Interaction states (hover, focus-visible, disabled, readonly,
  invalid) MUST be styled exclusively through tokens and CSS states; states
  are never attributes/props. The invalid appearance MUST surface only
  after the user has interacted with the field or a submission was
  attempted (user-invalid semantics) — never on the first render of an
  untouched field.
- **FR-012**: Unrecognized `type` values MUST fall back to `text` without
  breaking rendering.
- **FR-013**: Focus MUST be clearly visible in every theme; the field's
  pointer target MUST be at least 24 px tall in every theme (WCAG 2.2
  minimum, 002 precedent).
- **FR-014**: The component MUST expose `field`, `input` and `label` parts
  for the customization ladder (tokens first, then parts, then slots).
- **FR-015**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (multiline → future ki-textarea,
  option choice → future ki-select, boolean → future ki-checkbox/ki-switch).
- **FR-016**: The component introduces no intrinsic motion in v1 (static
  label, no floating-label animation); any transition a theme adds through
  tokens MUST respect `prefers-reduced-motion`.
- **FR-017**: The input MUST expose an `autocomplete` attribute forwarded
  to the entry control inside the shadow root, so the field's purpose
  (e.g. `email`, `tel`, `current-password`) is programmatically
  identifiable by browsers and assistive technology (WCAG 2.2 SC 1.3.5
  Identify Input Purpose; EN 301 549 §9.1.3.5). Without the forward,
  host-level autocomplete never reaches the entry control and no consumer
  of ki-input could reach AA.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-input` (attributes:
  `type`, `label`, `placeholder`, `value`, `name`, `required`, `readonly`,
  `disabled`, `autocomplete`; slots: `start`, `end` — no default slot, the label is an
  attribute; parts: `field`, `input`, `label`; events: composed `input` and
  `change` with platform semantics, no component-specific events; component
  tokens: `--ki-input-*`). Purely additive — no existing API changes.
  Catalog and llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no
  new runtime dependency ("none").
- **Accessibility** (Art. V): native text-input semantics with a visible
  label as the accessible name — an established pattern, NOT a new APG
  interaction pattern, so no manual APG walkthrough is required (charter
  flags dialog/tooltip/tabs/select only). axe zero violations across
  type × state × theme; keyboard family covered by S7/S8/S22. WCAG 2.2
  SC 1.3.5 (Identify Input Purpose) is met through the forwarded
  `autocomplete` attribute (FR-017, S25) — a gap axe cannot detect, so it
  is contract-covered rather than gate-covered.
- **Tokens** (Art. VI): new component token family `--ki-input-*` in the
  component layer, following the 002 convention — structure
  (`height`, `padding-inline`, `gap`, `radius`, `font-size`, `font-weight`,
  plus border width per logical side: `border-width` with per-side
  overrides such as `border-block-end-width`, so a theme can express
  either M3 enclosure — outlined's full border or filled's bottom-only
  active indicator — as 002 included `border-width` explicitly),
  per-state color (`{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border}`
  plus placeholder and label color), and
  `--ki-input-focus-ring-{color|width|offset}` — resolving from the
  semantic layer in both shipped themes (onmars, material3). No
  semantic-layer deltas anticipated; if the contrast gate's WCAG arithmetic
  forces any (as in 002), they will be declared explicitly for founder
  sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — collecting one line
  of free text from a person (name, email, password, URL, phone, search
  query), always with a visible label. When NOT to use — multiline text
  (future ki-textarea), choosing among predefined options (future
  ki-select / ki-radio-group), boolean state (future ki-checkbox /
  ki-switch), numeric stepper entry (`type="number"` is post-v1).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can enter, correct and clear text using only the
  keyboard, in 100% of the six types; keyboard-only operation covers 100%
  of the behavior available to pointer users.
- **SC-002**: the value carried in submitted form data matches the entered
  text in 100% of types, and form reset restores the declared initial
  value in 100% of attempts.
- **SC-003**: an empty required field and a value mismatching its declared
  kind (e.g. a malformed email) block form submission in 100% of attempts,
  and a field satisfying its constraints never blocks it (full
  constraint-validation parity with the native input).
- **SC-004**: switching the document theme (onmars ↔ material3) restyles
  every type × state combination with zero markup or component changes —
  only the theme declaration differs.
- **SC-005**: zero accessibility violations across type × state × theme in
  automated auditing, and every rendered field exposes a non-empty
  accessible name equal to its label.
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- The label is an attribute, not a slot, so the accessible-name wiring to
  the native entry control is guaranteed by construction; a slotted rich
  label could arrive later as an additive MINOR.
- No `size`, `variant` or `tone` attributes in v1: the M3 text-field
  inventory shows no emphasis or size axis and the MarsUI input frames are
  pending verification (charter scope). Introducing a size axis later would
  be additive MINOR.
- The enclosure style (M3 filled vs outlined) is a per-theme token
  decision; the material3 theme picks one M3 enclosure as its reference
  rendering, and onmars decides its own once the MarsUI frames are
  verified at gate 1. The component API is identical either way.
- `type="number"` is excluded from v1 (spinner UI + locale/formatting
  complexity, per charter); it is a post-v1 additive candidate.
- Supporting/helper text and on-screen validation-message display are
  deferred (charter): additive post-v1 surface. Constraint validation
  itself is in scope now via native reporting.
- The v1 label is static — no M3 floating-label animation — so the
  component has no intrinsic motion; FR-016 covers theme-added transitions
  under `prefers-reduced-motion`.
- Readonly fields being exempt from `required` validation follows native
  semantics deliberately (least surprise, Art. IV).
- `autocomplete` is a deliberate, recorded deviation from the charter's 003
  attribute list (charter rule: deviations are justified here). WCAG 2.2
  SC 1.3.5 (Identify Input Purpose) is a NON-NEGOTIABLE Art. V target, and
  with shadow DOM an autocomplete set on the host never reaches the entry
  control — without FR-017 no consumer of ki-input could reach AA, and axe
  does not detect the gap. Constitution > charter on conflict; the addition
  is additive and dependency-free.
- Constraint-validation scope in v1: the entry control's FULL native
  validity is mirrored via ElementInternals — `required` (valueMissing)
  plus whatever the declared kind contributes natively (e.g. email/url
  mismatch; `tel` contributes none natively). Mirroring rather than
  filtering is the simplest design (Art. VII) and keeps FR-001's "native
  entry semantics" and SC-003's parity claim consistent.
- Native dirty-value semantics govern `value`: the attribute declares the
  default only and is never rewritten by typing; the property reads and
  writes the live current value; a programmatic property assignment
  replaces the displayed value without emitting `input`/`change` (events
  report user actions only); form reset restores the attribute-declared
  default, discarding user edits and programmatic assignments alike.
- MarsUI cells marked pending in the design-source table are to be
  confirmed at gate 1 (Figma connector unavailable 2026-07-08); the API is
  defensible from the M3 inventory plus the batch charter regardless of
  the outcome.
