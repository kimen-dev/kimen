Feature: Mobile navigation keeps the main destinations visible
  A phone layout offers three to five labeled destinations in a bottom bar.

  # S1
  Scenario: The default bar shows the destinations at the bottom edge
    Given a mobile layout with five destinations and Home as the current page
    When the navigation is displayed
    Then the bar spans the bottom edge of the viewport
    And all five destinations show their labels and have targets at least 48 by 48 pixels

  # S2
  Scenario: The floating bar leaves room for the end of the page
    Given a scrollable page with floating navigation after its content
    When the reader scrolls to the end of the page
    Then the bar is inset from the sides and bottom of the viewport
    And the final content can scroll clear of the bar

  # S3
  Scenario: The software keyboard temporarily hides the bar
    Given a mobile layout with a text field and visible navigation
    When entering text opens the software keyboard
    Then the navigation is hidden while the keyboard is open
    And it is available again as soon as the keyboard closes

  # S4
  Scenario: Destinations use the native keyboard path
    Given Home, Search and Inbox are available in that order
    When the reader uses Tab and Shift+Tab through the bar and presses Enter on Inbox
    Then focus follows the destination order and reverses with Shift+Tab
    And the Inbox destination opens

  # S5
  Scenario: The landmark, current page and unread count are announced
    Given navigation labeled "Main" with Home current and three new items in Inbox
    When a reader inspects the navigation with assistive technology
    Then it exposes a navigation landmark named "Main"
    And the links identify Home as the current page and announce "Inbox, 3 new"

  # S6
  Scenario: The current destination remains recognizable when the display is adapted
    Given a themed bar with Home as the current destination
    When the reader uses a theme override, forced colours or reduced motion
    Then the current icon remains visibly distinguished from the other icons
    And the bar uses no animation

  # S7
  Scenario: Right-to-left order and touch targets are preserved
    Given five destinations in a right-to-left phone layout
    When a reader uses a coarse pointer
    Then the first destination is at the inline start
    And every link remains at least 48 by 48 pixels
