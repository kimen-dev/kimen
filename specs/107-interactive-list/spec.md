# InteractiveList

Issue #377 extends the shipped `ki-list` and `ki-list-item`. Static lists
keep their current structure, appearance, and token defaults. Navigation rows
use native links. Selection lists expose a named listbox. A settings row can
hold one independently focusable control in its trailing slot.

## Requirements

- `selection` accepts `none` (default), `single`, or `multiple`.
  Interactive lists require a nonempty `label`.
- `href` makes the row a native link with a decorative trailing chevron.
  Selection items use `value`, `selected`, and `disabled`. A visual
  radio or checkbox indicates selection in addition to the selected fill.
- Each row has at most one interaction. A development warning identifies a
  conflict. The single trailing control in a settings row uses the primary
  text as its accessible name when it has no authored name.
- Selection is form-associated. The list exposes `name`, `required`,
  and `value`. A selection change from the user emits one composed
  `ki-change` event with a `{ value }` detail.
- Match the reference in both themes using component tokens. Preserve
  forced-colors, reduced-motion, direction and density behavior.

## Interpretations

- **Agent's choice, pending founder confirmation.** `value` is a string
  or `null` in single mode and an array of strings in multiple mode.
  Multiple selection submits repeated name entries in row order. Declare
  initial HTML and catalog selections using `selected` on the rows.
- **Agent's choice, pending founder confirmation.** Arrow keys, Home, End,
  and type-ahead move focus independently of selection. Space or Enter toggles
  the focused option. Disabled and hidden options are skipped. Without a value
  attribute, the option uses its primary text as its value.
- **Agent's choice, pending founder confirmation.** In selection mode the
  option takes precedence over a conflicting link or slotted control.
  Outside selection mode an authored control takes precedence over a
  conflicting row link. Authored control names take precedence over the
  primary row text.
- **Agent's choice, pending founder confirmation.** Keep the shipped
  `--ki-list-item-radius` on static rows and use a separate token for
  interactive radius so the existing Material 3 square rows are preserved.

## Scenario Family Coverage

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S3, S4 |
| Keyboard path | S5, S6, S7 |
| Assistive-tech outcome | S8, S9 |
| Form participation | S10, S11, S12 |
| Theming | S13, S14, S15, S16, S17 |

## Gherkin Scenarios

```gherkin
Feature: Interactive list rows
  A list can present navigation, selection, or a trailing control while
  keeping a single interactive element per row.

  # Family: core behavior
  # S1
  Scenario: A navigation row opens its destination
    Given the Settings list contains an Account row linked to the account section
    When a user activates the Account row
    Then the browser navigates to the account section

  # S2
  Scenario: Choosing a single option replaces the previous choice
    Given Reviewers allows one choice and Ana is selected
    When a user chooses Luis
    Then only Luis is selected
    And one change event reports Luis's value

  # S3
  Scenario: A row with conflicting interactions produces a development warning
    Given an Account row declares a link and contains a trailing switch
    When the list renders in a development build
    Then a warning explains the one-interactive-element rule
    And the switch is the row's only active control

  # S4
  Scenario: Disabling an option prevents it from being chosen
    Given a Reviewers option for Luis is disabled
    When a user clicks Luis
    Then Luis remains unselected
    And no selection change event is emitted

  # Family: keyboard path
  # S5
  Scenario: Arrow keys move within a single tab stop
    Given Ana is selected and focused and the next enabled option is Sara
    When a user presses Down Arrow
    Then focus moves to Sara without changing the selection
    And Sara becomes the listbox's only tab stop

  # S6
  Scenario: Space toggles an option independently
    Given Reviewers accepts multiple choices and Ana is selected and Luis is focused
    When a user presses Space
    Then Ana and Luis are selected
    And one change event reports both values

  # S7
  Scenario: Typing a prefix focuses the matching option
    Given the focused option is Ana and the list also contains Sara and Sol
    When a user types "so"
    Then Sol receives focus without changing the selection

  # Family: assistive-tech outcome
  # S8
  Scenario: A selection list exposes its name and states
    Given Reviewers accepts multiple choices and Ana is selected and Luis is disabled
    When assistive technology reads the list
    Then it exposes a listbox named Reviewers that allows multiple selections
    And Ana is a selected option and Luis is a disabled unselected option

  # S9
  Scenario: A settings control uses the row's text as its name
    Given the Notifications list contains an Email digest row with an unlabeled trailing switch
    When a keyboard user tabs into the list
    Then focus lands on a switch named Email digest

  # Family: form participation
  # S10
  Scenario: Multiple selections submit under the same name
    Given a form contains a Reviewers list named reviewers with Ana and Sara selected
    When the form is submitted
    Then the submitted data contains ana and sara in order under reviewers

  # S11
  Scenario: A required selection prevents empty submission
    Given a required Reviewers list has no selection
    When the user submits the form
    Then the form reports the list as missing a value and blocks submission

  # S12
  Scenario: Reset restores the initial choice
    Given Reviewers initially selected Ana and now selects Luis
    When the form is reset
    Then Ana is selected and the form data contains ana

  # Family: theming
  # S13
  Scenario: The selected row honors the active theme
    Given Ana is selected in a themed Reviewers list
    When the page replaces the selected foreground and background tokens
    Then the row uses those colors and retains its selection mark

  # S14
  Scenario: Forced colors preserves the selected state and focus
    Given Ana is selected and focused in a Reviewers list
    When the operating system forces its colors
    Then the row keeps a visible selection mark and focus ring

  # S15
  Scenario: Navigation points toward the inline end
    Given a right-to-left Settings list contains an Account link
    When the row renders
    Then its chevron trails the text and points toward the inline end

  # S16
  Scenario: Reduced motion removes interactive row transitions
    Given a user prefers reduced motion
    When an option is selected
    Then its selected appearance applies without a transition

  # S17
  Scenario: Coarse pointers retain the touch target without hover paint
    Given a dense Settings list is used with a coarse pointer
    When the user taps the Account link
    Then the row meets the touch target minimum and has no lingering hover paint
```
