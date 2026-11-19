Feature: ki-counter marks new items on a trigger
  A decorative counter shows a count or presence while the surrounding application
  owns its accessible meaning.

  # S1
  Scenario: Positive counts show their value up to an inclusive cap
    Given counters for 3, 99 and 120 unread items
    When the screen displays those counts
    Then the counters read "3", "99" and "99+"

  # S2
  Scenario: A count disappears at zero
    Given a counter showing 3 unread items
    When the unread count becomes zero
    Then the counter is absent from the visible layout

  # S3
  Scenario: A presence dot takes precedence over a number
    Given Ana García's avatar has a success counter with a value of 3
    When the counter is set to dot mode
    Then a dot without digits sits at the avatar's block-end inline-end corner

  # S4
  Scenario: An external counter follows the trigger named by its ID
    Given an inbox link and an external counter targeting its ID
    When the link scrolls within its container
    Then the counter stays aligned to the link's block-start inline-end corner

  # S5
  Scenario: The notification button keeps its place in the tab order
    Given a notification button with a slotted counter followed by another button
    When the user tabs from the notification button
    Then focus moves directly to the next button

  # S6
  Scenario: The host label supplies the count and presence to assistive technology
    Given a notification button labeled "Notifications, 3 unread" and an avatar labeled "Ana García, online"
    When the screen exposes the hosts and their counters
    Then assistive technology receives the two host labels and no separate counter content

  # S7
  Scenario: The application announces an important count update once
    Given a notification button and a page-owned polite status region
    When another notification arrives
    Then the button's name and the status region report the new count
    And the counter supplies no additional live region

  # S8
  Scenario: A theme can repaint the counter surface and its digits
    Given a counter showing 3 unread items
    When the theme overrides the counter's background and foreground tokens
    Then the counter repaints both colors

  # S9
  Scenario: The counter follows the notification button's logical corner
    Given a notification button with a slotted count
    When the notification button is shown in right-to-left layout
    Then the counter overlaps the block-start inline-end corner
