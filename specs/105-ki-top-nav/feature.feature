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
