Feature: Hosts can request a compact catalog prompt
  Compact guidance uses fewer bytes while retaining the rules for a valid UI spec.

  # S1
  Scenario Outline: Compact guidance fits the size ceiling and includes a valid example
    Given the standard prompt for <catalog>
    When the host derives a compact prompt for the same catalog selection
    Then the compact prompt uses at most 85% of the standard prompt's UTF-8 bytes
    And its embedded UI-spec example validates for that catalog selection
    And each component retains its prop types, enum values, required fields, bounds, formats and slots

    Examples:
      | catalog                                                                               |
      | the full built-in catalog                                                             |
      | ki-card, ki-icon, ki-button, ki-input, ki-select, ki-option, ki-textarea and ki-table |

  # S2
  Scenario: Compact guidance preserves the catalog's emission rules
    Given the standard prompt for the full built-in catalog
    When the host derives a compact prompt for that catalog
    Then the prompt retains declared actions, event bindings and form collection rules
    And it explains that "ki-option" belongs inside "ki-select" or "ki-combobox"

  # S3
  Scenario: Omitting verbosity returns the standard prompt
    Given the standard prompt for "ki-card" and "ki-button" before compact mode was available
    When the host derives a prompt for that selection without a verbosity option
    Then it receives the same standard prompt byte for byte
