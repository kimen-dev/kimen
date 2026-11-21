# Feature Specification: MCP Apps adapter

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), Art. II (Proportionate Behavior Contracts)
     and Art. I (AI-First: One Source of Truth). -->

**Feature Branch**: `feat/fase-p-specs` (spec `030-adapter-mcp-apps`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Deliver `@kimen/adapter-mcp-apps` (roadmap §5,
after `@kimen/adapter-a2ui`): expose Kimen surfaces to MCP Apps (SEP-1865)
hosts as predeclared `ui://` resources with the host↔surface bridge. Same
principle as every adapter: the neutral catalog plus the guarded renderer are
the only render path, the surface document is self-contained and auditable,
the adapter declares its exact protocol versions in COMPAT.md, and public
capability claims follow green evidence."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Scenarios S4, S5, S6, S7 and S8 exercise the Art. VIII security boundary and
require standalone founder attention at human gate 1. S20 (host theme values
validated at the protocol boundary) and S21 (the document's content policy)
joined that boundary with the 2026-11-14 amendment and carry the same
requirement.

## Design-source analysis (Figma)

Not applicable: this feature is a protocol boundary with no visual surface of
its own. Every pixel a host displays comes from catalog components rendered by
the guarded renderer (specs `027-runtime-catalog` and `028-guarded-renderer`);
the adapter transports specs, results and declared actions between an MCP Apps
host and that renderer. The governing sources are the constitution (Art.
VIII), the MCP Apps proposal (SEP-1865) and the catalog contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An MCP host renders a tool result as a Kimen surface (Priority: P1)

An MCP tool author declares a Kimen surface for a tool's results. An MCP
Apps-capable host resolves that declaration to a predeclared resource — one
self-contained document it can audit and cache before ever rendering it — and
displays the tool's result through catalog components. A host without
interactive-surface support still receives a complete text answer.

**Why this priority**: this is the adapter's reason to exist — without the
declare → resolve → render path there is no feature. Roadmap §5 promises
exactly this surface.

**Independent Test**: serve a fixture tool through the adapter, resolve its
declared resource in a host harness, and verify the `ui://` addressing, the
self-contained document, the rendered catalog output and the text fallback
using only packaged artifacts.

**Acceptance Scenarios**: S1, S2 and S3.

---

### User Story 2 - Malicious tool output cannot escape the guardrail (Priority: P1)

A model-driven tool emits hostile output — a non-catalog component, an
undeclared property, smuggled markup, an undeclared action, a message that is
not protocol traffic. Every hostile part is refused or stays inert, every
refusal is observable, and nothing renders or dispatches outside the catalog
and the declared actions.

**Why this priority**: Art. VIII makes the guardrail a tested security
boundary; an adapter is precisely where untrusted protocol data meets the
renderer. A single escape invalidates the whole GenUI promise.

**Independent Test**: feed an adversarial fixture corpus (each S4–S7 input
verbatim) through the adapter and assert refusal, inertness and reporting
deterministically — no model in the loop.

**Acceptance Scenarios**: S4, S5, S6 and S7. The security corpus for the
human gate and for SC-001 is S4–S8: S8 (undeclared protocol version) lives
in User Story 3 because it is also churn discipline, and it completes this
story's corpus — one suite, two stories.

---

### User Story 3 - Protocol churn dies inside the adapter (Priority: P2)

The MCP Apps protocol is young and will move. The adapter declares the exact
protocol version(s) it supports, refuses versions it does not declare, and
absorbs a breaking protocol release — or is retired — without touching
`@kimen/elements`, `@kimen/tokens` or `@kimen/catalog`.

**Why this priority**: disposability is the constitutional design of every
adapter (Art. VIII); without the version discipline the core inherits the
protocol's volatility.

**Independent Test**: inspect the packaged compatibility matrix, connect a
harness announcing an undeclared protocol version, and evaluate workspace
module boundaries for protocol-type leakage.

**Acceptance Scenarios**: S8, S9 and S10.

---

### User Story 4 - The delivered document is the whole surface (Priority: P1)

An MCP server can hand a host nothing but the resource: it cannot inject a
script or a stylesheet into a self-contained document. So the document the
adapter delivers carries everything a Kimen surface needs — the definition of
every catalog component and the design tokens that style them — and follows
the color scheme its host announces. A host that only speaks the protocol
shows real, styled, operable Kimen components.

**Why this priority**: without it the adapter renders unknown elements with no
behavior and no styling in every real host — the declare → resolve → render
path of User Story 1 ends in nothing a user can use.

**Independent Test**: load the packaged document in a sandboxed frame of a
real browser, drive it only through `postMessage` as a host would, and
observe registered, token-styled components, an action reaching the host and
the color scheme following the host's theme.

**Acceptance Scenarios**: S16, S17, S18, S19, S20 and S21.

### Edge Cases

- Partial or streaming tool input (`ui/notifications/tool-input-partial`) is
  acknowledged and never rendered in v1: the spec renders only from the tool
  result, through the same guarded path — never a second parser or a relaxed
  "fast path" for incomplete specs.
- The text fallback is derived from the same tool result and never becomes an
  alternate render path: markup inside text content is data, not UI.
- A host caches the audited resource: the packaged surface document must be
  deterministic (byte-identical regeneration) so a cached audit stays valid.
- A refusal must not silently blank the surface: hostile parts are refused
  and reported while every part that does render comes from the catalog (S4).
- A host that fails to enforce the declared content policy: the surface
  document must remain safe by construction (inline-only, no code execution
  from data) — defense in depth, not delegation to the host.
- The host never renders the declared surface at all: the text content (S3)
  is the complete degraded experience.
- A host that announces no theme: the document keeps following the viewer's
  own color-scheme preference; nothing is guessed.
- A host that announces host style variables (`hostContext.styles`): they are
  kept in the host context and not applied — appearance stays token-driven
  (see Assumptions).
- XML namespace names (`http://www.w3.org/2000/svg`, `/1999/xhtml`,
  `/1999/xlink`) appear verbatim in the bundled component runtime because the
  DOM requires them as identifiers. They are never dereferenced; the
  self-containment audit (S2) allowlists exactly those three names and
  nothing else.
- A catalog component whose content is a network resource (an avatar image,
  a video source): the document declares no network, so the resource does not
  load and the component shows its own fallback.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: MCP Apps adapter
  Kimen surfaces reach MCP Apps hosts as predeclared, self-contained
  resources rendered exclusively through the neutral catalog and its guarded
  renderer; the protocol is absorbed inside a disposable adapter that
  declares exactly what it supports.

  Rule: Surfaces are predeclared, self-contained and auditable

    # S1
    Scenario: A tool declares its Kimen surface and the host resolves it
      Given an MCP tool whose metadata declares a Kimen surface for its results
      When the host resolves the declared surface
      Then the surface is served as a resource addressed by a ui:// URI
      And the resource is one self-contained HTML document embedding the catalog renderer

    # S2
    Scenario: The surface document references no external origin
      Given the adapter's packaged surface document
      When the host audits the document before first render
      Then every script and style the document needs is inline
      And neither the document nor its declared content policy references an external network origin

    # S3
    Scenario: A host without interactive surfaces still receives a usable answer
      Given a host that does not support interactive tool surfaces
      When the tool returns a result through the adapter
      Then the result carries text content that describes the outcome without the surface

  Rule: The guarded renderer is the only render path

    # S4
    Scenario Outline: Hostile spec content is refused at the guardrail
      Given a tool result whose surface spec contains <hostile-input>
      When the surface renders the result
      Then rendering refuses the hostile part and reports <refusal>
      And every component that does render comes from the catalog

      Examples:
        | hostile-input                                        | refusal                      |
        | an "iframe" component targeting https://evil.example | the unknown component name   |
        | an undeclared property "onclick" on a catalog button | the undeclared property name |

    # S5
    Scenario: Markup smuggled in result data stays inert
      Given a tool result whose text field contains "<script>document.title='owned'</script>"
      When the surface renders the result
      Then the field appears as inert text
      And the surface document title is unchanged

    # S6
    Scenario: Only declared actions leave the surface
      Given a rendered surface whose spec declares only the action "refresh-inventory"
      When the surface attempts to dispatch the action "transfer-funds"
      Then no message for "transfer-funds" reaches the host
      And the attempt is reported as refused
      And dispatching "refresh-inventory" sends one tools/call request naming the adapter's app-only action tool

    # S7
    Scenario: A message without the protocol envelope never becomes state
      Given a rendered surface connected to its host
      When the surface receives the raw string "javascript:import('https://evil.example/x.js')" instead of a protocol message
      Then the surface ignores it and its rendered state is unchanged

  Rule: Protocol churn is absorbed inside the disposable adapter

    # S8
    Scenario: An undeclared protocol version is refused, never guessed
      Given a host whose ui/initialize result negotiates an MCP Apps protocol version absent from the adapter's compatibility matrix
      When the host and the surface negotiate their connection
      Then the adapter refuses the connection naming the versions it supports
      And the surface never sends ui/notifications/initialized
      And no surface renders under the undeclared version

    # S9
    Scenario: The compatibility matrix declares exact protocol versions
      Given the packaged adapter
      When a consumer inspects its compatibility matrix
      Then every row pairs an adapter version with the exact MCP Apps protocol version(s) it supports
      And no placeholder row remains

    # S10
    Scenario: No protocol type reaches the core packages
      Given the workspace with the adapter package present
      When module boundaries are evaluated
      Then no MCP Apps protocol type is importable from the elements or catalog packages

  Rule: The surface speaks the MCP Apps 2026-01-26 lifecycle

    # S11
    Scenario: The surface opens the connection with the ui/initialize handshake
      Given the surface document embedded by an MCP Apps host
      When the surface starts
      Then its only message before the host answers is one ui/initialize request carrying its app info, its capabilities and protocol version "2026-01-26"
      And after the host's successful result it sends ui/notifications/initialized

    # S12
    Scenario: Host traffic before the handshake completes never becomes state
      Given a surface whose ui/initialize request has not been answered
      When the host sends a ui/notifications/tool-result carrying a valid surface spec
      Then nothing renders and the message is reported as refused
      And no action can leave the surface

    # S13
    Scenario: A tool result notification renders through the guarded renderer
      Given a surface whose handshake has completed
      When the host sends ui/notifications/tool-result whose structured content carries a catalog spec
      Then the spec renders through the guarded renderer
      And a tool result without a Kimen surface is refused and leaves the rendered state unchanged

    # S14
    Scenario: The host's teardown request is answered and closes the surface
      Given a rendered surface whose handshake has completed
      When the host sends a ui/resource-teardown request
      Then the surface answers that request with an empty result
      And no action leaves the surface afterwards

    # S15
    Scenario: A host request the surface does not implement gets a JSON-RPC error
      Given a surface whose handshake has completed
      When the host sends a request for a method the surface does not implement
      Then the surface answers with a JSON-RPC "method not found" error for that request id

  Rule: The delivered document is a complete Kimen surface

    # S16
    Scenario: A tool result renders as real, token-styled Kimen components
      Given the packaged surface document embedded by a host that supplies only protocol messages
      When the host sends a tool result whose spec contains a ki-button labeled "Confirm"
      Then "Confirm" renders as a registered Kimen button styled by the Kimen design tokens

    # S17
    Scenario: Activating a rendered control sends its declared action to the host
      Given the packaged surface document showing a "Confirm" button bound to the declared action "confirm"
      When the user activates the button
      Then the host receives one tools/call request naming the adapter's app-only action tool with the action "confirm"

    # S18
    Scenario: Every catalog component renders inside the document under its own content policy
      Given the packaged surface document embedded by an MCP Apps host
      When the host sends a tool result whose spec contains every component of the neutral catalog
      Then every component renders as a registered Kimen element
      And the document reports no content-policy violation

    # S19
    Scenario Outline: The document follows the host's color scheme
      Given the packaged surface document embedded by an MCP Apps host
      When the host announces the theme "<theme>" in <message>
      Then the document renders in the <theme> color scheme

      Examples:
        | theme | message                                              |
        | dark  | its ui/initialize result                             |
        | light | a ui/notifications/host-context-changed notification |

    # S20
    Scenario: A theme the protocol does not define leaves the color scheme unchanged
      Given a surface rendering in the dark color scheme its host announced
      When the host sends ui/notifications/host-context-changed with the theme "sepia"
      Then the document stays in the dark color scheme

    # S21
    Scenario: The content policy admits only the document's own script and stylesheet
      Given the adapter's packaged surface document
      When the host audits the document before first render
      Then its content policy identifies the inline script and the inline stylesheet by digest
      And the policy permits no other inline script, inline style or evaluated code
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-boundary feature, not a UI component. Core behavior —
including the adversarial guardrail scenarios — is covered; the four
interaction families belong to the catalog components and the guarded
renderer contract, which this adapter consumes and never re-implements.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S21 | |
| Keyboard path | | N/A — the adapter adds no interaction pattern; keyboard behavior is each catalog component's own contract |
| Assistive-tech outcome | | N/A — the accessibility tree is produced by catalog components under their own contracts; the adapter adds no rendered semantics |
| Form participation | | N/A — form behavior is the components' contract; the adapter transports declared actions, not form controls |
| Theming | S19, S20 | The host's light/dark theme selects the token color scheme; mapping host style variables onto tokens stays deferred (see Assumptions) |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The adapter MUST live in its own package,
  `@kimen/adapter-mcp-apps` at `packages/adapter-mcp-apps`, created through
  the adapter generator structure and behind the `scope:adapter` module
  boundary. No MCP Apps protocol type may be importable from
  `@kimen/elements` or `@kimen/catalog` (Art. VIII). The adapter consumes
  the catalog; it never forks or re-declares it.
- **FR-002**: The adapter MUST let an MCP tool declare a Kimen surface for
  its results, served as an MCP resource addressed by a `ui://` URI whose
  content is one self-contained HTML document — all scripts and styles
  inline, no external network origin in the document or its declared content
  policy — so a host can audit and cache it before rendering.
- **FR-003**: The only render path inside a surface MUST be the guarded
  renderer over the neutral catalog (spec `028-guarded-renderer`), reached
  through the live surface (spec `035-live-surface`), whose every batch
  crosses the same boundary (amended by spec 157, 2026-11-21). The four
  guardrail invariants hold at this protocol boundary: only catalog
  components render, only declared actions dispatch, unknown props are
  rejected and reported, and no code-execution path exists from spec or
  result data.
- **FR-004**: Protocol traffic entering the surface MUST be validated at the
  boundary before it affects rendering; a message that does not conform to
  the declared protocol envelope is ignored without state change. Outbound
  traffic MUST be limited to declared actions, the protocol's required
  lifecycle messages, and the one `ui/message` relay spec
  `040-surface-action-relay` defines for a declared action the integrating
  server acknowledged for relay, all mediated by the host (amended by spec
  040 D8, 2026-11-16; S6 and S17 hold as written). Before the `ui/initialize`
  handshake completes the surface sends nothing but that request, and host
  traffic does not affect rendering. A declared action leaves as a standard
  `tools/call` to one app-only tool whose name is fixed by the adapter, never
  taken from spec data.
- **FR-005**: Every surfaced tool result MUST also carry text content usable
  by hosts without interactive-surface support. The text fallback is data,
  never a second render path.
- **FR-006**: `COMPAT.md` MUST pair each adapter version with the exact MCP
  Apps protocol version(s) it supports; the generator's placeholder row
  blocks release. The adapter MUST refuse to operate under a protocol
  version absent from the matrix, naming the versions it does support.
- **FR-007**: Self-containment MUST be verified mechanically: a
  deterministic gate fails when the packaged surface document or its
  declared content policy references an external origin, or when any script
  or style is not inline.
- **FR-008**: Public status MUST keep the MCP Apps adapter labelled planned
  under the `protocol-adapters` capability until this feature's
  deterministic evidence is green; changing that claim requires listing the
  green evidence through the capabilities gate
  (`018-project-integrity-hardening` FR-022/S13).
- **FR-009**: A breaking MCP Apps protocol release MUST be absorbable inside
  this package alone — a new adapter version row in the matrix, or retiring
  the adapter — with zero changes to `@kimen/elements`, `@kimen/tokens` or
  `@kimen/catalog` (Art. VIII: adapters are disposable).
- **FR-010**: The package MUST join the root packaging validation (publint +
  attw) and the standard gate suite like every publishable package.
- **FR-011**: The packaged surface document MUST register the definition of
  every component of the neutral catalog and embed the default token
  stylesheets inline, so a host that supplies only protocol messages displays
  operable, token-styled Kimen components. The registered set is derived from
  the catalog at generation time, never hand-listed (Art. I).
- **FR-012**: The surface MUST apply the host's color scheme: a `theme` of
  `light` or `dark` in the host context — in the `ui/initialize` result or a
  later `ui/notifications/host-context-changed` — selects the document's
  token color scheme. Any other value is ignored without changing the
  scheme. Without an announced theme the document follows the viewer's
  preference.
- **FR-013**: The document's content policy MUST identify its inline script
  and inline stylesheet by digest and permit no other inline script, inline
  style or evaluated code. The document MUST operate inside that policy
  without raising a violation.

### Key Entities

- **Surface resource**: the predeclared, self-contained HTML document a host
  resolves through a `ui://` URI, audits, caches and renders.
- **Surface spec**: the catalog-schema payload derived from tool input and
  results; the only input the renderer accepts.
- **Surface update**: an optional live batch and the page revision it was
  computed on, carried next to the full spec in a tool result; applied only
  on that revision and only when the live surface accepts it (spec 157).
- **Declared action**: a named interaction declared in the surface spec; the
  only application traffic allowed to leave the surface, as its `tools/call`
  and, when the server asks for it, its spec 040 relay.
- **Protocol envelope**: the JSON-RPC 2.0 message shape (request,
  notification, result, error) host and surface exchange over `postMessage`
  (MCP Apps 2026-01-26); traffic outside it is ignored.
- **Lifecycle**: the View-initiated `ui/initialize` →
  `ui/notifications/initialized` handshake that gates every other message,
  ending with the host's `ui/resource-teardown` request.
- **Compatibility matrix**: `COMPAT.md` rows pairing each adapter version
  with the exact protocol version(s) it supports.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new package `@kimen/adapter-mcp-apps`
  with its own SemVer; `COMPAT.md` is versioned alongside it. Zero change to
  the public API of `@kimen/elements`, `@kimen/tokens` or `@kimen/catalog`.
- **Bundle budget** (Art. IV): zero impact on existing package budgets. The
  surface document embeds the renderer, the catalog validator, every catalog
  component definition and the default token stylesheets, so it receives its
  own size budget, enforced by the package's test suite
  (`tests/resource.spec.ts`) within the raw, gzip and brotli limits
  `scripts/lib/bundle-size-budget.mjs` calculates from the component
  inventory (amended by spec 157, 2026-11-21). Any protocol runtime
  dependency is subject to the audit-and-pin supply-chain gate.
- **Accessibility** (Art. V): no new interaction pattern; each catalog
  component's APG pattern applies unchanged inside the surface.
- **Tokens** (Art. VI): none introduced. The document embeds the default
  theme's token stylesheet and page contract unchanged and selects their
  color scheme from the host's theme; mapping host style variables onto
  `--ki-*` tokens is explicitly deferred (see Assumptions).
- **Catalog/agent legibility** (Art. I): when-to-use — presenting a Kimen
  surface for an MCP tool's results inside an MCP Apps host. When NOT to use
  — any non-MCP host (use the catalog and renderer directly, or the A2UI
  adapter for A2UI hosts); any surface that needs open HTML instead of the
  declarative catalog pattern.
- **Guardrail/security boundary** (Art. VIII): this feature IS an adapter
  surface. S4–S8 are standalone security-boundary scenarios and require
  explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the adversarial fixture corpus (unknown components,
  undeclared properties, undeclared actions, script payloads, non-envelope
  messages, undeclared protocol versions) is refused or stays inert, with
  every refusal reported — verified deterministically in CI, never
  model-judged.
- **SC-002**: The packaged surface document contains zero external origin
  references, verified mechanically on every PR.
- **SC-003**: At first release the compatibility matrix names at least one
  exact MCP Apps protocol version and contains zero placeholder rows.
- **SC-004**: A clean host harness resolves the declared resource and
  renders a fixture tool result using only packaged artifacts, with no
  workspace resolution.
- **SC-005**: The public MCP Apps adapter claim changes from planned only in
  a change where the capabilities gate passes with this feature's green
  evidence listed.
- **SC-006**: In a real browser, the packaged document — driven only through
  protocol messages inside a sandboxed frame — registers 100% of the catalog
  components, renders them token-styled, delivers a user activation to the
  host as its declared action and follows the host's light/dark theme, with
  zero content-policy violations.

## Assumptions

- **Spec risk — protocol maturity**: MCP Apps (SEP-1865) is a proposal by
  Anthropic, OpenAI and the MCP-UI authors. Its ratification status and the
  MCP spec revision that includes it MUST be verified at plan time. The
  exact metadata keys (`_meta.ui.*`), the concrete bridge message API and
  the content-policy declaration keys are deliberately not fixed by this
  contract; scenarios assert observable outcomes only. `COMPAT.md` pins the
  exact protocol version(s) after that verification — until then the
  placeholder row blocks release (S9).
- **Amendment — conformance to the stable revision (2026-11-05)**: verified
  against MCP Apps `2026-01-26` (`specification/2026-01-26/apps.mdx` in
  github.com/modelcontextprotocol/ext-apps at commit
  `19256f52cad5517ba8272581ed2e11d6a81273d5`). The first implementation
  used a bridge vocabulary the stable revision does not define (`ui/ready`,
  `ui/toolResult`, `ui/action`) and skipped the `ui/initialize` handshake, so
  a conforming host would never deliver a result. Through the Art. II
  amendment path S6 and S8 were tightened to the real lifecycle (no IDs
  retired) and S11–S15 appended; the security invariants are unchanged.
- The `ui://` addressing and the self-contained text/html resource shape
  come from the SEP as proposed. Unlike 029 — which deliberately excludes
  all protocol vocabulary from its Gherkin — this contract fixes both facts
  in approvable scenarios (S1, S2) and in FR-002: a deliberate, declared
  trade-off, because they are the deliverable named by roadmap §5 and
  keeping them abstract would make S1/S2 unfalsifiable. The accepted
  consequence: if ratification changes the addressing or resource shape,
  S1/S2 are amended through the normal Art. II spec-amendment path (retired
  IDs, new S-IDs appended) at plan time, before implementation — never by
  silent drift. The change stays inside this adapter (Art. VIII) and never
  weakens the contract's security invariants.
- This feature depends on `027-runtime-catalog` and `028-guarded-renderer`
  and follows `029-adapter-a2ui` per roadmap §5. The 027–030 numbering is
  the first globally free range across branches. Like the rest of the
  quartet, this spec merges to main only together with its first traced
  tests (see the merge-sequencing assumption in `027-runtime-catalog`).
- The `protocol-adapters` capability is shared with `029-adapter-a2ui`:
  029's evidence may advance the public A2UI claim only in a form that
  keeps this adapter labelled planned (this feature's FR-008; 029's FR-008
  carries the mirror obligation), splitting the capability entry per
  adapter if the registry cannot express both states in one entry.
- Frame isolation is the host's obligation, but the surface must be safe
  even for a host that does not enforce the declared content policy
  (defense in depth: inline-only document, guarded render path, no code
  execution from data).
- **Amendment — the delivered document is the whole surface (2026-11-14)**:
  the first release declared registering the `ki-*` definitions and loading
  the tokens "the consuming MCP server's step". A server cannot take that
  step: the resource is one self-contained document and the host loads
  nothing else, so every real host displayed unknown elements with no
  behavior and no styling. Through the Art. II amendment path S16–S21 were
  appended (no IDs retired): the document now carries every catalog
  component definition and the default token stylesheets, follows the host's
  light/dark theme (`McpUiHostContext.theme`, apps.mdx:544-545), and its
  content policy names its script and stylesheet by digest instead of
  allowing any inline code.
- **Amendment — live updates (2026-11-21)**: spec 157 makes the document
  paint through the live surface. A tool result may carry an update next to
  its full spec; the action call carries the bound node's `id` and the page
  revision. No S-ID is retired or added here; FR-003, Key Entities and the
  bundle budget sentence are amended.
- Mapping host **style variables** (`hostContext.styles`, apps.mdx:895-908)
  onto `--ki-*` tokens stays out of scope: there is no verified one-to-one
  mapping between the host's standardized variables and the token layers,
  and a wrong one would silently break contrast. It enters through a
  follow-up contract. Only the theme (light/dark) is applied.
- WebMCP is tracked but shapes no API here (Art. VIII).
- In-repo references for implementers: `.agents/skills/create-mcp-app/SKILL.md`
  and `.agents/skills/mcp-builder/SKILL.md`. Their network and install steps
  run only inside the credential-free sandbox (Art. XI).
