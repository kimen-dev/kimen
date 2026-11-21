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
