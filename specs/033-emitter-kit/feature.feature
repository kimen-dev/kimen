Feature: Emitter kit
  From one catalog value — built-in or registered — derive the guidance
  artifacts any LLM integration needs (prompt, catalog-specialized JSON
  Schema with provider lowerings, tool definition) and the ingest helpers
  that close the reliability loop, deterministically, with the validation
  boundary staying the only enforcement point.

  # Family: core behavior — schema derivation
  # S1
  Scenario: The derived JSON Schema accepts a valid spec
    Given the JSON Schema derived from a catalog containing ki-card and ki-badge
    When a valid spec composing ki-card and ki-badge is checked against that schema
    Then the schema accepts the spec

  # S2
  Scenario: The derived JSON Schema rejects an out-of-catalog component
    Given the JSON Schema derived from a catalog without "acme-invoice-table"
    When a spec referencing "acme-invoice-table" is checked against that schema
    Then the schema rejects the spec

  # S3
  Scenario: Enum props surface as closed enums in the schema
    Given a catalog constraining ki-badge's "tone" to five declared values
    When the JSON Schema is derived and a spec sets "tone" to "sparkly"
    Then the schema rejects the spec naming no additional allowed values beyond the five

  # S4
  Scenario: A component subset outside the catalog is refused
    Given a catalog without "acme-invoice-table"
    When a schema derivation requests the subset containing "acme-invoice-table"
    Then derivation fails naming "acme-invoice-table" as outside the catalog

  # S5
  Scenario: The strict lowering satisfies the all-required closed-object subset
    Given the JSON Schema derived with the openai-strict target
    When every object schema in the document is inspected
    Then each carries additionalProperties false and lists every declared property as required

  # S6
  Scenario: The recursion-free lowering contains no recursive references
    Given the JSON Schema derived with the anthropic-strict target
    When the document's reference graph is inspected
    Then no reference cycle exists and the composition depth bound is declared on the artifact

  # Family: core behavior — prompt derivation
  # S7
  Scenario: The prompt carries every component's guidance verbatim
    Given a catalog extended with the registered component "acme-kpi-card"
    When the prompt is derived
    Then each entry's when-to-use and when-NOT-to-use guidance appears verbatim, acme-kpi-card's included

  # S8
  Scenario: The prompt's embedded example is self-consistent
    Given a derived prompt containing an example UI spec
    When the example is validated against the same catalog
    Then validation accepts the example

  # Family: core behavior — tool, versioning, determinism
  # S9
  Scenario: The tool definition wraps the lowered schema
    Given a catalog and the openai-strict target
    When the tool definition is derived
    Then it carries a name, a model-facing description and exactly the schema the same derivation options produce

  # S10
  Scenario: Every derived artifact embeds the catalog schema version
    Given a catalog under the current catalog schema version
    When prompt, schema and tool definition are derived
    Then each artifact carries that catalog schema version

  # S11
  Scenario: Derivation is deterministic
    Given the same catalog value
    When any artifact is derived twice
    Then both outputs are byte-identical

  # S12
  Scenario: A version-skewed catalog is refused at derivation
    Given a catalog value declaring an unsupported catalog schema version
    When any artifact derivation is requested
    Then derivation fails naming the unsupported and the supported versions

  # Family: core behavior — emission ingest
  # S13
  Scenario: Normalization strips strict-mode null placeholders
    Given a strict-mode emission whose props carry null placeholder values
    When the emission is normalized
    Then the null-valued props are gone and the spec validates against the catalog

  # S14
  Scenario: A failed validation becomes one repair message naming every offender
    Given a validation report rejecting a spec with an unknown component and a wrong-typed prop
    When the repair message is built
    Then it names each issue's code, path and offender and requests exactly one corrected emission

  # S15
  Scenario: A catalog beyond a provider limit fails derivation naming the offender
    Given a catalog whose declared enum surface exceeds the strict target's documented limit
    When the schema is derived for that target
    Then derivation fails naming the offending component and the exceeded limit
