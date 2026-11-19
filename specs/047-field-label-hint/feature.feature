Feature: Field label hint
  A form control can carry a short hint after its label, such as "(optional)"
  or "(required)", so people learn before they submit which questions they
  must answer. The hint is part of the label: it is shown after the label text
  and read with it as the control's name. It is the application's own text
  and never changes whether the control is required.

  Rule: The label hint joins the label

    # S1
    Scenario Outline: A control's label hint is shown after its label and joins its name
      Given a <control> labeled "Email" with the label hint "(optional)"
      When the control receives focus
      Then "(optional)" is shown after the label "Email"
      And the accessibility tree exposes the control with the name "Email (optional)"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S2
    Scenario Outline: A required control without a label hint shows no hint of its own
      Given a required <control> labeled "Email" without a label hint
      When the page renders
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the control with the name "Email"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S3
    Scenario: A blank label hint shows nothing
      Given a ki-input labeled "Email" whose label hint is only spaces
      When the page renders
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the field with the name "Email"

    # S4
    Scenario: Removing the label hint removes it from the name
      Given a ki-input labeled "Email" with the label hint "(optional)"
      When the application removes the label hint
      Then nothing is shown after the label "Email"
      And the accessibility tree exposes the field with the name "Email"

    # S5
    Scenario: The label hint sits a small space after the label text
      Given an onmars page with a ki-input labeled "Email" with the label hint "(optional)"
      When the page renders
      Then the label hint starts 4px after the end of the label text
      And the label hint has the font size and line height of the label

    # S6
    Scenario: On a right-to-left page the label hint follows the label in reading order
      Given a right-to-left page with a ki-input labeled "البريد" with the label hint "(اختياري)"
      When the page renders
      Then the label hint ends 4px to the left of the label text
      And the accessibility tree exposes the field with the name "البريد (اختياري)"

    # S7
    Scenario Outline: Clicking the label hint acts as clicking the label
      Given a <control> labeled "Terms" with the label hint "(optional)"
      When the user clicks the label hint
      Then <outcome>

      Examples:
        | control     | outcome                 |
        | ki-input    | focus is on the field   |
        | ki-checkbox | the checkbox is checked |

  Rule: The label hint reaches the keyboard and assistive technology

    # S8
    Scenario Outline: Tabbing to a control lands on it with its full name
      Given a text field "Name" followed by a <control> labeled "Phone" with the label hint "(optional)"
      When the user tabs from "Name" to the next control
      Then focus is on the <control>
      And the accessibility tree exposes the focused control with the name "Phone (optional)"

      Examples:
        | control     |
        | ki-input    |
        | ki-select   |
        | ki-checkbox |

    # S9
    Scenario: The label hint joins the name while the help text stays the description
      Given a ki-input labeled "Email" with the label hint "(optional)" and the help text "We never share your email"
      When the control receives focus
      Then the accessibility tree exposes the field with the name "Email (optional)"
      And the accessibility tree exposes the field with the description "We never share your email"

    # S10
    Scenario: An error message leaves the label hint in the name
      Given a form with a required ki-select labeled "Country" with the label hint "(required)" and the error text "Choose a country", left unanswered
      When the user submits the form
      Then "Choose a country" is shown with the control
      And the accessibility tree exposes the control with the name "Country (required)" and the description "Choose a country"

  Rule: The label hint never sets a constraint

    # S11
    Scenario Outline: A control whose label hint says required is not required by it
      Given a form with a <control> labeled "Answer" with the label hint "(required)", left unanswered
      When the user submits the form
      Then the form is submitted

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

  Rule: The label hint reads clearly in every theme and mode

    # S12
    Scenario Outline: The label hint reads at least 4.5:1 in every theme and scheme
      Given a <theme> page in the <scheme> scheme with every control carrying the label hint "(optional)"
      When the page renders
      Then every label hint reads at a contrast of at least 4.5:1 against the surface behind it
      And no accessibility rule is violated

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S13
    Scenario Outline: Under more contrast the label hint strengthens with the other supporting text
      Given a <theme> page in the <scheme> scheme with every control carrying the label hint "(optional)"
      When the page declares more contrast
      Then every label hint reads at a contrast of at least 7:1 against the surface behind it

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S14
    Scenario Outline: A disabled control's label hint follows the disabled ink of its label
      Given a disabled <control> labeled "Email" with the label hint "(optional)"
      When the page renders
      Then the label hint renders in the same ink as the label

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-radio-group |

    # S15
    Scenario: Reassigning the semantic supporting ink restyles every label hint
      Given a page themed with --ki-text-supporting set to "#7a1fa2"
      And every control carrying the label hint "(optional)"
      When the page renders
      Then every label hint renders in "#7a1fa2"

    # S16
    Scenario: Reassigning one component's hint tokens restyles that component's hint alone
      Given a page whose stylesheet sets --ki-input-label-hint-fg to "#7a1fa2" and --ki-input-label-hint-gap to "8px"
      And a ki-input and a ki-textarea carrying the label hint "(optional)"
      When the page renders
      Then the ki-input label hint renders in "#7a1fa2", 8px after its label text
      And the ki-textarea label hint keeps the ink and the gap of its theme

    # S17
    Scenario Outline: Under forced colors the label hint takes the forced ink of its label
      Given forced colors are active
      And <state> <control> labeled "Terms" with the label hint "(optional)"
      When the page renders
      Then the label hint renders in the same forced color as its label

      Examples:
        | state      | control     |
        | an enabled | ki-input    |
        | a disabled | ki-checkbox |
