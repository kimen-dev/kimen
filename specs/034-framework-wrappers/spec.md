# Feature Specification: Framework wrappers

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. I (AI-First:
     One Source of Truth), Art. II (Proportionate Behavior Contracts),
     Art. IV (Web Standards: generated framework wrappers), Art. IX (Public
     API Stability) and Technology Standards ("generated wrappers
     (@kimen/react, ...)"). -->

**Feature Branch**: `feat/034-framework-wrappers` (spec `034-framework-wrappers`)

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Generated, publish-grade wrapper packages
@kimen/react, @kimen/vue and @kimen/angular produced by Stencil's official
output targets from the same component contract that generates everything
else. Each wrapper exposes every published ki-* component as an idiomatic
framework component: typed props from the manifest, native framework event
bindings for ki-* custom events, form components wired to the framework's
form idiom (React controlled props, Vue v-model, Angular
ControlValueAccessor/ngModel), tree-shakable per-component imports, and
packaging correctness validated mechanically. Generated wrapper sources are
committed and drift-gated like the catalog and surfaces. Client-side
rendering only."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Wrappers are named generated artifacts of the constitution (Art. I:
"manifests, the Zod catalog, docs, llms.txt and AGENTS.md are GENERATED";
Technology Standards names the wrapper packages) — this contract makes the
declared surface real. Founder intent to proceed was given in the working
conversation (2026-08-15).

## Design-source analysis (Figma)

Not applicable: wrappers add no visual surface of their own — they project
the existing `ki-*` components into framework idioms. The design sources
are the committed Custom Elements Manifest (the Art. I machine surface) and
each framework's official binding conventions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A framework developer uses Kimen as native components (Priority: P1)

A React, Vue or Angular developer installs their wrapper package and uses
every Kimen component as an idiomatic, fully typed component of their
framework: props type-checked from the component contract, `ki-*` custom
events bound with the framework's native event syntax, and the underlying
element reachable when needed — without writing `customElements` plumbing
or `addEventListener` glue by hand.

**Why this priority**: this is the adoption path for the three dominant
application frameworks; "works in every framework" is only credible when
the idiomatic layer exists, is typed, and is generated (never drifts).

**Independent Test**: mount one component per framework with a typed prop,
receive one `ki-*` custom event through the framework's binding, and fail
the framework's type-check with a wrong-typed prop.

**Acceptance Scenarios**:

1. **Given** the React wrapper, **When** a component renders with a typed
   prop, **Then** the underlying `ki-*` element carries it and the prop is
   type-checked.
2. **Given** a wrapper component with a bound event, **When** the element
   dispatches its `ki-*` custom event, **Then** the framework callback
   receives it natively.
3. **Given** a wrong-typed prop value, **When** the consuming app
   type-checks, **Then** the build fails naming the prop.

---

### User Story 2 - Form components speak each framework's form idiom (Priority: P1)

The form components (input, textarea, select, checkbox, radio group,
switch) participate in each framework's form model the way native inputs
do: controlled usage in React, `v-model` in Vue, `ngModel`/reactive forms
through value accessors in Angular — value changes flow both ways through
the component's own `ki-*` events.

**Why this priority**: forms are where wrapper quality is won or lost; a
wrapper without the form idiom forces exactly the glue code wrappers exist
to remove. The demand context (operational forms over enterprise data)
makes this the load-bearing case.

**Independent Test**: per framework, bind one text-entry component and one
checked component to the framework's form state, simulate user input via
the `ki-*` event, and assert the two-way round trip.

**Acceptance Scenarios**:

1. **Given** a Vue form component bound with `v-model`, **When** the
   component emits its change event, **Then** the bound model updates, and
   updating the model updates the component.
2. **Given** an Angular form control bound with a value accessor, **When**
   the component emits its change event, **Then** the form control value
   updates and marks dirty, and writing the control value updates the
   component.

---

### User Story 3 - Wrappers are generated, drift-gated and publish-grade (Priority: P2)

A maintainer never hand-writes wrapper code: the three packages are
generated from the same component contract as every other artifact, cover
every published component by construction, regenerate byte-identically,
fail a sync gate when the committed sources drift, register components
tree-shakably (importing one component does not register the rest), and
pass mechanical packaging validation ready for npm.

**Why this priority**: Art. I is what makes 29 × 3 wrapper surfaces
sustainable for a one-person operation; without generation and gating the
wrappers would rot within one component release.

**Independent Test**: hand-edit a generated wrapper file and watch the
sync gate fail; regenerate from two checkout paths and compare bytes;
import a single component and inspect the custom element registry; run the
packaging validators on the three packed packages.

**Acceptance Scenarios**:

1. **Given** the committed manifest, **When** wrappers are generated,
   **Then** each wrapper exports one component per published custom
   element.
2. **Given** a hand-edited generated wrapper source, **When** the sync
   gate runs, **Then** it fails pointing at the drifted artifact.
3. **Given** an app importing exactly one wrapper component, **When** it
   runs, **Then** only that component (and its internal dependencies) is
   registered.

### Edge Cases

- Event names: `ki-*` events use dash-cased names; each wrapper maps them
  to its idiom (React callback props, Vue `@` bindings, Angular outputs)
  mechanically from the manifest — a mapping gap for any published event
  is a generation failure, not a silent omission.
- Sub-components that only compose inside a parent (option, radio, tab,
  tab-panel, list-item) are wrapped like any component; their containment
  rules remain the components' own contracts.
- Form components are `formAssociated` custom elements: wrappers bind
  through the components' public events and properties and MUST NOT
  introduce a second value pathway (no double-firing, no synthetic-event
  duplication).
