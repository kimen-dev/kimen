Feature: Component heading typography
  Themes can choose a typeface for dialog and alert headings independently
  of body copy.

  # S1
  Scenario Outline: Default headings retain the theme's body typeface
    Given a <theme> page in the <scheme> scheme with a dialog and an alert
    When their headings are rendered with default tokens
    Then both headings use their component's body typeface
    And the dialog heading keeps its normal tracking

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S2
  Scenario: A theme chooses a shared heading typeface
    Given a themed region that sets --ki-typography-family-heading to serif
    When a dialog and an alert render headings in the region
    Then both headings use serif
    And their body copy keeps the theme's body typeface

  # S3
  Scenario: Component heading typefaces take precedence over the shared typeface
    Given a theme whose heading typeface is sans-serif
    And a dialog and an alert whose component heading family tokens are set to serif
    When their headings render
    Then both headings use serif
    And their body copy keeps the theme's body typeface

  # S4
  Scenario: A dialog heading has its own tracking
    Given a dialog with --ki-dialog-heading-letter-spacing set to 2px
    When its heading renders
    Then its heading has 2px letter spacing
    And its body copy keeps normal tracking
