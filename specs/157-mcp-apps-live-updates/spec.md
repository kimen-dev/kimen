# Feature Specification: MCP Apps surfaces change without a full repaint

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. II, VII and IX. -->

**Feature Branch**: `claude/mcp-apps-live-updates-804fb8` (spec `157-mcp-apps-live-updates`)

**Created**: 2026-11-21

**Status**: Approved. The founder approved S1 to S7 verbatim on 2026-11-21
("Aprobado S1 a S7; sigue tus dos recomendaciones"), including the Art. VIII
guardrail confirmation, and accepted both recommendations: the relay keeps
only the action and its data, and the unused render seam is removed.

**Input**: Founder decision of 2026-11-21 to land the improvements to the
generative layer before publishing it (design
"Mejoras de Kimen antes de publicar", package D1, improvements 2 and 4).
Today every tool result repaints the whole MCP Apps surface, so the person
loses focus, scroll and whatever they were typing. The surface document now
paints through the live surface (spec `035-live-surface`). A tool result
still carries the full spec and may also carry an update computed on a known
revision; the page applies the update when it can and paints the full spec
otherwise. The action call gains the bound node's `id` and the page
revision, both optional on the server side.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. S1, S2, S3, S5 and S7 change what crosses the
Art. VIII boundary (an untrusted batch enters the surface; two new arguments
leave it) and require explicit standalone founder confirmation.

## Design-source analysis

Not applicable. Nothing looks different: the change decides which parts of
the surface a tool result rebuilds, not how they look. Every pixel still
comes from catalog components rendered under their own contracts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A server answer does not erase what the person is typing (Priority: P1)

A person fills a field of a Kimen surface in an MCP Apps host and, before
sending it, activates another control: "Add" on a list. The server answers
with the list's new item. Today the answer repaints the whole surface: the
field is emptied and the keyboard focus falls to the page. With this feature
the answer also carries an update that inserts one item; the page applies it,
and the field keeps its text and the focus.

**Why this priority**: it is the reason for the feature (improvement 4).
Without it, any multi-field surface in MCP Apps loses work on every answer.

**Independent Test**: in the packaged document, driven by the hand-written
host double, type into a field, keep the focus there, deliver a result whose
update inserts a node, and check the inserted node, the typed text and the
focused element.

**Acceptance Scenarios**: S1 and S4.

---

### User Story 2 - A wrong or late update never leaves the page out of step (Priority: P1)

The page and the server can drift: two answers cross, a batch was computed
against content the page no longer shows, or a hostile batch arrives. In
every such case the page paints the full spec that the same result carries,
so it always ends showing what the server described. The server does not
need to know what happened on the page.

**Why this priority**: an update path that can leave the page showing
something the server never described is worse than the full repaint it
replaces (plan Review Focus 4).

**Independent Test**: deliver results whose update was computed on another
revision, whose batch the live surface rejects, or whose full spec declares
different actions, and compare the surface with that full spec.

**Acceptance Scenarios**: S2, S3 and S7.

---

### User Story 3 - The server learns which node the person used, and on which revision (Priority: P2)

A server that renders a list of records needs to know which row's button the
person pressed, and a server that answers with an update needs the revision
the person saw. Each action call now carries the bound node's `id` (when the
spec gave it one) and the page revision. Servers that read only `action` and
`data` keep working, and calls from a document that does not send the new
arguments are still accepted.

**Why this priority**: improvement 2. Without the revision, no server can
compute an update; without the `id`, a dialog's action cannot say which
record it confirms.

**Independent Test**: activate a bound control and read the arguments of the
`tools/call` the host double receives; call the Kimen MCP server's action
tool with and without the new arguments.

**Acceptance Scenarios**: S5 and S6.

### Edge Cases

- A result carries an update but the page has no surface yet (its first
  result): the full spec paints.
- A result's full spec is invalid: the whole result is refused and nothing
  changes, as today (spec 030 S4, S13), even when its update alone would
  apply. The full spec is the authority; an update never rescues an invalid
  one.
- The update is not a well-formed object, its `baseRevision` is not a
  non-negative integer, or its batch is not a live batch: the update is not
  applied, the full spec paints, and the reason is reported.
