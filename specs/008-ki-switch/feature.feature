Feature: Switch
  A switch flips a setting on or off with immediate effect, reports its state
  to forms and assistive technology, and lets any brand restyle it through
  tokens alone.

  # Family: core behavior
  # S1
  Scenario: Toggling the switch turns it on
    Given a switch labeled "Email notifications" that is off
    When the user toggles the switch
    Then the switch is on
    And the page observes exactly one input event
    And the page observes exactly one change event

  # S2
  Scenario: Toggling the switch again turns it off
    Given a switch labeled "Email notifications" that is on
    When the user toggles the switch
    Then the switch is off

  # S3
  Scenario: A disabled switch does not toggle
    Given a disabled switch labeled "Email notifications" that is off
    When the user attempts to toggle it
    Then the switch remains off
    And no state change is reported

  # S4
  Scenario: Malformed attribute values do not break the switch
    Given a switch declared with a checked attribute value of "maybe"
    When the page renders
    Then the switch renders on and remains operable

  # S17
  Scenario: Activating the slotted label toggles the switch
    Given a switch labeled "Email notifications" that is off
    When the user activates the slotted label
    Then the switch is on
    And the page observes exactly one change event

  # S25
  Scenario: A script click toggles the switch as it toggles a native checkbox
    Given a switch labeled "Newsletter" that is off
    When a script clicks the switch
    Then the switch is on
    And the page observes exactly one input event followed by exactly one change event

  # S27
  Scenario Outline: Boolean attributes read consistently from markup and script
    Given a switch
    When an attribute (checked and disabled) is <write> <moment>
    Then the corresponding property reads <state>

    Examples:
      | write                    | moment                 | state        |
      | absent                   | in the initial markup  | its default  |
      | set to exactly "false"   | in the initial markup  | false        |
      | set to an empty value    | in the initial markup  | true         |
      | set to "true"            | in the initial markup  | true         |
      | set to exactly "false"   | after the first render | false        |
      | set to an empty value    | after the first render | true         |
      | set to "true"            | after the first render | true         |

  # Family: keyboard path
  # S5
  Scenario: The keyboard reaches the switch with visible focus
    Given a page whose first interactive element is a switch
    When the user presses Tab
    Then the switch is focused and its focus indication is visible

  # S6
  Scenario: Space toggles the focused switch
    Given the focused "Email notifications" switch is off
    When the user presses Space
    Then the switch is on

  # S20
  Scenario: The keyboard skips a disabled switch
    Given a page whose first interactive element is a disabled switch followed by a button
    When the user presses Tab
    Then focus lands on the button, skipping the switch

  # Family: assistive-tech outcome
  # S7
  Scenario: The switch exposes its name, role and state
    Given a switch labeled "Email notifications" that is off
    When the accessibility tree is queried
    Then it exposes a switch named "Email notifications" in the off state

  # S8
  Scenario: Assistive technology observes the state change
    Given a switch labeled "Email notifications" that is off
    When the user toggles the switch
    Then the accessibility tree exposes the switch in the on state

  # S9
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled switch labeled "Email notifications"
    When the accessibility tree is queried
    Then the switch is exposed as unavailable

  # Family: form participation
  # S10
  Scenario: An on switch submits its value with the form
    Given a form containing a switch named "newsletter" that is on
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "on"

  # S11
  Scenario: An off switch contributes nothing to the form
    Given a form containing a switch named "newsletter" that is off
    When the user submits the form
    Then the submitted form data does not contain "newsletter"

  # S12
  Scenario: Resetting the form restores the switch's initial state
    Given the "newsletter" switch was on when the form loaded and is now off
    When the user resets the form
    Then the switch is on

  # S13
  Scenario: A disabled fieldset disables the switch
    Given a switch named "newsletter" inside a disabled fieldset
    When the user attempts to toggle it
    Then the switch keeps its state

  # S18
  Scenario: A custom value replaces the default submitted value
    Given a form containing a switch named "newsletter" with value "weekly" that is on
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "weekly"

  # S21
  Scenario: Resetting the form returns a user-toggled switch to off
    Given the "newsletter" switch was off when the form loaded and the user has turned it on
    When the user resets the form
    Then the switch is off

  # Family: theming
  # S14
  Scenario: A second theme restyles the switch through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the switch's appearance resolves from material3 token values

  # S15
  Scenario: The switch honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the switch's appearance resolves from the dark token values

  # S16
  Scenario: The switch follows the document's writing direction
    Given a right-to-left document with a switch labeled "Email notifications" that is on
    When the page renders
    Then the label and control mirror the writing direction
    And the on-state thumb rests at the track's inline end

  # S19
  Scenario: Reduced motion suppresses the thumb travel animation
    Given a user who prefers reduced motion and a switch that is off
    When the user toggles the switch
    Then the switch is on without a travel animation

  # S23
  Scenario Outline: A theme sets the glyph color for each switch state
    Given a switch that is <state>
    When the page applies the theme's <token> color
    Then the thumb shows its <glyph> in that color

    Examples:
      | state        | token                       | glyph |
      | on           | --ki-switch-glyph-checked   | check |
      | off          | --ki-switch-glyph-unchecked | dash  |
      | disabled on  | --ki-switch-glyph-disabled  | check |
      | disabled off | --ki-switch-glyph-disabled  | dash  |

  # S24
  Scenario Outline: A theme hides an individual state glyph with a transparent color
    Given a theme that colors the on, off and disabled switch glyphs
    When the theme sets <token> to transparent
    Then the <state> switch shows no glyph
    And the other states still show their glyphs

    Examples:
      | state    | token                       |
      | on       | --ki-switch-glyph-checked   |
      | off      | --ki-switch-glyph-unchecked |
      | disabled | --ki-switch-glyph-disabled  |

  # S26
  Scenario Outline: A theme restyles the thumb shadow without redefining a shared effect
    Given a switch that is <state> under a theme that leaves every effect token as shipped
    When the theme sets --ki-switch-thumb-shadow to <shadow>
    Then the thumb casts <shadow> in place of the default shadow

    Examples:
      | state | shadow                          |
      | off   | none                            |
      | on    | a 2px ring in the theme's color |

  # S28
  Scenario: A settings row fills its field and rows of supporting text appear beneath it
    Given a switch in a full-width settings field with a trailing value and help text
    When the application reports an error
    Then the switch row spans the field and the value sits at its inline end
    And the error appears below the row in place of the help text

  # S29
  Scenario: A trailing value leaves the switch name intact
    Given a switch labeled "Email notifications" with the trailing value "On"
    When assistive technology reads the switch
    Then the switch is named "Email notifications"
    And the value "On" remains available as separate text

  # S30
  Scenario Outline: A theme sizes a switch label independently of the surrounding text
    Given a <size> switch labeled "Email notifications"
    When the theme sets the label font size and line height for that size
    Then its label uses both theme values

    Examples:
      | size |
      | md   |
      | lg   |
      | xl   |
