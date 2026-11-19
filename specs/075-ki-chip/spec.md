# Chip — issue #355

A filter chip toggles an independent filter. An input chip displays a picked value
and can remove it. An assist chip triggers a contextual action. Use a badge for
static status, a button for primary actions and a radio group or segmented control
for mutually exclusive choices.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S7, S10, S12, S13 | |
| Keyboard path | S4, S5, S6 | |
| Assistive-tech outcome | S8, S9 | |
| Form participation | | The application owns filter selection and picked values. The linked field handles form submission and validation. |
| Theming | S11 | |

## Interpretations

- **Agent's choice, pending founder confirmation.** The group uses a shared type
  of filter, input or assist and supplies that type to children without an explicit
  type. Direct chips are list items in an input group. Markup should use a group
  type consistent with its children.
- **Agent's choice, pending founder confirmation.** A successful remove request
  removes the element. Consumers can cancel `ki-remove` to manage the DOM
  themselves. Omitted values are reported as an empty string. Focus moves to the
  next enabled, focusable chip, then the field identified by the group's
  `focus-target` ID. If no field is linked or focusable, it falls back to the
  previous enabled, focusable chip or the group. A standalone chip leaves
  focus recovery to its consumer.
- **Agent's choice, pending founder confirmation.** Assist emits `ki-activate`
  for guarded surfaces. The catalog resolves the primary action from the
  validated chip kind. An input chip must be removable to bind removal.
- **Agent's choice, pending founder confirmation.** A reorderable group moves its
  direct children in DOM order. Alt+Left/Right follows inline direction. The
  handle also supports click or tap to pick up and place. Reordering keeps the
  source chip focused, announces the position and emits `ki-reorder` with the
  value and zero-based indices. An input chip without remove becomes focusable
  when reordering is enabled.
- **Agent's choice, pending founder confirmation.** Labels for remove and position
  updates are localizable. Touch density is opt-in under Kimen's density contract.

## Behavior contract

```gherkin
Feature: Chips expose filters, picked values and contextual actions

  # S1
  Scenario: Activating a filter changes its selection
    Given the "Engineering" filter is unselected
    When the user activates it
    Then the chip shows its selected fill and check
    And the change event reports that it is selected

  # S2
  Scenario: Removing a picked value advances focus
    Given removable recipients "Ana García" and "Luis" in that order
    When the user activates "Remove Ana García"
    Then the remove event identifies Ana's value and the chip disappears
    And focus moves to "Remove Luis"

  # S3
  Scenario: Activating assist runs a contextual action
    Given an "Add to calendar" assist chip
    When the user activates it
    Then the activation event is emitted once

  # S4
  Scenario: Space toggles the focused filter
    Given the "Engineering" filter is focused and selected
    When the user presses Space
    Then the filter becomes unselected

  # S5
  Scenario Outline: Deleting the last chip returns focus to the field
    Given the last recipient's remove button is focused and the entry field is linked
    When the user presses <key>
    Then the recipient is removed and focus returns to the entry field

    Examples:
      | key       |
      | Backspace |
      | Delete    |

  # S6
  Scenario Outline: Arrow shortcuts reorder a chip
    Given "Design" precedes "Engineering" in a reorderable filter group in <direction>
    When the user presses <shortcut> on the focused "Design" chip
    Then "Design" follows "Engineering" and retains focus
    And the new position is announced politely

    Examples:
      | direction | shortcut        |
      | LTR       | Alt+ArrowRight  |
      | RTL       | Alt+ArrowLeft   |

  # S7
  Scenario: Dragging a handle reorders the chips
    Given "Design" precedes "Engineering" in a reorderable group
    When the user drags the "Engineering" handle onto "Design"
    Then "Engineering" precedes "Design" in reading order

  # S8
  Scenario: Filter and input collections expose their roles
    Given a selected "Design" filter in "Team" and a removable chip for "Ana García" in "Recipients"
    When assistive technology reads the collections
    Then "Team" is a named group containing a pressed toggle button
    And "Recipients" is a named list with an item containing "Remove Ana García"

  # S9
  Scenario: Assist exposes a plain button named by its label
    Given an "Add to calendar" assist chip with a leading icon
    When assistive technology reads the chip
    Then it exposes one button named "Add to calendar" without pressed state

  # S10
  Scenario: Disabled chips decline activation
    Given disabled filter, input and assist chips
    When the user tries to activate their controls
    Then selection and membership stay as they were and no surface event is emitted

  # S11
  Scenario: The selected background follows the theme
    Given a theme overrides the selected chip background
    When the user selects "Design"
    Then the selected fill uses the overridden background

  # S12
  Scenario: Two pointer activations reorder chips without dragging
    Given the user has picked up "Engineering" by its handle in a reorderable group
    When the user activates the "Design" handle
    Then "Engineering" precedes "Design" in reading order

  # S13
  Scenario: A consumer can keep a value when removal is cancelled
    Given the application cancels removal of "Ana García"
    When the user activates "Remove Ana García"
    Then the recipient remains and retains focus
```
