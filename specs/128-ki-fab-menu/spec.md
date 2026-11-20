# Feature specification · Floating action menu

**Branch** `feat/415-ki-fab-menu`  
**Issue** #415  
**Sources** Issue #415, the FabMenu reference preview, and the shipped FAB and Menu contracts.

Use the menu when a screen has two to six related actions that share one floating entry point. Label the menu for the task it groups and give each item a visible action label.

## Gherkin scenarios

```gherkin
Feature: Floating action menu
  A floating action button reveals a short stack of related actions above it.

  # S1
  Scenario: The floating button opens and closes the stack
    Given the closed "Create" menu contains "New message" and "New event"
    When the user clicks Create
    Then the actions appear above a "Close menu" button
    And the page receives one open notification

  # S2
  Scenario: Choosing an action closes the stack
    Given the "Create" menu is open with a "New message" action valued "message"
    When the user selects New message
    Then the page receives the selection "message" and one close notification
    And focus returns to Create

  # S3
  Scenario: The scrim dismisses the menu
    Given the "Create" menu is open with its scrim enabled
    When the user clicks the scrim
    Then the actions and the scrim disappear and focus returns to Create

  # S4
  Scenario: The stack shows at most six actions
    Given the "Create" menu has seven actions in document order
    When the menu opens
    Then only the first six actions are available

  # S5
  Scenario: The trigger is unavailable with fewer than two actions
    Given the "Create" menu has only one action
    When the menu appears
    Then the Create button is disabled and no actions are shown

  # S6
  Scenario Outline: Opening from the trigger places focus at a menu edge
    Given the closed "Create" menu button is focused
    When the user presses <key>
    Then the menu opens and focus moves to <action>

    Examples:
      | key       | action      |
      | Enter     | New message |
      | Space     | New message |
      | ArrowDown | New message |
      | ArrowUp   | New event   |

  # S7
  Scenario Outline: Vertical navigation moves among the actions
    Given the menu is open with focus on <start>
    When the user presses <key>
    Then focus moves to <destination>

    Examples:
      | start       | key       | destination |
      | New message | ArrowDown | New event   |
      | New event   | ArrowDown | New message |
      | New message | ArrowUp   | New event   |
      | New event   | Home      | New message |
      | New message | End       | New event   |

  # S8
  Scenario: Escape restores focus to the menu button
    Given the "Create" menu is open with focus on New message
    When the user presses Escape
    Then the menu closes and focus returns to Create

  # S9
  Scenario Outline: Tab leaves the menu in the page's focus order
    Given the "Create" menu is open between the First and Last page controls
    When the user presses <key> from an action
    Then the menu closes and focus moves to <destination>

    Examples:
      | key       | destination |
      | Tab       | Last        |
      | Shift+Tab | First       |

  # S10
  Scenario: A link action navigates to its destination
    Given the open menu has focus on "New event" linked to "#new-event"
    When the user presses Enter
    Then the browser navigates to "#new-event" and the menu closes

  # S11
  Scenario: Assistive technology can identify the menu and its actions
    Given a closed menu named "Create" with button and link actions
    When the user opens the menu
    Then the trigger exposes an expanded menu popup and controls the "Create" menu
    And the menu owns the "New message" and "New event" menu items

  # S12
  Scenario: The open trigger uses the primary color pair
    Given a "Create" menu with a surface trigger and a theme with a custom primary FAB color pair
    When the menu opens
    Then the close button uses the primary pair and items use the menu's item color pair

  # S13
  Scenario: The stack follows the logical edge in right-to-left layouts
    Given a right-to-left page with a fixed "Create" menu
    When the menu opens
    Then the trigger sits at the bottom left and the actions stack above its left edge

  # S14
  Scenario: Forced colors preserve the action boundaries and keyboard focus
    Given the system forces its color palette
    When the user opens the "Create" menu with the keyboard
    Then the trigger and first action have visible edges and the action has a visible focus indicator

  # S15
  Scenario: Reduced motion allows the stack to open immediately
    Given the user requests reduced motion
    When the user opens the "Create" menu
    Then the actions appear without animation

  # S16
  Scenario: Coarse pointers retain roomy action targets at compact density
    Given a coarse-pointer device displays the "Create" menu at compact density
    When the user opens the menu
    Then the trigger and actions each have a target at least 56 pixels wide and high
```

## Scenario family coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1–S5 | |
| Keyboard path | S6–S10 | |
| Assistive-tech outcome | S11 | |
| Form participation | N/A | The actions are commands and native links. Buttons use `type="button"` and the component contributes no form value. |
| Theming | S12–S16 | |

## Requirements

- Pair an icon FAB with an upward stack in document order, aligned at logical inline end. Support static and fixed placement and the three FAB variants. The open trigger uses primary styling and a decorative close glyph.
- Provide the named menu and its relationship to the native button. Keep menu items out of the page's tab sequence and support keyboard activation, wrapping arrows, Home, End, Escape and Tab. Preserve normal link navigation.
- Enable the page scrim by default. Dismiss through the trigger, scrim, selection, Escape or focus leaving the menu. Respect reduced motion, forced colors, viewport direction and pointer density.
- Emit `ki-open` and `ki-close` on state changes and `ki-select` with `{ value }` on activation. Publish both elements through the catalog and wrappers.
- Expose menu item and scrim surface tokens, including optional background images and backdrop filters. Use semantic aliases and the shipped FAB tokens for the trigger.

## Interpretations

Each item is an agent's choice, pending founder confirmation.

1. Use the shipped FAB defaults of secondary and static. The component owns a native button so the trigger and its controlled menu share one shadow root. The internal plus and close glyphs ship with the component. Supply `close-label` to localize the open trigger's default "Close menu".
2. A blank `href` produces a button. An optional `value` provides a stable selection identifier. Its fallback is the trimmed visible label. Keyboard activations on links preserve the native destination.
3. Count visible direct item children in document order. The first six can be used. Fewer than two disable the trigger and close an already open menu. An initially open menu focuses its first item without emitting a mount notification. Programmatic state changes emit the same lifecycle events as user changes.
4. Follow Menu's trigger ArrowUp and ArrowDown, wrapping vertical navigation, Home, End and Tab conventions. Open and close immediately, matching the reference preview.
5. Use the existing high-emphasis overlay as the scrim, including its theme opacity. Static placement requires block-start clearance for the action stack. Fixed placement reuses the FAB inset and mobile navigation reservation.
6. The catalog binds the parent action to `ki-select`. Command items expose a local, non-bubbling `ki-select` for distinct catalog action IDs. Link items use native navigation and the existing URL policy.
7. Measure the two tags together for the component budget. Record only the measured MCP server growth of 26,162 raw bytes and 4,396 gzip bytes against the same-dependency build of `8879dbb`. The existing Brotli allowance has headroom.
