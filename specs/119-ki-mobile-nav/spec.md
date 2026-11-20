# Feature specification for ki-mobile-nav

**Branch** `feat/407-ki-mobile-nav` · **Issue** [#407](https://github.com/kimen-dev/kimen/issues/407)

Use a bottom navigation landmark for three to five top-level destinations in a phone app or narrow layout. Use buttons for actions and share the application's breakpoint with TopNav or Sidebar on wider layouts.

## Gherkin scenarios

```gherkin
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
```

## Scenario families

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3 | |
| Keyboard path | S4 | |
| Assistive-tech outcome | S5 | |
| Form participation | | Navigation links have no form value, validity or submission behavior. |
| Theming | S6, S7 | |

## Requirements

- Paint a fixed full-width bar with a top border by default, or an inset elevated pill in the floating variant. Respect the bottom safe-area inset.
- Give each destination a decorative icon, a visible label and a native link with a target at least 48 by 48 CSS pixels. The app supplies the current destination. The current icon has a pill and its link exposes `aria-current="page"`.
- Show positive unread counts using `ki-counter`. Include the full count in the anchor's accessible name and localize its suffix.
- Reserve enough space after page content for the bar and its bottom inset. Remove that reserve while the software keyboard hides the navigation.
- Provide semantic token aliases for component styling and register both tags in the catalog and framework wrappers.

## Interpretations

- **Agent's choice, pending founder confirmation.** The app controls the responsive breakpoint, whom it marks current and the number of direct destinations. A nav placed after content provides its own in-flow space for scroll clearance. Use a single instance per layout.
- **Agent's choice, pending founder confirmation.** MobileNav detects a reported software keyboard rectangle or a keyboard-sized loss in available height while an editable control has focus. Pinch zoom alone keeps the bar visible.
- **Agent's choice, pending founder confirmation.** Counter caps the painted value at `99+`. A localizable `count-label` template uses `{count}` for the full rounded count and defaults to `{count} new`.
- **Agent's choice, pending founder confirmation.** The landmark label defaults to `Main`. Navigation uses native anchors and the catalog's standard click binding when an action is declared.
- **Agent's choice, pending founder confirmation.** Use the supporting ink role for inactive labels. It matches medium-emphasis ink in standard mode and adapts in contrast-more.
