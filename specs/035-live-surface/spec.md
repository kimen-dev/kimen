# Feature Specification: Live surface

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, III, VII and IX. -->

**Feature Branch**: `feat/catalog-live-surface` (spec `035-live-surface`)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "A long-lived surface that an agent keeps
changing for hours (a conversation board) must change minimally and
locally: today `renderUiSpec` replaces the whole tree on every update, so
focus, typed values, scroll and component state are lost, and
`createStreamingRenderer` only appends and halts forever once its budget is
spent. Add a live surface to `@kimen/catalog`: nodes with optional stable
ids, atomic batches of operations addressed by id, validated against the
resulting state with the same guarded-renderer boundary, rejected whole
without killing the surface, with a revision, a snapshot and action events
that name their node."

**Constitution check**: behavior enters the system exactly once, here
(Art. II). This feature is a NEW guardrail surface (Art. VIII): S2, S9, S10,
S11, S12, S13, S14, S16, S19, S20, S21, S22 and S23 are security-boundary
scenarios and require explicit standalone founder confirmation at human
gate 1.

## Design-source analysis

Not applicable. The live surface introduces no visual surface of its own:
every pixel belongs to a catalog component governed by its own contract.
The design sources are the Art. VIII invariants, the guarded renderer of
`028-guarded-renderer` (its pipeline is reused, never relaxed), the catalog
value of `032-catalog-registration`, and the 2026-11-05 audit of the core
for a live board (identity loss proven by re-render probe P1).

## Decisions *(founder, 2026-11-05)*

These were decided before this contract was written and are not reopened
here:

- **D1** A NEW entry point `createLiveSurface` in `@kimen/catalog`.
  `renderUiSpec` and `createStreamingRenderer` keep their semantics: atomic
  whole-tree replacement and append-then-halt remain correct for one-shot
  surfaces and ephemeral streams.
- **D2** Nodes carry an OPTIONAL stable `id` with a narrow grammar
  (`^[a-z0-9][a-z0-9_-]{0,63}$`), unique per document and per live surface.
  A node without an id is not addressable. The id is never written to the
  DOM (`id` attribute collisions with the host page and `aria-*` references
  are impossible); the surface keeps an internal id → element map.
- **D3** Atomic batches of operations addressed by id: `insert` (parent,
  slot, position), `set` (props), `text`, `remove`, `replace`. The whole
  batch is applied to a copy of the state and the RESULTING state is
  validated with the same purity wall, tag grammar, declared props and
  actions, URL allowlist and budgets (state and per batch) before any DOM
  write. Any failure discards the whole batch with inert diagnostics; the
  surface stays live with its previous state (it never halts like a
  stream).
- **D4** Minimal DOM change: `set` touches only the attributes it changes on
  the existing element; no element outside a `replace` or `remove` is
  recreated; nothing outside the batch is reordered. Focus, selection,
  scroll and typed values survive (proven in a real browser).
- **D5** User-owned state (`checked`, `value`, `open` — a control's own
  value channel) that the user has changed is never overwritten nor
  discarded by the agent unless the op says `force: true` AND the host
  enabled `allowUserStateOverride` (default off). This binds `set` on the
  node, and `replace` and `remove` of the node or of ANY of its ancestors
  (a `remove` plus an `insert` of the same id in one batch included).
  *Revised by the founder after the adversarial review of PR #191: the
  first draft let `replace`/`remove` of a node discard its user state by
  design; that decision is withdrawn.*
- **D6** A monotonic `revision` per surface; an optional `ifRevision` on
  the batch for optimistic concurrency (a mismatch rejects with a
  diagnostic); `snapshot()` returns the current content as frozen plain
  data.
