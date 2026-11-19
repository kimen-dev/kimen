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

### Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5 | |
| Keyboard path | | The repository gate leaves keyboard behavior to each component's contract. |
| Assistive-tech outcome | | The repository gate leaves assistive-tech outcomes to each component's contract. |
| Form participation | | The repository gate leaves form participation to each component's contract. |
| Theming | | Component contracts cover rendered appearance under each theme. S5 covers scaffold token files. |

### Component manifest

Each component folder contains a `component.json` and a `gallery.ts`.

| Field | Meaning |
| --- | --- |
| `barePage.keyboardPressed` | Required boolean. Selects the keyboard-held appearance check when the gallery exposes a pressable target. |
| `pointer.hoverWitness` | Required boolean. Selects a gallery for the Chromium pointer capability witness. Every tag participates in the shared pointer audits. |
| `catalog` | Optional boolean. Set to `true` after reviewing the proposed guarded catalog contract. |
| `formBinding` | Optional `text`, `boolean` or `select`. Selects the existing native event and property binding for Vue and Angular. |
| `budgetGroup.members` | Optional list of tags for a composite chunk. The owning component must be one of the members. |
| `sizeBudget` | Optional measured byte additions to the existing ceilings. See the rebase rule in `scripts/lib/bundle-size-budget.mjs`. |
