# Feature Specification: Consumer catalog registration

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. I (AI-First:
     One Source of Truth), Art. II (Proportionate Behavior Contracts),
     Art. VIII (Neutral Catalog, Disposable Adapters) and Art. IX (Public API
     Stability). -->

**Feature Branch**: `feat/032-catalog-registration` (spec `032-catalog-registration`)

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Catalog registration API for consumer
components: open the closed neutral catalog so a consuming application can
register its OWN components behind a declarative JSON facade — same entry
shape as the generated catalog (tag, description, whenToUse, whenNotToUse,
typed prop constraints, slots, events) — producing an immutable runtime
catalog value that validation and the guarded renderer accept as an explicit
option, defaulting to the built-in generated catalog when absent. The
registration definition itself is untrusted input and crosses the same purity
wall and strict validation as UI specs; registered entries are deeply
immutable; collisions with built-in tags and invalid custom-element names are
rejected fail-closed with named offenders; the catalog-schema-version skew
gate applies to consumer catalogs identically. Motivated by a real enterprise
adopter demand signal (2026-08-15) and strategy open decision nº 1."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Every scenario in this contract is guardrail-adjacent (Art. VIII): the
feature deliberately renegotiates the closed-catalog contract of 027 S5, so
the entire scenario set requires explicit standalone attention at human
gate 1. Founder intent to proceed was given in the working conversation
(2026-08-15); the founder's merge decision remains the final human gate.

## Design-source analysis (Figma)

Not applicable: this feature adds a data-registration boundary with no visual
surface. The design sources are the generated catalog's entry contract (the
JSON facade a consumer authors mirrors it), the Art. VIII guardrail
invariants, and the purity-wall semantics fixed by specs 027/028.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A company registers its own components behind a JSON facade (Priority: P1)

A consuming application (the demand signal: an enterprise generating
operational forms and cards over its own data) declares its proprietary
components in a data-only catalog definition — tag, usage guidance, typed
prop constraints, slots, events — registers it at runtime, and from then on
its agent-emitted UI specs validate and render against those components
exactly as Kimen's own components do, composed freely with the built-in
catalog. Their system builds arbitrary UI with their identity; Kimen supplies
the trust layer.

**Why this priority**: this is strategy open decision nº 1 made real — the
product moves from "Kimen's components" to "the guardrail for anyone's
components", and the market it serves multiplies. It is the feature the
adopter conditions adoption on.

**Independent Test**: register a two-component definition (one standalone,
one composing built-ins), validate and render one well-formed spec and one
adversarial spec against it, without touching any Kimen source.

**Acceptance Scenarios**:

1. **Given** a definition declaring `acme-kpi-card` with typed props, **When**
   a spec using it is validated against the registered catalog, **Then** the
   spec is accepted.
2. **Given** a registered catalog extending the built-in catalog, **When** a
   spec composes `acme-kpi-card` inside `ki-card`, **Then** the spec is
   accepted.
3. **Given** no registered catalog is supplied, **When** a spec references
   `acme-kpi-card`, **Then** validation rejects it naming the component —
   the 027 S5 closed-catalog behavior is unchanged on the default path.

---

### User Story 2 - The registration definition is treated as hostile input (Priority: P1)

The JSON facade arrives from configuration, a network, or a build pipeline
the library does not control. A definition that collides with built-in tags,
uses invalid custom-element names, omits usage guidance, malforms a prop
constraint, carries prototype-pollution keys or non-data values is rejected
fail-closed with the offender named — and registering a catalog can never
execute code, mutate objects outside the definition, or weaken the boundary
for anyone else.

**Why this priority**: registration IS a new door into the security boundary
(Art. VIII). If the door is weaker than the spec-validation door, the
guardrail's promise is void. The same purity-wall bar that specs cross,
definitions cross.

