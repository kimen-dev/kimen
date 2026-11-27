Feature: Hosts declare collection keys for strict UI-spec emission
  A strict schema can describe which form values belong to each action report.

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S1
  Scenario: The strict tool exposes collection keys for each declared action
    Given a host allowing "customerName", "region" and "notes" for "save", and only "region" for "preview"
    When the host derives the strict UI-spec tool
    Then its input schema matches the strict schema for those options
    And a populated "collect" map requires exactly the keys for its bound action, with node IDs as values

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S2
  Scenario Outline: The strict schema rejects collection outside the host's declaration
    Given a strict schema allowing "customerName", "region" and "notes" for "save", and only "region" for "preview"
    When the host checks a button with "action" set to <binding> and "collect" set to <map>
    Then the strict schema rejects the button's collection

    Examples:
      | binding              | map                                                                                   |
      | "preview"            | {"customerName":"f-name","region":"f-region","notes":"f-notes"}                       |
      | "export"             | {"region":"f-region"}                                                                 |
      | "save"               | {"customerName":"f-name","region":"f-region"}                                         |
      | "save"               | {"customerName":"f-name","region":"f-region","notes":"f-notes","destination":"f-url"} |
      | "preview"            | {"region":"https://example.com/receive"}                                              |
      | {"ki-change":"save"} | {"customerName":"f-name","region":"f-region","notes":"f-notes"}                       |
      | null                 | {"region":"f-region"}                                                                 |

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S3
  Scenario: A strict action can report without collecting fields
    Given a strict emission binding "save" with "collect" set to null
    When the host normalizes the emission
    Then the resulting spec still binds "save" and has no "collect" member on that node

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S4
  Scenario: The strict collection declaration does not declare the action in the spec
    Given a normalized spec with fields "f-name", "f-region" and "f-notes"
    And a button binding "save" and collecting those fields as "customerName", "region" and "notes"
    And the spec's top-level actions list contains only "preview"
    When the host validates the spec
    Then validation rejects the undeclared "save" binding

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S5
  Scenario: A valid collection reaches the host as an action report
    Given a validated "save" button collecting "customerName" from "f-name", "region" from "f-region" and "notes" from "f-notes"
    And those fields currently hold "Ana", "Madrid" and "Pickup after 5" with budget available for a report
    When the user activates "save"
    Then the host receives one "save" action report with those three live field values in its data
    And collection supplies no destination and performs no submission

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S6
  Scenario: Strict guidance still omits collection when the host declares no keys
    Given a catalog offering "ki-button"
    When the host derives an openai-strict schema without the "collect" option
    Then the schema offers no "collect" member on that button

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S7
  Scenario: A forbidden collection key fails strict derivation
    Given a host declaring "constructor" as a collection key for "save"
    When the host derives an openai-strict schema with that declaration
    Then derivation reports "invalid-option" for the forbidden key and returns no schema
