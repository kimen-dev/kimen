# Optional theme fonts

**Issue** [#346](https://github.com/kimen-dev/kimen/issues/346)

Apps can opt in to self-hosted Latin fonts through a separate stylesheet for
their theme. The family tokens continue to work with fonts supplied by the
app and never fetch fonts by themselves. The usage guide documents import
paths, theme versions and preloading.

## Decisions

- The onmars stylesheet supplies the v2 faces. The browser fixture uses the
  v2 body and display families while #341 owns the change to the shipped
  defaults (agent's choice, pending founder confirmation).
- The supplied Roboto v3.015 carries SIL OFL 1.1. The Material 3 stylesheet
  ships without that binary because the issue specifies Apache 2.0 and
  limits the source to the reference files. Its stylesheet provides a
  local fallback alias for apps that self-host Roboto (agent's choice,
  pending founder confirmation).
- The adjusted local aliases are opt-in via the app's semantic family
  stacks. Use Georgia for Newsreader and Arial as a fixed proxy for
  the platform-dependent system-ui fallback, which has no local() name
  (agent's choice, pending founder confirmation).

## Gherkin scenarios

```gherkin
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
```
