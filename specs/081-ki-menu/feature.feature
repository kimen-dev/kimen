Feature: Menu runs actions from an anchored popup
  An action menu supports grouped commands and checkable choices.

  # S1
  Scenario: Selecting an action dismisses the menu
    Given the Actions menu is open
    When the user selects Rename
    Then the menu reports the value "rename" and closes

  # S2
  Scenario: A checkbox action stays open
    Given Pin to sidebar is checked and the menu is open
    When the user activates Pin to sidebar
    Then the menu reports "pin" as unchecked and stays open

  # S3
  Scenario: A radio action replaces the group's selection
    Given Compact is selected in the View group
    When the user selects Comfortable in that group
    Then the menu reports "comfortable" as checked and closes
    And Compact is unchecked

  # S4
  Scenario: A pointer can dismiss the menu from outside
    Given the Actions menu is open
    When the user clicks another control outside it
    Then the menu closes and that control receives focus

  # S5
  Scenario Outline: Trigger keys open the menu at an edge
    Given the closed Actions trigger is focused
    When the user presses <key>
    Then the menu opens with focus on <action>

    Examples:
      | key       | action |
      | Enter     | Rename |
      | Space     | Rename |
      | ArrowDown | Rename |
      | ArrowUp   | Delete |

  # S6
  Scenario Outline: Navigation moves through the menu actions
    Given the open menu has focus on <start>
    When the user presses <key>
    Then focus moves to <end>

    Examples:
      | start  | key       | end       |
      | Delete | ArrowDown | Rename    |
      | Rename | ArrowUp   | Delete    |
      | Rename | ArrowDown | Move to…  |
      | Delete | Home      | Rename    |
      | Rename | End       | Delete    |
      | Rename | p         | Pin to sidebar |

  # S7
  Scenario Outline: Activation keys select the focused action
    Given the open menu has focus on Rename
    When the user presses <key>
    Then the menu reports the value "rename" and closes

    Examples:
      | key   |
      | Enter |
      | Space |

  # S8
  Scenario: Escape returns focus to the trigger
    Given the open Actions menu has focus on Delete
    When the user presses Escape
    Then the menu closes and focus returns to the Actions trigger

  # S9
  Scenario Outline: Tab exits relative to the trigger
    Given focus is on an action in the open menu
    When the user presses <key>
    Then the menu closes and focus moves to <destination>

    Examples:
      | key       | destination         |
      | Tab       | the next control    |
      | Shift+Tab | the prior control   |

  # S10
  Scenario: Opening a filterable menu starts in the filter
    Given the Actions menu has a filter named "Filter actions"
    When the user opens the menu
    Then focus is in the "Filter actions" field

  # S11
  Scenario: Filtering announces the number of matches
    Given the "Filter actions" field is focused
    When the user types "PIN"
    Then Pin to sidebar is the only available action
    And a polite status reports one match

  # S12
  Scenario: Arrow Down moves from the filter to a match
    Given the filter has matched only Pin to sidebar
    When the user presses ArrowDown in the filter
    Then focus moves to Pin to sidebar

  # S13
  Scenario: A disabled action can be discovered without running
    Given the open Actions menu has focus on disabled Move to…
    When the user tries to activate Move to…
    Then the menu stays open and reports no selection
    And assistive technology exposes Move to… as disabled

  # S14
  Scenario: The trigger and menu expose their relationship
    Given the Actions trigger is associated with a grouped menu
    When the user opens the menu
    Then the trigger exposes a menu popup, its expanded state and the controlled menu
    And the menu exposes the Edit group and its checkable actions

  # S15
  Scenario: The menu surface follows the theme
    Given the raised surface semantic token has been reassigned
    When the user opens the menu
    Then the popup uses the reassigned surface color

  # S16
  Scenario: The menu flips when the preferred side has no room
    Given the Actions trigger is near the bottom of the viewport
    When the user opens the menu with bottom-start placement
    Then the menu appears above the trigger within the viewport

  # S17
  Scenario: The menu aligns to the logical inline edge
    Given the Actions trigger is on a right-to-left page
    When the user opens the menu with bottom-start placement
    Then the menu aligns to the trigger's right edge
