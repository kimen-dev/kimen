Feature: Card
  A card groups related content — media, header, body and footer — on one
  distinct surface that any brand restyles through tokens alone, without the
  card ever competing with the interactive content placed inside it.

  # Family: core behavior
  # S1
  Scenario: A card presents its regions in reading order
    Given a card with an image, the header "Monthly report", body text and a footer holding a "Download" button
    When the page renders
    Then the image leads, the header precedes the body and the footer closes the card

  # S2
  Scenario: Absent regions leave no empty space
    Given a card holding only the body text "Storage is almost full"
    When the page renders
    Then only the body is rendered, with no space reserved for the other regions

  # S3
  Scenario: Unknown attribute values fall back to the default appearance
    Given a card declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the card renders its content with the default card appearance

  # S8
  Scenario: The card leaves its content's events untouched
    Given a card whose footer holds a button labeled "Download" on a page that counts activations
    When the user clicks the button
    Then the page observes exactly one activation

  # Family: keyboard path
  # S4
  Scenario: The card never takes focus away from its content
    Given a card whose footer holds a button labeled "Renew subscription"
    When the user presses Tab
    Then focus lands on the "Renew subscription" button and never on the card itself

  # Family: assistive-tech outcome
  # S5
  Scenario: The card exposes its content without adding roles of its own
    Given a card with the heading "Monthly report" and body text
    When the accessibility tree is queried
    Then the heading and body text are exposed and the card contributes no role, name or state of its own

  # Family: form participation — N/A for ki-card: a non-interactive grouping
  # container is not a form control and contributes no entry to submitted
  # form data (justified in spec.md's Scenario Family Coverage table).

  # Family: theming
  # S6
  Scenario: A second theme restyles the card through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the card's surface, border and elevation resolve from material3 token values

  # S7
  Scenario: The card honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the card's appearance resolves from the dark token values
