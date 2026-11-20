# Searchable single and multiple choice

**Branch** `feat/375-ki-combobox`  
**Issue** #375  
**Design source** Kimen design system, Components → Proposed → Combobox

People can narrow a list by typing, choose an available option, and optionally enter a new value. A multiple-choice field shows each committed value as a removable tag. The [component contract](contracts/combobox-contract.md) describes the API, event details and form behavior.

## Interpretations

- **Agent's choice, pending founder confirmation.** Local filtering compares case-insensitively against trimmed option labels. Contains and starts-with emphasize the first match in bold. Server search receives the raw query. A free-entry offer trims the query and excludes exact case-insensitive matches against labels or values and values already chosen.
- **Agent's choice, pending founder confirmation.** Typing changes the query independently of the committed selection. Single selection closes the list and shows the option label, while multiple selection keeps the list available and clears the query. Escape first closes and then clears a query or single selection. Tab or pointer dismissal restores the single selection's label and discards pending text.
- **Agent's choice, pending founder confirmation.** The first enabled option becomes active when ArrowDown opens the list, and the last when ArrowUp opens it. Navigation skips disabled options and stops at the ends. Multiple selection toggles choices in the list.
- **Agent's choice, pending founder confirmation.** Multiple form values submit as repeated entries in selection order. A selected value stays committed while results are refreshed, and its most recent label remains available. Form reset restores the initial value.
- **Agent's choice, pending founder confirmation.** The option description is an optional property and the start content uses a named slot on the authored option. Tags use internal markup and native remove buttons. The list uses a CSS-anchored manual popover through the shared overlay utility. An inset edge identifies selected rows. The field leaves the input free of decorative glyphs, and tag buttons use the registered remove glyph.
- **Agent's choice, pending founder confirmation.** A2UI lists above fifteen options switch to Combobox in both supported protocol versions. Short mutually exclusive lists use radio groups and short multiple-selection lists use checkbox groups. An unlabeled multiple-selection picker uses the accessible fallback.
- **Agent's choice, pending founder confirmation.** The component reports query and selection through separate composed DOM events. The DOM uses `ki-input` for query edits and the native `change` event name for selection, consistent with form wrappers. The catalog lists both events and designates selection as its action and encodes multiple initial values as a JSON array string in the scalar `value` attribute. English UI messages are overridable templates.

- **Agent's choice, pending founder confirmation.** The API declaration uses the gate's major classification for changes to Stencil's exported loader namespaces. The component's standalone size stays within the standard limits. Its MCP bundle allowances record the measured increase against `a362db8` with the same installed dependencies.

## Scenario family coverage

| Family | Scenarios |
| --- | --- |
| Core behavior | S1–S4, S18 |
| Keyboard path | S5–S7 |
| Assistive-tech outcome | S8–S9 |
| Form participation | S10–S12 |
| Theming | S13–S17 |

## Gherkin scenarios

```gherkin
Feature: Searchable single and multiple choice
  People can search authored options and optionally add their own choices.

  # S1
  Scenario Outline: Typing filters the available choices
    Given "Ana Ruiz", "Anabel Soto" and "Juan Antón" are available with the <filter> filter
    When the user types "AN"
    Then <count> matching options are shown
    And the field reports "AN" as the current query

    Examples:
      | filter      | count |
      | contains    | 3     |
      | starts-with | 2     |
      | none        | 3     |

  # S2
  Scenario: Choosing a search result commits its value and shows its label
    Given the user is searching for an assignee and "Ana Ruiz" is available
    When the user chooses "Ana Ruiz"
    Then the field shows "Ana Ruiz" and reports the selected value "ana"
    And the choices close

  # S3
  Scenario: Free entry makes a new removable choice
    Given a multiple-choice field allows free entry and the user has typed " search "
    When the user chooses "Add “search”"
    Then a removable tag labeled "search" appears
    And the selected values include "search" and the query is empty

  # S4
  Scenario: Loading replaces the search results
    Given a user is waiting for a server search with the choices open
    When the application marks the field as loading
    Then a labeled loading indicator is shown in place of the available choices

  # S5
  Scenario: Arrow navigation skips unavailable choices and Enter chooses
    Given "Ana Ruiz" is available after an unavailable choice
    When the user navigates from the closed field with ArrowDown and accepts with Enter
    Then "Ana Ruiz" is chosen
    And focus stays in the text field

  # S6
  Scenario: Escape closes an open list before clearing the query
    Given a user has typed "An" and the choices are open
    When the user presses Escape twice
    Then the first press closes the choices and preserves "An"
    And the second press clears the field

  # S7
  Scenario: Backspace at an empty query removes the last choice
    Given "bug" and "search" are chosen in a multiple-choice field with an empty query
    When the user presses Backspace in the text field
    Then only "bug" remains chosen

  # S8
  Scenario: A named field reports its active choice and result count
    Given an assignee field with three available choices
    When a keyboard user opens the choices with ArrowDown
    Then the field exposes its name, expanded state and controlled listbox
    And it exposes the active option while focus stays in the text field
    And a polite status reports "3 results"

  # S9
  Scenario: Each selected tag exposes a named removal control
    Given "bug" is chosen in a multiple-choice field
    When the user activates "Remove bug"
    Then the tag disappears and the field reports the empty selection
    And focus returns to the text field

  # S10
  Scenario: Multiple choices submit under the same form name
    Given "bug" and "search" are chosen in a field named "labels"
    When the form is submitted
    Then the submitted values for "labels" are "bug" and "search" in order

  # S11
  Scenario: A required field needs a committed choice
    Given a required field has a typed query and no chosen value
    When the form validates
    Then the field reports a missing value

  # S12
  Scenario: Form reset restores the starting selection
    Given a form field started at "ana" and has since changed
    When the form resets
    Then the chosen value is "ana" and the field displays "Ana Ruiz"

  # S13
  Scenario: Theme tokens style the choices and active row
    Given a theme assigns custom listbox and active option colors
    When a user opens the choices with ArrowDown
    Then the listbox and active option use the assigned colors

  # S14
  Scenario: Forced colors preserve the active option affordance
    Given forced colors are active
    When the user navigates the open choices
    Then the active option has a visible outline

  # S15
  Scenario: Reduced motion keeps the pending search readable
    Given reduced motion is preferred and a search is pending
    When the user opens the choices
    Then the loading label is visible and the spinner respects reduced motion

  # S16
  Scenario: Right-to-left choices align to the field's inline start
    Given a field in a right-to-left region
    When the user opens the choices
    Then the listbox aligns to the field's right edge

  # S17
  Scenario: Touch density keeps selection and removal targets usable
    Given a multiple-choice field in a coarse-pointer region with touch density
    When the user opens the choices
    Then the field and active controls provide at least 24 pixel targets

  # S18
  Scenario: A long A2UI choice list uses a searchable field
    Given an A2UI ChoicePicker with sixteen options
    When the adapter translates it
    Then the output exposes each option in a searchable field
    And multiple selection preserves all supplied values when requested
```
