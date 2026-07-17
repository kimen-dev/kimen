Feature: QR code
  A QR code hands a declared value — a link, a pairing payload — from the
  screen to a nearby camera as a machine-scannable graphic that any brand
  restyles through tokens alone without losing scannability.

  # Family: core behavior
  # S1
  Scenario Outline: The QR code renders its value as a scannable code
    Given a QR code with the value "<value>"
    When the page renders
    Then the rendered code decodes back to exactly "<value>"

    Examples:
      | value                   |
      | https://onmars.dev      |
      | Reunión mañana — Zúrich |
      | こんにちは世界          |
      | Ticket 🎫 №42           |

  # S2
  Scenario: Changing the value re-encodes the code
    Given a rendered QR code encoding "https://onmars.dev"
    When the value changes to "https://onmars.dev/pricing"
    Then the rendered code decodes back to exactly "https://onmars.dev/pricing"

  # S3
  Scenario: An empty QR code exposes nothing and breaks nothing
    Given a QR code with no value
    When the page renders
    Then no code is rendered, the accessibility tree exposes no content for it and the page renders without error

  # S4
  Scenario: Unknown appearance attributes fall back to the default appearance
    Given a QR code declared with an unrecognized shape attribute copied from another design system
    When the page renders
    Then the code renders with the default appearance and still decodes to its value

  # Family: keyboard path
  # S5
  Scenario: The QR code never takes keyboard focus
    Given a focused button, then a QR code encoding "https://onmars.dev", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the QR code

  # Family: assistive-tech outcome
  # S6
  Scenario: The QR code exposes an image whose name states its purpose
    Given a QR code encoding "https://onmars.dev" labeled "Open onmars.dev on your phone"
    When the accessibility tree is queried
    Then it exposes an image named "Open onmars.dev on your phone" with no interactive role or state

  # S7
  Scenario: Without a label the encoded value names the image
    Given a QR code encoding "https://onmars.dev" with no label
    When the accessibility tree is queried
    Then it exposes an image named "https://onmars.dev"

  # Family: form participation — N/A for ki-qr: a non-interactive graphic
  # that displays a machine-readable code is not a form control, carries no
  # user input and contributes no entry to submitted form data (justified in
  # spec.md's Scenario Family Coverage table).

  # Family: theming
  # S8
  Scenario: A second theme restyles the QR code through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the code's size, colors and module shape resolve from material3 token values
    And the rendered code still decodes to its value

  # S9
  Scenario: Reassigning the module shape tokens rounds the modules
    Given a page reassigning the QR module shape tokens to the round values
    And a QR code encoding "https://onmars.dev"
    When the page renders
    Then the modules render round and the code still decodes to "https://onmars.dev"

  # S10
  Scenario: The QR code honors a forced dark scheme without losing scannability
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the QR code's appearance resolves from the dark token values
    And the rendered code still decodes to its value

  # S11
  Scenario: The code never mirrors in a right-to-left document
    Given a right-to-left document with a QR code encoding "https://onmars.dev"
    When the page renders
    Then the code renders unmirrored and decodes back to exactly "https://onmars.dev"

  # Family: core behavior (appended)
  # S12
  Scenario: A value beyond QR capacity fails soft
    Given a QR code whose value exceeds the byte capacity of the densest QR symbol
    When the page renders
    Then no partial or corrupt code is rendered and the page renders without error