- Frameworks with first-class custom-element support (Svelte, Solid, and
  React 19's native custom-element handling) remain supported WITHOUT
  wrappers; the wrappers add typing and idiom, never a requirement — the
  no-wrapper path stays documented.
- Client-side only: the wrappers register real custom elements; SSR/DSD
  remains the repository's deferred bet, and the wrappers must not claim
  otherwise (documented limitation).
- The wrapper packages depend on `@kimen/elements` and their framework
  peer only; no other Kimen package leaks in (module boundaries).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
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
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is an infrastructure feature (generated framework bindings over
existing components), not a new UI component. The wrapped components'
keyboard, assistive-technology and theming contracts live in their own
specs (002–026) and are unchanged by wrapping.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S8, S9, S10, S11, S12 | |
| Keyboard path | | N/A — wrappers add no interaction surface; the components' keyboard contracts are specs 002–026 |
| Assistive-tech outcome | | N/A — the accessibility tree is produced by the wrapped components, unchanged |
| Form participation | S5, S6, S7 | |
| Theming | | N/A — wrappers carry no visual values; theming remains the token layer (Art. VI) |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The three wrapper packages MUST be generated from the same
  component contract that produces every other artifact (Art. I) — no
  hand-maintained component list — and MUST cover every published custom
  element; a coverage gap is a generation failure, never a warning.
- **FR-002**: The React wrapper MUST expose each component as an idiomatic
  typed component: manifest-typed props (enum unions preserved), `ki-*`
  custom events as typed callback props, and a ref path to the underlying
  element.
- **FR-003**: The Vue wrapper MUST expose idiomatic typed components with
  native event binding, and the form components MUST support `v-model`
  bound to their value/checked property through their own change events.
- **FR-004**: The Angular wrapper MUST expose typed components with
  outputs for `ki-*` events, and the form components MUST integrate with
  template-driven and reactive forms through value accessors.
- **FR-005**: Wrapper imports MUST be tree-shakable per component:
  importing one component registers only that component and its internal
  dependencies, never the whole library.
- **FR-006**: Generated wrapper sources MUST be committed, diffable and
  drift-gated: a deterministic sync gate fails when the committed sources
  differ from a fresh regeneration (catalog-sync / surfaces-sync
  precedent), and regeneration is byte-identical regardless of checkout
  location (FR/S10).
- **FR-007**: The wrapper packages MUST pass mechanical packaging
  validation (entry points, types, module format) and declare their
  framework peer ranges explicitly; they depend on `@kimen/elements` and
  their framework peer only (module boundaries enforced).
- **FR-008**: Wrappers are client-side: they MUST NOT advertise SSR
  support (deferred bet), and the no-wrapper usage path per framework
  remains documented.
- **FR-009**: A capability claim for framework wrappers MUST flip from
  `planned` to `available` only in the change that lands green evidence
  (018 S13 contract); public docs (README package table, frameworks
  guides) MUST reflect the real status in the same change.
- **FR-010**: The wrappers MUST NOT change `@kimen/elements`' public API;
  build configuration may extend, but the elements' own surfaces
  (manifest, llms.txt, catalog) remain byte-compatible except for
  additions required by generation.

### Key Entities

- **Wrapper package**: one generated npm package per framework exposing
  every published component in that framework's idiom.
- **Component contract**: the committed manifest + component types — the
  single derivation source (Art. I).
- **Form idiom binding**: the framework-specific two-way value pathway
  (controlled props / v-model / value accessor) generated for the form
  components.
- **Wrapper sync gate**: the drift check holding committed generated
  wrapper sources to regeneration.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): three NEW packages (first release), each
  a generated projection of the elements' API; wrapper SemVer tracks the
  elements' SemVer. No change to any existing package surface.
- **Bundle budget** (Art. IV): wrappers are thin generated bindings; the
  per-component budget continues to bind the elements. Wrapper runtime
  overhead is bounded and measured at plan time.
- **Accessibility** (Art. V): unchanged — produced by the wrapped
  components; wrappers add no interaction surface.
- **Tokens** (Art. VI): none; wrappers carry no styling.
- **Catalog/agent legibility** (Art. I): wrappers are named generated
  artifacts; committed, diffable, sync-gated. `llms.txt`/docs gain the
  wrapper usage surface.
- **Guardrail/security boundary** (Art. VIII): untouched — wrappers do not
  interact with the catalog or renderer paths.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer in each of the three frameworks renders a
  component, receives its event and binds a form control using only the
  wrapper package and its docs (S1–S7).
- **SC-002**: 100% of published custom elements are exported by each
  wrapper, enforced mechanically (S8; a gap cannot reach main).
- **SC-003**: The form idiom round-trips are proven per framework for a
  text-entry and a checked component (S5–S7).
- **SC-004**: Tree-shaking proven: importing exactly one component defines
  only it (S11).
- **SC-005**: Drift gate red on hand-edit; two regenerations from
  different paths byte-identical (S9, S10).
- **SC-006**: The three packages pass packaging validation with their
  declared peer ranges (S12).

## Assumptions

- Scope: React, Vue and Angular — the frameworks with official Stencil
  output targets. Svelte/Solid (and React 19's native path) consume the
  custom elements directly; that path stays documented instead of wrapped.
- Exact generator/tool versions, generated file layout, the Angular
  packaging pipeline and peer ranges are plan-phase decisions pinned by
  research.
- Numbering: 032 and 033 are occupied by the in-flight registration and
  emitter specs (PRs #148/#149, branched separately); 034 is the first
  free number. This feature is independent of both and branches from main.
- **Merge sequencing**: the traceability gate demands ≥1 traced test per
  S-ID, so this spec merges only with its first traced implementation
  (027–033 precedent).
