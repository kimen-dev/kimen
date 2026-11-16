# Feature Specification: Declared surface actions reach the model

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), Art. II (Proportionate Behavior Contracts)
     and Art. I (AI-First: One Source of Truth). -->

**Feature Branch**: `claude/sweet-feistel-003244` (spec `040-surface-action-relay`)

**Created**: 2026-11-16

**Status**: Draft — waiting for founder confirmation. No code is written
until the founder confirms the scenarios, the guardrail scenarios and
decisions D1–D8.

**Input**: Founder request (2026-11-16): today `@kimen/adapter-mcp-apps`
(spec `030-adapter-mcp-apps`) sends a declared action only as `tools/call
kimen_surface_action`, and `@kimen/mcp-server` (spec `038-mcp-server`, D6)
only acknowledges it, so the model never learns that the person clicked.
Study MCP Apps 2026-01-26 `ui/message` and `ui/update-model-context`,
recommend one mechanism, and state the invariants that must hold: only
declared actions, data as inert values, bounded size, no code path.

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
This is a guardrail change: a new kind of outbound traffic leaves the surface
and speaks in the person's name. Scenarios S5–S14 exercise the Art. VIII
boundary (only declared actions dispatch, no code path from spec data) and
require explicit founder confirmation at human gate 1.

**Depends on**: PR [kimen-dev/kimen#281](https://github.com/kimen-dev/kimen/pull/281)
(`@kimen/mcp-server`, spec 038) for S3 and S4. The adapter half (every other
scenario) builds on `main` as it is.

## Design-source analysis

Not applicable: no visual surface changes. The relay is outbound protocol
traffic; nothing new is painted. The governing sources are the constitution
(Art. VIII), the MCP Apps extension and the adapter's compatibility matrix.

Sources read for this spec (2026-11-16), all at
`github.com/modelcontextprotocol/ext-apps` commit
`19256f52cad5517ba8272581ed2e11d6a81273d5`, the commit `COMPAT.md` pins:

- `specification/2026-01-26/apps.mdx` (Stable): `ui/message` (:998–1035),
  `ui/update-model-context` (:1061–1101), the interactive phase of the
  lifecycle (:1338–1356), `HostCapabilities` (:624–667), and "`content` is
  for model context, `structuredContent` is not added to it" (:1472–1474).
- `src/spec.types.ts` of the reference SDK `@modelcontextprotocol/ext-apps`
  2.0.4: `McpUiMessageRequest` (:208–217, `content: ContentBlock[]`),
  `McpUiHostCapabilities.message` and `.updateModelContext`
  (:494–523), and `src/generated/schema.ts:801–813`, where the reference host
  validates `ui/message` params as an **array** of content blocks.
- `specification/draft/apps.mdx` (:765–777): the draft adds the same
  `message` and `updateModelContext` host capabilities to the normative text.

Two gaps between the 2026-01-26 prose and the reference SDK matter here and
are recorded in `COMPAT.md` when this lands: the prose shows `ui/message`
`content` as one object while the SDK requires an array, and the prose
defines no host capability for `ui/message` while the SDK and the draft do.
The adapter follows the SDK on both, as it already does for interoperability.

## Decisions *(recommended, waiting for founder confirmation)*

**D1 — Mechanism: `ui/message`.** A person activating a control is a turn of
the conversation: they chose "Confirm" and expect an answer. `ui/message`
adds a `user`-role message to the conversation and the host follows up
(apps.mdx:1032–1034, :1346–1348), so the model learns of the click and can
answer at once. The host MAY ask the person for consent, which is right for
anything sent in the person's name.

Rejected — `ui/update-model-context`: it triggers no follow-up, the host MAY
defer it until the person's next message, and each update overwrites the
previous one (apps.mdx:1090–1101). The model would learn of the click only
when the person typed something else, and a second click would erase the
first: the defect this spec exists to fix, delayed. It stays the right tool
for a later need — keeping live form state in context without a turn — which
this spec does not address.

Rejected — both at once: two mechanisms for one event doubles the surface of
the guardrail for no gain (Art. VII).

**D2 — The integrating server decides, per action, in its acknowledgment.**
The surface relays an action only after the server answers that action's
`tools/call` successfully with a relay request:
`structuredContent.kimenAction` equal to `{ "action": <the action the surface
sent, compared exactly>, "relay": true }` (`relay` is the boolean `true`,
nothing else). Without that request the action stays between surface and
server, which is today's behavior. The adapter exports the server-side
builder, `acknowledgeSurfaceAction(action, { relay })`, so integrators never
hand-write the key.

Why the server: it is the only party that knows whether its tool already did
the work (a "refresh" that returns a new surface needs no model turn) or
whether the person's choice needs the model. It also makes "only declared
actions" a two-key rule: the surface's own allowlist (spec 030 S6) and the
server's memory of what it rendered (spec 038 S13) must both agree. The
server contributes one boolean and nothing else: it never supplies the text.

Rejected — relay every declared action: every UI-only interaction would cost
a model turn, and every existing integrator's behavior would change. Rejected
— a per-action relay flag in the UI spec: it changes the neutral catalog's
schema for one protocol's need (Art. VIII).

**D3 — Only hosts that advertise text messages receive one.** The surface
sends `ui/message` only when the host's `McpUiInitializeResult` carried
`hostCapabilities.message` as an object with a `text` member (the SDK field,
:523, and the draft's). Otherwise the action still goes to the server, no
`ui/message` is sent, and the relay is reported as unsupported. Fail closed:
the surface never speaks to a host that did not say it listens. Rejected —
send per the 2026-01-26 prose and treat an error as the answer: behavior would
vary by host, and a host that never opted in would receive messages in the
person's name.

**D4 — The relay text is one language-neutral line.** Exactly:

```text
kimen-surface-action {"action":"add-to-cart","data":{"sku":"A-12"}}
```

the fixed prefix `kimen-surface-action ` followed by the JSON serialization
of a fresh object with exactly two members, `action` (the dispatched action)
and `data` (exactly the data the `tools/call` carried: string, finite number
and boolean values only). After serialization, every line terminator and
bidirectional formatting character still present — U+0085, U+2028, U+2029,
U+061C, U+200E, U+200F, U+202A–U+202E and U+2066–U+2069 — is written as its
`\uXXXX` escape, so the text has no line break and nothing in it can
reorder or disguise what a host shows the person. JSON already escapes
U+0000–U+001F, quotes and backslashes. Stripping the prefix and parsing the
rest returns exactly the dispatched action and data.

No prose: the line carries no English (Art. IV, no hardcoded user-visible
strings) and no label text from the spec, and it reads as data rather than as
the person's words. Its meaning is taught to the model where the model reads
it: the description of the tool that rendered the surface (D7).

**D5 — Bounded: 8192 bytes, never truncated.** The UTF-8 length of the
relay text is at most 8192 bytes (about 2,000 tokens). A longer relay is not
sent and is reported as too large; the `tools/call` has already gone. It is
never cut: a truncated value would tell the model something the person did
not do.

**D6 — Once, only on a live connection, never retried.** At most one
`ui/message` per acknowledged dispatch, sent after the server's answer and
only while the surface is `ready`. A host error or an `isError` result is
reported as a failed relay and never retried, so the person's action is never
posted twice. An answer to a request id the surface never sent (for example a
model calling the app-only tool itself, in a host that does not filter it),
or one that arrives after `ui/resource-teardown`, relays nothing.

**D7 — `@kimen/mcp-server` relays every action it acknowledges.** Its
`kimen_surface_action` answer carries the relay request for every declared
action it acknowledges; undeclared actions stay refused (spec 038 S13). The
description of `kimen_render_spec` gains one sentence: when the person
activates a control, a user message arrives that starts with
`kimen-surface-action ` followed by the action and its data as JSON.

**D8 — Amendments, applied in the implementation change.**

- Spec 030 FR-004, second sentence, becomes: "Outbound traffic MUST be
  limited to declared actions, the protocol's required lifecycle messages,
  and the one `ui/message` relay spec 040 defines for a declared action the
  integrating server acknowledged for relay, all mediated by the host." 030
  S6 and S17 stay true as written: the `tools/call` still leaves first.
- Adapter `COMPAT.md`: wire-vocabulary rows for `ui/message` (View → Host)
  and for reading `hostCapabilities.message`; `ui/message` leaves the
  "Not used" list, `ui/update-model-context` stays on it; the two
  prose/SDK gaps above are recorded.
- Spec 038 D6 and the server's `COMPAT.md`: the "No relay of surface
  actions" boundary is replaced by D7. Spec 038 S12 stays true as written.

No change reaches `@kimen/catalog` or `@kimen/elements`: the relay is MCP
Apps vocabulary and lives in the adapter (Art. VIII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The model learns what the person chose (Priority: P1)

A person activates a control on a Kimen surface the model rendered; the model
receives one user message naming the declared action and its data, and can
answer in the same conversation.

**Why this priority**: without it a rendered surface is a dead end for the
model: the person clicks and nothing in the conversation changes.

**Independent Test**: drive the bridge with a host double that advertises
text messages and a server double that acknowledges with a relay request;
assert the exact `ui/message`.

**Acceptance Scenarios**: S1, S2, S3 and S4.

---

### User Story 2 - Nothing undeclared or unacknowledged speaks for the person (Priority: P1)

Only a declared action that the server acknowledged for relay, on a host that
listens, produces a message in the person's name.

**Why this priority**: `ui/message` carries the `user` role. A relay outside
the two-key rule would let spec data, host traffic or a stray answer put
words in the person's mouth (Art. VIII).

**Independent Test**: the adversarial corpus over the bridge — undeclared
actions, mismatched or malformed relay requests, error answers, unsolicited
answers, hosts without the capability.

**Acceptance Scenarios**: S5, S6, S7, S8 and S9.

---

### User Story 3 - Relayed data is inert and bounded (Priority: P1)

Whatever the data holds — markup, line breaks, direction overrides, long
text — the model receives one bounded line of JSON values, and nothing runs.

**Why this priority**: the data includes spec properties and whatever the
person typed; a line break or an override could make data read as a new
instruction or disguise what the host shows the person.

**Independent Test**: property-based over arbitrary scalar data: the text is
one line, at most 8192 bytes, and round-trips to the dispatched action and
data.

**Acceptance Scenarios**: S10, S11 and S12.

---

### User Story 4 - One relay per activation, only while connected (Priority: P2)

A relay is sent once, never retried, never after teardown.

**Why this priority**: a retried or late relay posts the person's action twice
or into a conversation that has moved on.

**Independent Test**: host doubles that deny `ui/message`, and a teardown
between dispatch and acknowledgment.

**Acceptance Scenarios**: S13 and S14.

---

### User Story 5 - The reference host receives it (Priority: P2)

In a real browser, the packaged surface document reaches the reference SDK
host's message handler, which validates the request against its own schema.

**Why this priority**: the prose and the SDK disagree on the content shape
(see Design-source analysis); only the reference host settles it.

**Independent Test**: extend spec 030's real-browser suite (`browser-tests/`)
with an `AppBridge` configured with `message: { text: {} }` and an
`onmessage` handler.

**Acceptance Scenarios**: S15.

### Edge Cases

- The server's answer carries a new surface and a relay request: the surface
  re-renders as today, and the relay still goes, because it depends on the
  acknowledgment only.
- The re-render replaces the declared-action set: the relay concerns the
  action that was declared when it was dispatched.
- The host advertises `message` but cannot proxy tool calls: no
  acknowledgment ever arrives, so nothing is relayed (D2 makes the
  acknowledgment the gate).
- The host asks the person for consent and the person declines: the host
  answers with an error, reported as a failed relay, never retried.
- A host that does not filter app-only tools lets the model call
  `kimen_surface_action` itself: the answer goes to the model, not to the
  surface, so no relay can follow (S9 covers the surface's side).
- A declared action whose name is long: the name counts toward the 8192-byte
  bound like the data does.
- The person activates two controls quickly: each acknowledged dispatch
  relays once, in the order the acknowledgments arrive.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Declared surface actions reach the model
  When a person activates a declared action on a Kimen surface inside an
  MCP Apps host, and the integrating server acknowledges that action and
  asks for it to be relayed, the model learns it through exactly one
  ui/message: a single bounded line carrying the action and its data as
  inert JSON values. Nothing else ever speaks in the person's name.

  Rule: An acknowledged action the server asks to relay reaches the conversation once

    # S1
    Scenario: A relayed action reaches the model as one user message
      Given a surface whose host advertises text messages and whose spec declares the action "add-to-cart"
      And an integrating server that acknowledges "add-to-cart" and asks for it to be relayed
      When the person activates the control bound to "add-to-cart" whose data is "sku" "A-12"
      Then after the server's acknowledgment the host receives one ui/message request with role "user" and this single text block:
        """
        kimen-surface-action {"action":"add-to-cart","data":{"sku":"A-12"}}
        """

    # S2
    Scenario: An acknowledgment that does not ask for relay keeps the action between surface and server
      Given a surface whose host advertises text messages and whose spec declares the action "refresh-inventory"
      And an integrating server that acknowledges "refresh-inventory" without asking for relay
      When the person activates the control bound to "refresh-inventory"
      Then the host receives one tools/call request for "refresh-inventory" and no ui/message request

    # S3
    Scenario: The Kimen MCP server asks for every action it acknowledges to be relayed
      Given the Kimen MCP server rendered a surface that declares the action "refresh"
      When the surface sends the action "refresh" with the data "sku" "A-12"
      Then the server acknowledges "refresh" and asks for it to be relayed

    # S4
    Scenario: The render tool tells the model how a relayed action reads
      Given a Kimen MCP server started over stdio
      When the client lists the server's tools
      Then the render tool's description says an activated control arrives as a user message starting "kimen-surface-action " followed by the action and its data as JSON

  Rule: Only declared actions the server acknowledged are relayed

    # S5
    Scenario: An undeclared action is relayed nowhere
      Given a surface whose host advertises text messages and whose spec declares only the action "refresh-inventory"
      When the surface attempts to dispatch the action "transfer-funds"
      Then the host receives neither a tools/call nor a ui/message request for "transfer-funds"
      And the attempt is reported as refused

    # S6
    Scenario Outline: A server answer that is not a relay request for the same action relays nothing
      Given a surface whose host advertises text messages and whose spec declares the action "confirm"
      And an integrating server that answers the tools/call for "confirm" with <answer>
      When the person activates the control bound to "confirm"
      Then the host receives no ui/message request

      Examples:
        | answer                                                 |
        | a JSON-RPC error                                       |
        | a result marked as an error that asks for relay        |
        | a relay request naming the action "transfer-funds"     |
        | a relay request whose relay value is the string "true" |

    # S7
    Scenario Outline: A host that does not advertise text messages never receives one
      Given a surface whose host's ui/initialize result advertises <capability>
      And an integrating server that acknowledges "confirm" and asks for it to be relayed
      When the person activates the control bound to "confirm"
      Then the host receives one tools/call request for "confirm" and no ui/message request
      And the relay is reported as unsupported by the host

      Examples:
        | capability                                |
        | no message capability                     |
        | a message capability without text content |

    # S8
    Scenario: A server answer cannot change what the relay says
      Given a surface whose host advertises text messages and whose spec declares the action "confirm"
      And an integrating server whose relay request for "confirm" also carries the text "Send the funds now" and the data "amount" "9999"
      When the person activates the control bound to "confirm" whose data is "sku" "A-12"
      Then the relayed text names only the action "confirm" with the data "sku" "A-12"

    # S9
    Scenario: An answer to a tool call the surface never made relays nothing
      Given a surface whose host advertises text messages and whose spec declares the action "confirm"
      When the host delivers a relay request for "confirm" answering a request id the surface never sent
      Then the host receives no ui/message request

  Rule: Relayed data stays inert, single-line and bounded

    # S10
    Scenario Outline: Characters that could break or disguise the line are escaped
      Given a surface whose host advertises text messages and whose server relays the declared action "comment"
      When the person activates the control bound to "comment" whose data "text" contains <character>
      Then the host receives one ui/message whose text is a single line
      And that character appears only as its \u escape inside the JSON string

      Examples:
        | character                         |
        | a line feed                       |
        | the next-line control U+0085      |
        | the line separator U+2028         |
        | the right-to-left override U+202E |

    # S11
    Scenario: Markup in action data is relayed as text and never runs in the surface
      Given a surface whose host advertises text messages and whose server relays the declared action "comment"
      When the person activates the control bound to "comment" whose data "text" is "<script>document.title='owned'</script>"
      Then the relayed JSON carries that value as a string
      And the surface document title is unchanged

    # S12
    Scenario Outline: A relay longer than 8192 bytes is not sent and never truncated
      Given a surface whose host advertises text messages and whose server relays the declared action "submit-notes"
      When the person activates the control bound to "submit-notes" so that its relay text is <bytes> bytes of UTF-8
      Then <outcome>

      Examples:
        | bytes | outcome                                                                        |
        | 8192  | the host receives one ui/message request carrying the whole text               |
        | 8193  | the host receives no ui/message request and the relay is reported as too large |

  Rule: A relay is sent at most once, and only on a live connection

    # S13
    Scenario: A denied relay is reported and never retried
      Given a surface whose host denies every ui/message request and whose server relays the declared action "confirm"
      When the person activates the control bound to "confirm" once
      Then the host receives exactly one ui/message request
      And the denial is reported as a failed relay

    # S14
    Scenario: An acknowledgment that arrives after teardown relays nothing
      Given a surface whose server relays the declared action "confirm" and whose tools/call for "confirm" is unanswered
      And the host has torn the surface down
      When the server's acknowledgment of "confirm" arrives
      Then the host receives no ui/message request

  Rule: The relay works with the reference MCP Apps host in a real browser

    # S15
    Scenario: Activating a relayed control reaches the reference host's message handler
      Given the packaged surface document embedded by the reference MCP Apps host, which advertises text messages
      And a "Confirm" button bound to the declared action "confirm" that the server acknowledges for relay
      When the person activates the button
      Then the reference host's message handler receives one user message whose text names the action "confirm"
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-boundary feature, not a UI component. Core behavior —
including the adversarial guardrail scenarios — is covered; the interaction
families belong to the catalog components, which this feature does not
change.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15 | |
| Keyboard path | | N/A — no interaction pattern is added; a control's keyboard activation is its own contract and dispatches the same declared action |
| Assistive-tech outcome | | N/A — nothing new is rendered; the accessibility tree is the catalog components' contract |
| Form participation | | N/A — form behavior is the components' contract; the relay transports an already dispatched action |
| Theming | | N/A — no visual change; the relay is protocol traffic |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The surface MUST send `ui/message` for a dispatch only when
  every condition holds: the action was declared by the rendered spec and
  left as a `tools/call` (spec 030 S6); the answer to that request id is a
  result, not a JSON-RPC error, whose `isError` is not `true`; its
  `structuredContent.kimenAction.action` equals the dispatched action
  exactly and `structuredContent.kimenAction.relay` is the boolean `true`;
  the host advertised `hostCapabilities.message.text` (D3); the surface is
  `ready`; and the relay text is within the bound (FR-004).
- **FR-002**: The request MUST be `{ "jsonrpc": "2.0", "id": <the
  surface's own next id>, "method": "ui/message", "params": { "role": "user",
  "content": [{ "type": "text", "text": <relay text> }] } }`: one text block,
  in an array (reference SDK schema).
- **FR-003**: The relay text MUST be built by the adapter as D4 states, from
  the action and data the surface itself dispatched, and from nothing else:
  no host message, server result field or spec content other than that
  action and data selects the method, the role, the prefix or any character
  of the text. The text MUST contain no line terminator and no bidirectional
  formatting character unescaped, and stripping the prefix and parsing the
  rest MUST return exactly the dispatched action and data.
- **FR-004**: The UTF-8 length of the relay text MUST be at most 8192 bytes.
  A longer relay MUST NOT be sent, MUST NOT be truncated, and MUST be
  reported as too large.
- **FR-005**: At most one `ui/message` MUST follow an acknowledged dispatch.
  A host error or `isError` answer to it MUST be reported as a failed relay
  and MUST NOT be retried. An answer to a request id the surface did not
  send, or any answer after `ui/resource-teardown`, MUST NOT relay.
- **FR-006**: Every relay that does not happen for a reason other than the
  server not asking MUST be an observable, inert `BridgeRefusal`:
  `relay-unsupported` (D3), `relay-too-large` (FR-004), `relay-failed`
  (FR-005), and `relay-mismatch` when `kimenAction` is present but not a
  relay request for the dispatched action. An answer without `kimenAction`
  is today's acknowledgment and reports nothing.
- **FR-007**: The relay MUST NOT feed the guarded renderer, and the surface
  MUST read nothing from the host's answer to `ui/message` but success or
  failure.
- **FR-008**: `@kimen/adapter-mcp-apps` MUST export
  `acknowledgeSurfaceAction(action, options)`, which builds the
  `CallToolResult` of an acknowledged action: text content naming the action
  as data, and, when `options.relay` is `true`, the relay request of D2.
- **FR-009**: `@kimen/mcp-server` MUST answer every action it acknowledges
  with the relay request (D7), MUST keep refusing undeclared actions by name
  (spec 038 S13), and its `kimen_render_spec` description MUST state how a
  relayed action reads.
- **FR-010**: Both `COMPAT.md` files and specs 030 and 038 MUST be amended
  as D8 states, in the same change that implements this spec.
- **FR-011**: `@kimen/catalog` and `@kimen/elements` MUST NOT change
  (Art. VIII), and the surface document MUST stay within its budget (600 kB
  raw, 135 kB gzip, 112 kB brotli; `tests/resource.spec.ts`).

### Key Entities

- **Relay**: the one `ui/message` request that tells the model a person
  activated a declared action the server acknowledged for relay.
- **Relay request**: `structuredContent.kimenAction = { action, relay: true }`
  in the server's successful answer to the action's `tools/call`; the server's
  only contribution to a relay.
- **Relay text**: the single line `kimen-surface-action <JSON>`, at most 8192
  bytes, built only from the dispatched action and data.
- **Advertised text messages**: `hostCapabilities.message.text` present in
  the host's `ui/initialize` result.
- **"Whose server relays the declared action X"** (scenario shorthand): the
  spec declares X and the integrating server acknowledges X with a relay
  request.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive (MINOR) on
  `@kimen/adapter-mcp-apps` — `acknowledgeSurfaceAction` and its options and
  result types, the `METHOD_MESSAGE` and `KIMEN_ACTION_KEY` constants, and
  the four new `BridgeRefusal` reasons. `@kimen/mcp-server` (private,
  unpublished) changes its action answer additively. Zero change to the
  public API of `@kimen/elements`, `@kimen/tokens` or `@kimen/catalog`.
- **Bundle budget** (Art. IV): the bridge grows by the relay builder and its
  checks, well inside the surface document's existing budget; no dependency
  is added.
- **Accessibility** (Art. V): no new interaction pattern and nothing new is
  rendered.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the render tool's description tells
  the model how a relayed action reads (D7); the adapter README documents
  `acknowledgeSurfaceAction`, with when to relay (the person's choice needs
  the model) and when not (UI-only actions the server's tool fully handles).
- **Guardrail/security boundary** (Art. VIII): this feature adds outbound
  traffic in the person's name. S5–S14 are standalone guardrail scenarios
  and require explicit founder confirmation. The invariants:
  1. **Only declared actions**: a relay needs the surface's allowlist and the
     server's acknowledgment to agree on the exact action (FR-001, S5, S6,
     S9).
  2. **Data as inert values**: the text is built by the adapter alone, one
     line, JSON values only, round-trips exactly (FR-003, S8, S10, S11).
  3. **Bounded size**: at most 8192 bytes, never truncated (FR-004, S12).
  4. **No code path**: nothing from spec, host or server selects the method,
     role or text, and the relay never reaches the renderer (FR-003,
     FR-007, S8, S11).
  5. **Fail closed and once**: no capability, no relay; no retry; nothing
     after teardown (FR-005, S7, S13, S14).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the adversarial corpus (undeclared actions,
  mismatched or malformed relay requests, error and `isError` answers,
  unsolicited answers, answers after teardown, hosts without the capability,
  oversize data) produces zero `ui/message` requests, each reported as FR-006
  states — verified deterministically in CI, never model-judged.
- **SC-002**: A property-based test over arbitrary action names and scalar
  data shows that every relay text is one line, at most 8192 bytes, free of
  unescaped line terminators and bidirectional formatting characters, and
  round-trips to exactly the dispatched action and data.
- **SC-003**: In Chromium, the packaged document embedded by the reference
  SDK `AppBridge` delivers exactly one `ui/message` per relayed activation,
  accepted by the host's own schema validation, with zero content-policy
  violations.
- **SC-004**: The Kimen MCP server's end-to-end suite shows every
  acknowledged declared action carrying the relay request and every
  undeclared action still refused.

## Assumptions

- The reference SDK `@modelcontextprotocol/ext-apps` 2.0.4 at the pinned
  commit is the interoperability target, as it is for spec 030. No
  production host (Claude, ChatGPT, VS Code, Goose) has been tested; one that
  does not advertise `hostCapabilities.message` will not receive relays until
  it does (D3).
- Consent is the host's: Kimen adds no confirmation UI of its own, and the
  surface shows nothing when a relay is sent or refused.
- The relay carries the data the `tools/call` already carries (the bound
  control's spec properties and its live state). Narrowing it to live state
  only is possible later without breaking the line's shape.
- Spec 038 (PR [kimen-dev/kimen#281](https://github.com/kimen-dev/kimen/pull/281))
  merges before this spec's implementation; the adapter half does not wait
  for it.
- `ui/update-model-context`, image or structured content in the relay, and
  relaying the label text are out of scope.
