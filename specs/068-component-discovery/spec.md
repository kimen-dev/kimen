# Component discovery

A new component's files describe how it participates in shared quality checks.
This contract governs repository automation under Article X. The component UI
scenario families apply to the component's own behavior contract.

Catalog eligibility remains a separate, explicit declaration under Article VIII.

```gherkin
Feature: Shipped components are registered by discovery

  # S1
  Scenario: A complete component joins the shared checks and demos
    Given a component author adds a complete ki-example component
    When the repository discovers shipped components
    Then the shared checks and demos include ki-example

  # S2
  Scenario: An incomplete component fails the inventory gate
    Given ki-example is missing its required gallery
    When the component inventory gate runs
    Then it reports the missing gallery for ki-example

  # S3
  Scenario: A discovered component stays outside the agent catalog by default
    Given ki-example has no explicit catalog opt-in
    When the guarded catalog is generated
    Then agents cannot select ki-example from the catalog

  # S4
  Scenario: Each component contributes its reviewed allowance to shared bundle budgets
    Given ki-example is assigned a bundle size allowance
    When the bundle size gate runs
    Then it enforces the combined allowances and fixed headroom

  # S5
  Scenario: Authors scaffold a component without editing shared registries
    Given the ki-example tag is available
    When an author scaffolds ki-example
    Then the scaffold writes the component files and both theme token files
    And shared registries require no manual edits
```
