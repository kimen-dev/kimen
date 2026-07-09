Feature: Badge
  A badge names a status at a glance — a short, non-interactive pill whose
  tone reinforces the meaning its text already carries, and whose appearance
  any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The badge renders its label as a status pill
    Given a badge labeled "Active"
    When the page renders
    Then the label "Active" is visible inside a pill with the neutral tone appearance

  # S2
  Scenario: The tone drives the badge's appearance
    Given a badge labeled "Payment failed" with tone "danger"
    When the page renders
    Then the badge's appearance resolves from the danger tone token values

  # S3
  Scenario: Unknown appearance values fall back to defaults
    Given a badge declared with an unrecognized tone value
    When the page renders
    Then the badge renders with the neutral tone appearance

  # S8
  Scenario: An empty badge exposes nothing and breaks nothing
    Given a badge with no label
    When the page renders
    Then the accessibility tree exposes no content for the badge and the page renders without error

  # Family: keyboard path
  # S4
  Scenario: The badge never takes keyboard focus
    Given a focused button, then a badge labeled "Active", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the badge

  # Family: assistive-tech outcome
  # S5
  Scenario: The badge's meaning reaches assistive technology as text
    Given a badge labeled "Active" with tone "success"
    When the accessibility tree is queried
    Then it exposes the text "Active" with no interactive role or state

  # Family: theming
  # S6
  Scenario: A second theme restyles the badge through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the badge's appearance resolves from material3 token values

  # S7
  Scenario: The badge honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the badge's appearance resolves from the dark token values
