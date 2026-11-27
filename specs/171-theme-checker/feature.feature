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
  Scenario: Only unread component tokens yield advisories
    Given a theme overrides semantic, primitive and component tokens that Kimen does not read
    When the author runs the theme checker
    Then the checker warns about the component override and exits successfully

  # S4
  Scenario: A more-contrast override gets the mode token as a fix
    Given a theme overrides "--ki-text-supporting" inside the more-contrast media query
    When the author checks the stylesheet
    Then the checker reports an error and suggests "--ki-contrast-more-text-supporting"

  # S5
  Scenario: Material 3 follows the same rules as any theme
    Given Kimen's built Material 3 stylesheet and a copy with an extra comment
    When the author runs the theme checker
    Then neither version reports errors or warnings

  # S6
  Scenario: Every interface reports the same findings
    Given a stylesheet with token mistakes and the same filename on all interfaces
    When the author checks it via MCP, the CLI and the function export
    Then all three interfaces return the same findings in source order

  # S7
  Scenario: Palette, primitive and aliased tokens pass their unread checks
    Given a theme overrides unused palette and primitive tokens and a component token read through an alias
    When the author checks the stylesheet
    Then the checker returns no findings

  # S8
  Scenario: The installed checker has a Kimen-specific command
    Given the @kimen/tokens package is installed
    When the author looks up its executable
    Then kimen-tokens is the package's only command

  # S9
  Scenario: Clearly incompatible color values get a type error
    Given a theme assigns CSS colors, substitutions, and incompatible literals to a color token
    When the author checks the stylesheet
    Then only the incompatible literals produce type errors
