# Feature Specification: MCP Apps documents per catalog subset

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. II, IV and IX. -->

**Feature Branch**: `docs/spec-165-mcp-apps-subset-documents` (spec
`165-mcp-apps-subset-documents`)

**Created**: 2026-11-25

**Status**: Draft for the founder's approval. This is the contract only, and
nothing is implemented on this branch. S5 to S9 touch the guardrail and
security boundary (Art. VIII) and need the founder's explicit confirmation.
The open questions at the end are batched for the same review.

**Input**: the weight report of 2026-11-25 (opportunity 4; kept in the
founder's `internal/`, not in the repository). The one MCP Apps document
carries all 107 catalog components: 1.53 MB raw, 283.9 KB brotli. Every card
is an iframe that parses all of it, which took 244 ms to DOMContentLoaded in
Chromium with the CPU throttled 4×. A card with a form uses 109 KB of the
821 KB of component code in the document (13 %), and a table uses 25 KB (3 %).
The report measured replicas of the generator:

| Form card document | brotli |
|---|---:|
| Full document, as published | 283.9 KB |
| Only the subset's components | 151.6 KB |
| … and a catalog of the same subset | 110.4 KB |
| … and the catalog prose split, the tailored Stencil runtime and tokens pruned to what the script reaches | 71.7 KB (86 ms to DOMContentLoaded) |

The last row also depends on work that is in progress elsewhere (catalog
prose split, tailored runtime, token split). Nothing has been tried in a real
host.

**Constitution check**: the feature adds public API to
`@kimen/adapter-mcp-apps` (Art. IX, additive). It also changes what a document
may render, which is the guardrail of Art. VIII, so Art. II requires this
contract before any implementation. It needs no change to `@kimen/elements`,
`@kimen/catalog` or `@kimen/tokens` (FR-010).

## Design-source analysis

Not applicable. No component is drawn or changed; a subset document paints
the same components as the full one (S12).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A card loads only the components it can show (Priority: P1)

A server author knows that a tool shows forms. They declare a surface for a
"form" subset and point the tool at it. The host fetches, audits and caches a
document that carries those components and not the other hundred. Each card
then parses a fraction of what it parses today, and it looks the same.

**Why this priority**: it is the reason for the feature. The full document is
the heaviest thing Kimen ships to a browser, and a conversation pays for it
once per card.

**Independent Test**: declare a "form" subset surface, resolve it as a host
does, and compare it with the full document: what it registers, its size, and
how a form spec paints in each.

**Acceptance Scenarios**: S1, S2, S3, S12.

---

### User Story 2 - A subset surface renders its subset and nothing else (Priority: P1)

A result that names a component outside the subset is refused at the
document, even when the document happens to carry that component's code. The
server's own validation gives the same verdict, and a subset can never add a
component the catalog does not have.

**Why this priority**: a smaller document must not mean a weaker guardrail.
The report states the security condition: each document's validator uses the
same subset as its registered set.

**Independent Test**: deliver specs that name components outside the subset,
including one the document carries as another component's part, to the
document and to the server-side validator.

**Acceptance Scenarios**: S6, S7, S8, S9.

---

### User Story 3 - Hosts audit and cache every document as they do today (Priority: P1)

Each subset document is predeclared, self-contained and reproducible, with a
content policy of its own.

**Acceptance Scenarios**: S4, S5.

---

### User Story 4 - The server wires each tool to one surface (Priority: P2)

The tool, its app-only action tool and the catalog the agent is offered all
name the same surface.

**Acceptance Scenarios**: S10, S11.

### Edge Cases

- **An empty subset** fails generation, the way an empty catalog definition
  fails today (spec 032, `empty-definition`).
- **Native primitives** (spec 037) need no definition. A subset may name them,
  and they count as nameable like any other catalog entry.
- **The waiting placeholder** (spec 163) is a `ki-skeleton`. Every document
  carries it as the document's own part, and a spec may name `ki-skeleton`
  only when the subset names it (FR-002, S7).
- **The same subset under two names** produces two URIs with the same bytes.
  A host may cache both.
- **A host that cached an older document under the same URI** (the server
  changed the subset but kept the name) refuses specs that use a newly added
  component. This fails closed. Open question Q7.
- **Protocol behaviour** is the same in every document: the handshake,
  bridge, outbound allowlist, relay (spec 040), live updates (spec 157),
  action-rate budget (spec 162) and waiting state (spec 163).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: MCP Apps documents per catalog subset
  A server can serve a Kimen surface as a smaller predeclared document that
  carries only a named subset of the catalog. Each subset document stays
  self-contained and auditable under its own content policy, and it renders
  only its subset: the document, its validator, the server's validation and
  the catalog offered to the agent all use the same subset. The full document
  stays available for every surface that names no subset.

  Rule: A subset surface is a predeclared document of its own

    # S1
    Scenario: A tool's subset surface resolves to a document of that subset
      Given a server that declares a surface for the "form" subset of the catalog
      And a tool whose metadata declares that surface for its results
      When the host resolves the surface the tool declares
      Then the host receives one self-contained HTML document at that surface's own ui:// URI
      And the document carries the components of the "form" subset, not the whole catalog

    # S2
    Scenario: A subset that names a composite brings the parts the composite needs
      Given a surface served from a subset that names "ki-select" and not "ki-option"
      When a tool result arrives whose spec is a "ki-select" with three "ki-option" children
      Then the select paints with its three options

    # S3
    Scenario: A surface declared without a subset still serves the full document
      Given a server that declares a surface without naming a subset
      When the host resolves that surface
      Then the host receives the full surface document, which carries every catalog component

    # S4
    Scenario: A subset document regenerates byte for byte
      Given a document generated for the "form" subset
      When it is generated again from the same subset and the same package builds
      Then the two documents are byte-identical

    # S5
    Scenario: Each document's content policy admits only its own script and stylesheet
      Given a server that declares the full surface and a "form" subset surface
      When the host audits both documents before first render
      Then each content policy identifies that document's own inline script and stylesheet by digest
      And neither document nor its declared content policy references an external network origin

  Rule: A subset document renders only its subset

    # S6
    Scenario: A spec naming a catalog component outside the subset is refused
      Given a surface served from the "form" subset document
      When a tool result arrives whose spec names "ki-table", a catalog component outside the subset
      Then rendering refuses the spec and reports the unknown component "ki-table"
      And nothing of the spec is painted

    # S7
    Scenario: A component the document carries only to draw another cannot be named
      Given a subset document whose "ki-pagination" draws "ki-icon-button", which the subset does not name
      When a tool result arrives whose spec names "ki-icon-button"
      Then rendering refuses the spec and reports the unknown component "ki-icon-button"

    # S8
    Scenario: The server's validation for a subset surface reaches the document's verdict
      Given a server that validates the results of the "form" subset surface
      When it validates a spec that names "ki-table"
      Then the validation reports the unknown component "ki-table", as the "form" document does

    # S9
    Scenario: A subset cannot name a component the catalog does not have
      Given a subset definition that names "acme-chart", which is not in the catalog
      When the subset document is generated
      Then generation fails and names "acme-chart"
      And no document is produced

  Rule: A server picks a surface per tool

    # S10
    Scenario: A tool and its action tool name the same subset surface
      Given a server that declares the full surface and a "form" subset surface
      When it declares a tool that renders through the "form" subset surface
      Then the tool's metadata names the "form" surface's ui:// URI
      And the app-only action tool of that surface names the same URI

    # S11
    Scenario: The agent is offered the catalog of the tool's subset
      Given a tool that renders through the "form" subset surface
      When the agent reads the components it may use for that tool
      Then it is offered exactly the components the "form" document renders

  Rule: A subset changes the weight of the document, not how it looks

    # S12
    Scenario: A component looks the same in a subset document as in the full document
      Given a spec of a card with a form that the "form" document and the full document both accept
      When the host paints it in each document under the same theme
      Then every painted component has the same computed styles in both documents
```

Scenario vocabulary:

- **subset**: a named list of catalog components. "form" in the scenarios is
  an example name, not a decision (Q2).
- **carries**: the document registers that component's definition.
- **full surface document**: the document the package exports today as
  `SURFACE_DOCUMENT`.
- **unknown component**: the existing `unknown-component` refusal (spec 030
  S4), which names the tag. Refusal is atomic, as it is today.
- **the components the "form" document renders**: the effective subset
  (FR-003), the only components a spec there may name.

Guardrail scenarios that need the founder's explicit confirmation (Art. VIII,
gherkin-use-cases skill): **S5, S6, S7, S8 and S9**.

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-adapter feature, not a UI component. The families apply
to what a subset document paints.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S6, S7, S8, S9, S10, S11 | |
| Keyboard path | | N/A: no new interaction. Each component keeps its own keyboard contract whichever document carries it (S12 holds the styles equal; the definitions are the same modules) |
| Assistive-tech outcome | | N/A: the same component definitions run in both documents, so names, roles and states are unchanged |
| Form participation | | N/A: no field is added. A form in a subset document is made of the same components (S12) |
| Theming | S12 | |

Security, outside the families: S5 (content policy).

## Design decisions

- **D1. Predeclared documents per subset, never per call.** Each subset is
  its own static `ui://` resource, listed before any call, that a host
  fetches, audits and caches once (SEP-1865 `_meta.ui.resourceUri`; spec 030
  FR-002).
- **D2. One subset definition drives four things.** These are the
  definitions the document registers, the catalog its validator uses, the
  validator a server runs before returning a result, and the catalog offered
  to the agent for that tool. None of the four is configured apart from the
  others, so they cannot disagree.
- **D3. Inside a subset document, the built-in catalog is the subset.** Every
  validation and render path in the document uses that catalog by default,
  and the full catalog is not in the document at all. No code path in the
  document can validate against more than the subset. This also removes the
  unused catalog bytes (151.6 → 110.4 KB br in the report).
- **D4. A subset narrows the catalog; it never extends it.** A subset may
  name only components of the catalog (`catalog: true`, Art. VIII). Custom
  catalogs registered with `createCatalog` (spec 032) need their own element
  definitions in a document and stay out of scope (Q1).
- **D5. Composites bring their parts.** Naming `ki-select` brings
  `ki-option`, and naming `ki-tabs` brings `ki-tab` and `ki-tab-panel`. The
  parts are derived from the elements' component metadata at generation time
  (today `budgetGroup.members`), never hand-listed by a server, and they
  belong to the effective subset (FR-003). Q3 offers the alternative.
- **D6. A part a component draws is carried but cannot be named.** A
  component's definition registers the components it draws internally (for
  example, `ki-pagination` draws `ki-button` and `ki-icon-button`). The
  document has to carry them to paint, but only the effective subset is
  nameable by a spec (S7).
