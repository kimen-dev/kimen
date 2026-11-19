# Persistent selection for button and icon button

**Issue** #376  
**Branch** feat/376-toggle-icon-button

Bookmark, favourite and formatting controls can retain their state after
activation. Both existing button elements support this opt-in behavior.
Icon-only controls can provide different decorative glyphs for the two states.

The public surface and ButtonGroup handoff are in the [button contract](contracts/toggle.md).

## Scenario Family Coverage

| Family                | Scenarios         | N/A justification |
| --------------------- | ----------------- | ----------------- |
| Core behavior         | S1, S2, S3, S4    |                   |
| Keyboard path         | S5                |                   |
| Assistive-tech outcome | S6, S7            |                   |
| Form participation    | S8                |                   |
| Theming               | S9, S10, S11, S12 |                   |

## Interpretations

- Agent's choice, pending founder confirmation. Toggle mode is an independent
  action inside a form, including when a submit or reset type is supplied.
  State changes initiated by the application are silent. User activation
  emits one bubbling, composed, non-cancelable change carrying the new state.
- Agent's choice, pending founder confirmation. Only the icon button exposes a
  selected slot. An inline default SVG takes a current-colour fill on selection.
  Glyphs that need different geometry can use the selected slot.
- Agent's choice, pending founder confirmation. Toggle mode uses a
  variant-specific palette. The 3:1 state difference takes precedence over
  the preview's transparent selected ghost and low-emphasis selected secondary
  where those pairs miss the threshold. Shape remains visible with reduced
  motion, which suppresses the transition.
- Agent's choice, pending founder confirmation. ButtonGroup owns its
  `selection="single" | "multiple"` policy. Its separately tracked component
  can observe a direct toggle child's `ki-change` and set its children's
  reflected `selected` values silently.

## Gherkin

```gherkin
Feature: Persistent button selection
  People can turn an action such as Bookmark or Bold on and off.

  # S1
  Scenario: A pointer activation switches selection
    Given an unselected toggle button
    When the person clicks it twice
    Then the state is selected after the first click and unselected after the second
    And each activation reflects the new state and emits one change with that state

  # S2
  Scenario: An application can set the state silently
    Given a toggle button and a momentary button
    When the application sets both to selected
    Then only the toggle button presents a pressed state
    And neither button emits a change
    And the momentary button still performs its ordinary action on click

  # S3
  Scenario: A selected icon button presents the appropriate glyph
    Given a toggle icon button with a default outline icon and an optional selected icon
    When the button becomes selected
    Then the selected icon is visible if supplied
    And the default outline icon becomes filled whenever the selected icon is absent

  # S4
  Scenario: An unavailable toggle preserves selection
    Given a selected toggle button that is disabled or loading
    When activation is attempted
    Then its selection stays unchanged and it emits no change

  # S5
  Scenario: Enter and Space each switch selection
    Given an enabled toggle button with keyboard focus
    When the person presses Enter and then Space
    Then each key switches selection exactly once
    And focus stays on the button

  # S6
  Scenario: The accessible name stays stable
    Given a named toggle button
    When its selection changes
    Then assistive technology can read the new pressed state under the same name

  # S7
  Scenario: Forced colours distinguish selection
    Given a toggle button in forced colours
    When it becomes selected
    Then its shape and its system-colour fill distinguish the selected state

  # S8
  Scenario: A toggle is independent of form actions
    Given toggle buttons with submit and reset types inside a form
    When the person activates the toggle buttons
    Then their selection changes without submitting or resetting the form
    And a momentary submit button in the same form can still submit it

  # S9
  Scenario: Selected and unselected variants are distinguishable
    Given toggle buttons of every variant in a supported theme and colour scheme
    When their selected and unselected looks are compared
    Then the container fills differ by at least 3 to 1
    And icons meet 3 to 1 and text meets 4.5 to 1 on their respective containers
    And the change of shape provides a second visual cue

  # S10
  Scenario: Selection respects reduced motion
    Given a toggle button and a preference for reduced motion
    When the person selects it
    Then its selected shape is visible without an animated transition

  # S11
  Scenario: Selection works in right-to-left layouts
    Given toggle buttons in a right-to-left layout
    When the person activates a toggle button
    Then it takes the same selected appearance and retains the page direction

  # S12
  Scenario: A compact toggle keeps its coarse-pointer target
    Given an extra-small toggle button on a coarse-pointer device
    When the person taps within its minimum touch target
    Then the button changes selection
    And selection preserves the minimum target and the painted control size
```
