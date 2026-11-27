Feature: ki-link provides native navigation in Kimen interfaces

  # S1
  Scenario: An inline link navigates to a destination
    Given the text "Read the catalog contract" links to the catalog section
    When the reader activates the link
    Then the browser navigates to the catalog section

  # S2
  Scenario: Native download and browsing-context settings reach the link
    Given a link to "/report.csv" requests a download named "report.csv"
    And the link declares a browsing context and a relationship
    When the browser renders the link
    Then the native link carries the download, browsing context and relationship settings

  # S3
  Scenario: A keyboard reader can see focus and follow a link
    Given the "Catalog contract" link is next in the tab order
    When the reader tabs to it
    Then a visible focus ring identifies the link
    And Enter follows its destination

  # S4
  Scenario: An inline link exposes its text as its name
    Given a paragraph contains the link "Catalog contract"
    When assistive technology reads the paragraph
    Then it exposes a link named "Catalog contract"

  # S5
  Scenario: An external link announces its new tab
    Given the link "Source" is marked external
    When the browser renders the link
    Then the link opens in a new tab without access to its opener
    And an external-link icon marks it visually
    And assistive technology exposes a link named "Source (opens in a new tab)"

  # S6
  Scenario: Inline links are identified by a persistent underline
    Given a link appears inside running text
    When the reader views the text at rest
    Then the link is underlined and inherits the surrounding font size and weight

  # S7
  Scenario: Standalone links reveal their underline on hover
    Given a standalone link is configured to underline on hover
    When a hover-capable pointer rests on the link
    Then the link is underlined

  # S8
  Scenario: Primary and neutral ink follow the theme
    Given a themed page contains primary and neutral links
    When the theme changes its accent and body ink
    Then the links use the corresponding accent and body ink

  # S9
  Scenario: A standalone link remains recognizable and reachable on touch
    Given a standalone link is configured to underline on hover
    When the reader views it on a touch-only device
    Then the link is underlined
    And the target meets the coarse-pointer density minimum

  # S10
  Scenario: A guarded link uses the surface URL policy
    Given a guarded surface declares a link destination
    When the surface evaluates the link
    Then the existing URL policy determines whether the destination is allowed
    And the link declares no component actions

  # S11
  Scenario: A link places a custom icon after its text
    Given an external link with a trailing icon
    When the reader views the link
    Then the custom icon follows the text at the theme's icon size and gap
    And the external indicator follows the custom icon

  # S12
  Scenario Outline: A theme sets link weight and hover ink
    Given a <variant> link in a theme with custom link weight and <variant> hover ink
    When a hover-capable pointer rests on the link
    Then the link uses the custom weight and <variant> hover ink

    Examples:
      | variant |
      | primary |
      | neutral |
