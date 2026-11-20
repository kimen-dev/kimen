# Input and textarea appearances and character limits

Issue #404 extends the [input contract](../003-ki-input/contracts/input-contract.md)
and [textarea contract](../004-ki-textarea/contracts/textarea-contract.md).
Issue #348 is in the branch base at `3f8c864`.

## Scenario Family Coverage

| Family | Status | S-IDs | Justification |
| --- | --- | --- | --- |
| Core behavior | Covered | S1, S2 | Field shape, label position and optional help-row count. |
| Keyboard path | Covered | S3 | Tab focus, visible indicator and native text entry. |
| Assistive-tech outcome | Covered | S4 | Description, polite threshold updates and invalid state. |
| Form participation | Covered | S5, S6 | Too-long textarea edits and minimum-length validation. |
| Theming | Covered | S7 | Boundary and focus contrast across themes, schemes and modes. |

## Interpretations

- Agent's choice, pending founder confirmation. `ki-input` forwards both
  native length bounds. `ki-textarea` forwards `minlength` and enforces
  `maxlength` through form validity so the native textarea can retain the
  complete edit. The soft limit applies to assigned values and to textareas
  with the counter off. Existing `error-text` and `setCustomValidity` still
  override validation copy. `maxlength-error-text` localizes the default
  soft-limit message when no general error text is supplied.
- Agent's choice, pending founder confirmation. The counter appears only with
  a valid maximum and `show-count`. It measures UTF-16 code units of the
  displayed value, matching native length constraints. Lengths outside the
  native nonnegative integer range are treated as unset. An empty optional
  control remains valid with a positive minimum.
- Agent's choice, pending founder confirmation. The separate live region starts
  empty and updates on user edits that enter the at-limit or over-limit state.
  It holds the count announced at that transition until the state changes.
  The visual count always reflects the latest value and stays in the
  description when an error replaces the help text.
- Agent's choice, pending founder confirmation. Both explicit appearances use
  shared input tokens across the two elements. The count uses the semantic
  supporting-text ink so it responds to contrast-more. Filled fields add a
  thicker focus-coloured indicator and retain the same outline as outlined fields.
  The Material 3 filled radius follows that theme's extra-small field shape.

## Gherkin

```gherkin
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
```
