Feature: Theme fonts are available as optional stylesheets

  # S1
  Scenario: The onmars v2 font stylesheet loads its theme faces
    Given a page uses the onmars v2 body and display families
    When the page imports the onmars font stylesheet
    Then its Latin sample renders in Instrument Sans and Newsreader
    And swapping from fallback to web fonts causes cumulative layout shift below 0.01

  # S2
  Scenario: Tokens work with fonts supplied by the app
    Given a page uses the theme's typography tokens without importing a font stylesheet
    When the page renders Latin text
    Then the tokens trigger zero font requests
    And the text uses an available font or the theme's fallback

  # S3
  Scenario: Consumers can import the optional stylesheets from the package
    Given a consumer installs the tokens package
    When the consumer resolves the onmars and Material 3 font stylesheet imports
    Then both stylesheets resolve
    And each bundled font URL resolves to an asset shipped with its full licence
