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

  # Amendment A1 (decided 2026-11-19, issue 319): a touch density, opt-in
  # Family: core behavior
  # S13
  Scenario: A touch region grows its medium controls to 44 pixels
    Given an onmars page with a medium button "Save" and a text field "Email" inside a region
    When the region declares the density "touch"
    Then the button and the text field inside the region measure 44px tall
    And the same controls outside the region keep 40px

  # S14
  Scenario: Touch grows every button size by one step and leaves icon buttons their size
    Given an onmars page with a button "Save" and an icon button "Close" in every size inside a region
    When the region declares the density "touch"
    Then every button inside the region measures 4px taller than the same size outside it
    And every icon button inside the region measures the same as the same size outside it

  # S15
  Scenario: Small controls keep their painted size and their place in touch
    Given an onmars page with a checkbox "Accept", a radio "Basic", a switch "Alerts" and a dismissible alert "Saved" inside a region
    When the region declares the density "touch"
    Then each checkbox box, radio circle, switch track and dismiss control measures the same as outside the region
    And each component takes the same space as outside the region

  # S16
  Scenario Outline: Every interactive target accepts a pointer across 44 by 44 pixels in touch
    Given a <theme> page with every interactive component in every size inside a region
    When the region declares the density "touch"
    Then a pointer anywhere in the 44 by 44 CSS pixel square centred on each interactive target reaches that target

    Examples:
      | theme     |
      | onmars    |
      | material3 |

  # S17
  Scenario: Touch keeps text sizes, icon sizes and container spacing
    Given an onmars page with a medium button "Save" with a leading icon and a card "Invoice" inside a region
    When the region declares the density "touch"
    Then the label font size, the icon size and the card body padding are the same as outside the region

  # S18
  Scenario: Touch follows the active theme's own sizes
    Given a material3 page with a text field "Email" inside a region
    When the region declares the density "touch"
    Then the text field measures 52px tall instead of its standard 48px

  # S19
  Scenario: A touch region nested in a compact region is touch
    Given a compact region holding a region with a medium button "Save" and a card "Invoice"
    When the nested region declares the density "touch"
    Then the button measures 44px tall
    And the card body padding is 16px

  # S20
  Scenario: A compact region nested in a touch region is compact
    Given a touch region holding a region with a medium button "Save" and an extra-small icon button "Close"
    When the nested region declares the density "compact"
    Then the button measures 32px tall
    And the icon button's target ends at its 24px box

  # S21
  Scenario: A coarse pointer alone does not change the density
    Given an onmars page with a medium button "Save" and no density declaration
    When the page renders on a device whose primary pointer is coarse
    Then the button measures 40px tall

  # Family: theming
  # S22
  Scenario: A themed region inside a touch region stays touch
    Given an onmars page with a touch region
    When a region nested inside it declares the theme "material3"
    Then a text field inside the nested region measures 52px tall
    And a pointer anywhere in the 44 by 44 square centred on a checkbox inside it reaches the checkbox

  # S23
  Scenario: Reassigning the touch target minimum restyles touch regions
    Given an onmars page whose stylesheet sets the touch target minimum token to "48px"
    When a region declares the density "touch"
    Then a pointer anywhere in the 48 by 48 square centred on an extra-small icon button reaches it
    And the icon button still measures 24px
