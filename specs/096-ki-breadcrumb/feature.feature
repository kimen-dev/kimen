Feature: ki-breadcrumb shows the path to the current page
  Ancestor links let users move up the hierarchy.
  A long path can keep the first and last two levels in view.

  # S1
  Scenario: The full path ends at the current page
    Given a path from Workspace through Projects to Settings
    When the breadcrumb renders without a limit
    Then Workspace and Projects are links in that order
    And Settings is the current page and is plain text

  # S2
  Scenario: The overflow menu reveals the middle levels in order
    Given the path Workspace, Projects, Kimen, Packages, Releases, Settings with a limit of four
    When the user opens the overflow menu
    Then the trail shows Workspace, the overflow button, Releases and Settings
    And the menu offers links to Projects, Kimen and Packages in that order

  # S3
  Scenario: The trail follows changes to the hierarchy
    Given an expanded path from Workspace through Projects to Settings
    When the host app appends Profile to the path
    Then Profile is the current page
    And Settings is an ancestor link when it has a destination

  # S4
  Scenario: The keyboard opens and navigates the overflow menu
    Given the overflow button for Projects, Kimen and Packages has focus
    When the user presses Enter
    Then the menu opens with focus on Projects
    And the other destinations are reachable by arrow keys

  # S5
  Scenario: Escape returns focus to the overflow button
    Given the overflow menu is open with focus on Kimen
    When the user presses Escape
    Then the menu closes and the overflow button has focus

  # S6
  Scenario: Assistive technology can identify the trail and collapsed levels
    Given a breadcrumb named "Project path" with three collapsed levels and Settings as its last level
    When the user explores the breadcrumb with assistive technology
    Then the breadcrumb is a named navigation landmark containing an ordered list
    And Settings is marked as the current page and separators are silent
    And the available menu is announced by the "Show 3 more levels" button with its collapsed state

  # S7
  Scenario: Theme overrides restyle the breadcrumb links
    Given an ancestor link in a breadcrumb with a custom foreground token
    When the breadcrumb renders
    Then the ancestor link uses the custom foreground color

  # S8
  Scenario: A right-to-left trail follows reading order
    Given a breadcrumb from Workspace through Projects to Settings in a right-to-left region
    When the breadcrumb renders
    Then the path starts at the right
    And the separators point toward the next level

  # S9
  Scenario: Touch density expands the interactive targets
    Given a breadcrumb with collapsed levels in a touch-density region
    When the breadcrumb renders on a coarse-pointer device
    Then its links and overflow button have targets of at least 44 by 44 CSS pixels

  # S10
  Scenario: The overflow is operable with forced colors and reduced motion
    Given a keyboard user with forced colors and reduced motion enabled
    When the user opens the overflow menu
    Then the focused destination has a visible focus indicator
    And the menu is displayed without animation
