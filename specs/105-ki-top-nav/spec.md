# TopNav (issue 357)

The application header groups a brand, up to five primary sections and
global actions. Use a sidebar for deeper navigation and tabs for in-page
views. Use the app-bar variant for a single screen's heading and controls.
Link and action destinations belong to the consuming app.

## Interpretations

- Agent's choice, pending founder confirmation. Measure available inline
  size on the component. Use the same threshold for compact title centering.
  Header sizes `lg` and `xl` fall back to `md`.
- Agent's choice, pending founder confirmation. Use the nearest vertical
  scrolling ancestor or the document for scroll behavior. Both scrolling
  modes tint the surface. Tall bars collapse after scrolling past the extra
  title-row height. Their reserved layout space keeps the scroll range stable.
- Agent's choice, pending founder confirmation. Expose localized menu labels
  as props. Use TopNav-owned anchored menus with Menu keyboard behavior
  because the shared Menu element is absent from the assigned branch.
  Position them with scoped CSS anchors and viewport flip fallbacks.
- Agent's choice, pending founder confirmation. Three direct actions stay
  visible and subsequent named buttons or links appear in overflow. The
  search slot replaces the visible heading in a one-row bar while keeping
  its heading available to assistive technology.
- Agent's choice, pending founder confirmation. Keep the document's skip
  link and the account trigger with the page author. Put the notification
  count in the button name as well as in its decorative Counter slot.

- Agent's choice, pending founder confirmation. Keep the HTML `title`
  attribute and use `screenTitle` for the framework property because Stencil
  reserves the native property name.
- Agent's choice, pending founder confirmation. Use supporting ink for
  ordinary links and subtitles. Its standard value is medium emphasis and
  the contrast-more mode strengthens it. Draw the current indicator as a
  logical border so forced colors can preserve the mark.
- Founder decision (2026-11-27, 0.6.0 feedback F2). With `collapse-at="none"`,
  the brand, links and actions share a row when they fit. If they run out of
  room, the brand and actions keep the first row, the links wrap across the
  full width below, and the bar grows to hold them. The DOM and Tab order
  both stay brand, links, actions. In the stacked layout, Tab reaches the
  visually earlier actions after the links.
- Flexbox detects the fit from the intrinsic widths of the three groups,
  including the themed column gap. The existing ResizeObserver reads the
  resulting flex lines and queues the visual reorder. The action width caps
  the brand so they can share the first row on very narrow bars. With a CSS
  length, the header stays a fixed-height row above the collapse point. An
  app bar with `none` has no compact title alignment.

- Agent's choice, pending founder confirmation. Record the measured MCP
  Apps and MCP server byte increases in the component budget metadata.
  The baseline is the starting commit `183f880`. Both builds used Node
  26.5.0 and matching dependency layouts. The values below are exact
  positive deltas for the whole artifacts.

  | Artifact | Raw bytes | Gzip bytes | Brotli bytes |
  | --- | ---: | ---: | ---: |
  | MCP Apps self-contained document | 23162 | 5790 | 4711 |
  | MCP server binary | 36465 | 8167 | 5630 |

## Scenario Family Coverage

| Family                 | Scenario IDs                            | N/A justification                                                        |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Core behavior          | S1, S2, S3, S4, S5, S6, S7, S20, S23–S25 |                                                                         |
| Keyboard path          | S8, S9, S10, S11, S21                   |                                                                          |
| Assistive-tech outcome | S12, S13, S14, S22                      |                                                                          |
| Form participation     | N/A                                     | TopNav owns no value. Slotted controls participate on their own terms.    |
| Theming                | S15, S16, S17, S18, S19, S26, S27       |                                                                          |

## Gherkin contract

