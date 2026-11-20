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
