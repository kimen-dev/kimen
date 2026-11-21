# Feature Specification: Field custom error

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, with Arts. I, IV, V, VII, VIII and IX. -->

**Feature Branch**: `claude/field-custom-error-327cd5` (spec `156-field-custom-error`)

**Created**: 2026-11-21

**Status**: Approved. The founder approved the contract S1 to S14 and its
decisions D1 to D8 on 2026-11-21 ("Aprobado el contrato 156, adelante con la
implementación"). The design it implements (improvement 14, block C1) was
approved the same day.

**Input**: A generated UI spec cannot put an error of the application next to
a field. On `main` (`618df310`) `error-text` is only the wording of the
message a control shows when its own constraint fails: a required field left
empty, text that is not a number, a date out of bounds. A control whose value
it considers valid shows nothing, whatever `error-text` says. The application
error exists (`setCustomValidity`, spec 036), but it is a method, which a
declarative spec cannot call, and it shows only after a blocked submission,
which a spec never makes (spec 152). The phase 2 probes checked this in three
engines: a live `set` of `error-text` on a `ki-number-input`, a
`ki-date-picker`, a `ki-select` and a `ki-input` holding valid values writes
the attribute and shows nothing. Three controls, `ki-number-input`,
`ki-date-picker` and `ki-combobox`, also lack the public `checkValidity()`
and `reportValidity()` that the other form controls have, which the action
`collect` of spec 153 needs to ask a collected control to show its message.

**Constitution check**: a public API addition on twelve existing components
(Art. II, IX), reusing the accessible error line of spec 042 (Art. V), and a
new catalog prop an agent can fill (Art. I, VIII). No guardrail or security
boundary changes: the catalog gains the prop by regeneration and the
renderer passes it through its existing string-prop checks.

## Decisions *(proposed, for the founder's approval with the contract)*

- **D1 Shape.** One string prop, attribute `custom-error`, property
  `customError`, on `ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox`,
  `ki-checkbox-group`, `ki-radio-group`, `ki-switch`, `ki-number-input`,
  `ki-time-input`, `ki-code-input`, `ki-date-picker` and `ki-combobox`.
  `ki-file-upload` is left out: its `error-text` already is an application
  error, and two props for one job would confuse agents.
- **D2 Shown at once.** While `custom-error` holds text and counts, the
  control is invalid (`customError` validity flag through `ElementInternals`)
  and shows that text in its error line without waiting for the person to
  leave the field or submit, unlike `error-text` and `setCustomValidity`. A
  spec can neither submit nor call a method, so waiting would hide it for
  good.
- **D3 Withdrawn by the person's change.** The custom error stops counting at
  the person's first change of the answer: a keystroke in a text field, a
  pick in a list or calendar, a toggle, or a form reset. In `ki-combobox` the
  answer is the committed selection, so typing filter text does not withdraw
  it; choosing, removing or clearing a choice does. A withdrawn error no
  longer shows and no longer blocks. Withdrawing on a commit instead (leaving
  the field) was rejected: Enter in `ki-input` submits without a commit, so a
  stale error would block the corrected answer.
- **D4 The host removes it.** Withdrawal does not touch the prop: it keeps
  its text until the application removes it. Setting the same text again
  without removing it first changes nothing and shows nothing (S9). To show
  the same message again the application removes it and sets it again,
  which may happen in one update (S10); a different text shows at once. The
  prop's "When NOT to use" says so.
- **D5 Which message.** While it counts, the custom error is the control's
  `validationMessage`, ahead of the error set with `setCustomValidity`, then
  `error-text`, then the browser's message. `error-text` keeps its meaning.
  `setCustomValidity` keeps its own lifetime: it outlasts the person's edits
  (036 S5), so its message returns once the custom error is withdrawn.
- **D6 Accessible wiring.** The custom error uses each control's existing
  error line (spec 042): `aria-invalid="true"` and `aria-describedby` on the
  element that carries the role while it shows, and the polite live region
  that already exists before its text arrives, so its arrival is announced.
  `ki-date-picker` and `ki-combobox` keep their own markup.
- **D7 Validity methods.** `ki-number-input`, `ki-date-picker` and
  `ki-combobox` gain `checkValidity()` and `reportValidity()`, delegating to
  `ElementInternals` and documented as on the other controls (custom-elements
  build only). The other members of spec 036 (`validity`,
  `validationMessage`, `willValidate`, `setCustomValidity`) are not added:
  nothing asks for them yet (Art. VII).
- **D8 Unreadable text, documented.** The usage notes of `ki-number-input`
  and `ki-date-picker` state how text that cannot be read as a number or a
  date is reported today (improvement 17): the number field reports a
  change with no value when it held a number before and nothing when it did
  not, the date field reports nothing, and both stay invalid with their own
  message. Documentation only; behavior is unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the application's verdict next to the field (Priority: P1)

A person sends a form and the application rejects one answer, such as an
email already registered. The message appears next to that field, is read
out by a screen reader, and the field is marked invalid.

**Independent Test**: S1, S2, S3, S4, S5, S13.

### User Story 2 - Correct the answer without being blocked (Priority: P1)

The person changes the rejected answer and can send it again at once; the
old verdict never blocks the new answer.

**Independent Test**: S6, S7, S8, S9, S10.

### User Story 3 - Mark a field from an agent or ask a control for its validity (Priority: P2)

An agent sets the error through a live update of a generated spec, and the
application asks any control whether it is valid.

**Independent Test**: S11, S12, S14.

### Edge Cases

- Empty or whitespace-only `custom-error` is no custom error.
- Changing the text to a different non-empty text shows the new text at
  once, also after a withdrawal.
- Choosing the option already chosen is no change, so the error stays.
- A disabled control, directly or through a fieldset, takes no part in
  validation: it shows no custom error and does not block. Enabled again, the
  error shows again unless it was withdrawn.
- After a withdrawal the control's own constraints apply as before: an
  answer the person left empty in a required field shows its own message.
- An error set with `setCustomValidity` and a custom error at once: the
  custom error's text shows while it counts (D5).
- The prop exists on hosts created by the lazy loader; the two validity
  methods, like those of spec 036, exist on the custom-elements build only.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Field custom error
  An application or an agent marks a form control invalid with a message of
  its own, such as a server-side rule, by writing one text prop. The control
  shows the message next to the field at once and is announced as invalid,
  and the message stops counting as soon as the person changes the answer,
  so it never blocks the corrected answer.

  Rule: A custom error shows at once and makes the control invalid

    # S1
    Scenario Outline: A control given a custom error shows it and is announced as invalid
      Given a <control> labeled "Answer" holding an otherwise valid answer
      When the application sets the custom error "Choose another answer" on the control
      Then "Choose another answer" is shown with the control
      And the accessibility tree exposes the control as invalid with the description "Choose another answer"
      And "Choose another answer" is announced as a polite status message

      Examples:
        | control           |
        | ki-input          |
        | ki-textarea       |
        | ki-select         |
        | ki-checkbox       |
        | ki-checkbox-group |
        | ki-radio-group    |
        | ki-switch         |
        | ki-number-input   |
        | ki-time-input     |
        | ki-code-input     |
        | ki-date-picker    |
        | ki-combobox       |

    # S2
    Scenario Outline: A custom error blocks the form's submission
      Given a form with a <control> labeled "Answer" holding an otherwise valid answer and the custom error "Choose another answer"
      When the person submits the form
      Then the form is not submitted

      Examples:
        | control           |
        | ki-input          |
        | ki-textarea       |
        | ki-select         |
        | ki-checkbox       |
        | ki-checkbox-group |
        | ki-radio-group    |
        | ki-switch         |
        | ki-number-input   |
        | ki-time-input     |
        | ki-code-input     |
        | ki-date-picker    |
        | ki-combobox       |

    # S3
    Scenario: Submitting with the keyboard lands on the field with the custom error
      Given a form whose ki-input "Email" carries the custom error "Already registered" and whose "Name" field has focus
      When the person presses Enter
      Then the form is not submitted
      And focus is on the "Email" field

    # S4
    Scenario: A custom error takes the place of the error text
      Given a required ki-number-input labeled "Seats" showing its error text "Enter the number of seats"
      When the application sets the custom error "Booking is closed" on the field
      Then "Booking is closed" is shown with the field
      And "Enter the number of seats" is not shown

    # S5
    Scenario: A custom error that arrives while the person is typing shows and keeps their text
      Given the person has typed "ana@exa" into the ki-input "Email" and is still in the field
      When the application sets the custom error "Already registered" on the field
      Then "Already registered" is shown with the field
      And the field still holds "ana@exa"

  Rule: The person's change withdraws the custom error

    # S6
    Scenario Outline: The person's next change withdraws the custom error
      Given a <control> labeled "Answer" showing the custom error "Choose another answer"
      When the person changes the answer to another valid answer
      Then "Choose another answer" is no longer shown with the control
      And the control's validity check answers "valid"

      Examples:
        | control           |
        | ki-input          |
        | ki-textarea       |
        | ki-select         |
        | ki-checkbox       |
        | ki-checkbox-group |
        | ki-radio-group    |
        | ki-switch         |
        | ki-number-input   |
        | ki-time-input     |
        | ki-code-input     |
        | ki-date-picker    |
        | ki-combobox       |

    # S7
    Scenario: Resetting the form withdraws the custom error
      Given a form whose ki-input "Email" shows the custom error "Already registered"
      When the person resets the form
      Then no error is shown with the field
      And the field's validity check answers "valid"

  Rule: The application that sets the custom error removes it

    # S8
    Scenario Outline: Removing the custom error returns the control to valid
      Given a <control> labeled "Answer" holding an otherwise valid answer and showing the custom error "Choose another answer"
      When the application removes the custom error
      Then no error is shown with the control
      And the control's validity check answers "valid"
      And the control is not exposed to assistive technology as invalid

      Examples:
        | control           |
        | ki-input          |
        | ki-textarea       |
        | ki-select         |
        | ki-checkbox       |
        | ki-checkbox-group |
        | ki-radio-group    |
        | ki-switch         |
        | ki-number-input   |
        | ki-time-input     |
        | ki-code-input     |
        | ki-date-picker    |
        | ki-combobox       |

    # S9
    Scenario: Setting the same custom error again without removing it first shows nothing
      Given the person's change withdrew the custom error "Already registered" from the ki-input "Email"
      When the application sets the custom error "Already registered" again without removing it first
      Then no error is shown with the field
      And the field's validity check answers "valid"

    # S10
    Scenario: Removing the custom error and setting it again in one update shows it again
      Given the person's change withdrew the custom error "Already registered" from the ki-input "Email"
      When one update from the application removes the custom error and sets "Already registered" again
      Then "Already registered" is shown with the field

  Rule: Every control with a custom error answers validity questions

    # S11
    Scenario Outline: Checking an invalid control answers at once
      Given a required <control> labeled "Answer" left empty
      When the application checks the control's validity
      Then the check answers "invalid" without waiting

      Examples:
        | control         |
        | ki-number-input |
        | ki-date-picker  |
        | ki-combobox     |

    # S12
    Scenario Outline: Reporting an invalid control answers invalid and shows its message
      Given a required <control> labeled "Answer" left empty, with the error text "Answer this question"
      When the application reports the control's validity
      Then the report answers "invalid"
      And "Answer this question" is shown with the control

      Examples:
        | control         |
        | ki-number-input |
        | ki-date-picker  |
        | ki-combobox     |

  Rule: The custom error restyles through semantic tokens alone

    # S13
    Scenario Outline: Reassigning the semantic danger ink restyles the custom error
      Given a page themed with --ki-text-danger-high-em set to "#7a1fa2"
      And a <control> labeled "Answer" holding an otherwise valid answer
      When the application sets the custom error "Choose another answer" on the control
      Then the error message renders in "#7a1fa2"

      Examples:
        | control        |
        | ki-input       |
        | ki-date-picker |
        | ki-combobox    |

  Rule: An agent marks a generated field invalid

    # S14
    Scenario: A live update shows a custom error next to a generated field
      Given a live surface rendering a generated ki-number-input labeled "Seats" holding 42
      When a live update sets the field's custom error to "Only 40 seats left"
      Then "Only 40 seats left" is shown with the field
      And the field is exposed to assistive technology as invalid
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S4, S5, S6, S8, S9, S10, S14 | |
| Keyboard path | S3 | |
| Assistive-tech outcome | S1, S8, S14 | |
| Form participation | S2, S7, S11, S12 | |
| Theming | S13 | |

S13 runs on the three error-line markups: the shared one of spec 042
(`ki-input` stands for the ten controls that use it) and the own markup of
`ki-date-picker` and `ki-combobox`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The twelve controls of D1 MUST accept a `custom-error` string
  prop, attribute-backed, documented with when-to-use and when-NOT-to-use
  guidance.
- **FR-002**: While `custom-error` holds non-blank text and has not been
  withdrawn, the control MUST be invalid with that text as its validation
  message, blocking its form, and MUST show the text in its error line at
  once.
- **FR-003**: The person's first change of the answer, and a form reset, MUST
  withdraw the custom error (D3) without changing the prop's value.
- **FR-004**: A new value of the prop MUST make the custom error count again;
  setting the value it already holds MUST change nothing.
- **FR-005**: While the custom error shows, the element that carries the
  control's role MUST expose `aria-invalid="true"` and reference the error
  line through `aria-describedby`; the error line MUST be the polite live
  region that existed before the text arrived.
- **FR-006**: `error-text` MUST keep its current meaning on every control.
- **FR-007**: `ki-number-input`, `ki-date-picker` and `ki-combobox` MUST
  expose public `checkValidity(): boolean` and `reportValidity(): boolean`
  that answer synchronously from `ElementInternals`.
- **FR-008**: The usage notes of `ki-number-input` and `ki-date-picker` MUST
  state how unreadable text is reported today (D8).
- **FR-009**: The generated catalog, `llms.txt` and framework wrappers MUST
  carry the new prop and methods through `pnpm regen` (Art. I).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): 12 props (`custom-error`) and 6 methods
  (`checkValidity`, `reportValidity` on three controls). Additive, MINOR;
  declared with `pnpm api:declare field-custom-error minor`. No existing
  prop, event, part or default changes meaning.
