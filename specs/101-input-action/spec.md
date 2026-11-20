# InputAction on ki-input

**Issue** #383 · **Branch** `feat/383-input-action`

A search, subscribe, or send form with one field can put its submit button inside the
field border. Keep actions for multi-field forms beside the fields. Use `end` for
adornments such as clear and reveal controls.

## Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S8 | |
| Keyboard path | S2 | |
| Assistive-tech outcome | S3 | |
| Form participation | S4, S5, S9 | |
| Theming | S6, S7 | |

## Interpretations

- **Agent's choice, pending founder confirmation.** The action gap applies only between
  the action and the nearest control or adornment. The field's existing spacing
  still governs the entry and both adornment slots. Measure the action's inline-end
  padding from the inside border edge, as in the reference.
- **Agent's choice, pending founder confirmation.** Consumer-supplied buttons own their
  name and enabled state. A `ki-button type="submit"` uses its form behavior.
  A `ki-icon-button` needs a `label` and a consumer click handler that calls
  `requestSubmit()`. Enter in the entry keeps the existing implicit-submission behavior.
- **Agent's choice, pending founder confirmation.** The field may grow to fit a small
  action when the field's size or density would otherwise make it shorter than the button.

## Gherkin

```gherkin
Feature: ki-input puts a one-field form's submit action inside the field
  The optional action follows the trailing adornment and has its own name and focus.

  # S1
  Scenario: A submit action sits inside the field after the trailing adornment
    Given a search field with a trailing adornment
    When the field is rendered with a Search action
    Then the action appears after the adornment inside the border
    And the action is vertically centered

  # S2
  Scenario: Tab moves from the entry to its action
    Given the Search docs entry is focused
    When the user presses Tab
    Then the Search button receives focus

  # S3
  Scenario: An icon-only action exposes a name independent of the field
    Given a search field labeled "Search docs"
    When an icon-only action labeled "Search" is rendered in the field
    Then assistive technology exposes a searchbox named "Search docs"
    And assistive technology exposes a button named "Search"

  # S4
  Scenario: Enter in the field submits its current text once
    Given a search form with a Search action and a query of "tokens"
    When the user presses Enter in the entry
    Then the form submits once with "q" set to "tokens"

  # S5
  Scenario: Activating the action submits the field
    Given a search form with a Search action and a query of "tokens"
    When the user activates Search
    Then the form submits once with "q" set to "tokens"

  # S6
  Scenario: Action spacing responds to token overrides
    Given a field containing a Search action
    When the action gap and inline-end padding tokens are overridden
    Then the action has the requested gap and inset

  # S7
  Scenario: Forced colors preserve the field boundary and the focused action
    Given a search form in forced colors
    When the user tabs from the entry to the Search action
    Then the field boundary remains distinguishable from its fill
    And the action has a visible focus indicator

  # S8
  Scenario: The action follows inline end in right-to-left writing
    Given a right-to-left search field with a trailing adornment
    When the field is rendered with a Search action
    Then the action sits to the left of the adornment inside the field border

  # S9
  Scenario: Enter cannot submit a required empty field
    Given a required search field that is empty and has a Search action
    When the user presses Enter in the entry
    Then the form remains unsubmitted
    And the field exposes its invalid state
```
