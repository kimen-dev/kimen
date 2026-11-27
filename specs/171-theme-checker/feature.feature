Feature: Check Kimen theme CSS
  Theme authors and agents can correct token overrides before shipping them.

  # S1
  Scenario: An unknown default-size token gets a public replacement
    Given a theme declares "--ki-switch-md-track-width"
    When the author checks the stylesheet
    Then the finding identifies the file and line and suggests "--ki-switch-track-width" as an error

  # S2
  Scenario: Unitless zero gets a length fix
    Given a theme sets "--ki-button-label-padding-inline" to "0"
    When the author checks the stylesheet
    Then the checker reports an error and suggests "0px"

  # S3
  Scenario: An unread token yields an advisory
    Given a stylesheet whose only finding is an override of an unread public token
    When the author runs the theme checker
    Then the checker warns about the override and exits successfully

  # S4
  Scenario: A more-contrast override gets the mode token as a fix
    Given a theme overrides "--ki-text-supporting" inside the more-contrast media query
    When the author checks the stylesheet
    Then the checker reports an error and suggests "--ki-contrast-more-text-supporting"

  # S5
  Scenario: The Material 3 theme passes
    Given the Material 3 stylesheet built from Kimen's theme sources
    When the author runs the theme checker
    Then the checker returns no findings and exits successfully

  # S6
  Scenario: The MCP tool agrees with the command line
    Given a stylesheet with token mistakes and the same filename on both interfaces
    When the author checks it via MCP and the CLI
    Then both interfaces return the same findings in source order
