Feature: A compact density for dense regions
  Any element can declare a compact density for its region: controls and
  rows get shorter and container spacing gets tighter, text and icons keep
  their size, and no interactive target ever drops below 24 by 24 CSS pixels.

  # S1
  Scenario: A compact region shortens its controls
    Given an onmars page with a medium button "Save" and a text field "Email" inside a region
    When the region declares the density "compact"
    Then the button and the text field inside the region measure 32px tall
    And the same controls outside the region keep 40px

  # S2
  Scenario: A compact region tightens container spacing
    Given an onmars page with a card "Invoice" inside a region
    When the region declares the density "compact"
    Then the card body padding shrinks from 16px to 12px

  # S3
  Scenario: Compact keeps text and icon sizes
    Given an onmars page with a medium button "Save" with a leading icon inside a region
    When the region declares the density "compact"
    Then the label font size and the icon size are the same as outside the region

  # S4
  Scenario: No interactive target shrinks below 24 by 24 pixels
    Given an onmars page with an extra-small button "Undo" and an extra-small icon button "Close" inside a region
    When the region declares the density "compact"
    Then both measure at least 24 by 24 CSS pixels

  # S5
  Scenario Outline: Every interactive component meets the minimum target in compact
    Given a <theme> page with every interactive component in every size inside a region
    When the region declares the density "compact"
    Then every interactive target measures at least 24 by 24 CSS pixels

    Examples:
      | theme     |
      | onmars    |
      | material3 |

  # S6
  Scenario: Compact follows the active theme's own sizes
    Given a material3 page with a text field "Email" inside a region
    When the region declares the density "compact"
    Then the text field measures 40px tall instead of its standard 48px

  # S7
  Scenario: A nested region can return to the default density
    Given a compact region with a medium button "Save"
    When a region nested inside it declares the density "default"
    Then a medium button inside the nested region measures 40px tall
    And the button "Save" between the two regions keeps 32px

  # S8
  Scenario: A themed region inside a compact region stays compact
    Given an onmars page with a compact region
    When a region nested inside it declares the theme "material3"
    Then a text field inside the nested region measures 40px tall

  # S9
  Scenario: The whole page can be compact
    Given an onmars page with a medium button "Save" in its body
    When the page root declares the density "compact"
    Then the button measures 32px tall

  # S10
  Scenario: Without a declaration every component keeps its standard dimensions
    Given an onmars page with every component and no density declaration
    When the page renders
    Then every component measures exactly as it did before compact density existed

  # S11
  Scenario: An unknown density falls back to the default
    Given an onmars page with a medium button "Save" inside a region
    When the region declares the density "cozy"
    Then the button measures 40px tall

  # S12
  Scenario: Reassigning the compact step restyles compact regions
    Given an onmars page whose stylesheet sets the compact control offset token to "-4px"
    When a region declares the density "compact"
    Then a medium button inside the region measures 36px tall
