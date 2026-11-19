# Feature specification: Breadcrumb

**Issue** #392 · **Branch** `feat/392-ki-breadcrumb` · **Constitution** v2.0.0

Breadcrumbs show the path from the top of a hierarchy to the current page. Earlier levels lead to their destinations. An optional limit keeps the visible path short by putting the middle levels behind an overflow button.

## Acceptance and scope

- Render direct `ki-breadcrumb-item` children in document order in a named navigation landmark and ordered list. The last level exposes the current page as text. Ancestors with destinations are native links.
- Collapse only when the path exceeds its limit. Keep the first and last two levels visible and expose the hidden levels in order through the overflow menu. Use a localizable button name that announces the number of hidden levels.
- Open by pointer, Enter, Space, Down or Up. Focus starts at the first menu item, or the last for Up. Within the menu, Up and Down wrap, Home and End reach the edges, and typing a first character moves to a matching item. Escape closes and restores focus. Tab leaves the menu. Clicking outside dismisses it.
- Support the Kimen themes and schemes, contrast and transparency modes, forced colors, reduced motion, right-to-left layout and inherited target density. Draw decorative separators with CSS.
- Publish both tags in the catalog and generated React, Vue and Angular wrappers. Native links use the catalog's existing URL policy. There are no custom actions.

## Scenario families

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3 | — |
| Keyboard path | S4, S5 | — |
| Assistive-tech outcome | S6 | — |
| Form participation | N/A | Breadcrumbs are navigation and contribute no form value. |
| Theming | S7, S8, S9, S10 | — |

## Interpretations

- **Agent's choice, pending founder confirmation.** Use `max-items` as an overflow threshold with a minimum of four visible entries, including the overflow button. Round finite positive limits down and clamp to four. An omitted, non-positive or non-finite limit shows the full path.
- **Agent's choice, pending founder confirmation.** Infer the last level as current, including when it has an `href`. Accept the proposed `current` marker on the final level. The same marker on earlier levels leaves their link behavior intact.
- **Agent's choice, pending founder confirmation.** Item content supplies a plain-text label. A hidden item is omitted. An ancestor without a destination remains readable inline and appears as an unavailable menu item when collapsed.
- **Agent's choice, pending founder confirmation.** Expose the `more-label` template for localization using `{n}` as the placeholder. Follow the repository density contract so that `data-ki-density="touch"` provides 44 CSS pixel targets.
- **Agent's choice, pending founder confirmation.** Use a component-owned navigation menu backed by Kimen's anchored-overlay utilities. This branch has no shared Menu component and the reference Menu API describes command values. Hidden levels need native link destinations.

- **Agent's choice, pending founder confirmation.** Alias the ancestor foreground to the semantic supporting ink. It preserves medium emphasis in standard mode and reaches the contrast-more threshold.

## Gherkin

```gherkin
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
```