**Independent Test**: feed registration one well-formed definition and the
adversarial battery (collision, bad tag, missing guidance, malformed
constraint, `__proto__` key, function value) and check acceptance/rejection
plus the named offender in each report.

**Acceptance Scenarios**:

1. **Given** a definition declaring the tag `ki-button`, **When** registered
   as an extension of the built-in catalog, **Then** registration is rejected
   naming the collision.
2. **Given** a definition whose entries object carries `__proto__`, **When**
   registered, **Then** registration is rejected naming the forbidden key and
   no outside object gains properties.
3. **Given** a registered catalog, **When** the caller mutates it afterwards,
   **Then** the mutation has no effect on validation outcomes.

---

### User Story 3 - Every guardrail invariant holds identically over registered components (Priority: P2)

A host that adopts consumer registration keeps the exact protections of the
closed catalog: unknown components and props are rejected relative to the
catalog in use, prop types are enforced, only declared actions dispatch, URL
props are held to the scheme allowlist, budgets bound every render, version
skew fails closed, and the streaming path validates each node before it
attaches. Nothing about registration is a bypass.

**Why this priority**: parity is what makes the feature safe to ship at all;
it is cheaper to prove now, scenario by scenario, than to retrofit after an
adopter finds the gap.

**Independent Test**: run the representative 027/028 adversarial classes
parameterized over a registered catalog and assert identical rejection
behavior; render one registered component and assert the rendered surface
and its attribute projection.

**Acceptance Scenarios**:

1. **Given** a registered component declaring only `tone`, **When** a spec
   sets `onclick` on it, **Then** validation rejects it naming the unknown
   prop.
2. **Given** a registered component with a `src` prop, **When** a spec sets
   `src` to a `javascript:` URL and renders, **Then** the render is rejected
   naming the scheme and the surface stays untouched.
3. **Given** a streaming renderer created with a registered catalog, **When**
   a valid node using a registered component is pushed, **Then** the subtree
   attaches only after validation.

### Edge Cases

- An empty standalone definition (zero components) is a malformed definition:
  it would produce a catalog that rejects everything, which no consumer can
  intend — rejected naming the emptiness. An extension definition adding zero
  components is equally malformed (the built-in catalog already exists).
- Duplicate tags inside one definition: rejected naming the tag (the second
  entry is neither silently dropped nor silently overriding).
- A registered tag that a FUTURE Kimen release also ships: collision is
  evaluated against the catalog being extended at registration time; a later
  elements upgrade that introduces the same tag surfaces the collision at the
  consumer's next registration call, which fails closed naming it. The
  definition format reserves no namespace, but the recommendation (docs) is a
  consumer prefix, never `ki-`.
- Definitions are subject to the same payload budget class as specs: a
  multi-megabyte hostile definition is rejected before deep traversal.
- Prop value space stays scalar (boolean | number | string, enums over
  strings), because the neutral UI-spec format's prop values are scalar
  (027); a definition declaring anything richer is a malformed constraint.
- The `events` record on a registered entry is descriptive metadata for
  agents (like slots' descriptions); it creates NO dispatch path — the single
  declared-actions channel of 027/028 remains the only interaction surface.
- Accessibility of registered components is the consumer's contract, not
  Kimen's: the catalog transports guidance but cannot audit a foreign
  component's semantics (documented limitation, mirrors FR-015 of 027 in
  spirit).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
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
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is an infrastructure feature (a data-registration boundary plus the
catalog-parametrization of validation and rendering), not a UI component.
Core behavior is covered; the four interaction families are inapplicable —
the components named in the scenarios (`acme-*`, ki-*) are registration and
validation *subjects*; interactive contracts of real components live in their
own specs.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16 | |
| Keyboard path | | N/A — no interactive surface; registration is data consumed by machines |
| Assistive-tech outcome | | N/A — nothing new renders; registered components' accessibility contracts belong to their authors (documented limitation) |
| Form participation | | N/A — no form control is introduced |
| Theming | | N/A — the catalog carries no visual values; the spec format still exposes no styling surface (027 FR-006 unchanged) |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog package MUST expose a registration entry point that
  accepts a declarative, data-only catalog definition — component entries
  carrying tag, description, when-to-use and when-NOT-to-use guidance, typed
  prop constraints (boolean | number | string | enum over strings, optional
  documented values and defaults), named slots and named events — and
  produces a catalog value that validation and rendering accept. The entry
  shape MUST be the same shape the generated catalog uses, so one entry
  contract serves both origins (Art. I: one source of truth for the format).
