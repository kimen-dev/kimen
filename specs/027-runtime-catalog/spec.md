# Feature Specification: Neutral runtime catalog

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. I (AI-First:
     One Source of Truth), Art. VIII (Neutral Catalog, Disposable Adapters)
     and Art. IX (Public API Stability). -->

**Feature Branch**: `feat/fase-p-specs` (spec `027-runtime-catalog`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase P infrastructure quartet, spec 1 of 4:
deliver `@kimen/catalog` — the neutral, schema-constrained catalog of what
agents may emit (components, typed props, declared actions, when-to-use
metadata), generated from the committed Custom Elements Manifest per Art. I,
validating UI specs at the GenUI boundary per Art. VIII, and versioned with
the public API per Art. IX. The guarded renderer (spec 028) and the protocol
adapters (specs 029 A2UI, 030 MCP Apps) build on it."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
The validation scenarios S5–S8, S13 and S14 are guardrail-adjacent
(Art. VIII) and require explicit standalone attention at human gate 1.

## Design-source analysis (Figma)

Not applicable: this feature produces a machine-readable schema artifact and
a validation boundary with no visual surface. The design sources are the
committed Custom Elements Manifest (`custom-elements.json`, the Art. I
machine surface fixed by spec 017) and the Art. VIII guardrail invariants the
catalog must make checkable as data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent learns what it may emit from the catalog alone (Priority: P1)

A GenUI agent (or the model behind an adapter) reads the catalog and knows,
without reading source code or human docs, exactly which components exist,
which props each accepts with which types and closed value sets, which slots
compose, and when to use — and when NOT to use — each component.

**Why this priority**: the catalog is the durable asset of Art. VIII and the
runtime half of Art. I's agent-legibility deliverable. Every adapter and the
guarded renderer consume it; a catalog an agent cannot emit against correctly
is a defect, not a doc gap.

**Independent Test**: give an agent only the generated catalog, ask it to
compose a confirmation card (ki-card + ki-button + ki-badge), and validate
the emitted spec mechanically against the catalog.

**Acceptance Scenarios**:

1. **Given** the elements package's committed manifest, **When** the catalog
   is generated, **Then** it carries one entry per published custom element
   with tag, typed props, slots and events.
2. **Given** ki-button's enum-documented `variant` attribute, **When** the
   catalog is generated, **Then** the constraint is closed over exactly the
   five documented values.
3. **Given** a manifest entry with when-to-use guidance, **When** the catalog
   is generated, **Then** the guidance appears verbatim in the entry.

---

### User Story 2 - The boundary rejects what the catalog does not declare (Priority: P1)

A host application validates an agent-emitted UI spec before anything
renders. Specs composed only of cataloged components with declared,
well-typed props and declared actions are accepted; unknown components,
unknown props, wrong-typed values, undeclared actions and
prototype-pollution keys are rejected with errors that name the offender,
and validation itself is bounded by a declared payload-size budget so an
abusive spec cannot exhaust the validator.

**Why this priority**: this is the schema half of the Art. VIII guardrail
("unknown props are rejected", "only declared actions dispatch"). The
renderer (spec 028) enforces the rendering half; without catalog-level
rejection there is nothing sound for it to enforce.

**Independent Test**: feed the validator one well-formed spec and six
adversarial ones (unknown component, unknown prop, wrong type, undeclared
action, prototype-pollution key, over-budget payload) and check
acceptance/rejection plus the named offender in each error.

**Acceptance Scenarios**:

1. **Given** a spec composing ki-card, ki-button and ki-badge with declared
   props, **When** validated, **Then** it is accepted.
2. **Given** a spec referencing `ki-payment-form` (not in the catalog),
   **When** validated, **Then** it is rejected naming the unknown component.
3. **Given** a spec setting `onclick` on a ki-button, **When** validated,
   **Then** it is rejected naming the component and the unknown prop.
4. **Given** a spec binding an action its action list never declares,
   **When** validated, **Then** it is rejected naming the undeclared action.
5. **Given** a spec whose props object carries the key `__proto__`, **When**
   validated, **Then** it is rejected naming the forbidden key.
6. **Given** a spec larger than the declared validation size budget, **When**
   validated, **Then** it is rejected naming the exceeded budget.

---

### User Story 3 - The catalog never drifts from the component contract (Priority: P2)

A reviewer trusts the committed catalog the way they trust the committed
token CSS and machine surfaces: it is generated from the Custom Elements
Manifest, never hand-maintained, and a deterministic sync gate fails any
change that regenerates differently (Art. I; tokens-sync and surfaces-sync
precedents).

**Why this priority**: a drifting catalog silently widens or narrows the
guardrail — worse than no catalog.

**Independent Test**: hand-edit the committed catalog artifact; the sync gate
must fail pointing at it. Regenerate from a checkout at a different
filesystem path; outputs must be byte-identical.

**Acceptance Scenarios**:

1. **Given** a hand-edited committed catalog, **When** the sync gate runs,
   **Then** it fails pointing at the stale artifact.
2. **Given** a fresh generation, **When** regenerated from a checkout at a
   different path, **Then** both outputs are byte-identical.

---

### User Story 4 - Renderer and adapters consume a neutral, versioned catalog (Priority: P3)

The guarded renderer (028) and the disposable adapters (029, 030) build on a
catalog that carries no protocol vocabulary and declares which schema version
and which elements version it derives from, so protocol churn is absorbed in
adapters and version skew is detectable at the boundary.

**Why this priority**: neutrality is the reason the catalog outlives any
protocol (Art. VIII); versioning alongside the public API is Art. IX. Both
are cheaper to build in than to retrofit.

**Independent Test**: inspect the published package surface for protocol
types/identifiers; read the generated artifact's version metadata.

**Acceptance Scenarios**:

1. **Given** the published catalog package, **When** its public surface is
   inspected, **Then** no A2UI, MCP Apps, AG-UI or json-render vocabulary
   appears.
2. **Given** a generated catalog, **When** its version metadata is read,
   **Then** it declares its schema version and the elements version it
   derives from.

### Edge Cases

- Subcomponents that only make sense inside a parent (ki-option, ki-radio,
  ki-tab, ki-tab-panel, ki-list-item): they are cataloged like any custom
  element; how deeply containment is validated (option outside a select) is
  a plan-phase decision — v1 minimum is that the entries exist and their
  props are constrained.
- A component contract change (new prop, widened enum): the committed catalog
  is stale until regenerated; the sync gate blocks the PR exactly as
  tokens-sync and surfaces-sync do today.
- A hostile-but-well-formed spec (deep nesting, huge payloads): validation is
  pure data processing and never executes spec content, and its own cost is
  bounded — the declared validation size budget (FR-014, S14) rejects the
  spec before deep traversal, and a payload-size bound also bounds depth and
  node count by construction. The finer render-time budgets (depth, node
  count, accumulated stream) belong to the renderer (028 FR-006).
- Styling: the manifest documents 216 CSS custom properties for ki-button
  alone. The v1 catalog exposes NO free-form styling surface — UI specs
  carry no CSS values and no token reassignments; appearance stays at the
  consuming application's token layer (Art. VI), which also closes a style
  injection avenue.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
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
    Given the manifest documents ki-button's "variant" with five declared values
    When the catalog is generated
    Then the catalog constrains "variant" to exactly "primary", "secondary", "tertiary", "quaternary" and "ghost"

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
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is an infrastructure feature (a generated schema artifact plus a
data-validation boundary), not a UI component. Core behavior is covered; the
four interaction families are inapplicable — the ki-* components named in the
scenarios are validation *subjects*, and their own interactive contracts live
in specs 002–016.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14 | |
| Keyboard path | | N/A — no interactive surface; the catalog is data consumed by machines |
| Assistive-tech outcome | | N/A — nothing renders; accessibility contracts live in the component specs the catalog describes |
| Form participation | | N/A — no form control is introduced; form components are described by entries, not implemented here |
| Theming | | N/A — the catalog carries no visual values; v1 exposes no styling surface and tokens stay at the application's theme layer |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog MUST be generated from the committed Custom
  Elements Manifest (`packages/elements/generated/custom-elements.json`) as
  its single derivation source — no second analysis pass over component
  source (Art. I; spec 017 fixed that the catalog consumes the manifest, not
  replaces it). It MUST carry one entry per published custom element (20
  today: 15 components plus 5 subcomponents) covering tag, props with types
  and defaults, slots, events and usage guidance.
- **FR-002**: Prop constraints MUST be as narrow as the manifest documents:
  enum-typed attributes become closed value sets, booleans/strings/numbers
  become typed constraints, and entries reject props they do not declare
  (strict schemas — the "unknown props are rejected" invariant of Art. VIII
  expressed as data).
- **FR-003**: When-to-use and when-NOT-to-use guidance MUST flow verbatim
  from the manifest into each catalog entry; an entry for a published
  component missing guidance fails generation (Art. I: build failure, not
  warning — same bar spec 017 set for the surfaces).
- **FR-004**: The package MUST expose a validation entry point that, given a
  UI spec as data, either accepts it or rejects it with errors naming the
  offending component, prop, value or action and its location in the spec.
  Validation is pure data processing: it MUST NOT execute, evaluate or
  interpret any spec content as code.
- **FR-005**: The neutral UI-spec format MUST include a declared-actions
  list; any action binding in the spec body MUST reference a declared action
  or validation rejects the spec. This is the validation half of "only
  declared actions dispatch" (Art. VIII); render-time dispatch enforcement
  belongs to the guarded renderer (spec 028).
- **FR-006**: The v1 catalog and spec format MUST expose no free-form
  styling surface: no CSS values, no per-spec token reassignment. Appearance
  remains at the consuming application's token layer (Art. VI).
- **FR-007**: The generated catalog artifact MUST be committed and diffable,
  and a deterministic sync gate in the gate suite MUST fail when the
  committed artifact differs from a fresh regeneration (tokens-sync /
  surfaces-sync precedent).
- **FR-008**: Generation MUST be reproducible: byte-identical output
  regardless of absolute paths, timestamps, machine names or build
  directory.
- **FR-009**: The catalog package's public surface and runtime dependencies
  MUST remain protocol-neutral: no A2UI, MCP Apps, AG-UI or json-render
  types, identifiers or dependencies (Art. VIII); the existing module
  boundary tags MUST prevent adapter code from entering the catalog.
- **FR-010**: The generated catalog MUST declare its own schema version and
  the elements version it derives from, and the catalog MUST be versioned
  alongside the library's public API SemVer (Art. IX). This replaces the
  `CATALOG_SCHEMA_VERSION = '0.0.0'` placeholder as the package's first real
  public API.
- **FR-011**: The `runtime-catalog` capability claim in
  `docs/capabilities.json` MUST flip from `planned` to `available` only in
  the change that lands green evidence for it, naming the catalog sync gate
  and the validation test suite as its evidence entries
  (018 S13 / check-capabilities contract).
- **FR-012**: Schema validation technology (Zod) MUST remain confined to
  this guardrail/GenUI boundary (Technology Standards); `@kimen/elements`
  gains no new dependency and no protocol or catalog type leaks into it.
- **FR-013**: Validation MUST reject any spec whose props or data objects
  carry a `__proto__`, `constructor` or `prototype` key, naming the
  forbidden key, and validation MUST never mutate objects outside the spec.
  This is the same invariant as the renderer's FR-005 (spec 028) applied at
  the schema boundary: the validator is a public entry point consumed
  independently of the renderer, so it cannot delegate this class.
- **FR-014**: The validation entry point MUST enforce a declared maximum
  payload size: a spec beyond the budget is rejected naming the exceeded
  budget, before deep traversal, so validation time and memory stay bounded
  for standalone consumers. A payload-size budget bounds depth and node
  count by construction (neither can exceed the byte length), so one
  declared budget suffices at this boundary; the finer render-time budgets
  (depth, node count, accumulated stream) remain the renderer's contract
  (028 FR-006).
- **FR-015**: The validation API MUST document what it does NOT protect
  against: URL-scheme allowlisting (`javascript:`, `data:` and other
  executable schemes) and markup inertness are render-path invariants owned
  by the guarded renderer (028 FR-004, its S6/S7), because the safe-scheme
  policy is a render decision and duplicating it here would create two
  drifting sources for one rule (Art. I). Catalog validation is a schema
  boundary, never content sanitization; a host that renders outside the
  guarded renderer is outside the guardrail.

### Key Entities

- **Catalog**: the generated, committed artifact describing everything an
  agent may emit; the durable asset of Art. VIII.
- **Catalog entry**: one published custom element's schema — tag, typed
  props with constraints, slots, events, usage guidance.
- **UI spec**: the agent-emitted declarative document (data, never code)
  composing catalog entries and declaring actions; the input to validation
  and, later, to the guarded renderer.
- **Declared action**: a named identifier a spec declares before any binding
  may reference it; the unit of "only declared actions dispatch".
- **Validation report**: the accept/reject outcome plus errors naming each
  offending component, prop, value or action and its location.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): first real public API of
  `@kimen/catalog` — the generated catalog artifact, the UI-spec format and
  the validation entry point — versioned alongside the library's public API
  from its first release. No change to `@kimen/elements`.
