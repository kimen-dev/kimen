Feature: Component heading typography
  Themes can choose a typeface for dialog and alert headings independently
  of body copy.

  # S1
  Scenario Outline: Default headings follow the theme's typeface roles
    Given a <theme> page in the <scheme> scheme with a dialog and an alert
    When their headings are rendered with default tokens
    Then the dialog heading uses the <dialog family> typeface and keeps its normal tracking
    And the alert heading uses its component's body typeface

    Examples:
      | theme     | scheme | dialog family |
      | onmars    | light  | display       |
      | onmars    | dark   | display       |
      | material3 | light  | body          |
      | material3 | dark   | body          |

  # S2
  Scenario: A theme chooses a shared heading typeface
    Given a Material 3 region that sets --ki-typography-family-heading to serif
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
