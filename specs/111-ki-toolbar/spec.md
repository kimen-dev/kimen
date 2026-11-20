# Feature Specification: Toolbar

**Branch** `feat/402-ki-toolbar` · **Issue** #402

A toolbar brings the frequent actions of the current page together on a named
surface. Floating toolbars can be horizontal or vertical and can accompany a
FAB. Docked toolbars span the bottom edge of a compact page. The existing
controls keep their own activation and accessible state.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S17 | |
| Keyboard path | S6, S7, S8, S9, S10, S18 | |
| Assistive-tech outcome | S11 | |
| Form participation | | A toolbar groups actions. It has no form value, validity or reset behavior. |
| Theming | S12, S13, S14, S15, S16 | |

## Interpretations

Each interpretation is an agent's choice, pending founder confirmation.

- Floating provides an intrinsic pill surface. The page chooses where to place it over content. Docked fixes a horizontal surface to the viewport's bottom edge.
- The FAB slot is floating-only, following the slot description and the design-system preview. It lives outside the named action group, has its own Tab stop and follows the group in the layout. In a vertical pair it sits below the group.
- Scroll hiding tracks the page's vertical scroll. An upward scroll or focus entering the toolbar or its FAB reveals it. Focus within the pair keeps it visible. The option starts off.
- The default slot participates in roving focus through directly slotted Kimen buttons, icon buttons and native buttons. Native disabled, hidden and inert controls are skipped. Focusable ARIA-disabled controls retain their own accessibility behavior. Arrow navigation wraps and respects horizontal text direction.
- The branch base has no shipped FAB, ButtonGroup or toggle extension for IconButton. The implementation uses the shared keyboard helpers and leaves activation with the child. The gallery and executable browser fixtures represent the FAB slot and toggle behavior with existing controls until those issues land.

## Gherkin

```gherkin
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
```
