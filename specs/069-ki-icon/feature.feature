Feature: ki-icon displays an imported Lucide glyph

  # S1
  Scenario: Display a named glyph
    Given the application imports circle-check and triangle-alert
    When the icon name changes from circle-check to triangle-alert
    Then the warning glyph replaces the check glyph

  # S2
  Scenario: Keep illustrations outside the tab order
    Given a labelled and a decorative icon between two controls
    When the user tabs from the first control
    Then focus moves to the second control

  # S3
  Scenario: Name only meaningful icons
    Given the application imports triangle-alert and circle-check
    When the page displays triangle-alert with label "Warning" and circle-check without a label
    Then assistive technology exposes a single image named "Warning"

  # S4
  Scenario: Keep icons out of submitted form data
    Given a form with an icon named circle-check next to an input named status
    When the form data is collected
    Then it contains the status field alone

  # S5
  Scenario: Size and colour follow the surrounding theme
    Given a theme overrides the small icon size and stroke width
    When the page displays a small circle-check in a success ink
    Then the glyph uses the overridden size and stroke width and the surrounding ink

  # S6
  Scenario: Report unavailable names on a guarded surface
    Given the guarded surface imports circle-check alone
    When a surface requests an unimported or unknown icon name
    Then the surface draws no requested icon and reports the unavailable name

  # S7
  Scenario: Leave unavailable standalone icons empty
    Given a page uses an icon with a name unavailable to the application
    When the page is displayed
    Then that icon has no glyph or accessible image and requests no external asset

  # S8
  Scenario: Use a named glyph from A2UI
    Given an A2UI surface declares an Icon with name "check"
    When the adapter translates the surface
    Then the result names the check glyph on a ki-icon

  # S9
  Scenario: Preserve the glyph across user media preferences
    Given a labelled circle-check with the inherited size in a right-to-left row
    When the row is displayed with forced colours, reduced motion and coarse-pointer density
    Then the glyph follows the forced ink, keeps its size and shape, and does not animate

  # S10
  Scenario: Ship only the glyphs selected by the application
    Given an application imports circle-check and the alert-triangle alias
    When the production bundle displays the page
    Then the imported glyphs appear and the bundle excludes the rest of the icon set

  # S11
  Scenario: Keep guarded icons passive
    Given a guarded surface imports circle-check and declares an action
    When the surface attaches that action to circle-check
    Then the surface reports that the icon cannot dispatch actions

  # S12
  Scenario: Audit the four icon gallery appearances
    Given the icon gallery has a visual suite for both schemes
    When release verification checks expected captures
    Then the audit requires onmars and Material 3 in both light and dark

  # S13
  Scenario: Keep the stock MCP surface and server in agreement
    Given the stock MCP surface has selected circle-check
    When a spec names circle-check or the unselected house
    Then the server and packaged surface accept circle-check and diagnose house

  # S14
  Scenario: Offer specs only the selected glyphs, never a component's own
    Given the stock MCP surface has selected circle-check and its components draw x and triangle-alert
    When a spec names circle-check, x or triangle-alert
    Then the server and packaged surface accept circle-check
    And both reject x and triangle-alert with the unavailable-icon issue
    And a component's icon-name prop is held to the same selection