- **Bundle budget** (Art. IV): zero impact on `@kimen/elements`. Zod becomes
  a runtime dependency of `@kimen/catalog` only; this is the declared bet
  ("Zod at the guardrail/GenUI boundary only") and its KB cost is measured
  and budgeted for the catalog package at plan time.
- **Accessibility** (Art. V): not applicable — no rendered surface; the
  accessibility contracts of described components live in their own specs.
- **Tokens** (Art. VI): none introduced; v1 exposes no styling surface, so
  theming remains token-layer-only by construction.
- **Catalog/agent legibility** (Art. I): this feature IS the runtime half of
  the agent-legibility pipeline: generated from the manifest, never
  hand-maintained, committed, diffable, sync-gated.
- **Guardrail/security boundary** (Art. VIII): this spec delivers the schema
  half of the guardrail — unknown components, unknown props and undeclared
  actions are rejected as data (S5–S8), prototype-pollution keys are
  rejected and validation cost is bounded by a declared size budget
  (S13, S14). The rendering half ("only catalog components render", "no
  code-execution path exists from spec data" at render time, URL-scheme
  allowlisting) is delivered and adversarially tested by spec 028; the two
  specs jointly cover the four invariants. S5–S8, S13 and S14 require
  explicit founder confirmation at gate 1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent given only the generated catalog (no source, no human
  docs) composes a UI spec exercising every published component that passes
  catalog validation. The agent run is a scheduled eval per Art. III — never
  merge-blocking; the validation itself is the deterministic oracle.
