# Feature specification for ki-button-group

**Branch** `feat/382-ki-button-group` · **Created** 2026-11-19 · **Issue** [#382](https://github.com/kimen-dev/kimen/issues/382)

Use a named button group for two to five related actions such as Undo and Redo, text formatting, or Save with alternate save actions. Use a segmented control for a single-choice setting, individual buttons for unrelated actions, and links for navigation.

## Gherkin scenarios

```gherkin
Feature: ki-button-group groups related actions
  Authors can place related actions in a spaced row, join them edge to edge,
  or present them as one stop in the keyboard tab order.

  # S1
  Scenario: Spaced groups keep actions separate
    Given an ordinary group with Undo and Redo actions
    When the group is displayed
    Then there is a visible gap between the independently operable actions

  # S2
  Scenario: Attached groups share an edge and a visual style
    Given an Undo button with the primary variant and small size followed by a Redo button
    When the group is displayed as attached
    Then the actions share an edge with square inner corners and rounded outer corners
    And both actions use the primary variant and small size

  # S3
  Scenario: An explicit group size applies to both kinds of button
    Given a group with a text Save action and an icon-only More save options action
    When the group size is set to large
    Then both actions are displayed at the large size

  # S4
  Scenario: The split trigger opens the menu of alternate actions
    Given an attached group with Save and a More save options menu trigger
    When the user activates More save options
    Then the connected menu opens without invoking Save
    And the focused trigger exposes a menu popup to assistive technology

  # S5
  Scenario: Tab re-enters a toolbar at its most recently focused action
    Given a formatting toolbar between two controls with Bold focused most recently
    When the user tabs into the toolbar again
    Then focus returns to Bold
    And the toolbar occupies a single stop in the tab order

  # S6
  Scenario Outline: Arrow keys move in visual order and wrap past unavailable actions
    Given a toolbar with direction "<direction>" and enabled Undo and Redo separated by a disabled and a hidden action
    And focus is on "<from>"
    When the user presses "<key>"
    Then focus moves to "<to>"

    Examples:
      | direction     | from | key        | to   |
      | left-to-right | Undo | ArrowRight | Redo |
      | left-to-right | Redo | ArrowRight | Undo |
      | left-to-right | Undo | ArrowLeft  | Redo |
      | right-to-left | Undo | ArrowLeft  | Redo |
      | right-to-left | Redo | ArrowRight | Undo |

  # S7
  Scenario Outline: Home and End focus the first and last available actions
    Given a formatting toolbar with available actions Bold, Italic and Underline
    And Italic is focused
    When the user presses "<key>"
    Then focus moves to "<action>"

    Examples:
      | key  | action    |
      | Home | Bold      |
      | End  | Underline |

  # S8
  Scenario: Turning off toolbar mode restores the authored tab order
    Given a toolbar with Undo and Redo actions that are ordinarily tab stops
    When the application turns off toolbar mode
    Then each action returns to the ordinary tab order

  # S9
  Scenario Outline: The group name identifies its role in either mode
    Given a group labeled "Formatting"
    When the group is displayed in "<mode>" mode
    Then assistive technology exposes a "<role>" named "Formatting"

    Examples:
      | mode    | role    |
      | spaced  | group   |
      | toolbar | toolbar |

  # S10
  Scenario: A toggle icon exposes its label and pressed state
    Given a formatting toolbar with a pressed toggle labeled "Bold"
    When the user moves keyboard focus to Bold
    Then the button is announced as "Bold" and pressed
    And a tooltip shows "Bold"

  # S11
  Scenario: Toolbar frame and separators follow the theme
    Given a toolbar with a vertical separator between formatting and list actions
    When the theme overrides its raised surface and separator inks
    Then the toolbar frame displays the themed surface
    And the separator uses the themed divider ink
```

## Scenario family coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4 | |
| Keyboard path | S5, S6, S7, S8 | |
| Assistive-tech outcome | S4, S9, S10 | |
| Form participation | | N/A. The group has no value or validity. Child buttons retain their own form behavior. |
| Theming | S2, S11 | |

## Requirements

- Require an author-provided label. Expose a named group by default and a named horizontal toolbar in toolbar mode.
- Accept direct `ki-button` and `ki-icon-button` children. Keep the actions independent in every mode. Forward an explicit group size to both button kinds.
- Join attached actions without a gap, square the inner corners and keep the outside corners rounded. Use the buttons’ exposed parts and logical edges.
- Make the first available toolbar action the initial tab stop. Retain the most recently focused action when it remains available. Arrow keys follow the visual order in the current writing direction and wrap. Home and End reach the first and last available actions in reading order. Keep Tab and Shift+Tab available for navigation outside the toolbar.
- Expose the supplied label for each icon-only action and show that label through `ki-tooltip`. Preserve the application-owned pressed state of toggles on their focusable buttons.
- Compose a split button from an attached text button and a labeled chevron icon button with menu popup semantics. The application connects the trigger to `ki-menu` and handles the selected action. The group itself declares no actions.
- Theme the toolbar frame, background and optional decorative background image, backdrop filter, gap, radius and separators through semantic aliases. Verify both themes and schemes in standard, contrast-more and reduced-transparency modes. Verify forced colours, reduced motion, RTL and coarse-pointer density in browsers.
- Discover the tag in the catalog and React, Vue and Angular wrappers. Keep the public contract documented and add spaced, attached, split and toolbar examples and visual gallery states.

## Decisions

- **Agent's choice, pending founder confirmation.** Attached mode adopts the first button's variant and its size when the group has no explicit size. Leaving attached mode, clearing the group size or removing a child restores the child's own settings wherever the group no longer supplies them.
- **Agent's choice, pending founder confirmation.** Toolbar navigation skips hidden and disabled actions, wraps at each end, uses logical reading order for Home and End, and uses physical left and right for the arrows. Leaving toolbar mode restores the authored tab order.
- **Agent's choice, pending founder confirmation.** Authors place optional separators in the default slot with a vertical separator role, as in the design reference. The toolbar styles them with its divider token and excludes them from its tab order.
- **Agent's choice, pending founder confirmation.** Keep menu opening and selection in the application. Exercise the split trigger with a connected menu fixture until the `ki-menu` dependency is integrated.