```gherkin
Feature: TopNav
  An application header presents the brand, primary links and global actions.
  A screen app bar presents its heading, leading control and screen actions.

  # Family: core behavior
  # S1
  Scenario: A wide header presents the brand, five primary links and global actions
    Given a wide application header linking to Overview, Projects, Reports, Teams and Settings
    When the header appears
    Then the brand, five primary links and global actions are visible
    And Projects has a visible current-page indicator

  # S2
  Scenario: A narrow header moves the primary links into a menu
    Given a header narrower than its configured collapse point
    When the user opens navigation
    Then the menu presents the primary links in their authored order
    And the brand and global actions remain visible

  # S3
  Scenario: Additional screen actions appear in an overflow menu
    Given a screen app bar with five named actions
    When the user opens More actions
    Then the first three actions remain on the bar
    And the two remaining actions are available in the menu

  # S4
  Scenario: A wide title row collapses as its scroll container scrolls
    Given a sticky large screen app bar set to collapse
    When its scroll container scrolls down
    Then the bar shrinks to the medium height
    And the screen title remains visible in the main row

  # S5
  Scenario: The app bar can tint on scroll
    Given a sticky screen app bar with the default scroll behavior
    When its scroll container scrolls down
    Then the bar takes its scrolled surface color without changing height

  # S6
  Scenario: A compact screen can have a centered title
    Given a compact screen app bar with a leading button, one action and centered title alignment
    When the app bar appears
    Then the title is centered across the full bar

  # S7
  Scenario: Search occupies the main row of a search app bar
    Given a screen app bar with a search control and a screen title
    When the app bar appears
    Then the search control is usable in the main row
    And the screen heading remains available to assistive technology

  # S20
  Scenario: A header that never collapses wraps its links onto more lines
    Given a phone-width page with a header set never to collapse and more links than fit on one line
    When the header appears
    Then every link stays in the bar, wrapping onto further lines, with no navigation button
    And the page does not scroll horizontally

  # Family: keyboard path
  # S8
  Scenario: Escape returns focus from collapsed navigation
    Given the user opened collapsed navigation with the keyboard
    When the user presses Escape
    Then the menu closes and focus returns to Open navigation

  # S9
  Scenario: Arrow and boundary keys move among collapsed links
    Given collapsed navigation is open and Overview has focus
    When the user moves through the menu with the keyboard
    Then the arrows wrap and Home and End reach its boundaries
    And a letter key reaches a link with a matching name

  # S10
  Scenario: An overflow action is operable from the keyboard
    Given More actions is open and its Archive action has focus
    When the user activates Archive from the keyboard
    Then the authored action runs once and focus returns to More actions

  # S11
  Scenario: The page skip link bypasses the header
    Given a page whose first focusable element is its Skip to content link
    When the user activates the skip link
    Then focus lands at the start of the main content

  # S21
  Scenario: Tab follows wrapped links in their authored order
    Given a header set never to collapse whose links wrap onto more than one line
    When the user tabs from the brand to the global actions
    Then focus visits each primary link once, in authored order

  # Family: assistive-tech outcome
  # S12
  Scenario: Navigation exposes its landmark and current page
    Given a header labeled Main where Projects is current and Notifications has three unread items
    When the accessibility tree is queried
    Then the named navigation landmark exposes Projects as the current page
    And the notification button announces its unread count

  # S13
  Scenario: The collapsed menu is named by its trigger
    Given a collapsed header with a localized navigation trigger
    When the trigger opens the menu
    Then the trigger exposes its expanded state and controls the named menu
    And the current page is still identified

  # S14
  Scenario: The collapsed app bar exposes one heading and a named leading control
    Given a collapsible screen app bar with a Back button and a screen title set to heading level three
    When its scroll container scrolls down
    Then the title is exposed once as a level three heading
    And the leading button is named Back

  # S22
  Scenario: A header that never collapses exposes no disclosure
    Given a phone-width header set never to collapse where Projects is current
    When the accessibility tree is queried
    Then no navigation button or menu is exposed
    And the named navigation landmark exposes Projects as the current page

  # Family: form participation — N/A, TopNav contains navigation and actions and owns no field value

  # Family: theming
  # S15
  Scenario: The theme controls the app-bar surface and heading typeface
    Given a theme with a custom app-bar fill, background image, backdrop filter and heading family
    When a screen app bar appears
    Then its surface and heading use those theme values

  # S16
  Scenario: The header follows right-to-left reading order
    Given a right-to-left page with a brand, primary links and actions
    When a wide header appears
    Then the brand leads on the right and actions trail on the left

  # S17
  Scenario: Forced colors keep the current-page indicator visible
    Given a wide header with a current page and forced colors active
    When the header appears
    Then the current page is still marked by a visible bar

  # S18
  Scenario: Reduced motion makes a scroll collapse immediate
    Given a large collapsible bar with reduced motion active
    When its scroll container scrolls down
    Then the bar takes its compact layout without a transition

  # S19
  Scenario: A coarse pointer gets a touch-sized navigation trigger
    Given a narrow header on a page with a coarse pointer
    When the header appears
    Then the navigation trigger has a target of at least 44 by 44 pixels

  # Family: core behavior
  # S23
  Scenario: A phone-width header keeps its brand and actions above a full-width links row
    Given a 375 px header set never to collapse with the Gate-Driven Development brand, three primary links and a global action
    When the links cannot fit beside the brand
    Then the brand and action share the first row
    And the links occupy the full width below them

  # S24
  Scenario: Primary links stay readable as the header gets narrower
    Given a header set never to collapse with Documentación, Manifiesto and English as links
    When the header narrows
    Then each link stays fully visible and clear of the global action
    And the bar grows to hold the links without horizontal scrolling

  # S25
  Scenario: A header that never collapses keeps the existing layout when everything fits
    Given wide headers with the same brand, primary links and global action
    When one header uses a collapse point and the other never collapses
    Then the brand, links and action have matching positions and dimensions

  # Family: theming
  # S26
  Scenario: A theme can space the inline primary links apart
    Given a header showing its primary links outside the menu
    When the theme sets --ki-top-nav-links-gap
    Then the visible space between adjacent links follows that token

  # S27
  Scenario: A theme can align the primary links to the trailing edge
    Given a header showing its primary links outside the menu
    When the theme sets --ki-top-nav-links-justify to flex-end
    Then the inline links end next to the actions
    And links on their own row align to that row's trailing edge
```
