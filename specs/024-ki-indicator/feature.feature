Feature: Indicator
  A page indicator tells a viewer which position of a bounded sequence is
  current — one dot per position, exactly one highlighted — without ever
  taking focus or input, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The indicator renders one dot per position with the current one highlighted
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the page renders
    Then five dots render in a single row and only the second presents the current appearance

  # S2
  Scenario: The highlight follows the current position as it changes
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the current position changes to 3
    Then only the third dot presents the current appearance
    And the exposed position text is "3 / 5"

  # S3
  Scenario: An out-of-range current position clamps to the sequence bounds
    Given an indicator labeled "Slide position" with 5 positions declared with current position 9
    When the page renders
    Then only the fifth dot presents the current appearance

  # S4
  Scenario: A malformed current position falls back to the first position
    Given an indicator labeled "Slide position" with 5 positions declared with a non-numeric current position
    When the page renders
    Then only the first dot presents the current appearance

  # S5
  Scenario: Unknown attribute values fall back to the default appearance
    Given an indicator declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the indicator renders with the default appearance

  # S6
  Scenario: Reduced motion moves the highlight without animation
    Given a user whose system requests reduced motion
    And an indicator labeled "Slide position" with 5 positions and position 2 current
    When the current position changes to 3
    Then the third dot presents the current appearance without transitional motion

  # Family: keyboard path
  # S7
  Scenario: The indicator never takes keyboard focus
    Given a focused button, then an indicator labeled "Slide position", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the indicator or its dots

  # Family: assistive-tech outcome
  # S8
  Scenario: The indicator exposes its name and position to assistive technology
    Given an indicator labeled "Slide position" with 5 positions and position 2 current
    When the accessibility tree is queried
    Then it exposes one graphic named "Slide position, 2 / 5"
    And the individual dots expose no role, name or state of their own

  # Family: form participation — N/A for ki-indicator: a non-interactive
  # position display is not a form control, holds no value and contributes
  # no entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S9
  Scenario: A second theme restyles the indicator through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the dots' size, shape, spacing and colors resolve from material3 token values

  # S10
  Scenario: The indicator honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the indicator's appearance resolves from the dark token values

  # S11
  Scenario: The dot order follows the document's writing direction
    Given a right-to-left document with an indicator labeled "Slide position" with 5 positions and position 1 current
    When the page renders
    Then the first position's dot leads the row from the right edge
