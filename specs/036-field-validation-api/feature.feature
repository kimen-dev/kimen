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