- The person activates two controls before the first answer arrives: both
  calls carry the same revision. The first answer's update applies; the
  second answer's update was computed on a revision the page has left, so its
  full spec paints (S2).
- A full repaint happens between two answers that were computed on the same
  revision number of different contents: the page revision never repeats
  (S7), so the later update cannot apply to content it was not computed for.
- An update applies but the result's full spec declares other actions: the
  update is not applied (S3), so the outbound allowlist is always exactly the
  actions of the last accepted full spec, as today (spec 030 S6).
- A host caches an older surface document that sends only `{ action, data }`:
  the server accepts it (S6).
- The relay to the model (spec 040) carries only the action and its data. The
  `id` and the revision never enter the relayed text.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: MCP Apps surfaces change without a full repaint
  A Kimen surface inside an MCP Apps host paints through the live surface.
  A tool result always carries the full spec it describes and may also carry
  an update: a live batch and the page revision it was computed on. The page
  applies the update only on that revision and only when the live surface
  accepts it, so what the person is typing survives; in every other case it
  paints the full spec, as before. Each action call tells the server where
  the person acted: the bound node's id and the page revision.

  Rule: An update changes only what it names, or the full spec wins

    # S1
    Scenario: An update computed on the current revision keeps what the person is typing
      Given a surface at revision 2 whose field "title" has the keyboard focus and holds the unsent text "Buy milk"
      When a tool result arrives whose update, computed on revision 2, adds the item "Call Ana" to the list "tasks"
      Then the list "tasks" shows "Call Ana"
      And the field "title" still holds "Buy milk" and keeps the keyboard focus

    # S2
    Scenario: An update computed on another revision shows the full spec of that result
      Given a surface at revision 3 whose field "title" holds the unsent text "Buy milk"
      When a tool result arrives whose update was computed on revision 2
      Then the surface shows exactly the full spec of that result
      And the update is reported as not applied because its revision is stale

    # S3
    Scenario Outline: An update the surface cannot apply shows the full spec of that result
      Given a surface at revision 2 painted from a spec that declares only the action "add"
      When a tool result arrives whose update, computed on revision 2, <defect>
      Then the surface shows exactly the full spec of that result
      And nothing the update carried is rendered and the update is reported as not applied

      Examples:
        | defect                                                         |
        | removes the node "gone", which is not on the surface           |
        | inserts an "iframe" component targeting https://evil.example   |
        | comes with a full spec that also declares the action "archive" |

    # S4
    Scenario: A result without an update repaints from its full spec, as before
      Given a surface whose field "title" holds the unsent text "Buy milk"
      When a tool result arrives that carries only a full spec
      Then the surface shows exactly that spec
      And the field "title" holds the value that spec gives it

  Rule: An action call tells the server where the person acted

    # S5
    Scenario: An activated control's action call carries its node id and the revision
      Given a surface at revision 3 whose button with the id "save" is bound to the declared action "save"
      When the person activates the button
      Then the host receives one tools/call request for the app-only action tool with the action "save", the id "save" and the revision 3

  Rule: The new call arguments are optional

    # S6
    Scenario Outline: The Kimen MCP server accepts an action call with or without the new arguments
      Given the Kimen MCP server rendered a surface that declares the action "refresh"
      When the surface sends the action "refresh" <arguments>
      Then the server acknowledges "refresh" and asks for it to be relayed

      Examples:
        | arguments                                                     |
        | with the data "sku" "A-12", the id "row-3" and the revision 2 |
        | with the data "sku" "A-12" and neither an id nor a revision   |

  Rule: A revision names one state of the page and is never reused

    # S7
    Scenario: A full repaint never reuses a revision the page has already reported
      Given a surface at revision 3
      And a tool result without an update then repainted it from its full spec
      When the person activates a control bound to a declared action
      Then the action call carries the revision 4
