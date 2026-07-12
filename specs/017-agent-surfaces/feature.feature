Feature: Agent surfaces
  Everything an agent needs to wire a Kimen component correctly is generated
  from the component contract and shipped with the library: a standard
  manifest, a language-model summary, and when-to-use guidance — regenerated,
  committed and verified, never hand-maintained.

  # Family: core behavior
  # S1
  Scenario: The build produces a standard custom-elements manifest
    Given the elements package with the ki-button component
    When the machine surfaces are generated
    Then a custom-elements manifest describes ki-button's tag, properties, slots and parts

  # S2
  Scenario: The build produces a language-model summary
    Given the elements package with the ki-button component
    When the machine surfaces are generated
    Then an llms.txt summary carries the library name, an installation instruction and one entry per published component with its usage guidance

  # S3
  Scenario: When-to-use guidance flows from the component contract
    Given a component whose contract documents when to use it and when not to
    When the machine surfaces are generated
    Then the manifest and the summary carry that guidance verbatim

  # S4
  Scenario: An undocumented public API member fails the generation
    Given a component with a public property that carries no documentation
    When the machine surfaces are generated
    Then the generation fails naming the undocumented member

  # S5
  Scenario: Stale committed surfaces fail the sync gate
    Given committed machine surfaces that no longer match the component contract
    When the sync gate runs
    Then the gate fails pointing at the stale files

  # S6
  Scenario: Regeneration is independent of where the checkout lives
    Given machine surfaces freshly generated from the current contract
    When the surfaces are regenerated from a checkout at a different filesystem path
    Then both generated outputs are byte-identical
