Feature: Input and textarea appearances and character limits

  # S1
  Scenario: Explicit appearances keep the visible label above the field
    Given an outlined and a filled example of each text field
    When the fields are displayed
    Then all labels are above their fields
    And the outlined fields have a full border and the filled fields have a bottom indicator

  # S2
  Scenario: The optional count tracks the current value alongside help
    Given a field with help and a maximum length of 30
    When its value becomes "Kimen design"
    Then an enabled count displays "12 / 30" at the end of the help row
    And the count is absent when it is disabled or the maximum is absent

  # S3
  Scenario: Keyboard entry respects the input limit with a visible focus ring
    Given an outlined input with a maximum length of 3
    When the user tabs to it and types "ABCD"
    Then the focus ring is visible and the value is "ABC"

  # S4
  Scenario: Assistive technology receives the count and threshold notifications
    Given a field with help and an enabled count for a maximum length of 3
    When the user types into the field
    Then the accessible description includes the help and current count
    And the live region updates politely on reaching the limit and on first exceeding it

  # S5
  Scenario: A textarea preserves an over-limit edit and blocks form submission
    Given a form with a named textarea that permits 3 characters
    When the user edits its value to "ABCD"
    Then the full value remains editable and the textarea reports a length error
    And the form cannot submit until the value meets its constraints

  # S6
  Scenario: Both fields enforce the minimum length on user edits
    Given a form with a named text field with a minimum length of 3
    When the user types "AB"
    Then the text field reports a minimum length error and the form cannot submit

  # S7
  Scenario: Explicit appearances preserve boundary contrast and focus across themes
    Given outlined and filled text fields under either supported theme
    When a user focuses a field
    Then both appearances retain the same visible focus ring
    And each enabled outline or bottom indicator has at least 3:1 contrast in light and dark
