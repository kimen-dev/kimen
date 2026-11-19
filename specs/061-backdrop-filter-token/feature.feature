Feature: Themes control the complete backdrop filter
  A theme can use glass or turn the backdrop effect off for its components.

  # S1
  Scenario: A flat theme turns the backdrop effect off
    Given an onmars page whose theme sets the backdrop filters to none
    When glass surfaces are displayed
    Then each surface has a computed backdrop filter of none

  # S2
  Scenario: A theme can switch one component to glass
    Given a flat theme that sets the badge backdrop filter to blur(12px)
    When a neutral badge and a glass-style button are displayed
    Then the badge computes blur(12px)
    And the button computes none

  # S3
  Scenario Outline: Built-in themes preserve their backdrop appearance
    Given the <theme> theme in the <scheme> colour scheme
    When glass surfaces are displayed
    Then the standard backdrop filter computes <filter>
    And the select listbox computes <listbox>

    Examples:
      | theme     | scheme | filter     | listbox    |
      | onmars    | light  | blur(12px) | blur(24px) |
      | onmars    | dark   | blur(12px) | blur(24px) |
      | material3 | light  | blur(0px)  | blur(0px)  |
      | material3 | dark   | blur(0px)  | blur(0px)  |

  # S4
  Scenario: An existing blur-length override still controls the glass effect
    Given an onmars theme that customizes the published backdrop blur lengths
    When the badge, button and select listbox are displayed
    Then each computes a blur using its customized length

  # S5
  Scenario: Reduced transparency turns the backdrop effect off
    Given a page that enables reduced transparency
    When glass surfaces are displayed
    Then each surface has a computed backdrop filter of none
