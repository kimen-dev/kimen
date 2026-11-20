Feature: ki-toolbar groups the frequent actions of a page

  # S1
  Scenario: A floating toolbar arranges actions in a pill
    Given a toolbar labeled "Formatting" with Bold and Insert link
    When the toolbar is displayed
    Then both actions appear side by side in a pill

  # S2
  Scenario: A docked toolbar spans the bottom of the screen
    Given a docked toolbar with vertical orientation requested
    When the toolbar is displayed
    Then the surface spans the bottom edge and includes the bottom safe area
    And its actions are laid out horizontally

  # S3
  Scenario: A floating toolbar pairs with an independent primary action
    Given a floating toolbar with a Reply action in its FAB slot
    When the toolbar is displayed
    Then Reply appears beside the toolbar, outside its action group

  # S4
  Scenario: Scroll direction controls an opted-in toolbar
    Given a visible toolbar that hides on scroll and has no focused action
    When the page scrolls down
    Then the toolbar slides out of view

  # S5
  Scenario: Scrolling up brings back the toolbar
    Given a toolbar hidden by downward scrolling
    When the page scrolls up
    Then the toolbar returns to its original position

  # S6
  Scenario: Horizontal arrows move through available actions and wrap
    Given a horizontal toolbar with Bold, a divider, disabled Italic and Insert link
    When the user presses Right Arrow from Insert link
    Then focus wraps to Bold

  # S7
  Scenario: Vertical toolbars follow Up and Down Arrow
    Given a vertical toolbar with Zoom in followed by Zoom out
    When the user presses Down Arrow from Zoom in
    Then focus moves to Zoom out

  # S8
  Scenario Outline: Home and End reach the toolbar boundaries
    Given a toolbar with Bold, Italic and Insert link and focus on Italic
    When the user presses <key>
    Then focus moves to <action>

    Examples:
      | key  | action      |
      | Home | Bold        |
      | End  | Insert link |

  # S9
  Scenario: Only the current toolbar action is in the Tab sequence
    Given a toolbar whose Insert link action was last focused
    When the user tabs into the toolbar
    Then focus lands on Insert link
    And the remaining toolbar actions are skipped in the Tab sequence

  # S10
  Scenario: Keyboard focus brings back a toolbar hidden on scroll
    Given a toolbar hidden by downward scrolling
    When the user tabs into the toolbar
    Then the focused action and the toolbar are visible immediately

  # S11
  Scenario: The toolbar and its toggle expose their semantics
    Given a toolbar labeled "Formatting" with a named Bold toggle
    When the user activates Bold with Space
    Then assistive technology exposes a toolbar named "Formatting"
    And Bold is exposed as a pressed button

  # S12
  Scenario: A vibrant toolbar accepts a themed color pair
    Given a vibrant toolbar with a custom vibrant background and foreground
    When the toolbar is displayed
    Then its surface uses the custom background and foreground

  # S13
  Scenario: Right-to-left toolbars follow visual order
    Given a horizontal right-to-left toolbar with Bold followed by Insert link
    When the user presses Left Arrow from Bold
    Then focus moves to Insert link to its left

  # S14
  Scenario: Forced colors preserves the toolbar edge
    Given a toolbar under the system forced-colors preference
    When the toolbar is displayed
    Then the toolbar has a visible system-colored edge

  # S15
  Scenario: Reduced motion removes the scroll transition
    Given a toolbar that hides on scroll under the reduced-motion preference
    When the page scrolls down
    Then the toolbar disappears without a slide animation

  # S16
  Scenario: Toolbar actions follow the selected touch density
    Given touch density and a toolbar with Kimen icon buttons on a coarse pointer
    When the toolbar is displayed
    Then each icon button offers a target at least 44 by 44 pixels

  # S17
  Scenario: Docked toolbars reserve the bottom edge for their action group
    Given a docked toolbar supplied with a separate FAB
    When the toolbar is displayed
    Then only its default actions are exposed

  # S18
  Scenario: A changed action group still has a reachable entry point
    Given a toolbar where Bold is the current action and Insert link is available
    When Bold becomes disabled
    Then Insert link becomes the toolbar's tab stop