- **D7** The live surface's action event carries the node's `id` (when it
  has one), its CURRENT `path`, the `revision` and the live data of
  `028` FR-003 (model props overlaid with the control's live value).
- **D8** The catalog schema version gate accepts compatible versions by
  SemVer (same major, minor not newer than supported) instead of exact
  equality, so the additive `id` lands as catalog schema `1.1.0` without
  rejecting specs that declare `1.0.0`. Under major `0` every minor may
  break (SemVer), so a `0.x` supported version accepts only its own minor.
- **D9** No protocol data binding (JSON pointers, data models) and no domain
  components in the core. The emitter is unchanged: operations for LLMs
  are the product's job (Art. VIII, Art. VII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent keeps a board current without disturbing the user (Priority: P1)

A host mounts a live surface; the agent sends small batches ("mark decision
3 decided", "add a question before q-2", "drop step 5") while the user is
typing in a field of the same board. Every change appears in place; the
field keeps its focus, caret, typed text and scroll.

**Why this priority**: it is the reason for the feature; without identity
preservation a live board is unusable.

**Independent Test**: in Chromium, focus a field inside the surface and
type, then apply `set`, `text` and `insert` batches around it; assert the
same element object, focus, typed value and `scrollTop`.

**Acceptance Scenarios**: S1, S4, S5, S6, S7, S8.

---

### User Story 2 - A hostile or wrong batch cannot escape the boundary nor kill the surface (Priority: P1)

Every batch crosses the same boundary as a complete spec. A single invalid
op discards the whole batch, the agent receives diagnostics it can act on,
and the surface keeps accepting later batches.

**Why this priority**: a new write path into the DOM is a security boundary
(Art. VIII); one escape falsifies the guarded renderer.

**Independent Test**: an adversarial batch set, each with one bad op among
valid ones; every batch leaves the DOM, the revision and the snapshot
unchanged and reports the rule; a following valid batch applies.

**Acceptance Scenarios**: S2, S9, S10, S11, S12, S19, S20.

---

### User Story 3 - The user's own state wins over the agent (Priority: P1)

What the user changed (a ticked box, a typed value, an expanded panel) is
never silently reverted by the agent; overriding it is an explicit op the
host has to allow.

**Acceptance Scenarios**: S13, S14, S21.

---

### User Story 4 - Host and agent stay in sync (Priority: P2)

The host can tell the agent which revision the user acted on, reject
answers computed against an older revision, summarize the current content
for the agent, and correlate every action with a stable node id.

**Acceptance Scenarios**: S15, S16, S17, S18, S22.

---

### User Story 5 - Existing specs keep validating after the format gains ids (Priority: P2)

Specs and hosts that declare catalog schema `1.0.0` keep working with a
renderer whose catalog is `1.1.0`; a newer minor or another major is still
rejected fail-closed.

**Acceptance Scenarios**: S3, S23.

### Edge Cases

- An empty batch (`ops: []`) is valid, applies nothing and does not advance
  the revision.
- `insert` without `parent` targets the surface's top level; `slot` is only
  meaningful with a parent (default slot `""`). `before` must name a node
  that sits in that same parent and slot; without it the node goes last.
  There is no move op and no implicit reordering.
- `set` with `null` for a prop unsets it; setting a prop to the value it
  already has writes nothing to the DOM.
- `text` replaces the text of one slot that holds only text; on a slot that
  holds nodes it is rejected (removing addressable nodes implicitly would
  bypass `remove`). An empty text empties the slot.
- `replace` may reuse the replaced node's id; it recreates that node's
  element (and its subtree) only. It is rejected, like `remove`, while that
  subtree holds user state the agent did not write (S21).
- A slot name, unlike an object key, reaches the surface as a VALUE: it is
  accepted only when the node's catalog entry declares it as an own
  property, and `__proto__`, `constructor` and `prototype` are never slot
  names (S20).
- `apply` called while a batch is being applied (from `onAction` or a
  component reacting to its own connection) is rejected whole as
  `reentrant-batch`; the host submits it after `apply` returns (S22).
- Ops inside one batch see the effects of the previous ops of the same batch
  (an insert may target a parent inserted earlier in the batch).
- The state budgets bind the resulting state and go DOWN when content is
  removed, unlike the accumulated stream budget of `028` FR-006.
- An unsupported `catalogSchemaVersion` at creation leaves a surface that
  rejects every batch with the version diagnostic (nothing ever renders).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Live surface
  A long-lived surface changes through atomic batches of operations addressed
  by stable node ids. Each batch is validated against the resulting state by
  the guarded renderer's boundary before any DOM write, changes only the
  elements it names, never overwrites the user's own state implicitly, and a
  rejected batch leaves the surface live with its previous state.

  Rule: Nodes may carry stable ids

    # S1
    Scenario: A node carrying a stable id validates and renders without exposing the id
      Given a spec whose ki-card node carries the id "dec-3"
      When the host validates and renders the spec
      Then the spec is accepted and the card renders
      And no rendered element carries an id attribute derived from "dec-3"

    # S2
    Scenario Outline: An id outside the grammar or repeated is rejected
      Given a spec whose nodes carry the ids <ids>
      When the host validates the spec
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>" and the offending id

      Examples:
        | ids                    | rule         |
        | "Dec 3"                | invalid-id   |
        | "-dec"                 | invalid-id   |
        | a 65-character id      | invalid-id   |
        | "dec-3" and "dec-3"    | duplicate-id |

  Rule: Compatible catalog schema versions are accepted

    # S3
    Scenario Outline: The version gate accepts the same major up to the supported minor
      Given a renderer whose catalog schema version is "1.1.0"
      And a spec declaring the catalog schema version "<declared>"
      When the renderer validates the spec
      Then the spec is <outcome>

      Examples:
        | declared | outcome                          |
        | 1.0.0    | accepted                         |
        | 1.1.0    | accepted                         |
        | 1.1.7    | accepted                         |
        | 1.2.0    | rejected as unsupported-version  |
        | 2.0.0    | rejected as unsupported-version  |
        | 0.9.0    | rejected as unsupported-version  |
        | 1.1      | rejected as unsupported-version  |

  Rule: A batch changes only what it names

    # S4
    Scenario: Setting props keeps the element, its focus, its typed value and its scroll
      Given a live surface showing a card "dec-3" and a field "note" the user has focused and typed "hola" into
      When the agent applies a batch setting the card's tone and the field's label
      Then the card and the field are the same elements as before
      And the field keeps the focus, the typed "hola" and its scroll position

    # S5
    Scenario: Inserting a sibling before a focused node recreates and reorders nothing else
      Given a live surface whose list holds the nodes "q-1" and "q-2" and the user has focused "q-2"
      When the agent applies a batch inserting the node "q-0" before "q-1"
      Then the list shows "q-0", "q-1", "q-2" in that order
      And "q-1" and "q-2" are the same elements as before and "q-2" keeps the focus

    # S6
    Scenario: A text op replaces only the text of the named slot
      Given a live surface showing the card "dec-3" with the header text "Draft" and a focused field in its body
      When the agent applies a batch setting the header text of "dec-3" to "Decided"
      Then the header reads "Decided"
      And every element of the card is the same as before and the field keeps the focus

    # S7
    Scenario: Removing a node detaches only its subtree and frees its id and budget
      Given a live surface at its node budget holding the nodes "q-1" and "q-2"
      When the agent applies a batch removing "q-1"
      Then only "q-1" and its subtree leave the surface and "q-2" is the same element
      And a later batch may insert a new node with the id "q-1"

    # S8
    Scenario: Replacing a node swaps exactly that node in place
      Given a live surface whose list holds the nodes "q-1", "q-2" and "q-3"
      When the agent applies a batch replacing "q-2" with a new node
      Then the new node sits between "q-1" and "q-3"
      And "q-1" and "q-3" are the same elements as before

  Rule: A batch is atomic and a rejection never kills the surface

    # S9
    Scenario: One invalid op discards the whole batch and the surface stays live
      Given a live surface at revision 4
      And a batch of ten ops whose seventh inserts the component "script"
      When the agent applies the batch
      Then the surface's elements, revision and snapshot are unchanged
      And the diagnostic names the op, the rule and the offending value
      And a following valid batch applies and advances the revision to 5

    # S10
    Scenario Outline: Every op is held to the guarded renderer's boundary
      Given a live surface showing the card "dec-3"
      When the agent applies a batch that <violation>
      Then the surface is unchanged
      And the diagnostic names the rule "<rule>"

      Examples:
        | violation                                                   | rule              |
        | inserts a component outside the catalog                     | unknown-component |
        | sets an undeclared prop on "dec-3"                          | unknown-prop      |
        | sets the event-handler prop "onclick"                       | unknown-prop      |
        | inserts a link whose URL prop is "javascript:alert(1)"      | url-scheme        |
        | carries the key "__proto__" inside an op's props            | forbidden-key     |
        | inserts a node whose id is already live                     | duplicate-id      |
        | targets an id that is not live                              | unknown-id        |
        | inserts into a slot the parent does not declare             | unknown-slot      |
        | binds an action the surface does not declare                | undeclared-action |
        | inserts before a node that sits in another parent           | invalid-position  |
        | sets text on a slot that holds nodes                        | slot-has-nodes    |

    # S20
    Scenario Outline: A name inherited from the object prototype never resolves as a declared one
      Given a live surface showing the empty list "p" and the badge "b"
      When the agent applies a batch that <op> named "<name>"
      Then the surface, its revision and its snapshot are unchanged
      And the diagnostic names the rule "<rule>"
      And no later op can address a node through that name

      Examples:
        | op                                   | name           | rule          |
        | inserts a badge under "p" in a slot  | __proto__      | forbidden-key |
        | inserts a badge under "p" in a slot  | constructor    | forbidden-key |
        | inserts a badge under "p" in a slot  | toString       | unknown-slot  |
        | sets the text of a slot of "p"       | hasOwnProperty | unknown-slot  |
        | sets on "b" the prop                 | valueOf        | unknown-prop  |

    # S11
    Scenario Outline: State budgets bind the resulting state on both sides
      Given a live surface whose resulting state would hold <state>
      When the agent applies the batch producing that state
      Then the batch is <outcome>

      Examples:
        | state                                         | outcome                         |
        | exactly the declared node budget              | applied                         |
        | one node beyond the declared node budget      | rejected as node-count-budget   |
        | one level beyond the declared depth budget    | rejected as depth-budget        |
        | one byte beyond the declared payload budget   | rejected as size-budget         |

    # S12
    Scenario Outline: A batch beyond a per-batch budget is rejected without halting
      Given a live surface whose per-batch budget allows <limit>
      When the agent applies a batch exceeding it by one
      Then the batch is rejected as "<rule>"
      And a following batch within the budget applies

      Examples:
        | limit           | rule              |
        | two ops         | batch-op-budget   |
        | 200 bytes       | batch-size-budget |

  Rule: The user's own state is never overwritten implicitly

    # S13
    Scenario: Setting a value the user changed is rejected without an explicit override
      Given a live surface showing the checkbox "agree" that the user has ticked
      When the agent applies a batch setting "agree" unchecked without forcing it
      Then the checkbox stays ticked and the batch is rejected as "user-state-conflict"

    # S14
    Scenario Outline: A forced override applies only when the host allows it
      Given a live surface whose host <policy> user-state overrides
      And the checkbox "agree" that the user has ticked
      When the agent applies a batch forcing "agree" unchecked
      Then <outcome>

      Examples:
        | policy      | outcome                                                              |
        | allows      | the checkbox is unticked                                             |
        | does not allow | the checkbox stays ticked and the batch is rejected as "user-state-override-denied" |

    # S21
    Scenario Outline: Replacing or removing what holds the user's state needs an allowed override
      Given a live surface whose host <policy> user-state overrides
      And the card "card" holding the field "note" the user has typed into
      When the agent applies a batch that <op>
      Then <outcome>

      Examples:
        | policy         | op                                      | outcome                                                                                  |
        | does not allow | replaces "card"                         | the field keeps the typed text and the batch is rejected as "user-state-conflict"        |
        | does not allow | removes "card"                          | the field keeps the typed text and the batch is rejected as "user-state-conflict"        |
        | does not allow | replaces "note"                         | the field keeps the typed text and the batch is rejected as "user-state-conflict"        |
        | does not allow | removes "note" and inserts a new "note" | the field keeps the typed text and the batch is rejected as "user-state-conflict"        |
        | does not allow | replaces "card" with force              | the field keeps the typed text and the batch is rejected as "user-state-override-denied" |
        | allows         | replaces "card" with force              | the card is replaced and the typed text is discarded                                     |

  Rule: Revision, optimistic concurrency and snapshot keep host and agent in sync

    # S15
    Scenario: The revision advances once per applied batch and never on a rejection
      Given a live surface at revision 0
      When the agent applies a valid batch, a rejected batch and another valid batch
      Then the revision is 2

    # S16
    Scenario: A batch computed against a stale revision is rejected
      Given a live surface at revision 3
      When the agent applies a valid batch carrying ifRevision 2
      Then the surface is unchanged
      And the diagnostic names the rule "stale-revision" and the current revision

    # S17
    Scenario: The snapshot is the current content as frozen plain data
      Given a live surface after several applied batches
      When the host takes a snapshot
      Then the snapshot holds the current nodes with their ids, props, actions and text as plain data
      And the snapshot cannot be mutated and every node in it validates as a spec root

  Rule: Actions identify their node

    # S18
    Scenario: An action event names the node's id, current path, revision and live data
      Given a live surface where the button "pay" is bound to the declared action "submit"
      And later batches inserted a sibling before it and set its label
      When the user activates "pay"
      Then the host receives one "submit" event with the id "pay", its current path and the current revision
      And its data carries the props set by the latest batch

  Rule: One batch at a time

    # S22
    Scenario: A batch submitted while another is being applied is rejected
      Given a live surface whose host applies a new batch from onAction
      And a component that emits its declared event as soon as it is connected
      When the agent applies a batch inserting that component and then a badge
      Then the inner batch is rejected as "reentrant-batch" and changes nothing
      And the outer batch applies whole, the revision advances once and the DOM matches the snapshot

  Rule: A 0.x catalog schema is compatible only within its minor

    # S23
    Scenario Outline: Under major 0 the version gate accepts only the supported minor
      Given a renderer whose catalog schema version is "0.3.0"
      And a spec declaring the catalog schema version "<declared>"
      When the renderer validates the spec
      Then the spec is <outcome>

      Examples:
        | declared | outcome                          |
        | 0.3.0    | accepted                         |
        | 0.3.9    | accepted                         |
        | 0.2.9    | rejected as unsupported-version  |
        | 0.1.0    | rejected as unsupported-version  |
        | 0.4.0    | rejected as unsupported-version  |

  Rule: No code path exists from batch data

    # S19
    Scenario: Markup in a text op renders as inert text
      Given a live surface showing the card "dec-3"
      When the agent applies a batch setting its text to "<img src=x onerror=alert(1)>"
      Then the text appears verbatim
      And no image element exists and no script executes
```

### Scenario Family Coverage

This is guardrail infrastructure, not a UI component: the live surface adds
no interaction pattern of its own. Keyboard, assistive-technology, form and
theming behavior belong to the catalog components it instantiates; what it
guarantees is that it does not destroy them (S4–S6, S13).

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S23 | |
| Keyboard path | | N/A — no new interaction; focus preservation across updates is core behavior (S4, S5, S6) |
| Assistive-tech outcome | | N/A — the accessibility tree is produced by the rendered catalog components under their own contracts |
| Form participation | | N/A — form behavior is owned by the rendered form components; the surface only refuses to overwrite user state (S13, S14) |
| Theming | | N/A — the surface emits no styles |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (D2): `UiSpecNode` gains an optional `id`. `validateUiSpec`,
  `renderUiSpec`, `createStreamingRenderer` and the live surface reject an
  id outside `^[a-z0-9][a-z0-9_-]{0,63}$` (`invalid-id`) and a repeated id
  in one document (`duplicate-id`). The renderers never write the id to the
  DOM. Nodes without an id are valid and not addressable.
- **FR-002** (D8): the catalog schema version gate (renderer, stream, live
  surface and `createCatalog`'s `extend`) accepts a declared `MAJOR.MINOR.PATCH`
  version with the supported major and a minor not newer than the
  supported minor (under major `0`: exactly the supported minor, S23);
  anything else, including a non-SemVer string, is rejected fail-closed
  with `unsupported-version`. The catalog schema
  version becomes `1.1.0` (generated, Art. I).
- **FR-003** (D1, D3): `createLiveSurface(options)` returns `{ apply,
  snapshot, revision }`. Options: `surface`, `catalog`, `actions` (the
  declared actions, fixed for the surface's life), `budgets` (resulting
  state: depth, node count, payload bytes; defaults of `028`),
  `batchBudgets` (ops per batch, bytes per batch), `catalogSchemaVersion`,
  `onAction`, `allowUserStateOverride`. The catalog is fixed for the
  surface's life (032 S16 semantics).
- **FR-004** (D3): `apply(batch)` takes untrusted data
  `{ ifRevision?, ops: [...] }` and runs, in order: purity wall over the
  whole batch → batch shape → per-batch budgets → `ifRevision` → every op
  applied to a COPY of the state, each inserted or replacing node validated
  as a spec root (catalog, props, actions, slots, ids) → the resulting
  state validated as a whole (catalog membership and props of every node,
  declared slots, unique ids, tag grammar, prop-name guards, URL allowlist,
  state budgets) → only then the DOM. The first failure discards the whole
  batch; the result is `{ ok, revision, diagnostics }` with `028`-shaped
  inert diagnostics naming op or state path, rule and offending value.
  A rejected batch changes neither DOM, revision nor snapshot, and never
  halts the surface. Every name an op carries (slot, prop) and every
  catalog lookup resolves by OWN property only, and the state budgets are
  counted on the live model itself, not on a derived view (S20). A call
  to `apply` while a batch is being applied is rejected as
  `reentrant-batch` without touching anything (S22).
- **FR-005** (D4): DOM writes are minimal: `set` changes only the
  attributes whose value changes on the existing element (booleans by
  presence, `null` unsets); `text` updates the text node of a slot in place
  when the slot holds one text, otherwise swaps only that slot's text
  nodes; `insert` builds the new subtree detached and places it before the
  DOM node of the next sibling; `remove` detaches only the subtree;
  `replace` swaps only that subtree in place. Every new element crosses the
  same builder as `renderUiSpec` (attributes, inert text nodes, declared
  activation event). No other element is created, removed or moved.
- **FR-006** (D5): `checked`, `value` and `open` are user-owned on an
  element whose catalog entry declares them, once a user interaction event
  (`input`, `change` or a declared event of that entry) was emitted by that
  element. A `set` that would change such a prop away from the element's
  live value is rejected as `user-state-conflict` unless the op carries
  `force: true`; a forced op is rejected as `user-state-override-denied`
  unless the host set `allowUserStateOverride: true`, in which case the
  attribute and the component's own property are written. The same holds
  for `replace` and `remove` (both accept `force`): they are rejected while
  the node or any descendant holds a user-owned value that differs from
  what the agent last wrote (S21).
- **FR-007** (D6): `revision` starts at 0 and advances by exactly one per
  applied non-empty batch. `ifRevision` different from the current revision
  rejects the batch as `stale-revision` with the current revision as value.
  `snapshot()` returns `{ revision, actions, nodes }` deep-frozen, where
  `nodes` are the top-level nodes in the neutral format; each validates as
  the root of a spec declaring `actions`.
- **FR-008** (D7): the live action channel delivers
  `{ action, id?, path, revision, data }`: `id` of the bound node when it has
  one, `path` computed from the node's CURRENT position
  (`surface[<i>]…slots.<name>[<j>]`), the surface revision at the gesture,
  and `data` per `028` FR-003 computed from the node's CURRENT props.
- **FR-009** (D9): nothing in the feature names a protocol; no data binding
  or domain component enters the core. `renderUiSpec` and
  `createStreamingRenderer` keep their semantics (whole replacement and
  append-then-halt).

### Key Entities

- **Node id**: optional, stable, grammar-restricted, unique per surface;
  the only address of an op.
- **Batch**: untrusted plain data `{ ifRevision?, ops }`; the unit of
  atomicity, validation and revision.
- **Op**: `insert { parent?, slot?, before?, node }`, `set { id, props,
  force? }`, `text { id, slot?, text }`, `remove { id, force? }`,
  `replace { id, node, force? }`.
- **Resulting state**: the surface content as it would be after the batch;
  the only state budgets and validation are evaluated against.
- **Revision**: monotonic per-surface counter of applied batches.
- **Snapshot**: frozen plain-data copy of the current content.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive on `@kimen/catalog` —
  `createLiveSurface`, `LiveSurface`, `LiveSurfaceOptions`, `LiveBatchResult`,
  `LiveSnapshot`, `LiveActionEvent`, `LiveBatchBudgets`,
  `DEFAULT_LIVE_BATCH_BUDGETS`, the optional `UiSpecNode.id` and the
  `invalid-id`/`duplicate-id` validation codes; catalog schema `1.0.0` →
  `1.1.0` (additive minor). The version gate change widens what is
  accepted only within the same major. `@kimen/catalog` is not part of the
  elements/tokens public-API snapshot (as for 027/028/032), so no
  `changes/api` declaration digest changes.
- **Bundle budget** (Art. IV): one new module of plain TypeScript; no new
  runtime dependency.
- **Accessibility** (Art. V): no new interaction pattern; the feature exists
  to preserve focus and the user's state.
- **Tokens** (Art. VI): none.
- **Guardrail/security boundary** (Art. VIII): a new DOM write path. It reuses
  the purity wall, catalog validation, tag grammar, prop-name guard and URL
  allowlist of `028`/`032` on the resulting state (S9–S12, S19), and adds
  user-state protection (S13, S14) and optimistic concurrency (S16).

## Success Criteria *(mandatory)*

- **SC-001**: in Chromium, after `set`, `text` and `insert` batches around a
  focused field with typed text, the field is the same element and keeps
  focus, value and `scrollTop` (S4–S6).
- **SC-002**: 100% of the adversarial batches leave DOM, revision and
  snapshot unchanged, report the rule, and a following valid batch applies.
- **SC-003**: a property-based run of random valid and invalid batches never
  leaves an element outside the catalog on the surface and the DOM always
  equals a fresh build of `snapshot()`.
- **SC-004**: the S1–S23 traced tests run green inside the deterministic
  gates; the existing 028/032 suites stay green unchanged except for the
  version-gate scenario they share with S3.

## Assumptions

- Client-side only, like `028`.
- The host paces batches; per-batch budgets bound the work of one batch.
- What the user changed is detected from the element's own interaction
  events and its live property, read as a scalar of the declared type (the
  same channel `028` FR-003 reads); a component that changes those props
  without emitting `input`/`change`/a declared event is not protected.
- `replace` and `remove` never discard user state implicitly (D5 as
  revised): the agent removes or rebuilds what the user changed only with
  `force` and the host's permission.