- **FR-002**: The registration definition MUST be treated as untrusted input:
  it crosses the same purity-wall class as UI specs (forbidden keys
  `__proto__`/`constructor`/`prototype`, non-data values, accessor
  properties, shared references/cycles, payload budget) and a strict schema;
  every rejection names the offending entry, field or key and its location;
  registration MUST NOT execute, evaluate or interpret definition content as
  code, and MUST NOT mutate objects outside the definition.
- **FR-003**: Entries missing description, when-to-use or when-NOT-to-use
  guidance, or declaring malformed prop constraints (an enum without values,
  an unknown constraint type, a non-scalar value space) MUST be rejected
  naming the entry and field — the Art. I agent-legibility bar the generator
  enforces at build time, applied at registration time.
- **FR-004**: Registration MUST support two composition modes: a catalog
  that EXTENDS the built-in catalog and a standalone catalog composed only
  of consumer entries. Tag collisions — within the definition, or against
  the catalog being extended — and tags that are not valid custom-element
  names MUST be rejected fail-closed naming the tag. An empty definition is
  malformed. Built-in entries are never overridden or shadowed.
- **FR-005**: The produced catalog value MUST be deeply immutable: mutation
  attempts after creation have no effect on any subsequent validation or
  render outcome.
- **FR-006**: The validation entry point and both renderers (complete and
  streaming) MUST accept the catalog as an explicit option; when absent they
  MUST use the built-in generated catalog with behavior identical to today —
  the entire pre-existing 027/028 contract holds unchanged on the default
  path, making this an additive, non-breaking API change (Art. IX: MINOR).
- **FR-007**: Every guardrail invariant of specs 027/028 MUST hold
  identically over a registered catalog, with "outside the catalog" meaning
  outside the catalog in use: unknown components, unknown props, wrong-typed
  values and undeclared actions rejected with named offenders; purity wall
  and budgets on specs; URL-scheme allowlist on URL-named props; atomic
  fail-closed rendering; streaming halt semantics; no code-execution path
  from spec or definition data.
- **FR-008**: The catalog-schema-version skew gate MUST apply to registered
  catalogs identically: a registered catalog carries the catalog schema
  version it was built under, and a spec declaring an unsupported version is
  rejected fail-closed naming both versions, on the complete and streaming
  paths alike.
- **FR-009**: Protocol neutrality (027 FR-009) is preserved: the definition
  format and the registration surface carry no A2UI, MCP Apps, AG-UI or
  json-render vocabulary, and the catalog package gains no new runtime
  dependency.
- **FR-010**: The definition format and registration entry point become
  public API versioned with the library's SemVer (Art. IX); the definition
  format's acceptance rules are documented so a consumer can author the JSON
  facade from the docs alone (Art. I agent legibility: a capable agent must
  be able to write a valid definition from the published format description).
- **FR-011**: The renderer's catalog-derived behaviors (entry lookup for
  validation, the `type`-prop pinning safeguard) MUST read from the catalog
  in use, never implicitly from the built-in catalog, so a registered
  catalog is never half-applied.
- **FR-012**: A new capability claim for consumer catalog registration MUST
  be added to `docs/capabilities.json` and flip to `available` only in the
  change that lands green evidence for it (018 S13 / check-capabilities
  contract).

### Key Entities

