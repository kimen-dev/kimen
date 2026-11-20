Feature: ki-stat displays a key metric and its comparison
  The sign shows which way a metric moved.
  The metric's preference determines whether the change is favorable.

  # S1
  Scenario: A metric uses its locale and separate comparison format
    Given a German page with a value of 1234.5 milliseconds
    And its comparison of minus 0.12 uses percent formatting
    When the stat appears
    Then the value reads "1.234,5 ms"
    And the comparison shows "12 %" with a falling glyph

  # S2
  Scenario Outline: Metric preference assigns the tone independently of sign
    Given a metric with <preference> preference and a change of <change>
    When the stat appears
    Then the change shows a <trend> glyph in the <tone> tone

    Examples:
      | preference       | change | trend   | tone   |
      | higher-is-better | 9      | rising  | good   |
      | higher-is-better | -9     | falling | bad    |
      | lower-is-better  | 9      | rising  | bad    |
      | lower-is-better  | -9     | falling | good   |
      | neutral          | -9     | falling | neutral |

  # S3
  Scenario: A missing comparison leaves only the metric
    Given an active-surfaces stat of 1284 with a reference period but no comparison value
    When the stat appears
    Then it shows only the metric label and the value "1,284"

  # S4
  Scenario: An unchanged metric displays a neutral zero
    Given a render-time stat with a comparison of zero milliseconds
    When the stat appears
    Then the comparison shows a neutral "0 ms" with no trend glyph

  # S5
  Scenario: A static stat leaves the tab sequence intact
    Given a stat between the "Edit" and "Export" buttons
    And focus is on "Edit"
    When the user presses Tab
    Then focus moves to "Export"

  # S6
  Scenario: A falling comparison is available as one phrase
    Given a median render time of 84 milliseconds down 9 milliseconds since last week
    When assistive technology reads the stat
    Then it reads "Median render time, 84 ms, down 9 ms vs last week" once
    And it skips the decorative glyph

  # S7
  Scenario: A sparkline can have its own accessible description
    Given a sales stat with a sparkline described as "Revenue over seven days"
    When assistive technology reads the stat
    Then it can read the metric and the chart description separately

  # S8
  Scenario: A theme can recolor the metric card
    Given a theme with a white raised surface and contrasting metric text
    When the stat appears
    Then it paints its card white

  # S9
  Scenario: A forced-color palette preserves the trend
    Given a high-contrast palette that overrides author colors
    When a stat with a negative comparison appears
    Then the falling glyph and comparison text remain visible

  # S10
  Scenario: Reduced motion keeps the comparison still
    Given a reader who requests reduced motion
    When a stat with a comparison appears
    Then the metric and comparison are visible without animation

  # S11
  Scenario: Right-to-left reading order starts with the glyph
    Given a right-to-left dashboard
    When a stat with a comparison appears
    Then the trend glyph appears to the right of the comparison magnitude

  # S12
  Scenario: A coarse pointer preserves the stat's readability
    Given a touch-density dashboard on a coarse-pointer device
    When the stat appears
    Then its text and glyph remain legible without pointer interaction
