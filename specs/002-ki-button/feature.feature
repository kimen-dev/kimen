Feature: Button
  A button lets a person trigger an action or operate a form with full
  input-modality parity, and lets any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Activating the button runs its action exactly once
    Given a button labeled "Save" on a page that counts activations
    When the user clicks the button
    Then the page observes exactly one activation

  # S2
  Scenario: A disabled button does not act
    Given a disabled button labeled "Save"
    When the user attempts to activate it
    Then no activation is observed

  # S11
  Scenario: Unknown appearance values fall back to defaults
    Given a button declared with an unrecognized variant value
    When the page renders
    Then the button renders with the default variant appearance

  # Family: keyboard path
  # S3
  Scenario: The keyboard reaches the button with visible focus
    Given a page whose first interactive element is a button
    When the user presses Tab
    Then the button is focused and its focus indication is visible

  # S4
  Scenario: The keyboard activates the focused button
    Given a focused button labeled "Save"
    When the user activates it from the keyboard
    Then the page observes exactly one activation

  # Family: assistive-tech outcome
  # S5
  Scenario: The button is exposed as a named button
    Given a button labeled "Save"
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Save"

  # S6
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled button labeled "Save"
    When the accessibility tree is queried
    Then the button is exposed as unavailable

  # Family: form participation
  # S7
  Scenario: A submit button submits its form with the form data
    Given a form holding a named text field with a value and a submit button
    When the user activates the button
    Then the form submits carrying the field's name and value

  # S8
  Scenario: A button of type button never submits its form
    Given a form containing a button of type "button"
    When the user activates the button
    Then the form does not submit

  # Family: theming
  # S9
  Scenario: A second theme restyles the button through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the button's appearance resolves from material3 token values

  # S10
  Scenario: The button honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the button's appearance resolves from the dark token values