- **D7. Names and URIs keep today's rule.** A surface named `form` is
  `ui://kimen/form`. The server chooses the name, and a surface declared
  without a subset keeps serving the full document (S3), so every existing
  call keeps its meaning.
- **D8. Every document gets the full document's checks.** Each one is
  reproducible (S4) and passes the self-containment and content-policy gates
  (spec 030 FR-007, FR-013; S5). Each packaged document also has a size
  budget of its own (Art. IV).
- **D9. Recommended production for the first version.** Kimen generates a
  small set of named subset documents ("profiles") in its own build and
  publishes them with the adapter, one subpath export per profile, so a
  bundler ships only the profiles a server imports. The audit, budget and
  reproducibility checks stay in Kimen's CI. The scenarios also hold for
  server-generated subsets (Q1).

## Rejected alternatives

- **A document per call**, built for the spec of each result. It breaks
  predeclaration: SEP-1865 binds a tool to a resource listed before the call.
  It also breaks the host's audit and cache, because each call would bring a
  new document with new content-policy digests. It breaks the security model
  too: the model's output would choose what the document can render. And it
  needs a bundler while serving the request.
- **One full document whose components load lazily.** The content policy
  forbids any fetch (`default-src 'none'`). Components inlined as text and
  evaluated later would need evaluated code, which the policy refuses (spec
  030 FR-013). Every byte would still ship.
