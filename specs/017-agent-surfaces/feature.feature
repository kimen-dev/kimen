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
    Then the manifest, the component's own document and the complete summary carry that guidance verbatim

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

  # S7
  Scenario: A slot the component fills itself stays out of the agent surfaces
    Given a component that renders a named slot it fills with its own children
    And the slot is declared as managed output with a reason instead of documented as public
    When the machine surfaces are generated
    Then the generation passes and neither the manifest nor the summary lists that slot
    And a rendered named slot that is neither documented nor declared still fails the generation

  # S8
  Scenario: The language-model summary is a brief index of linked documents
    Given the elements package with its published components
    When the machine surfaces are generated
    Then llms.txt names the library, summarizes it, tells how to install and load it, and links one document per published component beside the first sentence of its when-to-use guidance
    And llms.txt stays within its declared size budget

  # S9
  Scenario: Every published component has its own contract document
    Given the elements package with the ki-indicator component
    When the machine surfaces are generated
    Then a ki-indicator document carries its guidance verbatim with its attributes, slots, parts, events, methods, styling tokens and examples
    And the document marks each attribute the contract declares required, numerically bounded or a URL

  # S10
  Scenario: The complete summary stays available as one document
    Given the elements package with its published components
    When the machine surfaces are generated
    Then llms-full.txt carries the installation guidance and the complete entry of every published component in a single file

  # S11
  Scenario: The packaged index links only files shipped in the package
    Given machine surfaces freshly generated from the current contract
    When the elements package is packed
    Then every link in its llms.txt is a relative path to a file inside the packed package

  # S12
  Scenario: The published index links only documents the site serves
    Given machine surfaces freshly generated from the current contract
    When the public site is assembled
    Then the site serves llms.txt and llms-full.txt at its root
    And every link in the served llms.txt is an address of that site whose document the assembled site contains

  # S13
  Scenario: The index links the guides beyond the components
    Given the theming guidance of the preamble and the GenUI packages described in the GenUI source
    When the machine surfaces are generated
    Then every llms.txt links a generated theming guide
    And the repository llms.txt also links one generated guide per GenUI package carrying its usage guidance and entry points