- **SC-002**: 100% of published custom elements appear in the catalog with
  typed props and usage guidance, enforced mechanically (a gap cannot reach
  main).
- **SC-003**: Two independent regenerations of the catalog from the same
  commit are byte-identical, verified in CI on every PR by the sync gate.
- **SC-004**: Every malformed-spec class in the contract — unknown
  component, unknown prop, wrong-typed value, undeclared action,
  prototype-pollution key, over-budget payload — is rejected with an error
  naming the offender (or the forbidden key or exceeded budget), verified by
  deterministic tests mapped to S5–S8, S13 and S14.
- **SC-005**: The public `runtime-catalog` capability reads `available` only
  when its named evidence is green; until then every status surface keeps
  saying "planned" (018 S13 contract).

## Assumptions

- **Format ownership**: this spec owns the neutral UI-spec format — its
  schema, its versioning and its validation — as part of the
  `@kimen/catalog` public API (Art. IX). Spec 028 consumes the format
  unchanged and owns the render-time semantics over it (render budgets, URL
  allowlist, streaming attachment rules); specs 029/030 translate protocol
  messages into it. No other spec defines or forks the format.
- The exact shape of the UI-spec document (tree vs. flat list with child
  references, separate data model, streaming/partial form) is a plan-phase
  decision. It is informed by A2UI's declarative model but MUST stay
  protocol-neutral; A2UI specifics live in spec 029, and progressive
  rendering of partial specs is the renderer's concern (spec 028) — the
  validation API must not preclude incremental validation. **Spec risk**:
  A2UI's exact message and component-catalog formats were unverified at
  writing time; nothing in this spec may depend on them.
