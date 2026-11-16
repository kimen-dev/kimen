# Feature Specification: Kimen MCP server

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), Art. II (Proportionate Behavior Contracts),
     Art. I (AI-First: One Source of Truth) and Art. XI (Operational Security
     of Agents). -->

**Feature Branch**: `claude/feat-mcp-server-296d11` (spec `038-mcp-server`)

**Created**: 2026-11-16

**Status**: Confirmed — the founder confirmed the scenarios, the guardrail
scenarios and decisions D1–D8 as recommended on 2026-11-16 ("Confirmo,
implementa"), including the open points: `preflightUiSpec` in
`@kimen/catalog`, component-level tokens only, acknowledgment-only actions,
and the names `@kimen/mcp-server` / `kimen-mcp`.

**Input**: Founder request (2026-11-16): "A Kimen MCP server in a new package,
over stdio, so an agent (Claude Code, Claude Desktop, …) can (1) query the
catalog — components, props, slots, events, actions and tokens — read from the
generated artifacts, never a hand-written list; (2) validate a `UiSpec` with
the catalog validator and get structured errors a model can correct; (3) also
render."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Scenarios S6, S8, S10, S13, S14, S15, S16 and S17 exercise the Art. VIII
guardrail or the Art. XI containment boundary and require explicit founder
confirmation at human gate 1.

## Design-source analysis

Not applicable: the server has no visual surface of its own. Every pixel a
host displays comes from catalog components painted by the guarded renderer
(spec `028-guarded-renderer`) inside the MCP Apps surface document of
`@kimen/adapter-mcp-apps` (spec `030-adapter-mcp-apps`). The governing sources
are the constitution (Art. VIII, XI), the MCP specification and the MCP Apps
extension (SEP-1865), and the catalog contract.

## Decisions *(founder, 2026-11-16)*

**D1 — What "render" means.** The server never paints and never produces
HTML in Node. `kimen_render_spec` validates the spec exactly as the guarded
renderer would (D7) and, when it passes, returns an MCP Apps tool result built
with `@kimen/adapter-mcp-apps`: the validated spec in
`structuredContent.kimenSurface.spec`, painted by the host inside the
predeclared `ui://kimen/surface` document, whose only render path is the
guarded renderer. A host without MCP Apps support receives the same result's
text content: a deterministic plain-text outline of the validated spec (one
line per component with its slot, its text and its bound action, quoted as
data, capped at 200 lines). The outline is never markup and never an
alternate render path. Rejected alternatives: server-side HTML (a second
render path outside the guardrail) and returning the raw spec as text (the
model already has it; a person reading the tool result in a host without
surfaces gets nothing legible).

**D2 — Tools and resources.** Tools are the primary surface, because many
hosts let the model call tools but not read resources on its own; the
catalog is mirrored as resources for hosts and people that read them.

| Tool | Input | Answer |
| --- | --- | --- |
| `kimen_list_components` | none | catalog and elements versions; per component: tag, description, when to use, when not to use |
| `kimen_describe_component` | `tag` | props (type, allowed or documented values, default, required, range, URL format), slots, events, design tokens (`--ki-*` custom properties) and parts, plus the emitter's authoring block for that component |
| `kimen_validate_spec` | `spec` (object, or JSON text) | `{ ok, issues[] }`, each issue `{ code, path, message, value? }`, plus a text summary |
| `kimen_render_spec` | `spec` (object, or JSON text) | valid: the MCP Apps surface result (D1); invalid: an error result with the same issues and no surface payload |
| `kimen_surface_action` | `{ action, data }` | app-only (D6): acknowledgment of a declared action, or an error naming an undeclared one |

| Resource | MIME type | Content |
| --- | --- | --- |
| `kimen://catalog` | `application/json` | the generated catalog (`catalogData`) |
| `kimen://guide/ui-spec` | `text/markdown` | the emitter's catalog prompt (`catalogPrompt`, spec 033) |
| `kimen://schema/ui-spec` | `application/schema+json` | the emitter's catalog JSON Schema (`uiSpecJsonSchema`, draft 2020-12) |
| `ui://kimen/surface` | `text/html;profile=mcp-app` | the adapter's self-contained surface document |

Tool names carry the `kimen_` prefix so they never collide in hosts that
merge tool lists; `kimen_surface_action` is the name the adapter fixes. The
`spec` argument is declared as an open object or string in the tool's input
schema and validated by the handler, so a defect always comes back as
structured issues instead of a host- or SDK-level schema error; the full
JSON Schema is published as a resource rather than inlined in every tool
listing. "Actions" are not catalog entries: a spec declares them, and the
catalog says which event activates a bound action (the guide states the
rule; `kimen_describe_component` lists each component's events). No prompts
in v1.

**D3 — Limits.** Every input is untrusted.

- A spec is held to the catalog's budgets: 262,144 bytes, checked before the
  input is traversed; 32 levels and 512 components, the guarded renderer's
  budgets (D7).
- Answers are bounded: at most 50 issues per report (with the total count),
  each offending value cut to 256 characters; the text outline at 200 lines.
- One stdio message is at most 4 MiB. A longer line is discarded before it is
  parsed and reported on stderr; the server keeps serving.
- Tool arguments are bounded too: a component tag at most 128 characters, an
  action name at most 256. A call that omits `spec` is answered by the SDK's
  argument validation with an error naming it.
- A spec that does not validate is never rendered (S10). Only catalog
  components are accepted, only declared actions are acknowledged (S13), and
  URL properties are refused (D5).
- No network and no file system beyond the server's own bundle: the bundle
  embeds everything it serves, and the end-to-end suite runs it under the
  Node permission model with read access to the bundle only and no network
  (S16).
- The server writes nothing to stdout but protocol messages; diagnostics go
  to stderr. It takes no command-line arguments; any argument is refused with
  exit code 2 and a usage line on stderr.

**D4 — SDK and protocol versions** (checked 2026-11-16 against the npm
registry and modelcontextprotocol.io).

- The current MCP revision is `2026-07-28`, which removes the `initialize`
  handshake in favor of a per-request `_meta` envelope and `server/discover`.
  The prior revision is `2025-11-25`.
- `@modelcontextprotocol/sdk` (v1 line, `1.32.2`) is rejected: for a
  stdio-only server it pulls `express`, `hono`, `cors`, `jose`,
  `express-rate-limit` and more.
- Adopted: the v2 line, `@modelcontextprotocol/server@2.4.0` (published
  2026-10-23, past the 7-day `minimumReleaseAge`), pinned exactly. Its only
  dependencies are `zod ^4.2.0` (deduplicated to the `4.6.7` the catalog
  pins) and `@modelcontextprotocol/core@2.4.0`. Both are Apache-2.0, carry npm
  provenance from GitHub Actions and have no install scripts.
- `serveStdio` serves the modern era (`2026-07-28`) and, by default, the
  legacy era (`2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`,
  `2024-10-07`). The server keeps both, because shipping hosts still open with
  `initialize`; the end-to-end suite exercises `2026-07-28` and `2025-11-25`
  (S18).
- The MCP Apps revision is `2026-01-26`, through `@kimen/adapter-mcp-apps`
  (its `COMPAT.md`).
- Tests use `@modelcontextprotocol/client@2.4.0`, exact, as a
  devDependency. It adds `jose`, `cross-spawn`, `eventsource`,
  `eventsource-parser` and `pkce-challenge`, at development time only.
- The SDK is bundled into the binary (D8), so the published package declares
  no runtime dependency.
- A full `supply-chain-risk-auditor` pass and `gates-dependencies` run at
  implementation.

**D5 — URL properties are refused.** The server validates with
`allowedUrlOrigins: []`, so every URL property is refused (`url-origin` for
http(s) and relative references, `url-scheme` for any other scheme). The
surface document declares no network origin — it can load no remote image or
media — and a navigable URL would lead the host's frame away from the
guarded renderer; refusing at the server tells the model the truth instead of
shipping a property that silently does nothing. No operator flag to open
origins in v1 (Art. VII): it would admit URLs the surface still cannot load.

**D6 — Actions.** The server registers the adapter's app-only action tool
(`declareActionTool`, `visibility: ["app"]`). It acknowledges an action only
when a surface it rendered on the same connection declared it (remembering
the declared actions of the last 32 rendered surfaces) and refuses every
other action by name. In v1 an acknowledged action has no further effect: it
is not relayed to the model, because MCP Apps relays it with `ui/message` or
`ui/update-model-context`, which the adapter does not implement yet
(`COMPAT.md`). Relaying user actions to the model is a follow-up to spec 030.

**D7 — "Valid" means "the guarded renderer will paint it".** The catalog
validator alone accepts specs the guarded renderer refuses: 33 to 256 levels
deep, more than 512 components, a catalog-version skew. A server that reported
those as valid would hand the surface a spec it refuses, and the model would
never learn why. Recommended: `@kimen/catalog` exports one pure function,
`preflightUiSpec(input, options)`, that returns the renderer's verdict without
touching the DOM. It is the renderer's own existing preparation step
(validation, then budgets, tag grammar and activation guards), exported, not
reimplemented (Art. I). Both validation and render use it. This is an additive
public API change to `@kimen/catalog` (Art. IX, MINOR).

**D8 — Package.** `@kimen/mcp-server` at `packages/mcp-server`, private and
`0.0.0` like every package; binary `kimen-mcp`; server name `kimen`. The
build bundles the server, the SDK, the catalog, the emitter output, the
adapter's surface document and the token documentation of the component
manifest into one ESM file, `dist/kimen-mcp.mjs`, with esbuild, the
surface-document precedent. The build is deterministic (`scripts/build.mjs
--check` proves a rebuild byte-identical) and is the only artifact the
permission-model run reads. The package exports no library API in v1: the binary is its whole
contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent learns the catalog from the generated artifacts (Priority: P1)

An agent connected to the server lists the catalog, reads one component's
whole contract — props, slots, events, tokens and parts — and finds the same
data as resources. Everything comes from the generated catalog and the
generated component manifest, so components added there (for example the
native primitives of spec 037) appear without a server change.

**Why this priority**: an agent that cannot see the catalog cannot write a
valid spec; and a hand-written list would drift from the catalog the
renderer enforces.

**Independent Test**: start the built server over stdio with a real MCP
client and compare every answer with the generated catalog and manifest.

**Acceptance Scenarios**: S1, S2, S3 and S4.

---

### User Story 2 - An agent validates and corrects its spec (Priority: P1)

An agent validates a draft spec and receives, for every defect, the code,
the location and the offender, so it can fix the spec and validate again.
"Valid" means the guarded renderer will paint it.

**Why this priority**: validation with correctable errors is what turns a
model's first draft into a renderable surface.

**Independent Test**: validate a corpus of valid and invalid specs over
stdio and compare each report with the catalog's own verdict.

**Acceptance Scenarios**: S5, S6, S7, S8 and S15.

---

### User Story 3 - An agent renders its spec in the host (Priority: P1)

An agent renders a valid spec. An MCP Apps host displays it as real Kimen
components inside the predeclared surface; a host without MCP Apps shows a
plain-text outline of the same spec.

**Why this priority**: the founder asked for rendering explicitly; it is
what makes the catalog visible to the person in the conversation.

**Independent Test**: render over stdio; assert the tool's declared surface,
the surface payload, the surface resource and the text outline.

**Acceptance Scenarios**: S9, S10 and S11.

---

### User Story 4 - Hostile or out-of-contract traffic is contained (Priority: P1)

Model output and host traffic are untrusted. A spec outside the catalog is
never rendered, an undeclared action is refused, URL properties are refused,
an oversized message is dropped unparsed, and the server reaches no network
and no file beyond its own bundle.

**Why this priority**: Art. VIII makes the guardrail a tested security
boundary and Art. XI requires least privilege for agent tooling; a server an
agent drives is exactly where untrusted data arrives.

**Independent Test**: drive the adversarial corpus over stdio with the
server under the Node permission model; assert refusals and continued
service.

**Acceptance Scenarios**: S6, S8, S10, S13, S14, S15, S16 and S17.

---

### User Story 5 - A rendered surface's declared actions reach the server (Priority: P2)

A person activates a control of a rendered surface; the surface sends its
declared action to the server, which acknowledges it, while any action no
rendered surface declared is refused.

**Why this priority**: without the action tool, activating a control in an
MCP Apps host ends in an unknown-tool error; relaying actions to the model is
deferred (D6).

**Independent Test**: render a spec with a declared action, then call the
action tool with declared and undeclared actions.

**Acceptance Scenarios**: S12, S13 and S14.

---

### User Story 6 - Protocol churn stays declared and tested (Priority: P2)

The server serves clients of both MCP eras over stdio and declares the exact
MCP and MCP Apps revisions it supports.

**Why this priority**: MCP changed its lifecycle in `2026-07-28` and shipping
hosts lag; a server that only speaks one era fails half of them.

**Independent Test**: connect clients pinned to each era; audit the
compatibility matrix against the code.

**Acceptance Scenarios**: S18 and S19.

### Edge Cases

- A spec sent as JSON text is measured against the byte budget before it is
  parsed (the validator's string path); a spec sent as an object crosses the
  catalog's iterative purity wall.
- A spec that declares an unsupported `catalogSchemaVersion` is refused with
  the renderer's version-skew issue.
- A host that does not filter app-only tools lets the model call
  `kimen_surface_action` itself: undeclared actions are refused and a declared
  one is only acknowledged, so the call has no effect.
- The component manifest gains a component that the catalog does not carry,
  or the reverse: the catalog decides membership. Tokens and parts are listed
  for catalog components only.
- Spec 037 adds native-tag primitives to the catalog and the renderer: they
  appear in every answer after a rebuild, and the surface document embeds the
  same catalog because both build from it.
- The surface resource is large (about 571 kB): it is served unchanged from
  the adapter, byte-identical across builds, so a host's cached audit stays
  valid.
- The client closes stdin: the connection tears down and the process exits.
- Requests arrive concurrently: answers do not depend on order, except that an
  action is acknowledged only after the render that declared it has answered.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Kimen MCP server
  An agent connected over stdio discovers the Kimen catalog from the
  generated artifacts, validates UI specs with errors it can correct, and
  renders accepted specs only as an MCP Apps surface painted by the guarded
  renderer; the server reaches no network and reads nothing beyond its own
  package.

  Rule: The catalog is read from the generated artifacts, never a hand-written list

    # S1
    Scenario: Listing the catalog returns exactly the generated catalog
      Given a Kimen MCP server started over stdio
      When the agent lists the catalog components
      Then every component of the generated catalog appears exactly once with its usage guidance
      And no component outside the generated catalog appears

    # S2
    Scenario: Describing a component returns its whole published contract
      Given a Kimen MCP server started over stdio
      When the agent describes the component "ki-button"
      Then the answer lists its props with types, allowed values and defaults, its slots and its events
      And it lists the design tokens and parts the component exposes for theming
      And every entry matches the generated catalog and component manifest

    # S3
    Scenario: Describing a component outside the catalog is refused by name
      Given a Kimen MCP server started over stdio
      When the agent describes the component "ki-carousel"
      Then the call fails naming "ki-carousel" as not in the catalog
      And the failure points the agent to listing the catalog

    # S4
    Scenario: The catalog is also published as readable resources
      Given a Kimen MCP server started over stdio
      When the client lists the server's resources
      Then the catalog, the spec-authoring guide and the spec JSON Schema are listed
      And reading the catalog resource returns the same components as listing the catalog

  Rule: Validation answers with errors a model can correct

    # S5
    Scenario: A spec composed only of catalog components validates
      Given a spec with a "ki-card" holding a "ki-button" bound to the declared action "save"
      When the agent validates the spec
      Then the result reports the spec valid with no issues

    # S6
    Scenario Outline: An invalid spec is reported with a code, a location and its offender
      Given a spec whose root contains <defect>
      When the agent validates the spec
      Then the result reports the spec invalid
      And it carries an issue with code "<code>" at "<path>" naming "<offender>"

      Examples:
        | defect                                                | code              | path                | offender    |
        | the component "ki-carousel"                           | unknown-component | root.component      | ki-carousel |
        | a "ki-button" bound to the undeclared action "delete" | undeclared-action | root.action         | delete      |
        | a "ki-badge" whose prop "tone" is "loud"              | invalid-prop-type | root.props.tone     | loud        |
        | a "ki-button" with the key "__proto__"                | forbidden-key     | spec.root.__proto__ | __proto__   |

    # S7
    Scenario Outline: Validation refuses what the guarded renderer would refuse
      Given a spec of catalog components that <exceeds-budget>
      When the agent validates the spec
      Then the result reports the spec invalid with the "<rule>" issue the guarded renderer enforces

      Examples:
        | exceeds-budget                 | rule              |
        | nests 33 levels deep           | depth-budget      |
        | holds 513 components           | node-count-budget |

    # S8
    Scenario: An oversized spec is refused before it is traversed
      Given a spec whose serialized size is 300 KiB
      When the agent validates the spec
      Then the result reports a "size-budget" issue naming the 262144-byte budget
      And no other issue is reported

  Rule: Rendering goes only through the guarded renderer, inside an MCP Apps surface

    # S9
    Scenario: Rendering a valid spec returns a Kimen surface for the host to display
      Given a host that supports MCP Apps
      When the agent renders a valid spec
      Then the render tool declares the server's ui:// Kimen surface as its interactive view
      And the result carries the validated spec for that surface to paint through the guarded renderer
      And reading the surface resource returns the adapter's self-contained surface document

    # S10
    Scenario: A spec that does not validate is never rendered
      Given a spec containing the component "iframe" with source "https://evil.example"
      When the agent renders the spec
      Then the call fails with the same issues validation reports
      And the result carries no surface payload

    # S11
    Scenario: A host without interactive surfaces still receives a usable answer
      Given a host that does not support MCP Apps
      When the agent renders a valid spec with a card titled "Inventory" and a button "Refresh" bound to "refresh"
      Then the result's text content outlines the card, its text "Inventory", the button "Refresh" and its action "refresh"
      And the text content is plain text, never markup to display

  Rule: Only actions a rendered surface declared reach the server

    # S12
    Scenario: A declared action from a rendered surface is acknowledged
      Given the server rendered a surface that declares the action "refresh"
      When the surface sends the action "refresh" with the data "sku" "A-12"
      Then the server acknowledges the action "refresh"

    # S13
    Scenario: An action no rendered surface declared is refused
      Given the server rendered only surfaces that declare the action "refresh"
      When a caller sends the action "transfer-funds"
      Then the call fails naming "transfer-funds" as undeclared
      And the server acknowledges no action

    # S14
    Scenario: The action tool is reserved for the surface
      Given a Kimen MCP server started over stdio
      When the client lists the server's tools
      Then the action tool is marked visible to the app only
      And it is linked to the server's ui:// Kimen surface

  Rule: URL properties are refused, because the surface can neither load nor open them

    # S15
    Scenario Outline: A URL property is refused by the server's URL policy
      Given a spec with a "ki-avatar" whose source is "<url>"
      When the agent validates the spec
      Then the result reports a "<code>" issue at "root.props.src"
      And rendering the same spec is refused with the same issue

      Examples:
        | url                           | code       |
        | https://tracker.example/p.gif | url-origin |
        | /avatar.png                   | url-origin |
        | javascript:alert(1)           | url-scheme |

  Rule: The server is contained and protocol-disciplined

    # S16
    Scenario: The server works with no network and no file access beyond its own package
      Given the server started under the Node permission model with read access to its own bundle only and no network
      When an agent lists, describes, validates, renders and sends a declared action
      Then every call is answered
      And no access outside the server's own bundle is attempted

    # S17
    Scenario: An oversized protocol message is discarded without being parsed
      Given a running server
      When the client sends one message larger than 4 MiB
      Then the server discards the message and reports it on its error stream
      And the server answers the client's next request

    # S18
    Scenario Outline: Clients of both protocol eras are served over stdio
      Given a client that speaks MCP <revision>
      When the client connects to the server over stdio
      Then it lists the server's tools and renders a valid spec

      Examples:
        | revision   |
        | 2026-07-28 |
        | 2025-11-25 |

    # S19
    Scenario: The compatibility matrix declares exact protocol versions
      Given the server's packaged compatibility matrix
      When a maintainer audits the supported protocol versions
      Then it names the exact MCP revisions the server negotiates and the MCP Apps revision it serves
      And the matrix and the server's code declare the same versions
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is an agent-tooling boundary, not a UI component. Core behavior —
including the adversarial guardrail and containment scenarios — is covered;
the four interaction families belong to the catalog components, the guarded
renderer and the MCP Apps surface, which this server consumes and never
re-implements.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19 | |
| Keyboard path | | N/A — the server adds no interaction pattern; keyboard behavior is each catalog component's own contract inside the surface |
| Assistive-tech outcome | | N/A — the accessibility tree is produced by catalog components under their own contracts; the text outline is plain data, not rendered semantics |
| Form participation | | N/A — form behavior is the components' contract; the server transports declared actions, not form controls |
| Theming | | N/A — the surface's theming is spec 030's contract (S19, S20 there); the server lists each component's tokens as data and introduces none |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The server MUST serve MCP over stdio from one bundled binary,
  `kimen-mcp`, and write only protocol messages to stdout.
- **FR-002**: Every catalog answer MUST derive from the generated catalog
  (`@kimen/catalog` `catalogData`) and, for tokens and parts, from the
  generated component manifest (`packages/elements/generated/custom-elements.json`),
  embedded at build time; the server source MUST contain no component list.
- **FR-003**: `kimen_list_components` and `kimen_describe_component` MUST
  answer with structured content and a text equivalent; an unknown tag MUST
  fail by name and point to listing the catalog.
- **FR-004**: The server MUST publish the resources of D2, and the catalog
  resource MUST equal the catalog the tools answer from.
- **FR-005**: `kimen_validate_spec` MUST report the guarded renderer's
  verdict (D7), with every issue's code, path, message and offending value,
  bounded as D3 states.
- **FR-006**: `kimen_render_spec` MUST render nothing for a spec that does not
  pass FR-005, answering an error result with the same issues and no surface
  payload.
- **FR-007**: For a passing spec, `kimen_render_spec` MUST answer the
  adapter's surface result (`surfaceToolResult`) carrying the validated spec,
  and the tool MUST declare the `ui://kimen/surface` resource
  (`declareToolSurface`), served by `createKimenSurfaceResource`.
- **FR-008**: The render result's text content MUST be the plain-text outline
  of D1, derived from the validated spec only.
- **FR-009**: The server MUST register the adapter's app-only action tool and
  acknowledge only actions declared by a surface it rendered on the same
  connection (D6), refusing every other action by name.
- **FR-010**: Validation and render MUST apply the URL policy of D5.
- **FR-011**: The server MUST discard, unparsed, any stdio message longer than
  4 MiB, report it on stderr and keep serving.
- **FR-012**: The server MUST run, with every tool and resource working, under
  the Node permission model with read access to its own bundle only and no
  network, child process or worker permission.
- **FR-013**: The server MUST serve clients of the MCP revisions D4 lists and
  declare them, with the MCP Apps revision, in `COMPAT.md` and in code; a test
  MUST fail when the two drift.
- **FR-014**: `@kimen/catalog` MUST export `preflightUiSpec`, the guarded
  renderer's DOM-free verdict, implemented by the renderer's own preparation
  step (D7).
- **FR-015**: Tools MUST carry MCP tool annotations: the catalog, validation
  and render tools are read-only, idempotent and closed-world.

### Key Entities

- **Catalog answer**: one component's published contract — tag, guidance,
  props, slots, events — from the generated catalog, plus its tokens and parts
  from the generated manifest.
- **Validation report**: `ok` plus bounded issues `{ code, path, message,
  value? }`, the guarded renderer's verdict.
- **Surface result**: the adapter's `CallToolResult` — the validated spec in
  `structuredContent.kimenSurface`, the text outline in `content`.
- **Declared-action memory**: per connection, the declared actions of the
  last 32 rendered surfaces; the only authority for acknowledging an action.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): a new package `@kimen/mcp-server`, private
  until release, whose contract is the binary, its tools and resources, and
  `COMPAT.md`. One additive export in `@kimen/catalog`: `preflightUiSpec`
  (D7), documented in the catalog README and the GenUI agent surfaces
  (`docs/genui-surfaces.json`); the public-API snapshot gate covers
  `@kimen/elements` and `@kimen/tokens` only. No change to `@kimen/elements`,
  `@kimen/tokens`, `@kimen/emitter` or `@kimen/adapter-mcp-apps`.
- **Bundle budget** (Art. IV): no impact on existing package budgets. The
  binary embeds the surface document (about 571 kB), the SDK and the catalog;
  it receives its own size budget, set about 5% above the size measured at
  implementation and enforced by the package's test suite.
- **Accessibility** (Art. V): no new interaction pattern.
- **Tokens** (Art. VI): none introduced; the component manifest's token
  documentation is served as data.
- **Catalog/agent legibility** (Art. I): every tool description states when
  to use it and when not; the guide and schema resources are the emitter's
  derivations, never a second copy.
- **Guardrail/security boundary** (Art. VIII, XI): S6, S8, S10, S13, S14,
  S15, S16 and S17 are boundary scenarios and require explicit founder
  confirmation.
- **Dependencies** (Art. X): `@modelcontextprotocol/server@2.4.0` and
  `@modelcontextprotocol/client@2.4.0`, exact, development-time only (D4);
  dependency review runs because `pnpm-lock.yaml` changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the adversarial corpus (unknown components, undeclared
  actions, forbidden keys, URL properties, over-budget specs, oversized
  messages) is refused, with every refusal named, verified over stdio with a
  real MCP client — never model-judged.
- **SC-002**: The end-to-end suite passes with the server under the Node
  permission model, read access to its bundle only and no network, on the CI
  Node version.
- **SC-003**: Clients of `2026-07-28` and `2025-11-25` both list, validate and
  render against the same binary.
- **SC-004**: The components the server lists equal the generated catalog's,
  with zero hand-written component names in the server source.
- **SC-005**: `COMPAT.md` names exact MCP and MCP Apps revisions with zero
  placeholder rows and matches the code.
- **SC-006**: A public capability claim for the server is added as available
  only in a change where the capabilities gate passes with this feature's
  green evidence listed.

## Assumptions

- Real hosts (Claude Desktop, Claude Code, claude.ai, ChatGPT, VS Code) are
  not exercised by CI; interoperability is proven against the reference SDK
  client of both eras, and spec 030's real-browser suite already proves the
  surface document against the reference MCP Apps host bridge.
- Which shipping hosts display MCP Apps surfaces is not verified here; in a
  host that does not (a terminal client, for example) the text outline is the
  whole render experience.
- Node 26 (the CI version) is required for the permission-model run, because
  network permissions do not exist in Node 22; the server itself runs on the
  repository's supported Node versions.
- Spec 037 (native primitives) and spec 039 (A2UI 1.0) land in parallel. This
  feature depends on the catalog's generated artifacts, never on their
  content; whichever merges later rebases and regenerates.
- Relaying surface actions to the model, operator-configurable URL origins,
  HTTP transport and prompts are out of scope for v1.
