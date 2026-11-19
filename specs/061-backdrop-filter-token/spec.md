# Feature Specification: Themes control the complete backdrop filter

**Branch** `feat/342-backdrop-filter-token`

**Input** kimen-dev/kimen#342

A filter value of `none` lets a flat theme avoid the backdrop compositing work
associated with a zero-radius blur. The public effect and component tokens
accept a complete CSS filter value. The 200-badge check counts Chromium
compositor layers with the filter enabled and disabled.

## Decisions

- **D1 — agent's choice, pending founder confirmation.** Keep the select
  listbox's 24px filter through its own semantic effect token. The other glass
  surfaces use the shared 12px default. A changed shared effect also reaches
  the listbox while it uses its default, and a listbox override can choose its
  own complete value.
- **D2 — agent's choice, pending founder confirmation.** Expose independent
  tokens for the alert shell and dismiss button, and use the shared button
  surface token for the icon button. Checkbox and radio already render without
  a backdrop filter.
- **D3 — agent's choice, pending founder confirmation.** Use the spec 041
  deprecation schedule, from 0.1.0 through the next major at 1.0.0. The old
  lengths still drive the default glass effect through CSS style queries. A
  full filter that differs from the built-in glass default takes precedence.
  This includes the literal `none` in Material 3 and reduced transparency.

## Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5 | |
| Keyboard path | | The filter value affects paint and compositing only. |
| Assistive-tech outcome | | The filter has no effect on accessible roles, names, or descriptions. |
| Form participation | | The filter has no effect on values, validation, or submission. |
| Theming | S1, S2, S3, S4, S5 | |

## Gherkin

```gherkin
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
      | material3 | light  | none       | none       |
      | material3 | dark   | none       | none       |

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
```