- The action-binding surface — which interaction points accept action
  bindings, and how manifest events (today `ki-dismiss`, `ki-close`,
  `ki-change`) map to them — is a plan-phase decision; the contract here
  only fixes that bindings reference declared actions (S8).
- Whether the committed artifact is generated schema code or a generated
  JSON document from which schemas are built at load time is a plan-phase
  decision; either way exactly the committed artifact is sync-gated and
  byte-reproducible.
- Containment constraints for subcomponents (e.g. ki-option inside
  ki-select) may land as a follow-up tightening; v1 guarantees entries and
  prop constraints for all 20 elements.
- Numbering: 019–026 are occupied on parked branches (fase-n component specs
  and governance worktrees); 027 is the first globally free number. The
  companion specs are 028-guarded-renderer, 029-adapter-a2ui and
  030-adapter-mcp-apps.
- **Merge sequencing**: these four contracts are spec-only; the required
  traceability gate demands at least one traced test per S-ID, so each spec
  merges to main only together with its first traced implementation (in
  027 → 028 → 029 → 030 order). Merging a spec-only contract to main would
  put the required gates-core suite red — the same reason 019–026 are parked
  on branches.
- The `packages/catalog` package exists today only as an anchor exporting
  the `0.0.0` placeholder; there is nothing else to preserve.