- **Catalog definition**: the consumer-authored, data-only JSON facade
  declaring component entries; untrusted input to registration.
- **Registered catalog**: the immutable catalog value registration produces;
  interchangeable with the built-in catalog at every boundary that accepts a
  catalog.
- **Catalog in use**: the catalog a given validation or render call resolves
  — the explicit option when supplied, the built-in generated catalog
  otherwise; the referent of every "outside the catalog" rejection.
- **Collision**: a definition tag equal to a tag in the definition itself or
  in the catalog being extended; always a fail-closed rejection.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive — a registration entry point, the
  definition format, and a catalog option on the validation and render
  surfaces. No existing signature changes shape; default-path behavior is
  byte-for-byte compatible. MINOR under the package's SemVer; this spec
  supersedes the closed-catalog *assumption* of 027 S5 while preserving its
  behavior on the default path (S3).
- **Bundle budget** (Art. IV): no new runtime dependency (existing Zod at
  the boundary suffices); KB impact of the registration module measured at
  plan time against the catalog package's budget.
- **Accessibility** (Art. V): no rendered surface of its own. Registered
  components' accessibility is their author's contract; the catalog
  transports guidance verbatim (documented limitation).
- **Tokens** (Art. VI): none introduced; the spec format still exposes no
  styling surface, so token-layer theming remains the only appearance
  channel for registered components too.
- **Catalog/agent legibility** (Art. I): guidance fields are mandatory for
  registered entries (FR-003); the definition format itself is documented to
  the "an agent can author it from the docs alone" bar (FR-010).
- **Guardrail/security boundary** (Art. VIII): the entire spec IS a
  guardrail change: registration opens the catalog without weakening any
  invariant (FR-002, FR-007, FR-008). All sixteen scenarios require explicit
  founder confirmation at gate 1; S4–S10 are the new adversarial surface,
  S11–S16 are the parity proof.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer registers components with typed props and a spec
  using them validates and renders with zero changes to Kimen source,
  demonstrated by the S1/S2/S13 tests operating purely through the public
  API.
- **SC-002**: 100% of the hostile-definition classes in the contract —
  collision, invalid tag, missing guidance, malformed constraint,
  prototype-pollution key, non-data value, post-creation mutation — are
  rejected with the offender named, verified by deterministic tests mapped
  to S4–S10.
- **SC-003**: The pre-existing 027/028 test suites pass unmodified: the
  default path is proven untouched.
- **SC-004**: Guardrail parity is proven by the representative adversarial
  classes (unknown component/prop, URL scheme, version skew, streaming)
  running parameterized over a registered catalog, mapped to S11–S16.
- **SC-005**: The new capability claim reads `available` only when its named
  evidence (registration test suite + parity suite) is green; until then
  every status surface says `planned`.

## Assumptions

- Exact public names (the registration entry point, the catalog option) are
  plan-phase decisions; the contract fixes behavior, not identifiers.
- The neutral UI-spec format is unchanged: scalar prop values, declared
  actions, slots-as-children. Registered entries therefore constrain props
  to the same scalar space (edge case above).
- Whether the built-in catalog is itself re-expressed through the same
  creation path internally (one code path for both origins) is a plan-phase
  decision; observable behavior is fixed by S3/SC-003 either way.
- A lossless export path toward external custom-catalog ecosystems (e.g.
  A2UI custom catalogs) is a design consideration for the plan phase and for
  the adapters (029's territory); nothing in this contract depends on any
  protocol's format (Art. VIII), and no protocol vocabulary enters the
  package (FR-009).
- The emitter kit (spec 033) will consume catalogs produced here; it is a
  separate contract and package surface. This spec does not block on it.
- Numbering: 031 is occupied (site experience); 032 is the first free
  number. Companion: 033-emitter-kit.
- **Merge sequencing**: the required traceability gate demands at least one
  traced test per S-ID, so this spec merges to main only together with its
  first traced implementation (the 027–030 precedent).
