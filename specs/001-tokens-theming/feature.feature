Feature: Tokens and theming with onmars as the default theme
  Every visual value in Kimen resolves from a design token
  (primitive → theme → semantic). onmars is the default theme;
  a brand restyles the system by reassigning the theme and
  semantic layers only, proven by the material3 reference theme.

  # S1
  Scenario: onmars light is the default appearance without configuration
    Given a document that loads the Kimen tokens stylesheet
    When the document renders with no theme or scheme declaration
    Then the brand token resolves to the onmars purple "#845abe"
    And the base surface token resolves to white "#ffffff"

  # S2
  Scenario: dark appearance follows the system preference automatically
    Given a document that loads the Kimen tokens stylesheet
    When the document renders under a dark system color scheme
    Then the base surface token resolves to the onmars dark surface "#0a0a0a"

  # S3
  Scenario: a document can force dark over a light system preference
    Given a document whose root declares the color scheme "dark"
    When the document renders under a light system color scheme
    Then the base surface token resolves to the onmars dark surface "#0a0a0a"

  # S4
  Scenario: a document can force light over a dark system preference
    Given a document whose root declares the color scheme "light"
    When the document renders under a dark system color scheme
    Then the base surface token resolves to white "#ffffff"

  # S5
  Scenario: declaring the material3 theme restyles the document
    Given a document that loads the Kimen tokens and material3 stylesheets
    When the document root declares the theme "material3"
    Then the brand token resolves to the Material 3 primary "#6750a4"

  # S6
  Scenario: material3 exposes the identical token contract as onmars
    Given the compiled onmars and material3 stylesheets
    When their token contracts are compared
    Then material3 defines exactly the same set of token names as onmars

  # S7
  Scenario: an unknown theme declaration falls back to onmars
    Given a document that loads the Kimen tokens stylesheet
    When the document root declares the unknown theme "acme"
    Then the brand token resolves to the onmars purple "#845abe"
