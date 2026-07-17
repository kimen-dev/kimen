Feature: Icon button
  An icon button lets a person trigger a compact, icon-only action with
  full input-modality parity and a mandatory accessible name, and lets
  any brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Activating the icon button runs its action exactly once
    Given an icon button labeled "Close" on a page that counts activations
    When the user clicks the icon button
    Then the page observes exactly one activation

  # S2
  Scenario: A disabled icon button does not act
    Given a disabled icon button labeled "Close"
    When the user attempts to activate it
    Then no activation is observed

  # S3
  Scenario: Unknown appearance values fall back to defaults
    Given an icon button declared with an unrecognized variant value
    When the page renders
    Then the icon button renders with the default variant appearance

  # Family: keyboard path
  # S4
  Scenario: The keyboard reaches the icon button with visible focus
    Given a page whose first interactive element is an icon button
    When the user presses Tab
    Then the icon button is focused and its focus indication is visible

  # S5
  Scenario: The keyboard activates the focused icon button
    Given a focused icon button labeled "Close"
    When the user activates it from the keyboard
    Then the page observes exactly one activation

  # Family: assistive-tech outcome
  # S6
  Scenario: The icon button is exposed as a named button without visible text
    Given an icon button labeled "Close" holding only a close icon
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Close"
    And the slotted icon contributes no name, role or text of its own

  # S7
  Scenario: The disabled state is exposed to assistive technology
    Given a disabled icon button labeled "Close"
    When the accessibility tree is queried
    Then the icon button is exposed as unavailable

  # S8
  Scenario: An accessible description on the host reaches assistive technology
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the accessibility tree is queried
    Then it exposes a button named "Close" whose accessible description is "Closes the dialog"

  # Family: form participation
  # S9
  Scenario: An icon button never submits an enclosing form
    Given a form holding a filled text field and an icon button labeled "Clear"
    When the user activates the icon button
    Then the form does not submit

  # Family: theming
  # S10
  Scenario: A second theme restyles the icon button through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the icon button's appearance resolves from material3 token values

  # S11
  Scenario: The icon button honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the icon button's appearance resolves from the dark token values

  # Family: assistive-tech outcome (appended)
  # S12
  Scenario: The exposed description follows a change on the host
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the host description changes to "Closes the settings panel"
    Then the button's exposed accessible description is "Closes the settings panel"

  # S13
  Scenario: Removing the host description removes the exposed description
    Given an icon button labeled "Close" whose host carries the accessible description "Closes the dialog"
    When the host description is removed
    Then the button exposes no accessible description

  # Family: keyboard path (appended)
  # S14
  Scenario: A disabled icon button sits outside the tab order
    Given a focused button, then a disabled icon button labeled "Close", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the disabled icon button