- **The full catalog in the document with a subset allowlist on top.** Two
  lists that can drift apart inside the guardrail. D3 makes that drift
  impossible by construction.
- **Validating the subset only on the server.** The document would still
  render any catalog component that a result carried, through a server bug or
  a path the server does not check. The guardrail has to hold at the document
  boundary (spec 030 FR-003).
- **Choosing the subset from tool input or arguments.** This is the per-call
  design again, under another name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (subset surface)**: the adapter MUST let a server declare a
  surface for a named subset of the catalog, served as a predeclared `ui://`
  resource whose content is one self-contained HTML document generated for
  that subset (spec 030 FR-002; S1).
- **FR-002 (registered set)**: a subset document MUST register the
  definitions of its effective subset (FR-003), of the components those draw
  internally, and of `ki-skeleton` for the waiting placeholder (spec 163). It
  MUST register no other catalog component. The set is derived at generation
  time from the subset's own names (Art. I).
- **FR-003 (effective subset)**: the effective subset is the components the
  subset names plus the parts their composite metadata declares (D5). It is
  exactly what the document's validator accepts, what the server-side
  validator accepts and what the agent is offered (S2, S8, S11).
- **FR-004 (built-in catalog)**: inside a subset document, the catalog that
  every validation and render path uses by default MUST be the effective
  subset, and the full catalog MUST NOT be in the document (D3; S6, S7).
