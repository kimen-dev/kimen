Feature: Neutral stack and grid layout
  Screen authors arrange content with Kimen spacing and preserve reading order.

  # S1
  Scenario: A stack arranges children on the chosen axis
    Given a stack with two children
    When the author changes the direction from column to row
    Then the children move from successive rows to the same row in source order

  # S2
  Scenario: A row wraps and distributes available space
    Given a row stack with wrapping enabled and a growing child
    When the available inline size changes
    Then the growing child takes the free space on its line
    And a child that cannot fit moves to a following line

  # S3
  Scenario: A fixed grid responds to its available inline size
    Given a three-column grid with a two-column item
    When the grid narrows below 30rem
    Then its items occupy one column in source order without creating extra tracks

  # S4
  Scenario: An automatic grid respects the minimum column size
    Given an automatic grid with an 8rem minimum and a two-column item
    When the grid widens to fit multiple columns
    Then it fills the available column tracks
    And the item spans two tracks

  # S5
  Scenario: Keyboard focus follows the visual sequence
    Given focusable children in a row stack and a grid in a right-to-left page
    When the user tabs through the layouts
    Then focus visits each child in visual and source order

  # S6
  Scenario: The layout preserves the semantics of its children
    Given a stack and a grid containing named controls
    When assistive technology reads the page
    Then each control keeps its name and role
    And the layouts supply no additional widget roles or focus stops

  # S7
  Scenario: Layout spacing follows the chosen theme step
    Given a stack and a grid using the small spacing step
    When the theme changes the small spacing step
    Then the separation between the children follows the new value

  # S8
  Scenario: A generated surface preserves row and column structure
    Given an A2UI surface with a column containing a row
    When the adapter translates the surface
    Then the column becomes a column stack and the row becomes a row stack
    And each stack preserves its child sequence

  # S9
  Scenario: Unsupported spacing keeps the default gap
    Given a stack and a grid with their default gaps
    When the author supplies a raw length as the gap
    Then both layouts keep their default spacing
