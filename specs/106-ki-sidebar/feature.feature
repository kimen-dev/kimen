Feature: Sidebar navigation for grouped application sections
  The sidebar presents routes and account access in a full navigation panel or icon rail.

  # S1
  Scenario: The expanded sidebar shows navigation and account content
    Given a sidebar with a brand, an Inbox count of 12 and an account trigger
    When the sidebar is displayed
    Then the brand, Inbox label and count are visible
    And the account trigger is at the foot

  # S2
  Scenario: A new sidebar restores the saved mode for its profile
    Given one profile has chosen the rail and another has no saved preference
    When the two profiles reopen their navigation
    Then the first profile sees the rail
    And the second profile sees the expanded sidebar

  # S3
  Scenario: The sidebar exposes one named navigation landmark with a labelled list
    Given navigation named "Main" with a Workspace group and a current Members link
    When assistive technology reads the navigation
    Then a single Main landmark contains a list named "Workspace"
    And the Members link is announced as the current page

  # S4
  Scenario: Space collapses the sidebar without losing focus
    Given the expanded sidebar's collapse button has focus
    When the user presses Space
    Then the focused button is named "Expand sidebar" and reports that it is collapsed
    And the sidebar reports the new collapsed state

  # S5
  Scenario: Focusing a rail item reveals its full label and count
    Given the rail's Inbox link has 12 new items
    When the user tabs to Inbox
    Then the link is named "Inbox, 12 new"
    And a tooltip shows the same text beside the dot-marked link

  # S6
  Scenario: Hovering a rail item reveals its full name
    Given the icon rail contains a Members link
    When the user hovers over Members
    Then a tooltip shows "Members"

  # S7
  Scenario: A theme can repaint the current item
    Given a sidebar with a current Home link
    When the theme overrides the current background and foreground tokens
    Then the Home link repaints both colors

  # S8
  Scenario: The rail centers items and mirrors the count marker
    Given an icon rail with 12 new items in Inbox
    When the page switches to right-to-left layout
    Then the Inbox icon remains centered
    And the dot sits at the link's inline end

  # S9
  Scenario: Coarse pointers get larger sidebar targets
    Given a sidebar on a coarse-pointer device
    When the user opens its icon rail
    Then the collapse control and links each retain a 44 pixel target at the default text size

  # S10
  Scenario: Changing an item count updates the meaning of the link
    Given a rail link named "Inbox, 12 new"
    When the application clears its unread count
    Then the link is named "Inbox"
    And the dot is absent

  # S11
  Scenario: Forced colors retain the current item and unread indicators
    Given an icon rail with a current Inbox link and 12 unread items
    When the operating system applies forced colors
    Then the current row and its unread dot remain distinguishable

  # S12
  Scenario: The rail appears without motion
    Given a visitor who prefers reduced motion
    When the visitor collapses the sidebar
    Then the navigation changes to rail width without an animation
