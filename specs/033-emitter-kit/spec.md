# Feature Specification: Emitter kit

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. I (AI-First:
     One Source of Truth), Art. II (Proportionate Behavior Contracts),
     Art. VII (Simplicity), Art. VIII (Neutral Catalog) and Art. IX (Public
     API Stability). -->

**Feature Branch**: `feat/033-emitter-kit` (spec `033-emitter-kit`)

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "The 'modulito': a model-agnostic emitter kit so
ANY LLM can be configured to emit valid Kimen UI specs from a catalog —
built-in or registered (spec 032). Derive from one catalog value the three
guidance artifacts an integrator needs (a model-facing prompt, a JSON Schema
of the UI-spec format specialized to the catalog with provider-strict
lowerings, and a provider-neutral tool definition) plus the two ingest
helpers that close the reliability loop (normalization of strict-mode
emissions and a single-round repair message from a validation report). Pure
data derivation: no model calls, no DOM, no protocol vocabulary; the guarded
renderer remains the only security boundary."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
This is a new public package surface (Art. IX) adjacent to the guardrail:
the emitter is RELIABILITY tooling, never enforcement — S-scenarios pin that
its artifacts stay consistent with the real validation boundary, and the
docs obligation (FR-011) pins the security disclaimer. Founder intent to
proceed was given in the working conversation (2026-08-15).

## Design-source analysis (Figma)

Not applicable: this feature derives machine-facing artifacts (prompt text,
JSON Schema documents, tool definitions) from the catalog. Its design
sources are the neutral UI-spec format (027), the catalog value shape (027 +
032) and the verified provider structured-output subsets (research:
OpenAI strict mode, Anthropic structured outputs / strict tools, A2UI
prompt-first precedent, json-render `catalog.prompt()` precedent).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An integrator points any model at the catalog and gets valid specs (Priority: P1)

The adopter's platform team wires their LLM (any provider) to Kimen: they
derive a system-prompt block, or a JSON Schema for structured outputs, or a
tool definition — all from the same catalog value their runtime validates
and renders against, including their own registered components. The model's
output validates at the boundary on the first try in the common case.

**Why this priority**: this is the "modulito para que mi LLM lo saque con
ese spec" the demand signal conditions adoption on; without it every
integrator hand-writes (and drifts) their own catalog transcription —
exactly what Art. I forbids internally.

**Independent Test**: derive prompt, schema and tool from one catalog
(extended with a registered component); check the schema accepts a
known-valid spec and rejects out-of-catalog components with a standard JSON
Schema validator; check the prompt carries every component's guidance.

**Acceptance Scenarios**:

1. **Given** a catalog, **When** the JSON Schema is derived, **Then** a
   valid spec passes and a spec naming an out-of-catalog component fails
   under a standard JSON Schema validator.
2. **Given** a registered catalog with `acme-kpi-card`, **When** prompt and
   schema are derived, **Then** both carry the registered component exactly
   as they carry built-ins.
3. **Given** a catalog, **When** the prompt is derived, **Then** every
   entry's when-to-use and when-NOT-to-use guidance appears verbatim and
   the prompt's example spec validates against that same catalog.

---

### User Story 2 - Provider-strict modes work without hand-tuning (Priority: P1)

The integrator selects a lowering target for their provider: the full
draft-2020-12 dialect by default, a strict lowering for providers that
demand all-required properties with `additionalProperties: false`
everywhere, and a recursion-free lowering for providers whose constrained
decoding rejects recursive references. Where a strict mode forces the model
to emit placeholder nulls, a normalization helper strips them so the
emission validates; where a catalog exceeds a provider's documented limits,
derivation fails naming the offending component instead of silently
truncating the model's world.

**Why this priority**: the provider subsets are where integrators bleed
time (verified: recursion is the fork — one major provider supports it via
references, another rejects it); shipping targets that are wrong or silent
about limits would be worse than shipping none.

**Independent Test**: structural assertions on each target's output
(additionalProperties, required completeness, absence of recursive
references, bounded depth) plus the normalization round-trip and a
limit-exceeding synthetic catalog.

**Acceptance Scenarios**:

1. **Given** the strict target, **When** the schema is derived, **Then**
   every object schema carries `additionalProperties: false` and lists
   every property as required.
2. **Given** a strict-mode emission carrying null-valued props, **When**
   normalized, **Then** the nulls are gone and the spec validates.
3. **Given** a catalog whose enum surface exceeds a declared provider
   limit, **When** the schema is derived for that target, **Then**
   derivation fails naming the offending component.

---

### User Story 3 - The reliability loop closes without the emitter becoming a boundary (Priority: P2)

