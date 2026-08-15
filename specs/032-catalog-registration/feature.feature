Feature: Consumer catalog registration
  A consuming application registers its own components behind a declarative
  JSON facade, producing an immutable catalog that validation and the guarded
  renderer accept explicitly; the built-in catalog remains the default, and
  every guardrail invariant holds identically over registered components.

  # Family: core behavior — registration and composition
  # S1
  Scenario: A spec using a registered consumer component is accepted
    Given a catalog registered from a definition declaring "acme-kpi-card" with the enum prop "tone" over "ok", "warn" and "critical"
    When a UI spec setting acme-kpi-card's "tone" to "warn" is validated against that catalog
    Then validation accepts the spec

  # S2
  Scenario: Registered components compose with built-in components
    Given a catalog registered as an extension of the built-in catalog with "acme-kpi-card"
    When a UI spec slotting acme-kpi-card inside ki-card is validated against that catalog
    Then validation accepts the spec

  # S3
  Scenario: Without a registered catalog the boundary stays the built-in catalog
    Given no consumer catalog is supplied to validation
    When a UI spec referencing "acme-kpi-card" is validated
    Then validation rejects the spec naming "acme-kpi-card" as outside the catalog

  # Family: the registration definition is untrusted input
  # S4
  Scenario: A definition colliding with a built-in tag is rejected
    Given a catalog definition declaring the tag "ki-button"
    When a catalog is registered from that definition as an extension of the built-in catalog
    Then registration is rejected naming "ki-button" as a colliding tag

  # S5
  Scenario: A definition whose tag is not a valid custom-element name is rejected
    Given a catalog definition declaring the tag "AcmeCard"
    When a catalog is registered from that definition
    Then registration is rejected naming "AcmeCard" as an invalid custom-element name

  # S6
  Scenario: A definition missing usage guidance is rejected
    Given a catalog definition declaring "acme-kpi-card" without when-to-use guidance
    When a catalog is registered from that definition
    Then registration is rejected naming "acme-kpi-card" and the missing guidance field

  # S7
  Scenario: A definition with a malformed prop constraint is rejected
    Given a catalog definition declaring "acme-kpi-card" with an enum prop "tone" that lists no values
    When a catalog is registered from that definition
    Then registration is rejected naming "acme-kpi-card", the prop "tone" and the malformed constraint

  # S8
  Scenario Outline: A definition carrying a prototype-pollution key is rejected
    Given a catalog definition whose entries object contains the key "<key>"
    When a catalog is registered from that definition
    Then registration is rejected naming the forbidden key "<key>"
    And no object outside the definition gains new properties

    Examples:
      | key         |
      | __proto__   |
      | constructor |
      | prototype   |

  # S9
  Scenario: A definition holding a non-data value is rejected
    Given a catalog definition where "acme-kpi-card"'s prop constraint holds a function value
    When a catalog is registered from that definition
    Then registration is rejected naming the non-data value's location

  # S10
  Scenario: A registered catalog is immutable after creation
    Given a catalog registered with "acme-kpi-card" constraining "tone" to three values
    When the caller attempts to widen the registered "tone" constraint afterwards
    Then the attempt has no effect and validation outcomes are unchanged

  # Family: guardrail parity over registered components
  # S11
  Scenario: An unknown prop on a registered component is rejected
    Given a catalog registered with "acme-kpi-card" declaring only the prop "tone"
    When a UI spec setting "onclick" on acme-kpi-card is validated against that catalog
    Then validation rejects the spec naming acme-kpi-card and the unknown prop "onclick"

  # S12
  Scenario: A component outside the registered catalog is rejected
    Given a catalog registered with only "acme-kpi-card"
    When a UI spec referencing "acme-invoice-table" is validated against that catalog
    Then validation rejects the spec naming "acme-invoice-table" as outside the catalog

  # S13
  Scenario: The guarded renderer renders a registered component
    Given a render surface and a catalog registered with "acme-kpi-card"
    When a valid UI spec using acme-kpi-card is rendered onto the surface with that catalog
    Then the surface contains the acme-kpi-card element with its declared props as attributes

  # S14
  Scenario: The URL allowlist applies to a registered component's URL props
    Given a catalog registered with "acme-logo" declaring the string prop "src"
    When a UI spec setting acme-logo's "src" to "javascript:alert(1)" is rendered with that catalog
    Then the render is rejected naming the rejected scheme and the surface stays untouched

  # S15
  Scenario: Catalog schema version skew fails closed for registered catalogs
    Given a catalog registered under the current catalog schema version
    When a UI spec declaring an unsupported catalog schema version is rendered with that catalog
    Then the render is rejected naming the unsupported version

  # S16
  Scenario: The streaming renderer honors a registered catalog
    Given a streaming renderer created with a registered catalog containing "acme-kpi-card"
    When a valid node using acme-kpi-card is pushed to the stream
    Then the node's subtree attaches to the surface after validation