```

Scenario vocabulary: "revision" is the page revision of FR-004; "update" is
the `update` member of FR-001; "full spec" is its `spec` member; "shows
exactly the full spec" means the rendered content is what painting that spec
alone produces, with no value the person typed before it arrived; "reported
as not applied" is one `update-not-applied` refusal (FR-005).

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-boundary feature of the MCP Apps adapter, not a UI
component. Like spec 030, it adds no component and no interaction pattern;
the interaction families belong to the catalog components it paints.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7 | |
| Keyboard path | | N/A — no new interaction; S1 asserts that the keyboard focus survives an update, and each component's keyboard path is its own contract |
| Assistive-tech outcome | | N/A — the accessibility tree comes from catalog components under their own contracts; this feature only decides which of them a result rebuilds |
| Form participation | | N/A — the surface has no form; values reach the server as action data, unchanged by this feature |
| Theming | | N/A — the color scheme stays as spec 030 S19 and S20 define it |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (result shape)**: the surface payload stays
  `structuredContent.kimenSurface = { spec, update? }`. `spec` is required and
  is always the complete UI spec the result describes; a result without it is
  refused as today (spec 030 S13). `update`, when present, is
  `{ baseRevision, batch }`: `baseRevision` is the page revision (FR-004) the
  batch was computed on, and `batch` is one live batch of spec 035, carried as
  untrusted data and validated only by the live surface.
- **FR-002 (one paint path)**: the surface document paints only through the
  live surface (`createLiveSurface`, spec 035), whose every batch crosses the
  guarded renderer's boundary (spec 028). A full paint is a new live surface,
  created with the actions the full spec declares, that receives the spec's
  root as one inserted node and then replaces the previous content in one
  operation. A rejected full paint leaves the previous content intact.
- **FR-003 (order)**: for each tool result, on both paths that render today
  (`ui/notifications/tool-result` and the answer to the surface's own
  `tools/call`):
  1. the full spec is judged exactly as `renderUiSpec` judges it today
     (`preflightUiSpec`, same budgets and catalog schema version); an
     invalid full spec refuses the whole result with today's diagnostics and
     nothing changes;
  2. the update is applied when, and only when, all hold: a surface exists,
     the page revision equals `baseRevision`, the full spec declares exactly
     the actions the current surface was created with, and the live surface
     accepts the batch. Nothing else changes: existing elements keep their
     identity, focus, typed values and scroll;
  3. otherwise the full spec paints (FR-002), as a result without an update
     does.
- **FR-004 (page revision)**: the page revision is 0 before the first paint
  and advances by exactly one on every full paint and on every applied
  update; it never decreases and never repeats during the page's life. It is
  the bridge's own counter, not the live surface's, because each full paint
  creates a new live surface whose own revision starts again.
- **FR-005 (observable fallback)**: an update that is present and not applied
  is reported through the bridge's refusal channel as one inert refusal with
  the reason `update-not-applied`, naming why (stale revision, different
  declared actions, or the live surface's first diagnostic). The result itself
  is accepted: it painted its full spec.
- **FR-006 (outbound allowlist)**: the actions a surface may dispatch are
  exactly the actions declared by the full spec of the last accepted result,
  as today (spec 030 S6). FR-003 step 2 keeps that true on the update path.
- **FR-007 (action call)**: a declared action leaves as today's `tools/call`
  to the app-only action tool, with `arguments` `{ action, data, revision,
  id? }`: `data` unchanged; `revision` the page revision at the gesture;
  `id` the bound node's stable id when the spec gave it one, absent
  otherwise. A dispatch through the bridge's public `dispatch(action, data)`
  carries the revision and no `id`.
- **FR-008 (declared tool schema)**: `declareActionTool` declares two optional
  properties: `id`, a string matching the node-id grammar
  (`NODE_ID_GRAMMAR`), and `revision`, a non-negative integer. `required`
  stays `["action"]` and `additionalProperties` stays `false`.
- **FR-009 (relay unchanged)**: the spec 040 relay is built from the action
  and its data alone (040 D4). The `id` and the revision never enter the
  relayed text.
- **FR-010 (Kimen MCP server)**: `@kimen/mcp-server`'s strict input schema for
  `kimen_surface_action` accepts `id` and `revision` under the bounds of
  FR-008 and ignores them: the acknowledgment and the relay request stay as
  spec 040 D7 defines them. A call without them is accepted as today. The
  server's results keep carrying only a full spec; it never sends an update.
- **FR-011 (budgets)**: the full spec keeps today's render budgets. An update
  batch is bounded by the live surface's per-batch op budget (64 ops) and by
  the full spec's byte budget (262,144 bytes by default) plus the few bytes of
  the one insert that paints a full spec, so a result never demands much more
  than two full specs. A full spec the guarded renderer accepts is never
  refused by a batch budget.
- **FR-012 (boundaries)**: `@kimen/catalog` and `@kimen/elements` do not
  change (Art. VIII). The adapter types the batch as `unknown` until
  `@kimen/catalog` exports the live batch type (spec 155).
- **FR-013 (documents)**: the adapter's `COMPAT.md` (the `tool-result` and
  `tools/call` rows, the action-answer row, the document size table),
  `README.md`, `docs/guides/mcp-apps.md` and the server's README and
  `COMPAT.md` describe the new shapes, and specs 030, 038 and 040 are amended
  as the section below states, in the change that implements this spec.

### Key Entities

- **Full spec**: `kimenSurface.spec`, the complete UI spec a result
  describes; the authority and the fallback.
- **Surface update**: `kimenSurface.update = { baseRevision, batch }`, an
  optional live batch and the page revision it was computed on.
- **Page revision**: the bridge's monotonic count of full paints and applied
  updates; sent with every action call, matched against `baseRevision`.
- **Action call**: the `tools/call` to `kimen_surface_action` with
  `{ action, data, revision, id? }`.

## Amendments to specs 030, 038 and 040 *(proposed, applied with the implementation)*

No scenario of 030, 038 or 040 pins the call's arguments or a full repaint,
so no Gherkin line changes and no S-ID is retired or added there. Each stays
true as written:

- **030 S6** ("dispatching "refresh-inventory" sends one tools/call request
  naming the adapter's app-only action tool") and **030 S17** ("... with the
  action "confirm"") name the tool and the action, not the full argument set.
- **030 S13** ("the spec renders through the guarded renderer") stays true:
  the live surface validates every batch at the guarded renderer's boundary,
  and a result without a Kimen surface is still refused with the rendered
  state unchanged.
- **030 S4** stays true: an invalid full spec refuses the whole result
  (FR-003 step 1), and a hostile update is refused by the live surface
  (S3 here).
- **040 S1–S15** stay true: the relay text is still built from the action and
  its data only (FR-009).
- **038 S12/S13** stay true: declared actions are acknowledged, undeclared
  ones refused.

What changes is prose and tests:

1. **030 FR-003**, first sentence, becomes: "The only render path inside a
   surface MUST be the guarded renderer over the neutral catalog (spec
   `028-guarded-renderer`), reached through the live surface (spec
   `035-live-surface`), whose every batch crosses the same boundary
   (amended by spec 157, 2026-11-21)."
2. **030 Key Entities**, after "Surface spec", add: "**Surface update**: an
   optional live batch and the page revision it was computed on, carried next
   to the full spec in a tool result; applied only on that revision and only
   when the live surface accepts it (spec 157)."
3. **030 Constitutional Surface**, bundle budget: replace the stale figures
   ("at most 600 kB raw, 135 kB gzip and 112 kB brotli — about 5% above the
   document measured on 2026-11-14 ...") with "within the raw, gzip and brotli
   limits `scripts/lib/bundle-size-budget.mjs` calculates from the component
   inventory".
4. **030 Assumptions**, append: "**Amendment — live updates (2026-11-21)**:
   spec 157 makes the document paint through the live surface. A tool result
   may carry an update next to its full spec; the action call carries the
   bound node's `id` and the page revision. No S-ID is retired or added
   here; FR-003 and Key Entities are amended."
5. **040 D4**, after "exactly the data the `tools/call` carried", add: "(the
   `id` and `revision` arguments that call also carries, spec 157, never enter
   the relay)". **040 FR-011**: replace the budget figures as in item 3.
6. **038**, tools table: the `kimen_surface_action` input becomes
   "`{ action, data?, id?, revision? }` (`id` and `revision` accepted and
   ignored, spec 157)".
7. Tests that pin the exact call (`expectedActionCall` in
   `tests/spec-messages.ts`, used by 030 and 040 tests, and the 040 S15
   reference-host test) gain the `revision` argument; the declared schema is
   pinned by this spec's S6 test.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): `@kimen/adapter-mcp-apps` (private,
  `0.0.0`): `surfaceToolResult` gains an optional `update` argument;
  `SurfacePayload` gains `update?`; `ActionCallRequest.arguments` gains
  `revision` and `id?`; `KimenActionTool` gains the two schema properties.
  `SurfaceBridgeOptions.render` and the `GuardedRender` type are removed: no
  caller in the repository injected them, and they could not keep their
  meaning (founder decision 2, below).
  `@kimen/mcp-server` (published): its action tool accepts two more optional
  arguments and its surface document changes; additive. `@kimen/catalog` and
  `@kimen/elements`: no change.
- **Bundle budget** (Art. IV): the document starts using the live surface,
  which the bundler dropped before because nothing imported it. Measured
  against main `618df310` on macOS: +16,944 B raw, +5,311 B gzip and +4,586 B
  brotli for the document, and +17,462 / +5,452 / +4,701 B for `kimen-mcp`,
  which embeds it. The founder approved re-basing both budgets
  (`scripts/lib/bundle-size-budget.mjs`) by exactly the measured growth on
  2026-11-21, so the headroom stays what it was. No new runtime dependency.
- **Accessibility** (Art. V): no new interaction pattern. The keyboard focus
  survives an applied update (S1), which today's full repaint loses.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): no catalog change. The guide tells
  an integrating server when to send an update (it knows the revision the
  person acted on) and that the full spec must always describe the whole
  surface.
- **Guardrail/security boundary** (Art. VIII): an untrusted live batch enters
  the surface (S1–S3), validated only by the live surface; two arguments leave
  it (S5, S7), both authored by the spec or the page, never typed by the
  person. Standalone founder confirmation required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: after an applied update, 100% of the elements the batch did not
  name keep their identity, typed value and focus (S1).
- **SC-002**: after a stale, rejected or inconsistent update, the rendered
  content equals what painting that result's full spec alone produces, in
  100% of the S2 and S3 cases.
- **SC-003**: every action call the document sends carries a revision, and
  no two different contents of one page ever carry the same revision (S5,
  S7).
- **SC-004**: the Kimen MCP server acknowledges a declared action with and
  without the new arguments (S6).

## Assumptions

- **Not run in a production host.** Like the rest of the adapter
  (`COMPAT.md`), this feature is exercised only by the hand-written host
  double and the reference SDK host. A later task prepares a real-host test;
  nothing here claims one.
- **A strict schema written by hand breaks.** The adapter's declared schema
  (`declareActionTool`) is the contract. An integrator who copied today's
  schema by hand, with `additionalProperties: false`, rejects calls from the
  new document until it adds the two optional properties; `COMPAT.md` says
  so. `@kimen/mcp-server` ships the document and the schema together.
- **The server computes the update.** The page never checks that the update
  turns the old content into the full spec; it checks the revision, the
  declared actions and the batch's validity, and paints the full spec on any
  doubt. A server whose batch disagrees with its own full spec shows the
  batch's result; the guide says the two must describe the same surface.
- **Layout.** A full paint mounts the new live surface in a container element
  inside the document's mount point, so the swap is one operation; it carries
  no semantics and no style.
- **The live batch type** is exported by spec 155's change. Until then the
  adapter types it as `unknown` (FR-012).
- **Founder decision 1 — the relay and the `id`.** The relay to the model
  keeps only the action and its data (FR-009), because the consumer of the
  `id` is an integrating server, and spec 040 D4 pins the relayed text. A
  model behind `@kimen/mcp-server` therefore still cannot tell which row's
  button was pressed. Adding the `id` later is an additive change to 040.
- **Founder decision 2 — the render seam.** `SurfaceBridgeOptions.render`
  (`GuardedRender`) was a test seam no test used, and it could not keep its
  meaning once painting goes through the live surface. It is removed (the
  package is private and unpublished).
- **Founder decision 3 — removable chips (2026-11-21).** On a live surface a
  `ki-chip`'s removal request is prevented (spec 035): its bound action still
  leaves, and the chip stays until a result removes it. The static renderer
  let the chip remove itself. Accepted and documented in `COMPAT.md`, the
  guide and the server's `COMPAT.md`; with `@kimen/mcp-server`, the model
  receives the relayed action and renders again.
