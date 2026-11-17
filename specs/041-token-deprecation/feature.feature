Feature: Deprecated tokens are announced before they are removed
  A published token that nothing paints stays available for at least one
  minor release. Wherever a consumer reads it, it says that it is
  deprecated, since when, when it goes and which token replaces it. It is
  removed on that schedule and never earlier.

  Rule: A deprecated token stays published and names its replacement

    # S1
    Scenario: A deprecated token keeps its value and is marked in the stylesheets
      Given "--ki-input-focus-border" is deprecated since 0.1.0, to be removed in 1.0.0, in favour of "--ki-input-focus-ring-color"
      When the tokens package is built
      Then "--ki-input-focus-border" keeps its value in onmars and material3, light and dark
      And its declaration is annotated "deprecated since 0.1.0, removed in 1.0.0: use --ki-input-focus-ring-color"

    # S2
    Scenario: The public API records a deprecation as a minor change
      Given "--ki-input-focus-border" is deprecated since 0.1.0 in favour of "--ki-input-focus-ring-color"
      When the public API gate compares the candidate with a baseline where it was not deprecated
      Then the token's entry carries deprecatedSince "0.1.0" and replacement "--ki-input-focus-ring-color"
      And the deprecation is classified as a minor change

    # S3
    Scenario: The token reference shows the deprecation next to the token
      Given "--ki-input-focus-border" is deprecated since 0.1.0, to be removed in 1.0.0, in favour of "--ki-input-focus-ring-color"
      When the token reference is generated
      Then the "--ki-input-focus-border" row reads "Deprecated since 0.1.0, removed in 1.0.0. Use --ki-input-focus-ring-color."

  Rule: A deprecation is complete and true, or the build fails

    # S4
    Scenario Outline: A deprecation that leaves out part of its schedule is rejected
      Given "--ki-input-focus-border" is deprecated without a <missing part>
      When the tokens package is built
      Then the build fails naming "--ki-input-focus-border" and its missing <missing part>

      Examples:
        | missing part     |
        | replacement      |
        | deprecation date |
        | removal version  |

    # S5
    Scenario: A replacement that is not a live published token is rejected
      Given "--ki-input-focus-border" is deprecated in favour of "--ki-button-primary-active-shadow"
      And "--ki-button-primary-active-shadow" is itself deprecated
      When the tokens package is built
      Then the build fails naming both tokens

    # S6
    Scenario: A component that reads a deprecated token fails the build
      Given "--ki-input-focus-border" is deprecated
      And the ki-input stylesheet reads "--ki-input-focus-border"
      When the elements package is built
      Then the build fails naming ki-input and "--ki-input-focus-border"

  Rule: A deprecated token is removed on schedule and never earlier

    # S7
    Scenario: Removing a deprecated token before a later minor has shipped it is blocked
      Given baseline 0.1.0 publishes "--ki-input-focus-border" deprecated since 0.1.0
      When a candidate declared major removes "--ki-input-focus-border"
      Then the public API gate blocks the removal because no later minor has shipped the deprecation

    # S8
    Scenario: Removing a deprecated token after a later minor has shipped it passes
      Given baseline 0.2.0 publishes "--ki-input-focus-border" deprecated since 0.1.0 in favour of "--ki-input-focus-ring-color"
      When a candidate declared major removes "--ki-input-focus-border"
      Then the public API gate passes

    # S9
    Scenario: A deprecated token still present at its removal version fails the build
      Given "--ki-input-focus-border" is to be removed in 1.0.0
      When the tokens package is built at version 1.0.0
      Then the build fails naming "--ki-input-focus-border" as due for removal
