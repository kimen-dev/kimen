# Tabs variants and decorative icons

Issue #405 extends [the shipped tabs family](../014-ki-tabs/spec.md). Authors
can distinguish screen-level tabs from sections inside a view, and add
decorative icons while keeping each tab visibly labeled.

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S4 | |
| Keyboard path | S2 | |
| Assistive-tech outcome | S3, S4, S5 | |
| Form participation | | Tabs switch views and hold no submitted form value. |
| Theming | S5, S6, S7 | |

## Interpretations

- Label-only primary tabs keep the shipped indicator geometry and theme
  overrides. Primary tabs with the new icon use the rounded-top 3px
  indicator. Secondary tabs use the 2px full-width marker with either icon
  layout. (agent's choice, pending founder confirmation)
- An icon tab with a blank or missing default-slot text label is omitted from
  the tablist and selection until it receives a label. Existing tabs using the
  legacy `start` or `end` slots keep their behavior. (agent's choice, pending
  founder confirmation)
- Use the forced-colour palette's `LinkText` for the selected label and
  `Highlight` for the marker. (agent's choice, pending founder confirmation)

## Gherkin

```gherkin
Feature: Tab variants and decorative icons
  A tab group can show primary navigation or secondary sections with labeled icons.

  # S1
  Scenario Outline: Icon arrangement follows the variant or the authored layout
    Given a <variant> tab group with icons and <layout> icon layout
    When the group renders
    Then each icon appears <position> its label

    Examples:
      | variant   | layout  | position       |
      | primary   | default | above          |
      | secondary | default | before         |
      | primary   | inline  | before         |
      | secondary | stacked | above          |

  # S2
  Scenario Outline: Each variant keeps automatic keyboard activation
    Given a <variant> group with "Inbox" selected, "Drafts" disabled and "Sent" enabled
    When the user presses Right Arrow on "Inbox"
    Then "Sent" receives focus and selection and its panel opens
    And "Sent" is the only tab in the group in the Tab sequence

    Examples:
      | variant   |
      | primary   |
      | secondary |

  # S3
  Scenario: The decorative icon leaves the label as the accessible name
    Given a tab whose label is "Inbox" and whose icon has its own title
    When assistive technology queries the selected tab and panel
    Then both are named "Inbox" and the tab is exposed as selected

  # S4
  Scenario: A tab that supplies an icon requires a visible text label
    Given an "Inbox" tab containing only a decorative icon and a labeled "Sent" tab
    When the group renders
    Then "Inbox" is unavailable for navigation and its panel stays hidden
    And "Sent" is selected

  # S5
  Scenario Outline: Forced colours distinguish the selected tab with two cues
    Given a <variant> tab group in forced colours
    When the user selects "Sent"
    Then an indicator marks "Sent" and its text colour differs from the unselected label

    Examples:
      | variant   |
      | primary   |
      | secondary |

  # S6
  Scenario: Primary indicators follow content and secondary indicators cover the tab
    Given a primary tab with an icon and a secondary tab
    When the page applies the tab indicator height and colour tokens
    Then the primary indicator spans the content with rounded top corners
    And the secondary indicator spans the tab with square corners

  # S7
  Scenario: Inline icons lead in right-to-left groups
    Given an inline-icon group in a right-to-left region
    When the tabs render
    Then each icon appears to the right of its label
```
