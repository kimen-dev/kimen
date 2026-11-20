# Neutral stack and grid layout

**Issue:** #361  
**Branch:** feat/361-ki-stack-grid

Screen authors and guarded renderers need directional and responsive layout.
Use stack for one axis and grid for responsive tracks. Use TopNav or Sidebar
for page shells, card for grouping with a surface, and a table for tabular
data. Both layouts accept content in their default slot and emit no events.

The public API and fallbacks are in [the layout contract](contracts/layout.md).

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S8, S9 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6 | |
| Form participation | N/A | The hosts are passive containers with no form value or validity. Slotted controls retain their own form behavior. |
| Theming | S7 | |

## Interpretations

- Agent's choice, pending founder confirmation. Fixed columns collapse at the
  host's inline size, and spans fit the existing tracks. Auto-fill spans two
  tracks only when two fit. Placement uses sparse row flow so later items
  cannot backfill gaps ahead of earlier items.
- Agent's choice, pending founder confirmation. Use the non-negative spacing
  scale, from `zero` through `26xl`. Unknown gap steps and direction or
  alignment values resolve to the documented defaults. Invalid numeric column counts
  use auto-fill, and invalid minimums use the theme default.
- Agent's choice, pending founder confirmation. In a stack, presence of
  `data-grow` gives a direct child one share of free space. A2UI maps matching
  alignment and justification values and preserves each inline Text child as
  a distinct layout item. A2UI `weight` stays lossy because the guarded
  catalog has no generic child attribute channel.
- Agent's choice, pending founder confirmation. Keep both generated tag
  directories and their local docs as required by the discovery registry.
  The shared Layout page and token sources describe both tags.
- Agent's choice, pending founder confirmation. Declare the API change as
  major. The gate classifies additions to the loader's `Components` and
  `JSX` namespace signatures as major.

## Gherkin

```gherkin
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
```
