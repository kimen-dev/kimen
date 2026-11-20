# Sidebar

**Issue** #358
**Branch** `feat/358-ki-sidebar`

Use the sidebar for more than five sections or for grouped navigation. Use top
navigation for a few sections and mobile navigation or a drawer on small screens.

## Behavior contract

```gherkin
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
    Given a sidebar in a touch-density region on a coarse-pointer device
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
```

## Scenario family coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S10 | |
| Keyboard path | S4, S5 | |
| Assistive-tech outcome | S3, S5, S6 | |
| Form participation | — | Sidebar navigation supplies no form value, and the collapse control is a non-submit button. |
| Theming | S7, S8, S9, S11, S12 | |

## Requirements

- Render one navigation landmark with optional brand and footer, top-level links,
  and lists named by their group headings.
- Use native links for destinations, expose the current page with `aria-current`,
  and use a native button with `aria-expanded` for collapse.
- Keep links and the toggle mounted when the sidebar changes mode. Announce
  counts as part of the link name and reveal that name in a tooltip in the rail.
- Style expanded and collapsed layouts with theme tokens, with logical placement
  for RTL and a larger target under coarse pointers.
- Register all three elements in wrappers and the neutral catalog. Use the
  established guarded URL policy for item destinations.
- See the [public contract](contracts/sidebar.md).

## Interpretations (agent's choice, pending founder confirmation)

- The application supplies an optional JavaScript `preference` property with a `storageKey` scoped to its profile and
  sidebar. The sidebar restores the saved value on initialization, persists
  user toggles and reports them through `ki-sidebar-change`. Without a key,
  the application can persist the event's state itself.
- `icon-name` follows the markup example and uses registered Kimen icons. The
  `start` slot overrides it. Without either, the rail shows the initial of the
  item label. An item without a destination is static content.
- Positive finite counts are rounded down, the complete count goes in the
  localized link name in both layouts, and nonpositive counts have no marker.
  Counter caps the painted pill at 99+, while the link name retains the full count.
- The rail uses the shipped tooltip. Direct imports register it alongside the
  Sidebar tags to keep the standalone composite within its bundle budget.
- The application supplies an accessible account trigger and owns the menu and
  the compact presentation of its footer content. The brand is shown in the
  expanded sidebar and hidden in the rail.
- Groups use level-two headings. The heading stays available to assistive
  technology when the sidebar is collapsed. The layout changes without
  animation.
- Resting items and group headings use semantic supporting ink. It matches
  medium-emphasis text in standard mode and strengthens it in contrast-more.
  Larger touch targets follow Kimen's opt-in region density.
