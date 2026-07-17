# Feature Specification: Guarded renderer

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, IV, VII and IX. -->

**Feature Branch**: `feat/fase-p-specs` (spec `028-guarded-renderer`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Specify the guardrail-renderer half of roadmap
§4: `@kimen/catalog` renders untrusted, agent-emitted UI specs exclusively
through the neutral catalog, tested as an Art. VIII security boundary — only
catalog components render, only declared actions dispatch, unknown props are
rejected, no code-execution path exists from spec data — with fail-closed
observable diagnostics, declared resource budgets against abusive specs, and
progressive rendering of streaming/partial specs. Catalog schema generation
is the sibling spec `027-runtime-catalog`; protocol adapters are specs 029
(A2UI) and 030 (MCP Apps)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. Behavior enters the system exactly once, here
(Art. II). This feature IS the Art. VIII guardrail: the adversarial scenarios
S2, S3, S5, S6, S7, S8, S9, S12, S13, S15 and S16 are security-boundary
scenarios and require explicit standalone founder confirmation at human
gate 1.

## Design-source analysis

Not applicable. The renderer introduces no visual surface of its own: every
pixel it produces belongs to a catalog component whose appearance is governed
by that component's approved contract (specs `002`–`016`) and the token
system. The design sources here are the constitution's Art. VIII invariants,
the generated catalog of `027-runtime-catalog`, and the roadmap §4 promise.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A host renders an agent-emitted spec through the catalog (Priority: P1)

A host application (a chat surface, the workshop, a protocol adapter) hands
the renderer an untrusted JSON UI spec produced by an agent and gets back
real catalog components: the described components render with validated
props, and interactions dispatch the actions the spec declares as plain data
events on a single channel — without the host ever trusting the spec.

**Why this priority**: this is the product promise of roadmap §4 and the
reason `@kimen/catalog` exists; without the rendering path there is nothing
to guard.

**Independent Test**: render a fixture spec (a card containing a button bound
to a declared action), then assert the rendered surface against the catalog
declarations and assert the dispatched action name and payload.

**Acceptance Scenarios**: S1 and S4.

---

### User Story 2 - Malicious specs cannot escape the catalog (Priority: P1)

As the founder publishing a security boundary, I know that any spec content
outside the catalog contract — unknown component types, undeclared props,
bindings to invented component events, embedded markup, executable URLs,
prototype-pollution keys, unsupported catalog schema versions — is rejected
fail-closed before anything attaches, and that no value originating in spec
data can ever execute.

**Why this priority**: Art. VIII names the guardrail a tested security
boundary. A single escape falsifies the entire GenUI promise; this is the
highest-blast-radius surface of the catalog package.

**Independent Test**: run the adversarial fixture set (each fixture a
concrete malicious spec); every fixture must produce zero rendered spec
nodes, zero executed code paths, zero network requests, and a diagnostic
naming the violation.

**Acceptance Scenarios**: S2, S3, S5, S6, S7, S8 and S13.

---

### User Story 3 - Abusive specs cannot exhaust the host, and every failure is diagnosable (Priority: P2)

A spec engineered to exhaust the host — thousands of nesting levels, node
floods — is rejected by declared budgets before rendering starts, and every
rejection (this story and story 2) pinpoints the offending node and rule so
an emitting agent can self-correct its next attempt.

**Why this priority**: denial-of-service resistance and observable
fail-closed errors make the boundary operable; a silent failure could hide
an escape and would make agent self-correction impossible.

**Independent Test**: budget-boundary fixtures (a spec exactly at a budget
passes, one unit beyond fails) plus diagnostic-shape assertions on any
rejected fixture, including a hostile offending value echoed through its
diagnostic.

**Acceptance Scenarios**: S9, S10, S14 and S16.

---

### User Story 4 - Streaming specs render progressively without weakening the boundary (Priority: P3)

An agent streams a spec in chunks; the user sees validated content appear
progressively instead of waiting for the full document, and the security
invariants hold at every instant — a node is attached only after it
validates, an invalid chunk fails closed mid-stream, and the declared
budgets bound the accumulated stream so an endless flow of chunks can never
exhaust the host by simply refusing to close the document.

**Why this priority**: roadmap §4 promises progressive rendering of
streaming/partial specs. It is P3 because it composes over the same
validation core and can land after atomic rendering.

**Independent Test**: feed a chunked fixture; assert the first valid node
attaches before the stream closes, that a later invalid chunk attaches
nothing further while reporting the violation, and that a never-closing
stream halts fail-closed when its accumulated content exceeds a budget.

**Acceptance Scenarios**: S11, S12 and S15.

### Edge Cases

- An empty spec (zero nodes) is valid and renders an empty surface;
  emptiness is not an error.
- Input that is not parseable JSON is rejected fail-closed with a diagnostic
  naming the parse failure; no partial render occurs. Schema-version skew
  (a spec declaring a catalog schema version the renderer does not support)
  is a contracted rejection, not an edge case: FR-012 and S13.
- A node missing a required prop is as invalid as a node carrying an
  undeclared prop; both name the component, the prop and the rule.
- A spec exactly at a declared budget renders; one unit beyond fails. The
  boundary is falsifiable on both sides (the 69/70 mutation-gate precedent).
- Re-rendering a surface with a new complete spec replaces the previous
  content only after the new spec validates; a rejected update leaves the
  previous valid surface intact.
- Diagnostics are data, never markup: a malicious value echoed inside a
  diagnostic remains inert text wherever the host displays it.
- Undeclared props are rejected, never silently stripped: sanitize-by-
  omission would hide agent errors and weaken falsifiability.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Guarded renderer
  Untrusted UI specs render only through the neutral catalog: components,
  props and actions outside the catalog contract are rejected fail-closed
  with machine-readable diagnostics, no code path executes from spec data,
  and declared budgets bound every render.

  Rule: Only catalog components render

    # S1
    Scenario: A valid spec renders catalog components with declared props
      Given a spec describing a ki-card containing a ki-button labeled "Pay now"
      When the renderer renders the spec
      Then the surface shows the described card and button
      And every rendered component and prop matches its catalog declaration

    # S2
    Scenario Outline: A component type outside the catalog never renders
      Given a spec containing a node of type "<requested-type>"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "<requested-type>" as outside the catalog

      Examples:
        | requested-type    |
        | script            |
        | iframe            |
        | ki-not-in-catalog |

  Rule: Only declared props and actions pass the boundary

    # S3
    Scenario: An undeclared prop is rejected fail-closed
      Given a spec whose ki-button node sets the undeclared prop "onclick" to "alert(1)"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "onclick" as undeclared for ki-button

    # S4
    Scenario: Activating a rendered control dispatches only its declared action
      Given a rendered spec binding the "Pay now" button to its declared action "submit-order"
      When the user activates the button
      Then the host receives one "submit-order" action event carrying the spec's data payload
      And no other callback or code path executes

    # S5
    Scenario: A binding to an invented component event never wires
      Given a spec binding the action "submit-order" to an event "onPwn" that the catalog does not declare for ki-button
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "onPwn" as undeclared for ki-button

  Rule: No code-execution path exists from spec data

    # S6
    Scenario: Markup inside spec text renders as inert text
      Given a spec whose ki-alert message text is "<img src=x onerror=alert(1)>"
      When the renderer renders the spec
      Then the message appears verbatim as text
      And no image request occurs and no script executes

    # S7
    Scenario Outline: An executable URL value is rejected
      Given a spec setting a URL-typed prop to "<value>"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the prop and the rejected scheme

      Examples:
        | value                                     |
        | javascript:alert(1)                       |
        | data:text/html,<script>alert(1)</script>  |

    # S8
    Scenario Outline: A prototype-pollution attempt leaves the runtime untouched
      Given a spec whose <object> contains the key "<key>" set to {"polluted": true}
      When the renderer validates the spec
      Then no part of the spec renders
      And no object outside the spec gains a "polluted" property

      Examples:
        | object       | key         |
        | props object | __proto__   |
        | props object | constructor |
        | props object | prototype   |
        | data object  | __proto__   |

  Rule: Declared budgets bound every render

    # S9
    Scenario Outline: A spec beyond a declared budget is rejected before rendering
      Given a spec exceeding the declared <budget> budget by <excess>
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the exceeded <budget> budget

      Examples:
        | budget       | excess            |
        | depth        | one nesting level |
        | node-count   | one node          |
        | payload-size | one byte          |

  Rule: Every rejection is observable

    # S10
    Scenario: A rejection diagnostic pinpoints the offending node
      Given a spec whose third child node is of type "iframe"
      When the renderer validates the spec
      Then the diagnostic reports the node path, the violated rule and the offending value
      And the diagnostic is machine-readable data, not markup

  Rule: Partial specs render progressively without weakening the boundary

    # S11
    Scenario: A streamed spec renders validated nodes before the stream ends
      Given a spec streaming in chunks whose first complete node is a valid ki-card
      When the renderer consumes the first complete node
      Then the card renders while the stream remains open
      And only validated nodes are attached to the surface

    # S12
    Scenario: An invalid node arriving mid-stream fails closed
      Given a streamed spec that rendered a valid ki-card and then delivers a node of type "script"
      When the renderer consumes the invalid node
      Then the invalid node and its children never render
      And the failure is reported while previously validated content remains

  Rule: Version skew fails closed at the boundary

    # S13
    Scenario: A spec declaring an unsupported catalog schema version is rejected
      Given a spec declaring a catalog schema version the renderer's catalog does not support
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the spec's declared version and the versions the renderer supports

  Rule: Budgets are falsifiable on both sides and bound the accumulated stream

    # S14
    Scenario: A spec exactly at every declared budget renders
      Given a spec exactly at the declared depth, node-count and payload-size budgets
      When the renderer renders the spec
      Then every node of the spec renders

    # S15
    Scenario: A stream that never closes still trips its budget
      Given a streamed spec delivering valid chunks without ever closing the document
      When the renderer consumes the chunk that takes the accumulated payload size beyond the declared budget
      Then the stream halts fail-closed and nothing further attaches
      And the diagnostic names the exceeded payload-size budget

  Rule: Diagnostics stay inert under hostile content

    # S16
    Scenario: A hostile offending value stays inert inside its diagnostic
      Given a spec rejected for the offending value "<img src=x onerror=alert(1)>"
      When the host displays the diagnostic containing that value
      Then the offending value appears as inert text
      And no image request occurs and no script executes
```

### Scenario Family Coverage

This is security-boundary infrastructure, not a UI component. The renderer
adds no interaction pattern of its own: keyboard, assistive-technology, form
and theming behavior belong to the catalog components it instantiates, each
governed by its own approved contract (specs `002`–`016`).

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S16 | |
| Keyboard path | | N/A — the renderer adds no interaction; keyboard behavior is owned by each rendered component's own contract |
| Assistive-tech outcome | | N/A — the accessibility tree is produced by the rendered catalog components under their own contracts |
| Form participation | | N/A — form behavior is owned by the rendered form components; the renderer only passes validated declared props |
| Theming | | N/A — the renderer emits no styles; appearance flows entirely from component tokens under their own contracts |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The renderer MUST accept an untrusted JSON UI spec and render
  exclusively components present in the neutral catalog. A node whose type
  is not a catalog entry MUST cause fail-closed rejection naming that type.
- **FR-002**: Every prop MUST validate against the generated catalog entry
  for its component. Undeclared props, type mismatches and missing required
  props MUST reject the spec naming the component, the prop and the violated
  rule. Undeclared props MUST NOT be silently stripped.
- **FR-003**: Actions are declarative data. The spec's declared-actions list
  (the neutral format of `027-runtime-catalog`, its FR-005) is the only
  dispatch vocabulary: the renderer wires listeners only for component
  events the catalog declares, only where a validated binding exists, and
  dispatch delivers the spec's data-only payload through the renderer's
  single action channel. An interaction without a validated binding
  dispatches nothing; a binding to an event the catalog does not declare
  rejects the spec. No other callback mechanism from spec data exists.
- **FR-004**: No code-execution path from spec data: spec strings are never
  parsed as markup; the catalog surface exposes no event-handler or
  code-valued props; URL-typed values accept only an allowlist (`https`,
  `http`, relative references) and every other scheme is rejected; the
  renderer performs no dynamic code evaluation of any spec content.
- **FR-005**: Spec parsing MUST be immune to prototype pollution: a spec
  containing `__proto__`, `constructor` or `prototype` keys in any props or
  data object is rejected, and parsing never mutates shared prototypes.
- **FR-006**: The renderer MUST enforce declared budgets for nesting depth,
  node count and total payload size, with safe package defaults the host may
  tighten. A spec exactly at a budget passes; one beyond it is rejected
  before any node renders. The budgets bind the ACCUMULATED resources of a
  streaming render exactly as they bind a complete document: a stream whose
  accumulated depth, node count or payload size exceeds a budget halts
  fail-closed even if the document never closes — no unbounded-chunk path
  exists below the budgets.
- **FR-007**: Rendering of a complete spec MUST be fail-closed and atomic:
  full validation precedes the first attach, and every rejection produces a
  machine-readable diagnostic carrying node path, violated rule and
  offending value. Diagnostics are data and remain inert wherever displayed.
- **FR-008**: Streaming/partial specs MUST render progressively: a node
  attaches only after it fully validates; an invalid chunk halts the stream
  fail-closed — its subtree never attaches, the failure is reported, and
  previously validated content remains. The FR-006 budgets apply to the
  accumulated stream state (attached plus buffered content), so a stream
  exceeding any budget halts fail-closed with the budget named, whether or
  not the document ever completes (S15).
- **FR-009**: The guardrail MUST be tested as a security boundary: the
  adversarial suite covering S2, S3, S5, S6, S7, S8, S9, S12, S13, S15 and
  S16 runs inside the deterministic gates, and its green result is the
  evidence that flips the `guarded-renderer` capability from planned to
  available (`docs/capabilities.json`, per the 018 capability-truth regime).
- **FR-010**: The renderer's public surface MUST accept only the neutral
  spec format. No protocol type (A2UI, MCP Apps, AG-UI, json-render) may
  appear in `@kimen/catalog`; protocol translation belongs to
  `@kimen/adapter-*` behind the Art. VIII module boundary.
- **FR-011**: Validation schemas MUST derive from the generated catalog of
  `027-runtime-catalog`; the renderer maintains no hand-written
  per-component schema (Art. I: one source of truth).
- **FR-012**: The renderer MUST reject fail-closed any spec declaring a
  catalog schema version its generated catalog does not support (the
  version metadata of `027-runtime-catalog` FR-010/S12), with a diagnostic
  naming the spec's declared version and the supported versions. No partial
  render and no best-effort downgrade occurs: a spec fabricated against a
  laxer schema version must never be validated under it.

### Key Entities

- **UI spec**: the untrusted JSON document an agent emits — a tree of nodes
  (component type, props, children, action bindings) plus data values. Pure
  data, never code.
- **Catalog entry**: the generated schema for one component — permitted
  type, props with types, slots and when-to-use metadata — produced from the
  component contract by `027-runtime-catalog`, never hand-maintained here.
- **Declared action**: an action name from the spec's own declared-actions
  list (per the `027-runtime-catalog` neutral format) — untrusted but
  explicit, inspectable data; the only names the renderer may dispatch. The
  host consumes dispatched actions as data events and ignores names it does
  not handle.
- **Render surface**: the host-owned mount point where only validated nodes
  attach.
- **Diagnostic**: a machine-readable rejection record — node path, violated
  rule, offending value — safe to display because it is inert data.
- **Budget**: the declared limits (nesting depth, node count, payload size)
  evaluated before rendering a complete spec and continuously over the
  accumulated content of a stream.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): adds the renderer half of the
  `@kimen/catalog` public API — the renderer entry point, the single action
  dispatch channel, budget configuration and the diagnostic shape — next to
  the validation surface of `027-runtime-catalog`, versioned alongside the
  catalog schema on the catalog's public SemVer line.
- **Bundle budget** (Art. IV): the renderer and its validation are runtime
  code and receive a written KB budget at plan time. Zod is the single
  justified runtime dependency, allowed only at this guardrail boundary
  (declared bet). Zero impact on `@kimen/elements` budgets.
- **Accessibility** (Art. V): no new interaction pattern; accessibility
  outcomes are owned by the rendered catalog components under their own
  approved contracts.
- **Tokens** (Art. VI): none. The renderer emits no styles and introduces no
  tokens.
- **Catalog/agent legibility** (Art. I): validation derives from the
  generated catalog, never hand-maintained; diagnostics are machine-readable
  so an emitting agent can self-correct its next spec.
- **Guardrail/security boundary** (Art. VIII): this feature IS the
  guardrail. The four constitutional invariants map to standalone
  adversarial scenarios — only catalog components render (S2), only declared
  actions dispatch (S4, S5), unknown props are rejected (S3), no
  code-execution path exists from spec data (S6, S7, S8) — plus budget
  (S9, S14), version-skew (S13), streaming (S12, S15) and
  diagnostic-inertness (S16) hardening. All of them require explicit founder
  confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of adversarial fixtures (unknown type, undeclared prop,
  invented event binding, markup-in-text, executable URL, prototype
  pollution, over-budget, unsupported schema version, invalid mid-stream
  chunk, never-closing stream, hostile diagnostic value) end with zero
  attached invalid nodes, zero network requests and zero executed script
  paths.
- **SC-002**: every rejected fixture yields a diagnostic naming node path,
  violated rule and offending value; zero silent failures across the set.
- **SC-003**: the valid fixture renders 100% of its nodes and every rendered
  component/prop pair exists in the generated catalog.
- **SC-004**: budget fixtures pass exactly at each declared budget (S14) and
  fail deterministically at budget-plus-one for depth, node count and total
  payload size (S9); the never-closing-stream fixture halts fail-closed
  exactly when its accumulated content exceeds a declared budget (S15).
- **SC-005**: after the prototype-pollution fixture runs, a freshly created
  empty object has no `polluted` property.
- **SC-006**: the streamed fixture attaches its first valid node before the
  stream closes; the invalid-chunk fixture attaches zero nodes at and below
  the violation and reports it.
- **SC-007**: the `guarded-renderer` capability leaves `planned` only when
  the S1–S16 traced tests run green inside the deterministic gates; the
  capability gate enforces the linkage.
- **SC-008**: module-boundary analysis reports zero protocol-specific
  imports or types in `@kimen/catalog`.

## Assumptions

- Sequencing: this spec consumes the generated catalog defined by
  `027-runtime-catalog` and is implemented after it. Specs 027–030 are
  reviewed as a set; each is independently implementable in that order, and
  each merges to main only together with its first traced tests (the
  required traceability gate demands one test per S-ID; see the
  merge-sequencing assumption in `027-runtime-catalog`).
- The neutral spec JSON format (node tree with type, props, children and
  action bindings) is defined, owned and versioned by `027-runtime-catalog`
  (its FR-005 and public API) and is protocol-agnostic. This feature
  consumes that format unchanged and contributes the safe-render semantics
  over it — render budgets, the URL allowlist, streaming attachment rules —
  without redefining the schema. Exact A2UI and MCP Apps message names,
  protocol versions and bridge APIs are deliberately NOT assumed here: they
  are declared spec risks verified inside `029-adapter-a2ui` and
  `030-adapter-mcp-apps`.
- Action model v1 follows the `027-runtime-catalog` neutral format: the spec
  carries its declared-actions list, the renderer dispatches data-only
  payloads on one channel, and the host decides which action names it
  handles (an unhandled name is inert data). Richer payload schemas may be
  added later without weakening the invariant.
- Fail-closed granularity v1 is a founder-visible decision encoded in the
  scenarios: atomic rejection for complete specs, halt-and-report for
  streams (already-attached validated content remains).
- Budget default values are fixed at plan/implementation time; this contract
  fixes only the boundary semantics (at-budget passes, beyond fails).
- URL allowlist v1 is `https`, `http` and relative references.
- Rendering is client-side for v1; SSR/Declarative Shadow DOM stays deferred
  per the declared bets. Zod (v4 line) is used at this boundary only.
