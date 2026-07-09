Feature: Progress
  A progress indicator shows how far a task has advanced — or that work of
  unknown duration is ongoing — without ever taking focus or input, and
  restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The indicator fills to the task's completed fraction
    Given a linear progress labeled "Uploading report.pdf" with value 40 of max 100
    When the page renders
    Then the indicator visibly fills 40% of the track

  # S2
  Scenario: The circular shape presents the same progress as a ring
    Given a circular progress labeled "Uploading report.pdf" with value 40 of max 100
    When the page renders
    Then a ring indicator visibly covers 40% of its circumference

  # S3
  Scenario: An indeterminate progress signals activity of unknown duration
    Given an indeterminate progress labeled "Loading messages"
    When the page renders
    Then the indicator shows continuous activity without a completed fraction

  # S4
  Scenario: Out-of-range values clamp to the track's bounds
    Given a progress labeled "Uploading report.pdf" declared with value 250 of max 100
    When the page renders
    Then the indicator renders completely full

  # S5
  Scenario: Unknown appearance values fall back to defaults
    Given a progress declared with an unrecognized shape value
    When the page renders
    Then the progress renders with the linear shape

  # S6
  Scenario: Reduced motion stills the indeterminate animation
    Given a user whose system requests reduced motion
    And an indeterminate progress labeled "Loading messages"
    When the page renders
    Then the activity indication presents without continuous motion

  # S13
  Scenario: The indicator follows the task as it advances
    Given a linear progress labeled "Uploading report.pdf" with value 40 of max 100
    When the task advances the value to 80
    Then the indicator visibly fills 80% of the track
    And the exposed current value is 80 of 100

  # S14
  Scenario Outline: Malformed numbers fall back to safe defaults
    Given a progress labeled "Uploading report.pdf" declared with value <value> of max <max>
    When the page renders
    Then the indicator visibly fills <fill> of the track
    And the exposed current value is <exposed> of 100

    Examples:
      | value | max | fill | exposed |
      | -10   | 100 | 0%   | 0       |
      | abc   | 100 | 0%   | 0       |
      | 40    | 0   | 40%  | 40      |
      | 40    | -5  | 40%  | 40      |
      | 40    | abc | 40%  | 40      |

  # S15
  Scenario: Indeterminate wins over a declared value
    Given an indeterminate progress labeled "Loading messages" declared with value 40 of max 100
    When the page renders
    Then the indicator presents no completed fraction
    And no current value is exposed to assistive technology

  # Family: keyboard path
  # S7
  Scenario: The progress never takes keyboard focus
    Given a focused button, then a progress labeled "Uploading report.pdf", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the progress

  # Family: assistive-tech outcome
  # S8
  Scenario: The progress exposes its name, role and current value
    Given a progress labeled "Uploading report.pdf" with value 40 of max 100
    When the accessibility tree is queried
    Then it exposes a progressbar named "Uploading report.pdf" with value 40 of 100

  # S9
  Scenario: An indeterminate progress exposes no current value
    Given an indeterminate progress labeled "Loading messages"
    When the accessibility tree is queried
    Then it exposes a progressbar named "Loading messages" with no current value

  # Family: theming
  # S10
  Scenario: A second theme restyles the progress through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the progress's appearance resolves from material3 token values

  # S11
  Scenario: The progress honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the progress's appearance resolves from the dark token values

  # S12
  Scenario: The bar fills along the document's writing direction
    Given a right-to-left document with a linear progress at value 40 of max 100
    When the page renders
    Then the filled portion grows from the right edge of the track