When a model still emits an invalid spec, the integrator turns the
validation report into ONE machine-readable repair message, sends it back
to the model once, and otherwise fails closed. Every derived artifact
embeds the catalog schema version so version skew is visible at the
emission side too. Nothing in the kit executes model output or renders
anything: validation and rendering stay the only enforcement points, and
the documentation says so explicitly.

**Why this priority**: constrained decoding degrades on hard schemas
(published benchmarks), so the validate→repair→fail-closed loop is the
honest reliability floor; making its policy fixed (one round) keeps the
surface minimal (Art. VII).

**Independent Test**: feed an invalid spec's report to the repair
formatter and check every issue's code, path and offender appear; check a
valid spec yields no repair message; check version stamps on every
artifact; check determinism (identical derivations byte-for-byte).

**Acceptance Scenarios**:

1. **Given** a validation report with three issues, **When** the repair
   message is built, **Then** it names each issue's code, path and
   offender, and requests exactly one corrected emission.
2. **Given** the same catalog twice, **When** any artifact is derived
   twice, **Then** the outputs are byte-identical.

### Edge Cases

- An empty component subset (or one naming a component outside the
  catalog) is an error naming the offender — a schema over zero components
  would make every emission invalid, which no integrator can intend.
- The `version: 1` literal and the declared-actions list are part of the
  derived schema (`const` / array of strings), but CROSS-FIELD rules (a
  node's action must appear in the spec's `actions` list, budgets, URL
  schemes) are not expressible in provider subsets: the schema is advisory
  shape, the validation boundary remains authoritative — pinned by the
  agreement property (SC-004) and the docs disclaimer (FR-011).
- The recursion-free target bounds composition depth; a catalog whose
  realistic compositions exceed the bound still validates at the boundary
  (the bound constrains the SCHEMA, not the format) — the bound is
  documented on the artifact.
- Guidance text stays OUT of the schema (token budget; provider
  name/enum-length limits) — judgment lives in the prompt, shape in the
  schema; the two are derived from the same entries so they cannot drift.
- A catalog value whose `catalogSchemaVersion` is not the version this kit
  supports is refused at derivation, fail-closed naming both versions
  (skew parity with 032 FR-008).
- Streaming ingest of partial JSON (healing) is explicitly out of scope in
  v1: the guarded renderer already streams complete nodes; text-level
  healing is recorded as explored-and-deferred pending demand.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Emitter kit
  From one catalog value — built-in or registered — derive the guidance
  artifacts any LLM integration needs (prompt, catalog-specialized JSON
  Schema with provider lowerings, tool definition) and the ingest helpers
  that close the reliability loop, deterministically, with the validation
  boundary staying the only enforcement point.

  # Family: core behavior — schema derivation
  # S1
  Scenario: The derived JSON Schema accepts a valid spec
    Given the JSON Schema derived from a catalog containing ki-card and ki-badge
    When a valid spec composing ki-card and ki-badge is checked against that schema
    Then the schema accepts the spec

  # S2
  Scenario: The derived JSON Schema rejects an out-of-catalog component
    Given the JSON Schema derived from a catalog without "acme-invoice-table"
    When a spec referencing "acme-invoice-table" is checked against that schema
    Then the schema rejects the spec

  # S3
  Scenario: Enum props surface as closed enums in the schema
    Given a catalog constraining ki-badge's "tone" to five declared values
    When the JSON Schema is derived and a spec sets "tone" to "sparkly"
    Then the schema rejects the spec naming no additional allowed values beyond the five

  # S4
  Scenario: A component subset outside the catalog is refused
    Given a catalog without "acme-invoice-table"
    When a schema derivation requests the subset containing "acme-invoice-table"
    Then derivation fails naming "acme-invoice-table" as outside the catalog

  # S5
  Scenario: The strict lowering satisfies the all-required closed-object subset
    Given the JSON Schema derived with the openai-strict target
    When every object schema in the document is inspected
    Then each carries additionalProperties false and lists every declared property as required

  # S6
  Scenario: The recursion-free lowering contains no recursive references
    Given the JSON Schema derived with the anthropic-strict target
    When the document's reference graph is inspected
    Then no reference cycle exists and the composition depth bound is declared on the artifact

  # Family: core behavior — prompt derivation
  # S7
  Scenario: The prompt carries every component's guidance verbatim
    Given a catalog extended with the registered component "acme-kpi-card"
    When the prompt is derived
    Then each entry's when-to-use and when-NOT-to-use guidance appears verbatim, acme-kpi-card's included

  # S8
  Scenario: The prompt's embedded example is self-consistent
    Given a derived prompt containing an example UI spec
    When the example is validated against the same catalog
    Then validation accepts the example

  # Family: core behavior — tool, versioning, determinism
  # S9
  Scenario: The tool definition wraps the lowered schema
    Given a catalog and the openai-strict target
    When the tool definition is derived
    Then it carries a name, a model-facing description and exactly the schema the same derivation options produce

  # S10
  Scenario: Every derived artifact embeds the catalog schema version
    Given a catalog under the current catalog schema version
    When prompt, schema and tool definition are derived
    Then each artifact carries that catalog schema version

  # S11
  Scenario: Derivation is deterministic
    Given the same catalog value
    When any artifact is derived twice
    Then both outputs are byte-identical

  # S12
  Scenario: A version-skewed catalog is refused at derivation
    Given a catalog value declaring an unsupported catalog schema version
    When any artifact derivation is requested
    Then derivation fails naming the unsupported and the supported versions

  # Family: core behavior — emission ingest
  # S13
  Scenario: Normalization strips strict-mode null placeholders
    Given a strict-mode emission whose props carry null placeholder values
    When the emission is normalized
    Then the null-valued props are gone and the spec validates against the catalog

  # S14
  Scenario: A failed validation becomes one repair message naming every offender
    Given a validation report rejecting a spec with an unknown component and a wrong-typed prop
    When the repair message is built
    Then it names each issue's code, path and offender and requests exactly one corrected emission

  # S15
  Scenario: A catalog beyond a provider limit fails derivation naming the offender
    Given a catalog whose declared enum surface exceeds the strict target's documented limit
    When the schema is derived for that target
    Then derivation fails naming the offending component and the exceeded limit
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is an infrastructure feature (pure data derivation from the catalog),
not a UI component. Core behavior is covered; the four interaction families
are inapplicable.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15 | |
| Keyboard path | | N/A — no interactive surface; artifacts are data consumed by models and integrations |
| Assistive-tech outcome | | N/A — nothing renders; the emitter derives text and schema documents |
| Form participation | | N/A — no form control is introduced |
| Theming | | N/A — no visual values; the spec format still exposes no styling surface (027 FR-006) |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kit MUST derive a model-facing prompt from any catalog
  value: per component its tag, description, when-to-use and
  when-NOT-to-use guidance verbatim, typed props with enum values inline,
  slots and events; plus the UI-spec format rules and at least one example
  spec that validates against that same catalog (self-consistency, S8).
