# Feature Specification: Field validation API

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, with Arts. I, IV, V and IX. -->

**Feature Branch**: `feat/form-validation-api` (spec `036-field-validation-api`)

**Created**: 2026-11-16

**Status**: Draft

**Input**: The 2026-11-14 audit found that no Kimen form control exposes
`checkValidity`, `reportValidity` or `setCustomValidity`. A form validates
its Kimen fields through `ElementInternals`, but the application cannot ask
one field whether it is valid, cannot report one field to the user, and
cannot set an error of its own on a field (a server-side "already
registered", a cross-field rule). Code written for native fields that walks
`form.elements` breaks on them.

**Constitution check**: a public API addition on six existing components
(Art. II, IX). No guardrail or security boundary is touched.

## Decisions *(founder, 2026-11-16)*

- **D1** The API is synchronous and uses the native names and shapes:
  `validity`, `validationMessage`, `willValidate`, `checkValidity()`,
  `reportValidity()` and `setCustomValidity(message)`. Stencil's `@Method`
  is always asynchronous, so these are plain class members delegating to
  `ElementInternals`, as the platform guidance and Material Web, Ignite UI
  and similar libraries do. Generic code that walks `form.elements` and
  calls `checkValidity()` expects a boolean; a promise is always truthy.
- **D2** Consequence of D1: the members exist in the custom-elements build
  (`@kimen/elements/ki-*`, `@kimen/elements/components`, and the framework
  wrappers), not on hosts created by the lazy loader (`@kimen/elements/loader`).
  This is documented on each control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask and report one field (Priority: P1)

An application validates a field on blur or before a step change, and
reports it to the user, exactly as it would with a native input.

**Independent Test**: S1, S2, S6.

### User Story 2 - Set an error of its own (Priority: P1)

An application sets a server-side or cross-field error on a field; the form
refuses to submit until the application clears it.

**Independent Test**: S3, S4, S5, S7.

### Edge Cases

- A control with both a native constraint failure and an application error
  reports the application's message, like a native field.
- A disabled control (directly or through a fieldset) is barred from
  validation: `willValidate` is false and `checkValidity()` is true, even
  with an application error, like a native field.
- `ki-switch` has no constraints of its own; only the application's error
  can make it invalid.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Field validation API
  Every form control can be asked about its own validity, can report it to
  the user and can carry an error the application sets, synchronously and
  under the same names as a native form control, so code written for native
  fields works unchanged on Kimen fields.

  Rule: A control answers validity questions at once

    # S1
    Scenario Outline: A required control left empty answers that a value is missing
      Given a required <control> labeled "Answer" with nothing chosen or typed
      When the application checks the control's validity
      Then the check answers "invalid" without waiting
      And the control reports the reason "value missing" with a message

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S2
    Scenario: A disabled control takes no part in validation
      Given a required ki-input labeled "Answer" that is disabled and empty
      When the application checks the control's validity
      Then the check answers "valid"
      And the control reports that it does not take part in validation

  Rule: The application can set an error of its own on a control

    # S3
    Scenario Outline: An error set by the application blocks submission with its message
      Given a form with a <control> labeled "Answer" holding an otherwise valid answer
      And the application sets the error "Choose another answer" on the control
      When the user submits the form
      Then the form is not submitted
      And the control reports "Choose another answer" as its validation message

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-switch      |
        | ki-radio-group |

    # S4
    Scenario: Clearing the application's error makes the control and its form valid again
      Given a form whose ki-input "Email" holds "ana@example.com" with the error "Already registered"
      When the application clears the control's error
      Then the control is valid
      And the form is valid

    # S5
    Scenario Outline: The application's error outlasts the user's next change
      Given a <control> labeled "Answer" carrying the error "Choose another answer"
      When the user changes the answer
      Then the control still reports "Choose another answer" as its validation message

      Examples:
        | control        |
        | ki-input       |
        | ki-select      |
        | ki-radio-group |

  Rule: Reporting validity reaches the user

    # S6
    Scenario: Reporting an invalid control moves focus to it
      Given a form with an empty required ki-input labeled "Email" and focus on a later button
      When the application reports the control's validity
      Then the report answers "invalid"
      And focus is on the "Email" field

    # S7
    Scenario: A blocked submission exposes a control with the application's error as invalid
      Given a form whose ki-select labeled "Country" carries the error "We do not ship there"
      When the user submits the form
      Then the "Country" combobox is exposed to assistive technology as invalid
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S5 | |
| Keyboard path | S6 | |
| Assistive-tech outcome | S7 | |
| Form participation | S3, S4 | |
| Theming | | N/A: the API has no visual surface of its own. The invalid styling a blocked submission shows belongs to each control's own contract (003–008), which already covers it under token reassignment. |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox`,
  `ki-switch` and `ki-radio-group` MUST expose `validity`,
  `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()`
  and `setCustomValidity(message)` with the native signatures and return
  types.
- **FR-002**: `checkValidity()` and `reportValidity()` MUST answer in the
  same task, fire `invalid` when the control is invalid, and
  `reportValidity()` MUST move focus to the control.
- **FR-003**: An application error MUST persist through the control's own
  revalidation (user edits, prop changes, form reset) until
  `setCustomValidity('')`, and MUST take precedence over the native
  message.
- **FR-004**: Each member MUST be documented in the control's generated
  surfaces (Art. I), including the lazy-loader limitation of D2.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): six new members on six components;
  additive, MINOR.
- **Bundle budget** (Art. IV): a few hundred bytes per control; no runtime
  dependency.
- **Accessibility** (Art. V): no new interaction pattern; focus and the
  invalid state follow the platform's constraint validation.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the members are documented per
  control with when-to-use and when-NOT-to-use guidance.
- **Guardrail/security boundary** (Art. VIII): none; the GenUI catalog does
  not expose these members.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A form validation helper that walks `form.elements` and calls
  `checkValidity()` gives the same answer for a Kimen field as for the
  equivalent native field.
- **SC-002**: Every scenario S1–S7 passes in Chromium for every control it
  names.

## Assumptions

- `ki-option`, `ki-radio` and `ki-button` are not fields of their own and
  get no validation members.
