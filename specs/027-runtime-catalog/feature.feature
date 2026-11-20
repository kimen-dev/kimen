Feature: Neutral runtime catalog
  The machine-readable schema of what agents may emit: every published
  component with typed props, slots and usage guidance, generated from the
  custom-elements manifest, protocol-neutral, versioned with the public API,
  and validating UI specs at the GenUI boundary.

  # Family: core behavior — derivation from the component contract
  # S1
  Scenario: The catalog is generated from the custom-elements manifest
    Given the elements package's committed custom-elements manifest
    When the catalog is generated
    Then the catalog carries one entry per published custom element with its tag, typed props, slots and events

  # S2
  Scenario: Enum-documented attributes become closed constraints
    Given the manifest documents ki-button's "tone" with three declared values
    When the catalog is generated
    Then the catalog constrains "tone" to exactly "neutral", "success" and "danger"

  # S3
  Scenario: Usage guidance flows verbatim into the catalog
    Given a component whose manifest entry carries when-to-use and when-not-to-use guidance
    When the catalog is generated
    Then that component's catalog entry carries the guidance verbatim

  # Family: core behavior — validation at the GenUI boundary
  # S4
  Scenario: A spec composed from cataloged components is accepted
    Given a UI spec composing ki-card, ki-button and ki-badge using only declared props
    When the spec is validated against the catalog
    Then validation accepts the spec

  # S5
  Scenario: A spec referencing an unknown component is rejected
    Given a UI spec referencing the component "ki-payment-form" absent from the catalog
    When the spec is validated against the catalog
    Then validation rejects the spec naming "ki-payment-form" as outside the catalog

  # S6
  Scenario: A spec carrying an unknown prop is rejected
    Given a UI spec setting the undeclared prop "onclick" on a ki-button
    When the spec is validated against the catalog
    Then validation rejects the spec naming ki-button and the unknown prop "onclick"

  # S7
  Scenario: A wrong-typed prop value is rejected
    Given a UI spec setting ki-button's boolean prop "disabled" to the string "yes"
    When the spec is validated against the catalog
    Then validation rejects the spec naming "disabled" and its expected boolean type

  # S8
  Scenario: A binding to an undeclared action is rejected
    Given a UI spec binding "submit-order" to a ki-button without declaring it in the spec's action list
    When the spec is validated against the catalog
    Then validation rejects the spec naming the undeclared action "submit-order"

  # Family: core behavior — integrity of the generated artifact
  # S9
  Scenario: A hand-edited catalog fails the sync gate
    Given a committed catalog artifact edited by hand
    When the sync gate runs
    Then the gate fails pointing at the artifact that no longer matches regeneration

  # S10
  Scenario: Regeneration is independent of where the checkout lives
    Given a catalog freshly generated from the current manifest
    When the catalog is regenerated from a checkout at a different filesystem path
    Then both generated outputs are byte-identical

  # Family: core behavior — neutrality and versioning
  # S11
  Scenario: The catalog surface stays protocol-neutral
    Given the published catalog package
    When its public surface is inspected
    Then no A2UI, MCP Apps, AG-UI or json-render protocol type or identifier appears

  # S12
  Scenario: The catalog declares the versions it is built from
    Given a generated catalog
    When an agent reads the catalog's version metadata
    Then the catalog declares its schema version and the elements version it derives from

  # Family: core behavior — adversarial validation hardening
  # S13
  Scenario Outline: A prototype-pollution key is rejected at validation
    Given a UI spec whose props object contains the key "<key>"
    When the spec is validated against the catalog
    Then validation rejects the spec naming the forbidden key "<key>"
    And no object outside the spec gains new properties

    Examples:
      | key         |
      | __proto__   |
      | constructor |
      | prototype   |

  # S14
  Scenario: A spec beyond the validation size budget is rejected
    Given a UI spec whose total payload size exceeds the declared validation size budget
    When the spec is validated against the catalog
    Then validation rejects the spec naming the exceeded size budget

  # Family: core behavior — declared prop constraints
  # S15
  Scenario: A prop the component contract declares required is required in the catalog
    Given the manifest marks ki-textarea's "label" as required by the component contract
    When the catalog is generated
    Then the catalog marks ki-textarea's "label" as required

  # S16
  Scenario Outline: A spec without a usable value for a required prop is rejected
    Given a UI spec whose ki-textarea <label state>
    When the spec is validated against the catalog
    Then validation rejects the spec naming ki-textarea and the missing required prop "label"

    Examples:
      | label state                      |
      | sets no "label"                  |
      | sets "label" to an empty string  |
      | sets "label" to only white space |

  # S17
  Scenario: Numeric bounds the component contract declares become catalog constraints
    Given the manifest bounds ki-indicator's "count" to the range 0 to 20
    When the catalog is generated
    Then the catalog constrains ki-indicator's "count" to a minimum of 0 and a maximum of 20

  # S18
  Scenario Outline: A number outside its declared bounds is rejected
    Given a UI spec setting ki-indicator's "<prop>" to <value>
    When the spec is validated against the catalog
    Then validation rejects the spec naming ki-indicator, "<prop>" and its declared bounds

    Examples:
      | prop    | value   |
      | count   | 1000000 |
      | count   | -1      |
      | current | 0       |

  # Family: core behavior — URL policy at the validation boundary
  # S19
  Scenario: A prop the component contract declares URL-typed is URL-typed in the catalog
    Given the manifest declares a string attribute with the URL format
    When the catalog is generated
    Then the catalog marks that prop as URL-typed

  # S20
  Scenario Outline: An executable URL value is rejected at validation
    Given a UI spec setting ki-avatar's "src" to "<value>"
    When the spec is validated against the catalog
    Then validation rejects the spec naming "src" and the rejected scheme

    Examples:
      | value                     |
      | javascript:alert(1)       |
      | data:image/svg+xml,<svg/> |

  # S21
  Scenario Outline: With allowed origins declared, only URLs from those origins are accepted
    Given validation restricted to the URL origin "https://cdn.example.com"
    And a UI spec setting ki-avatar's "src" to "<value>"
    When the spec is validated against the catalog
    Then validation <outcome>

    Examples:
      | value                             | outcome                                              |
      | https://cdn.example.com/ana.png   | accepts the spec                                     |
      | https://tracker.example.net/p.gif | rejects the spec naming "src" and the foreign origin |
      | /avatars/ana.png                  | rejects the spec naming "src" as not absolute        |
      | //tracker.example.net/p.gif       | rejects the spec naming "src" as not absolute        |

  # S22
  Scenario: A QR code's value is data, not a URL the page loads
    Given validation restricted to the URL origin "https://cdn.example.com"
    And a UI spec setting ki-qr's "value" to "https://other.example.org/menu"
    When the spec is validated against the catalog
    Then validation accepts the spec

  # Family: core behavior — deprecated enum values (#344)
  # S23
  Scenario: A deprecated enum value is not offered to agents but still validates
    Given the manifest documents "tertiary" as a deprecated button variant
    When the catalog is generated
    Then the catalog offers exactly "primary", "secondary", "quaternary", "ghost" and "outline" for both button components
    And existing UI specs using "tertiary" still validate and render