- **FR-005 (narrow only)**: a subset definition MUST name only catalog
  components. Generation MUST fail on an empty subset, an unknown name or a
  component outside the catalog. The failure names each offending entry, and
  no document is produced (S9).
- **FR-006 (content policy)**: each document MUST carry its own content
  policy, with the digests of its own inline script and stylesheet and no
  external origin, and its declared `_meta.ui.csp` stays empty (spec 030
  FR-007, FR-013; S5).
- **FR-007 (deterministic)**: each document MUST regenerate byte for byte
  from the same subset and the same package builds. This is checked
  mechanically, as for the full document (S4).
- **FR-008 (the full document stays)**: a surface declared without a subset
  MUST serve the full document, with its content and behaviour unchanged
  (S3).
- **FR-009 (server wiring)**: for a subset surface, the adapter MUST give a
  server five things: the resource; the tool metadata and the app-only action
  tool, both naming the same URI (S10); a validator whose verdict matches the
  document's (S8); and the effective subset's catalog to offer the agent
  (S11).
- **FR-010 (boundaries)**: `@kimen/elements`, `@kimen/catalog` and
  `@kimen/tokens` do not change. The protocol messages, the bridge and the
  behaviour of specs 040, 157, 162 and 163 are the same in every document.
- **FR-011 (budget)**: each packaged subset document MUST have its own raw,
  gzip and brotli budget, derived from its components and tested like the
  full document's (Art. IV).
- **FR-012 (same look)**: a component MUST paint with the same computed
  styles in a subset document as in the full document under the same theme
  (S12).

### Key Entities

- **Subset**: a named list of catalog components chosen for a surface.
- **Effective subset**: the subset plus the parts of its composites. It is
  the only set a spec may name in that surface.