- **FR-002**: The kit MUST derive a JSON Schema (draft 2020-12 by default)
  of the neutral UI-spec format specialized to the catalog: one branch per
  component with its `component` constant, exactly its declared props
  (enums closed, scalars typed), its declared slots as child containers,
  and closed objects everywhere (`additionalProperties: false` semantics);
  the spec `version` literal and declared-actions list are part of the
  schema shape.
- **FR-003**: The kit MUST provide named lowering targets: the full
  default dialect; a strict target meeting the all-required +
  closed-object subset (optionality expressed as null unions); and a
  recursion-free target that unrolls the node tree to a declared, bounded
  composition depth. Transformations a target cannot express are dropped
  to prompt guidance, never silently approximated in the schema.
- **FR-004**: The kit MUST derive a provider-neutral tool definition (name,
  model-facing description, input schema) wrapping the lowered schema for
  the same options, mappable to any provider's tool/function surface
  without further transformation.
- **FR-005**: The kit MUST provide a normalization helper for strict-mode
  emissions that removes null-valued props (and empty optional containers
  produced by all-required schemas) so a shape-conforming emission
  validates at the boundary; normalization is pure data cleanup and MUST
  NOT alter non-placeholder values.
- **FR-006**: The kit MUST format a validation report into a single repair
  message naming every issue's code, path and offender, requesting exactly
  one corrected emission; the one-round-then-fail-closed policy is fixed,
  not configurable (Art. VII).
- **FR-007**: All derivations MUST accept any `Catalog` value —
  the built-in catalog or a registered one (spec 032) — with identical
  behavior, and MUST refuse a catalog whose schema version the kit does
  not support, fail-closed naming both versions (skew parity, 032 FR-008).
- **FR-008**: Derivation MUST be deterministic: identical inputs yield
  byte-identical artifacts (sorted keys, no timestamps, no machine state) —
  the Art. I reproducibility bar applied to derived artifacts.
- **FR-009**: Component subsetting MUST be supported on prompt, schema and
  tool derivation; a subset naming a component outside the catalog, or an
  empty subset, fails naming the offender. Derivations exceeding a
  target's documented provider limits MUST fail naming the offending
  component and limit, never silently truncate.
