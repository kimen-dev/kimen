# Feature specification for ki-code-input

**Branch** `feat/409-ki-code-input` · **Issue** #409

Sign-in and verification flows can collect a short code with one accessible text field. The boxes show how much of the code the person has entered. Use `ki-input` for passwords, free text and longer codes.

## Gherkin scenarios

```gherkin
Feature: ki-code-input collects a fixed-length verification code
  A single field accepts the code and presents one box per character.

  # S1
  Scenario: Pasting a formatted code completes the field once
    Given an empty six-digit verification field
    When the user pastes "04 29-11"
    Then the boxes show "042911"
    And one input event followed by one completion event reports "042911"

  # S2
  Scenario: Accept a whole alphanumeric code through the autofill field
    Given a four-character alphanumeric verification field
    When the browser enters "a7B9" in one edit
    Then the boxes show "a7B9" in order
    And the completion event reports "a7B9"

  # S3
  Scenario: Edit a code with the keyboard as one field
    Given the six-digit verification field contains "042911" and has focus
    When the user selects and replaces the third digit with "8" using the keyboard
    Then the field contains "048911"
    And the completion event reports "048911"

  # S4
  Scenario: Undo an accepted native edit
    Given the user has changed "042911" to "048911" using the keyboard
    When the user undoes the edit
    Then the field contains "042911"

  # S5
  Scenario: Expose one named field and its delivery instructions
    Given a required field labeled "Verification code" with delivery instructions
    When the field receives focus
    Then assistive technology exposes one required text field named "Verification code"
    And the field is described by the delivery instructions

  # S6
  Scenario: Replace delivery instructions with a polite validation error
    Given a required six-digit field with "042" entered and the error "Enter all six digits."
    When the user submits the form
    Then the field is marked invalid and described by "Enter all six digits."
    And the help line is replaced by the polite error announcement

  # S7
  Scenario: Submit the code as one named form entry
    Given a form with "042911" in the verification field named "otp"
    When the user submits the form
    Then the form data includes one "otp" entry with the value "042911"

  # S8
  Scenario: Reset the code to its declared value
    Given the form declared "042911" and the user has replaced it
    When the user resets the form
    Then the field returns to "042911" silently

  # S9
  Scenario: Exclude the code when its fieldset is disabled
    Given a fieldset containing a verification field filled with "042911"
    When the fieldset is disabled
    Then the verification field is unavailable for editing
    And its code is excluded from submitted form data

  # S10
  Scenario: Restyle boxes through semantic tokens
    Given a page supplies a custom surface for a four-character code
    When the page shows the verification field
    Then the four boxes use the supplied surface

  # S11
  Scenario: Keep a stationary caret under reduced motion
    Given the empty verification field has focus
    When the user requests reduced motion
    Then the caret stays visible without blinking

  # S12
  Scenario: Distinguish focus from the resting border in forced colours
    Given a verification field in a forced-colour palette
    When the user focuses the field
    Then its boxes remain visible and the active box shows a distinct focus outline

  # S13
  Scenario: Keep the code order in a right-to-left form
    Given a right-to-left form shows the label "Verification code"
    When the user enters "042911"
    Then the code reads left to right and the field stays aligned to the reading start

  # S14
  Scenario: Respect density and keep a usable touch target
    Given a small verification field in a touch-density region
    When the user interacts using a coarse pointer
    Then the field uses the touch density and its entry text is at least 16 pixels
```

## Scenario family coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2 | |
| Keyboard path | S3, S4 | |
| Assistive-tech outcome | S5, S6 | |
| Form participation | S6, S7, S8, S9 | |
| Theming | S10, S11, S12, S13, S14 | |

## Requirements

- Present four to eight cells over a single native text field with `autocomplete="one-time-code"`, an appropriate input mode, and a matching maximum length. Preserve leading zeroes and keep the native selection and undo model for ordinary edits.
- Emit `ki-input` with the normalized value after each user edit that changes it. Emit `ki-complete` after any such edit that leaves a full code. Keep form data current before dispatching either event.
- Associate the label, help, errors and form validity as in `ki-input`. Clear a shown constraint error when the value becomes valid. Show application errors through the form control's custom validity API.
- Support semantic token overrides, onmars and Material 3, reduced motion, forced colours, RTL and coarse pointers. Show the reference states in light and dark visual galleries.
- Discover the component in the catalog and React, Vue and Angular wrappers. The catalog declares its props, no slots, and the input and completion actions.

## Decisions

- **Agent's choice, pending founder confirmation.** Accept ASCII digits in numeric mode and ASCII letters and digits in alphanumeric mode. Preserve case and leading zeroes, filter separators in paste and cap the result at the configured length. Unsupported lengths and types use the defaults.
- **Agent's choice, pending founder confirmation.** Follow the form field convention that `error-text` customizes a constraint message. Empty optional codes are valid, partial nonempty codes are invalid, and disabled codes are omitted from forms. Programmatic assignments and form reset are silent. Editing one complete code into another emits completion.
- **Agent's choice, pending founder confirmation.** The application owns verification, expiry and resend. The examples state the delivery channel and validity period and place a ghost resend button beside the field. Completion itself leaves submission to the application.
- **Agent's choice, pending founder confirmation.** Keep the code's character order left to right in RTL forms and align the field at the form's logical start. Offer medium and small cells and compose both with Kimen density. A reduced-motion caret stays visible.
- **Agent's choice, pending founder confirmation.** Expose the label, field, native input, cells, help and error as parts. Keep app-level content such as resend controls outside the component.
