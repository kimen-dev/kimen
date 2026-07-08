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
