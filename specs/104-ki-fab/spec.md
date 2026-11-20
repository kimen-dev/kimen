# Feature specification · Floating action button

**Branch** `feat/401-ki-fab`  
**Issue** #401  
**Sources** Issue #401 and the design system FAB README and preview. The current repository governs token names and conventions.

## User scenarios

The FAB provides the single primary action for a screen, especially on mobile. The default icon-only action stays compact. An extended FAB also presents its label. A fixed FAB can sit in the block-end inline-end corner after the main content in document order. Secondary, destructive, and already-visible primary actions belong in the page's ordinary action controls.

## Gherkin scenarios

```gherkin
Feature: Floating action button
  The primary action of a screen remains easy to reach as an icon or a labeled control.

  # Family: core behavior
  # S1
  Scenario Outline: An icon FAB uses the selected square size
    Given a FAB named "Compose" with a pencil icon and <size>
    When the FAB appears
    Then the icon-only control is <width> pixels square

    Examples:
      | size        | width |
      | no size     | 56    |
      | size "lg"   | 80    |
      | size "xl"   | 96    |

  # S2
  Scenario: An extended FAB can use a supplied icon
    Given an extended FAB named "Compose" with a pencil icon name and a supplied plus icon
    When the FAB appears
    Then the plus icon and the text "Compose" are visible in the control in place of the pencil icon

  # S3
  Scenario: Pointer activation bubbles one native click
    Given a FAB named "Compose" on an application page
    When the user clicks the FAB
    Then the application observes one native click from the FAB

  # S4
  Scenario: Scrolling down compacts a focused extended FAB
    Given a focused extended FAB named "Compose" set to collapse on page scroll
    When the user scrolls down the page
    Then the FAB becomes icon-only
    And the same control keeps focus and the name "Compose"

  # S5
  Scenario: Scrolling up restores the extended FAB
    Given a FAB named "Compose" compacted by downward page scrolling
    When the user scrolls up the page
    Then the text "Compose" becomes visible next to the icon

  # S6
  Scenario: The last item can scroll clear of a fixed FAB
    Given a left-to-right page that reserves bottom space for its mobile navigation and fixed "Compose" FAB
    When the user scrolls to the end of the page
    Then the FAB sits above the navigation at the bottom right of the viewport
    And the last content item can be reached above the FAB

  # Family: keyboard path
  # S7
  Scenario Outline: The action button supports native keyboard activation
    Given the "Compose" FAB is in the sequential focus order
    When the user tabs to it and activates it with <key>
    Then the FAB shows visible focus and the application observes one click

    Examples:
      | key   |
      | Enter |
      | Space |

  # S8
  Scenario: The link FAB has a native destination and supports Enter
    Given a focused FAB link named "Projects" with the destination "#projects"
    When the user presses Enter
    Then the browser navigates to "#projects"

  # Family: assistive-tech outcome
  # S9
  Scenario: The control has a name and a decorative glyph
    Given an icon-only FAB labeled "Compose" with a supplied glyph named "Pencil"
    When assistive technology encounters the FAB
    Then it exposes one button named "Compose" and no separate icon

  # S10
  Scenario: Fixed placement preserves the order of page controls
    Given a page with a fixed "Compose" FAB written after the main content
    When the user traverses the controls with Tab
    Then the FAB follows the controls in the main content

  # Family: theming
  # S11
  Scenario: Theme tokens set the default fill and ink
    Given a theme that changes the low-emphasis primary surface and its paired text color
    When an extended FAB appears with the default variant
    Then its background and text use the replacement colors

  # S12
  Scenario: Fixed placement follows the inline end in right-to-left layouts
    Given a right-to-left page with a fixed "Compose" FAB
    When the FAB appears
    Then the FAB sits at the bottom left of the viewport

  # S13
  Scenario: With reduced motion the change to icon-only is immediate
    Given an extended FAB set to collapse on page scroll and reduced motion is requested
    When the user scrolls down the page
    Then the FAB shows just its icon without a shrink animation

  # S14
  Scenario: Compact density preserves a roomy touch target
    Given a FAB in compact density on a coarse-pointer screen
    When the FAB appears
    Then its target measures at least 56 by 56 pixels

  # S15
  Scenario: Turning off scroll collapse restores the label
    Given an extended FAB compacted by downward scrolling
    When the page disables collapse on scroll
    Then the label becomes visible and stays visible during subsequent scrolling

  # S16
  Scenario: Forced colors preserve the control and its focus indication
    Given the "Compose" FAB has keyboard focus
    When the system forces its color palette
    Then the FAB has a visible edge, readable content and a visible focus indicator
```

## Scenario family coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1–S6, S15 | |
| Keyboard path | S7, S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | N/A | The action has no form value. Its native button is type="button" and its link navigates. |
| Theming | S11–S14, S16 | |

## Requirements

- Render a native button or an anchor with `href`. Require a descriptive `label`, which remains the accessible name throughout the FAB's life. Expose one native `click` to listeners and the catalog action binding.
- Use the `icon` slot when supplied and `icon-name` otherwise. Treat the glyph as decorative. Show the visible label only in the extended, expanded state.
- Support `md`, `lg` and `xl` (56, 80 and 96 pixels at the default root size), `primary`, `secondary` and `surface` variants, and `static` or `fixed` placement. Use semantic aliases for fill, text, elevation, geometry, typography and motion. Include optional background-image and backdrop-filter tokens with `none` defaults.
- Opt into document scroll collapse only when both `extended` and `collapse-on-scroll` are set. Collapse on downward movement, expand on upward movement and preserve the control and its focus.
- For fixed placement, keep document order and clear the reserved mobile navigation height and safe-area inset. The page reserves clearance after the last item and uses its own scroll container or viewport scroll padding as appropriate.
- Publish the types, slot and native activation event in the generated API and catalog and generate React, Vue and Angular wrappers. Cover the theme and scheme matrix in discovery-driven visual galleries.

## Interpretation decisions

Each item is an agent's choice, pending founder confirmation.

1. Scroll collapse watches the owner document's viewport. A component starts expanded, bounds scroll positions to the document range, and restores the label when either opt-in is cleared. Nested scroll regions keep their own scrolling behavior.
2. Fixed positioning uses a 16px logical edge offset and an inherited `--ki-fab-mobile-nav-block-size` reservation, which excludes the bottom safe area and defaults to zero. A page with mobile navigation supplies its visible height. The page controls content clearance.
3. A provided decorative icon slot overrides the name fallback. The application registers named Lucide glyphs via the existing per-icon imports. The public CSS parts are `control`, `icon` and `label`.
4. Reduced motion makes the change immediate. Regular motion transitions the label and spacing without replacing the focused native element.
5. Use the current `surface.s1` alias for the raised variant. The sizes remain constant under coarse pointer and compact density.
6. Hover follows the issue's elevation step. Optional background imagery stays theme-controlled.