- **Bundle budget** (Art. IV): one watched prop, one flag and a few lines of
  wiring per control; no runtime dependency, no new styles. Measured on the
  branch against `main` at `967cd05f`, the same generated artifacts grow by
  15,328 / 2,748 / 1,444 B (raw / gzip / brotli) in the MCP Apps document and
  26,855 / 4,624 / 1,754 B in `kimen-mcp`, mostly the twelve prop
  descriptions the catalog and agent docs embed. The growth is recorded in
  each control's `sizeBudget`, split evenly and rounded up. Two worst cases
  (full Stencil runtime) cross the uniform 25 kB ceiling and take a reviewed
  exception of 25,200 B brotli: `ki-combobox` (24.91 kB to 25.05 kB) and
  `ki-time-input` (24.97 kB to 25,001 B).
- **Accessibility** (Art. V): no new interaction pattern; the error line,
  description and live region of spec 042 carry the custom error. The new
  case is an error that arrives without an action of the person's, which the
  existing polite live region announces (S1).
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I, VIII): the twelve controls are
  catalog components, so the regenerated catalog lists `custom-error` with
  its description. The description tells agents to remove the error at the
  start of a new attempt.
- **Guardrail/security boundary** (Art. VIII): none. The prop is a string
  rendered as a text node, validated by the existing prop checks; unknown
  props are still rejected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every scenario S1 to S14 passes in Chromium for every control
  it names; the release matrix runs them in Firefox and WebKit.
- **SC-002**: The probe of the phase 2 findings that failed (a live update
  of a field holding a valid value shows nothing) passes as S14.
- **SC-003**: Each of the twelve components stays within its size budget,
  or the PR justifies a reviewed raise.

## Assumptions

- `ki-file-upload`, `ki-option`, `ki-radio` and `ki-list` get no custom
  error.
- Withdrawal is tracked per control instance and is not remembered across a
  re-render of the spec that creates a new element.
- Spec 153 (`collect`) consumes `reportValidity()` from the three controls;
  nothing else in this spec depends on it.
