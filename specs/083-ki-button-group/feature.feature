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