- **Subset document**: the self-contained HTML document generated for one
  subset, with its own content policy and size budget.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive, so a minor release. The shape is
  settled in the plan. Two proposals:
  (a) an optional subset on today's functions, plus a function that returns
  the subset's validator and catalog. This is the smallest change, but the
  server keeps four calls in agreement by name.
  (b) **Recommended**: one constructor, for example
  `defineKimenSurface({ name, subset })`, that returns the resource, the tool
  metadata, the action tool, a validator and the catalog together, so they
  cannot disagree (D2).
  Today's exports keep their signatures and meaning. The packaged profiles
  would be new subpath exports (D9).
- **Bundle budget** (Art. IV): the full document does not change. Each subset
  document gets its own budget (FR-011). The installed package grows by every
  profile it ships (Q5).
- **Accessibility** (Art. V): none. The components keep their contracts.
- **Tokens** (Art. VI): none added. Q4 covers pruning the stylesheet.
- **Catalog/agent legibility** (Art. I): for a tool, the agent is offered the
  subset's catalog with the same descriptions as the full catalog (S11).
- **Guardrail/security boundary** (Art. VIII): yes. S5 to S9 are standalone
  scenarios, flagged for explicit confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: measured on the same commit, the "form" document (or whichever
  form profile is approved) is at most 40 % of the full document's brotli
  size. The report's replica gives 39 % with the subset and its catalog
  alone.
- **SC-002**: the implementing PR reports the DOMContentLoaded time of the
  form document against the full one, in Chromium with the CPU throttled 4×
  (median of 7 loads). The report's replica, with every reduction applied,
  measured 86 ms against 244 ms.
- **SC-003**: S6 to S9 hold in 100 % of runs.

## Assumptions

- The pinned MCP Apps revision (2026-01-26, `COMPAT.md`) lets a server list
  several `ui://` resources, each tool naming one in `_meta.ui.resourceUri`.
  No production host has been tried with more than one Kimen resource (Q8).
- Every document shares one protocol revision and one `COMPAT.md` row.
- The other reductions in progress (catalog prose split, tailored Stencil
  runtime, token split) are independent of this feature. They make every
  document smaller, the full one included.

## Open questions for the founder

1. **Q1. Who defines subsets?** (a) Kimen publishes named profiles
   (recommended for the first version, D9). (b) A server author generates
   their own subset documents at build time with a Kimen generator, which
   needs esbuild and the elements build in their build, and gives full
   freedom. (c) Both: (a) first, (b) later. S1 to S12 hold under every
   answer.
2. **Q2. Which profiles, under which names?** The report measured two:
   - a form card: `ki-card`, `ki-input`, `ki-select` (with `ki-option`),
     `ki-checkbox`, `ki-textarea`, `ki-button`, `ki-stack` and `ki-skeleton`;
   - a table: `ki-table`, `ki-badge`, `ki-stack` and `ki-skeleton`.

   Are these the first profiles, and are the names "form" and "data"?
3. **Q3. Composites.** Complete the parts automatically (recommended, S2 as
   written), or fail generation when a subset names a composite without its
   parts (S2 would become a generation failure)?
4. **Q4. Tokens in subset documents.** Keep the full token stylesheet in the
   first version (simplest, so S12 holds trivially), or prune it to the tokens
   the document's components and page contract read? Pruning saves about
   15 KB br more on the form card, depends on the token split, and S12 is its
   guard.
5. **Q5. Install weight.** Each published profile adds its document to the
   package (the form card is about 0.6 MB raw before the other reductions;
   estimate). Subpath exports keep server bundles small but not installs. Is
   that acceptable, or should profiles live in a separate package?
6. **Q6. `kimen-mcp`.** Should the stdio server move its render tool to
   subset surfaces (for example one render tool per profile), or keep the
   full document? Either changes its tool list, so it is a separate decision
   and not part of this contract.
7. **Q7. A subset that changes under the same name.** A host that cached the
   older document fails closed for newly added components. Leave the name to
   the server and document the rule (recommended), or derive part of the URI
   from the subset's content so the URI changes with it?
8. **Q8. Real hosts.** Before the capability claim moves, run the host test
   of 2026-11-24 (Claude desktop) with two Kimen resources on one server?
