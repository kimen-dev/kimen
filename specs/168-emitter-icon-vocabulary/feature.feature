Feature: The host supplies the emitter's icon vocabulary
  A host offers the same glyph names to the model and the rendering surface.

  # S1
  Scenario: The prompt offers exactly the host's glyph names
    Given a catalog containing "ki-icon" and "ki-fab"
    When the host derives a prompt with "shopping-bag", "tag" and "search" as its icon vocabulary
    Then those are the only icon names offered for emission
    And any icon named by the embedded example belongs to that vocabulary

  # S2
  Scenario Outline: The schema closes every icon prop over the host's vocabulary
    Given a host icon vocabulary of "shopping-bag", "tag" and "search"
    When the host derives a "<target>" schema for the full catalog
    Then "ki-icon"'s required "name" and every "icon-name" prop offer exactly those three names
    And optional icon props still allow the target's representation of omission

    Examples:
      | target        |
      | draft-2020-12 |
      | openai-strict |

  # S3
  Scenario: The tool exposes the schema for the same vocabulary
    Given a draft-2020-12 schema for "ki-icon" with the vocabulary "shopping-bag", "tag" and "search"
    When the host derives the UI-spec tool with the same options
    Then the tool exposes that exact input schema

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S4
  Scenario Outline: An unavailable glyph leaves the rendered surface intact
    Given a surface displaying "Cart" and offering "shopping-bag", "tag" and "search"
    And "<icon>" is <status>
    When the host renders a spec naming "<icon>" on that surface
    Then rendering reports "unavailable-icon" for "<icon>"
    And the surface still displays "Cart"

    Examples:
      | icon   | status                     |
      | search | offered but unregistered   |
      | plus   | registered but not offered |

  # S5
  Scenario: An empty icon list fails derivation explicitly
    Given a catalog containing "ki-icon"
    When the host derives a prompt with an empty icon list
    Then derivation reports "invalid-option" for "options.icons"
    And returns no prompt

  # S6
  Scenario: A host without an icon vocabulary still gets open strings
    Given the built-in catalog containing "ki-icon" and "ki-fab"
    When the host derives a draft-2020-12 schema without an icon vocabulary
    Then "ki-icon"'s "name" and "ki-fab"'s "icon-name" remain open strings
