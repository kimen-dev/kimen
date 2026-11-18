Feature: Field help and error text
  Every form control can carry a line of help text and shows an error message
  in its place once the user's answer fails. Both are read out with the
  control by assistive technology, so people learn what to enter and how to
  fix it, and an application or an agent writes both through plain text props.

  Rule: Help text guides the answer

    # S1
    Scenario Outline: A control's help text is shown with it and describes it
      Given a <control> labeled "Answer" with the help text "You can change this later"
      When the control receives focus
      Then "You can change this later" is shown with the control
      And the accessibility tree exposes the control with the description "You can change this later"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-switch      |
        | ki-radio-group |

    # S2
    Scenario: Removing the help text removes it from the description
      Given a ki-input labeled "Email" with the help text "We never share your email"
      When the application removes the help text
      Then no help text is shown with the field
      And the accessibility tree exposes the field with no description

  Rule: The error message takes the help text's place once the answer fails

    # S3
    Scenario: Tabbing away from an invalid answer shows the error message
      Given a ki-input labeled "Email" of kind email with the error text "Enter an email address like name@example.com"
      And the user has typed "ana@" into the field
      When the user presses Tab
      Then "Enter an email address like name@example.com" is shown with the field
      And the field is exposed to assistive technology as invalid

    # S4
    Scenario Outline: A blocked submission shows the error of each unanswered required control
      Given a form with a required <control> labeled "Answer" left unanswered, with the error text "Answer this question"
      When the user submits the form
      Then the form is not submitted
      And "Answer this question" is shown with the control

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S5
    Scenario Outline: A control the user has not answered yet shows no error
      Given a required <control> labeled "Answer" with the error text "Answer this question" that the user has not answered
      When the user tabs past the control
      Then no error is shown with the control
      And the control is not exposed to assistive technology as invalid

      Examples:
        | control     |
        | ki-input    |
        | ki-checkbox |

    # S6
    Scenario: Correcting the answer brings the help text back at once
      Given the "Email" field shows the error "Enter an email address like name@example.com" in place of its help text "We never share your email"
      When the user completes the answer to "ana@example.com"
      Then "We never share your email" is shown with the field
      And no error is shown with the field
      And the field is not exposed to assistive technology as invalid

    # S7
    Scenario: Without error text a control shows its own validation message
      Given a form with a required ki-input labeled "Email" left empty and no error text
      When the user submits the form
      Then the message shown with the field is the field's validation message

    # S8
    Scenario: The error text becomes the control's validation message
      Given a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the application checks the control's validity
      Then the control reports "Enter your email" as its validation message
      And the control still reports the reason "value missing"

    # S9
    Scenario Outline: An error set by the application is shown when the form is submitted
      Given a form with a <control> labeled "Answer" holding an otherwise valid answer
      And the application sets the error "Choose another answer" on the control
      When the user submits the form
      Then "Choose another answer" is shown with the control

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-switch      |
        | ki-radio-group |

    # S10
    Scenario: An error set by the application outranks the error text
      Given a form whose ki-input "Email" holds "ana@example.com" and carries the error text "Enter your email"
      And the application sets the error "Already registered" on the control
      When the application reports the control's validity
      Then "Already registered" is shown with the field
      And the control reports "Already registered" as its validation message

    # S11
    Scenario: Disabling a control clears its error
      Given a form whose required ki-input "Email" shows the error "Enter your email"
      When the application disables the control
      Then no error is shown with the field
      And the field is not exposed to assistive technology as invalid

  Rule: Assistive technology learns of the error

    # S12
    Scenario: The error is announced politely when it appears
      Given a ki-input labeled "Email" of kind email with the error text "Enter an email address like name@example.com"
      And the user has typed "ana@" into the field
      When the user leaves the field
      Then "Enter an email address like name@example.com" is announced as a polite status message

    # S13
    Scenario: A blocked submission lands on the first invalid control with its error as description
      Given a form whose first field "Email" is required, left empty and carries the error text "Enter your email"
      When the user submits the form
      Then focus is on the "Email" field
      And the accessibility tree exposes it as invalid with the description "Enter your email"

  Rule: Resetting the form clears the error

    # S14
    Scenario: Resetting the form clears the error and restores the help text
      Given a form whose "Email" field shows the error "Enter your email" in place of its help text "We never share your email"
      When the user resets the form
      Then "We never share your email" is shown with the field
      And no error is shown with the field

  Rule: Help and error restyle through semantic tokens alone

    # S15
    Scenario: Reassigning the semantic danger ink restyles the error message
      Given a page themed with --ki-text-danger-high-em set to "#7a1fa2"
      And a form with a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the user submits the form
      Then the error message renders in "#7a1fa2"

    # S16
    Scenario: Reassigning the semantic medium-emphasis ink restyles the help text
      Given a page themed with --ki-text-med-em set to "#7a1fa2"
      And a ki-input labeled "Email" with the help text "We never share your email"
      When the user types "ana" into the field
      Then the help text renders in "#7a1fa2"

    # S17
    Scenario: Under forced colors the error is marked by a symbol, not by color alone
      Given forced colors are active
      And a form with a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the user submits the form
      Then the error message is preceded by an error symbol painted in the forced text color

  Rule: An agent writes help and error text through the catalog

    # S18
    Scenario: A generated field carries its help and error text
      Given a generated UI spec with a ki-input labeled "Email" carrying the help text "We never share your email" and the error text "Enter your email"
      When the guarded renderer renders the spec
      Then the spec is accepted
      And the rendered field is described by "We never share your email"