- **FR-010**: The kit is a NEW package surface with no runtime dependency
  beyond the catalog package; no DOM access, no network, no model calls,
  no protocol vocabulary (Art. VIII); every public member ships complete
  JSDoc (Art. I) and packaging correctness is validated mechanically
  before publish (Art. IX).
- **FR-011**: Documentation MUST state the security model explicitly: the
  derived schema and prompt are ADVISORY reliability tooling; passing them
  does not authorize rendering — the validation boundary and the guarded
  renderer remain the only enforcement points (budgets, URL allowlist,
  purity wall are server-side only). A capability claim for the emitter
  MUST be added and flip to `available` only with green evidence
  (018 S13 contract).
- **FR-012**: The kit's artifacts MUST embed the catalog schema version
  (and the elements version when the catalog carries one) so emission-side
  version skew is diagnosable (Art. IX).

### Key Entities

- **Derivation options**: the catalog value, an optional component subset,
  and a lowering target; the complete input of every derivation.
- **Prompt artifact**: deterministic model-facing text carrying judgment
  (guidance, composition rules, validated example).
- **Schema artifact**: deterministic JSON Schema document carrying shape,
  specialized to the catalog, lowered per target, version-stamped.
- **Tool artifact**: name + description + schema artifact, provider-neutral.
- **Repair message**: the single-round formatted rejection derived from a
  validation report.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): a NEW package (first release): prompt,
  schema, tool, normalization and repair derivations plus their option and
  artifact types. No change to any existing package's surface;
  `@kimen/catalog` gains a consumer, not an export.
- **Bundle budget** (Art. IV): no runtime dependency beyond the catalog
  package (schema documents are constructed directly from catalog data);
  size measured by the existing size-limit machinery for the new package.
- **Accessibility** (Art. V): N/A — no rendered surface.
- **Tokens** (Art. VI): none; artifacts carry no styling surface.
- **Catalog/agent legibility** (Art. I): the kit IS agent legibility as a
  product: one source (the catalog) derives every model-facing artifact;
  guidance flows verbatim; determinism is contract (S11).
- **Guardrail/security boundary** (Art. VIII): the kit touches no
  enforcement path and adds none; S8/S13 pin consistency WITH the boundary
  and FR-011 pins the advisory disclaimer. The agreement between schema
  and validator is tested (SC-004) so the two can never drift silently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An integrator derives prompt, schema and tool from a
  registered catalog using only the public API and documentation, with the
  registered component present in all three artifacts (S1, S7, S9, S14 —
  zero Kimen source reading required).
- **SC-002**: Every schema-expressible rejection class agrees with the
  validation boundary: specs accepted by the derived schema are accepted
  by `validateUiSpec`, or rejected only for rules the schema cannot
  express (declared-actions cross-field, budgets) — proven by a seeded
  property test over generated specs (agreement property).
- **SC-003**: Strict-target structural guarantees hold for every catalog
  the tests generate: 100% of object schemas closed and all-required
  (S5), zero reference cycles in the recursion-free target (S6).
- **SC-004**: The repair loop is single-round by construction: the repair
  formatter never emits a second-round message and documentation states
  the fail-closed policy (S14 + docs check).
- **SC-005**: Determinism verified in CI: repeated derivations
  byte-identical (S11); the emitter capability claim reads `available`
  only with its named green evidence.

## Assumptions

- Exact public identifiers (function and package names) are plan-phase
  decisions; the working names are `catalogPrompt`, `uiSpecJsonSchema`,
  `uiSpecTool`, `normalizeEmission`, `repairPrompt` in package
  `@kimen/emitter`.
- Provider subset facts are pinned by research (2026-08): OpenAI strict
  supports recursion via `$ref` but demands all-required + closed objects
  (limits: 5000 properties, 1000 enum values, 120k chars, 10 nesting
  levels); Anthropic structured outputs / strict tools reject recursive
  schemas (hence the unrolled target, default depth 6). If a provider
  changes its subset, the lowering targets adapt as MINOR versions of the
  kit — the neutral default dialect is the stable core.
- Partial-JSON healing (text-level streaming repair) and an A2UI catalog
  export are explored-and-deferred: healing pends real demand; the A2UI
  export belongs to `@kimen/adapter-a2ui` (Art. VIII) as a follow-up.
- The UiSpec v2 flat id-map format (which would eliminate the recursion
  problem) is recorded as explored-and-deferred; v1 keeps the tree format.
- Numbering: 032 is the companion registration spec; 033 is the first
  free number after it.
- **Merge sequencing**: the traceability gate demands ≥1 traced test per
  S-ID, so this spec merges only with its first traced implementation
  (stacked on the 032 branch).
