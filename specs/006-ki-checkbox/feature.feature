Feature: Checkbox
  A checkbox lets a person select independent options for a form — including
  a mixed partial-selection presentation — with full input-modality parity,
  and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting the checkbox checks it
    Given an unchecked checkbox labeled "Email notifications"
    When the user selects the checkbox
    Then the checkbox is checked
    And a change event reports the checked state
    And an input event precedes the change event

  # S2
  Scenario: A disabled checkbox does not change
    Given a disabled unchecked checkbox labeled "Email notifications"
    When the user attempts to select it
    Then the checkbox remains unchecked
    And no change event is observed

  # S3
  Scenario: Selecting an unchecked partially selected checkbox resolves it to checked
    Given an unchecked "Select all" checkbox displayed as partially selected
    When the user selects the checkbox
    Then the checkbox is checked and no longer partially selected

  # S19
  Scenario: Selecting a checked partially selected checkbox resolves it to unchecked
    Given a checked "Select all" checkbox displayed as partially selected
    When the user selects the checkbox
    Then the checkbox is unchecked and no longer partially selected

  # S20
  Scenario: Activating the label toggles the checkbox
    Given an unchecked checkbox labeled "Email notifications"
    When the user activates the label
    Then the checkbox is checked

  # S4
  Scenario: Non-canonical boolean values never break rendering
    Given a checkbox declared with checked="false"
    When the page renders
    Then the checkbox renders checked

  # Family: keyboard path
  # S5
  Scenario: The keyboard reaches the checkbox with visible focus
    Given a page whose first interactive element is a checkbox
    When the user presses Tab
    Then the checkbox is focused and its focus indication is visible

  # S6
  Scenario: Space toggles the focused checkbox
    Given a focused unchecked checkbox labeled "Email notifications"
    When the user presses Space
    Then the checkbox is checked

  # Family: assistive-tech outcome
  # S7
  Scenario: The checkbox exposes its name, role and state
    Given a checked checkbox labeled "Email notifications"
    When the accessibility tree is queried
    Then it exposes a checkbox named "Email notifications" in the checked state

  # S8
  Scenario: A partial selection is exposed as mixed
    Given a "Select all" checkbox displayed as partially selected
    When the accessibility tree is queried
    Then the checkbox is exposed in the mixed state

  # S9
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled checkbox labeled "Email notifications"
    When the accessibility tree is queried
    Then the checkbox is exposed as unavailable

  # Family: form participation
  # S10
  Scenario: A checked checkbox submits its value with the form
    Given a form containing a checked checkbox named "newsletter"
    When the user submits the form
    Then the submitted form data contains "newsletter" with value "on"

  # S11
  Scenario: An unchecked checkbox contributes nothing to the form
    Given a form containing an unchecked checkbox named "newsletter"
    When the user submits the form
    Then the submitted form data does not contain "newsletter"

  # S12
  Scenario: The partial-selection presentation never changes the submitted value
    Given a form whose checked checkbox named "select-all" is displayed as partially selected
    When the user submits the form
    Then the submitted form data contains "select-all" with value "on"

  # S13
  Scenario: Resetting the form restores the checkbox's initial state
    Given a form whose "newsletter" checkbox was checked when the page loaded and is now unchecked
    When the user resets the form
    Then the checkbox is checked

  # S14
  Scenario: A required unchecked checkbox blocks submission
    Given a form with a required unchecked checkbox labeled "Accept the terms"
    When the user submits the form
    Then the form does not submit
    And the checkbox is reported invalid

  # S15
  Scenario: A disabled fieldset disables the checkbox
    Given an unchecked checkbox named "newsletter" inside a disabled fieldset
    When the user attempts to select it
    Then the checkbox remains unchecked

  # Family: theming
  # S16
  Scenario: A second theme restyles the checkbox through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the checkbox's appearance resolves from material3 token values

  # S17
  Scenario: The checkbox honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the checkbox's appearance resolves from the dark token values

  # S18
  Scenario: Control and label follow the document's writing direction
    Given a right-to-left document containing a checkbox labeled "Notifications"
    When the page renders
    Then the control leads and the label trails in right-to-left order

  # S21
  Scenario: State changes apply without animation under reduced motion
    Given an unchecked checkbox and a user preference for reduced motion
    When the user selects the checkbox
    Then the checkbox is checked with no state-change animation
