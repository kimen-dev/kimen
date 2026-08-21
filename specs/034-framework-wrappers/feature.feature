Feature: Framework wrappers
  Generated wrapper packages expose every published ki-* component as an
  idiomatic, typed React, Vue or Angular component — events bound natively,
  form components speaking each framework's form idiom — produced from the
  same component contract as every other artifact, drift-gated, tree-shakable
  and packaging-validated.

  # Family: core behavior — idiomatic typed usage
  # S1
  Scenario: A React wrapper renders the underlying element with typed props
    Given the generated React wrapper for ki-button
    When the wrapper renders with variant "primary"
    Then the DOM contains a ki-button element carrying variant "primary"

  # S2
  Scenario: A React wrapper binds ki-* custom events as callback props
    Given a rendered React wrapper listening for the component's ki-* event
    When the underlying element dispatches that event
    Then the React callback receives it with the event detail

  # S3
  Scenario: A Vue wrapper renders the underlying element with typed props
    Given the generated Vue wrapper for ki-badge
    When the wrapper renders with tone "info"
    Then the DOM contains a ki-badge element carrying tone "info"

  # S4
  Scenario: A wrong-typed prop fails the consuming app's type-check
    Given a consuming app setting an undeclared value on a wrapped component's enum prop
    When the app is type-checked
    Then the check fails naming the prop

  # Family: form participation through the framework idiom
  # S5
  Scenario: Vue v-model round-trips a form component's value
    Given a Vue app binding ki-input with v-model
    When the element emits its change event with a new value
    Then the bound model carries the new value and writing the model updates the element

  # S6
  Scenario: An Angular value accessor round-trips a form control
    Given an Angular reactive form binding ki-checkbox through its value accessor
    When the element emits its change event checked
    Then the form control value is true and setting the control updates the element

  # S7
  Scenario: React controlled usage round-trips a form component's value
    Given a React component binding ki-input's value from state through the change callback
    When the element emits its change event with a new value
    Then the state carries the new value and the element reflects it

  # Family: generation, drift and tree-shaking
  # S8
  Scenario: Every published component appears in every wrapper
    Given the committed custom-elements manifest
    When the three wrappers are generated
    Then each wrapper exports one component per published custom element

  # S9
  Scenario: A hand-edited generated wrapper fails the sync gate
    Given a committed generated wrapper source edited by hand
    When the sync gate runs
    Then the gate fails pointing at the artifact that no longer matches regeneration

  # S10
  Scenario: Wrapper generation is deterministic
    Given a wrapper freshly generated from the current manifest
    When the wrapper is regenerated from a checkout at a different filesystem path
    Then both generated outputs are byte-identical

  # S11
  Scenario: Importing one wrapper component registers only that component
    Given an app importing exactly the ki-button wrapper
    When the app runs
    Then the custom element registry defines ki-button and does not define ki-dialog

  # Family: packaging
  # S12
  Scenario: The wrapper packages pass mechanical packaging validation
    Given the three packed wrapper packages
    When the packaging validators run
    Then each package passes with its declared entry points and framework peer ranges
