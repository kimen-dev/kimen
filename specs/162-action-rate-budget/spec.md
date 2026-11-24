# Feature Specification: A surface sends its actions within a rate budget

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. II, IV and IX. -->

**Feature Branch**: `claude/unruffled-hawking-2a5537` (spec `162-action-rate-budget`)

**Created**: 2026-11-24

**Status**: Approved. The founder approved the scenarios, which are guardrail
scenarios (Art. VIII), and the defaults on 2026-11-24; the amendment to `028`
below is applied. Two changes came after that approval, and the founder
approved both on the same day. S3 uses a code field instead of a combobox,
because a combobox's edit reports its committed selection, not the typed
text, so the rule could not be observed with it. S8 is new: a security
review of the implementation found that a held report left with the surface
revision current when it was delivered, so a host that had updated the
surface in between would read a person's action against a page they never
saw. S8 pins the fix: a held report names the revision, and the path, of the
moment its event fired. Once spec 123 A1 (#588) gave `ki-carousel` a 5000 ms
rotation floor, no catalog component fires its bound event hundreds of times
a second on its own; the founder approved rewording S2 so the real carousel
reports a change every millisecond instead of rotating that fast, which keeps
the budget covered for any future source.

**Input**: The review of spec 154 on 2026-11-24 (draft spec
`161-action-is-a-report`) found declared events that fire without a person's
gesture and left one question out of its scope: how many actions per second
an agent-written spec can cause through such an event. Spec 028 bounds an
abusive spec by depth, node count and payload size, but nothing bounds how
often its bound actions dispatch.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. It adds a fourth kind of render budget to the
guardrail and changes when bound actions reach the host.

## Design-source analysis

Not applicable. No visual surface changes.

## Finding

Measured on `main` at 14909122 (catalog schema `1.9.0`), Chromium 1255 under
Playwright 1.65.1, headless, on the founder's Mac, 2026-11-24. Real time, not
a page clock: smooth scrolling runs on the compositor, which a page clock does
not drive. Each figure is the count in one 1,000 ms window opened 300 ms after
render, over three runs.

**The spec.** A `ki-carousel` with `autoplay: 1`, `loop: true` and three
`ki-carousel-item` slides, bound by name to the declared action `slide` (its
only declared event is `ki-slide-change`). The catalog accepts any `autoplay`
from 1 to 2,147,483,647 ms.

| Path | Placement | Actions in 1 s |
|---|---|---|
| `renderUiSpec` (packaged document, real components) | visible, `single` layout | 215–217 |
| `renderUiSpec` | visible, `multi-browse` layout | 421–435 |
| `renderUiSpec` | inside a closed `ki-details` | 211–217 |
| MCP Apps, reference `AppBridge` 2.0.4, server acknowledges with `relay: true` | visible, `single` | 20–24 `tools/call`, as many `ui/message` |
| same | visible, `multi-browse` | 0 (rotation stalled after 1–6 moves; not investigated) |
| same | inside a closed `ki-details` | 192–198 `tools/call` and 192–198 `ui/message` |
| MCP Apps, server never answers | inside a closed `ki-details` | 195–207 `tools/call`, all still pending |

**Why the visible figures vary.** Rotation calls `restartTimer` after every
move (`packages/elements/src/components/ki-carousel/ki-carousel.tsx`); the
browser clamps the chained 1 ms timer to about 4 ms. A scroll event clears
the timer and only `scrollend` restarts it, so when a smooth scroll gets a
frame, rotation waits for it (the 20–24 per second through MCP Apps). When
moves keep restarting the smooth scroll before a frame lands, no scroll event
fires and nothing slows the rotation (the 215 per second). Inside a closed
disclosure nothing is painted, no scroll event ever fires, and the rate is
steady at about 200 per second whatever the layout. That placement is also
the one a person cannot see, hover, focus or pause. Only
`prefers-reduced-motion: reduce` stops it.

**What each action costs downstream.** In MCP Apps each dispatch is one
`tools/call` to the server through the host
(`packages/adapter-mcp-apps/src/bridge.ts`); `pendingActions` has no cap. A
server that acknowledges with `relay: true` (spec 040) turns each one into a
`ui/message` with role `user` in the model's conversation: about 200 per
second, 12,000 per minute, from one hidden component. A server that never
answers accumulates the same number of outstanding requests.

**The catalog has one self-repeating source today.** The other events that
fire without a gesture (`161`: a toast's timeout, an image's load error, a
spec-opened popover, a lazy tree item) fire once per render. A live update
can retrigger them, but each update is a host message, so the other side
sets that rate. Bindable events a person can fire quickly are the
per-keystroke ones: `ki-combobox` and `ki-code-input` `ki-input` (about 10–15
per second for a fast typist, about 30 with key repeat). A slider's per-drag
`input` is not a declared event.

## Options compared

| Option | Measured effect on the hidden carousel | What it leaves open |
|---|---|---|
| **A floor on `ki-carousel` `autoplay`** in its component contract | at most one move per floor interval (0.2 per second with a 5,000 ms floor) | Every other path: a future self-repeating event, a live update loop. Raising the catalog `minimum` rejects specs that are valid today (Art. IX), so it would have to clamp silently. A component contract is not where Art. VIII places the boundary. |
| **A cap on in-flight action calls** in the MCP Apps bridge | none while the server answers: the 192–198 `tools/call` per second above were all answered | The rate itself, the `ui/message` relays, A2UI, and a host that consumes `onAction` directly. It only bounds a server that stops answering. |
| **An action-rate budget in the guarded renderer** (this spec) | at most 12 in the first second, then 2 per second, on every path | Several surfaces on one page each get their own budget. |

**Recommendation: the renderer budget.** Spec 028 already treats every spec
as untrusted and bounds it with declared budgets in one place that every
render path and every adapter shares (FR-006, US3). Shedding the excess at the
source, rather than queuing it, is the standard answer to an overload that
would otherwise reach a downstream service (load shedding: Newman, *Building
Microservices*, 2nd ed., ch. 12, on bulkheads). Holding the latest report per binding keeps
the honest high-frequency case (a remote search box) correct.

**The carousel floor is worth doing on its own**, as an accessibility change
to spec 123, not as this guardrail: slides that change more than three times
a second can fail WCAG 2.2 SC 2.3.1 (Three Flashes or Below Threshold,
Level A) when they differ enough in luminance. That decision is separate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No spec floods the host with actions (Priority: P1)

A host renders an agent-written spec that binds an action to an event that
fires on its own, hidden where the person cannot stop it. However the
component behaves, the host receives at most the declared burst at once and
one more action per refill interval after that.

**Why this priority**: today one hidden carousel makes about 200 `tools/call`
and, with a relaying server, about 200 `ui/message` per second.

**Independent Test**: render the measured spec through each render path and
count actions over one second (S2); render the boundary fixtures (S1, S7).

**Acceptance Scenarios**: S1, S2, S7.

---

### User Story 2 - An honest binding keeps its meaning under the budget (Priority: P1)

A person typing into a field bound per edit (a verification code, a remote
search) gets an answer for what they last typed, and a person's click is never
starved by another binding's flood.

**Why this priority**: a budget that drops the last report of a field bound
per edit would break the honest use spec 154 enabled.

**Independent Test**: spend the budget, type a code, read the last action
(S3); flood one binding, click another (S4).

**Acceptance Scenarios**: S3, S4.

---

### User Story 3 - The excess is safe and diagnosable (Priority: P2)

A held report never describes a node that is gone, and the host learns, once
per surface, that the budget held a report and for which node and action, so
an emitting agent can correct its next spec.

**Why this priority**: 028 US3 requires every refusal to be diagnosable;
without it, missing actions look like a host bug.

**Independent Test**: hold a report, re-render, assert it never arrives (S5);
assert one diagnostic for a flooding spec (S6).

**Acceptance Scenarios**: S5, S6, S8, S9.

### Edge Cases

- Repeated activations of one binding while it is held arrive as one report,
  carrying the data of the latest. A surface whose every activation must be
  counted stays within the burst, which no person's clicking exceeds.
- A collecting binding (`153`) whose fields are invalid dispatches nothing and
  spends nothing.
- Each surface has its own budget: one call of `renderUiSpec`, one streaming
  render, or one live surface for its whole life. A host that shows several
  surfaces at once multiplies the bound by their number, and a new full paint
  in MCP Apps starts a new live surface with a full budget; both are the
  host's or the server's doing, not the spec's.
- Nothing is scheduled while nothing is held: an idle surface keeps no timer.
- Teardown already stops actions in each adapter (spec 040 S14); a held
  report is discarded with its surface.
- `prefers-reduced-motion: reduce` still stops a carousel's rotation; the
  budget does not depend on it.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A surface sends its actions within a rate budget
  An agent-written spec can bind an action to an event that fires on its own,
  such as a carousel's automatic rotation. Every rendered surface lets through
  at most a declared burst of actions, then one more per refill interval, so
  no spec can flood the host; the latest report of each binding still arrives,
  and a flood on one binding never starves another.

  Rule: A surface never sends more actions than its budget allows

    # S1
    Scenario Outline: A burst exactly at the action budget arrives whole
      Given a surface whose action budget is a burst of 10, then one more every 500 ms
      And 11 buttons, each bound to its own declared action
      When <count> of the buttons are activated at the same moment
      Then the host receives <now> actions at once
      And the host receives <later> more 500 ms later

      Examples:
        | count | now | later |
        | 10    | 10  | 0     |
        | 11    | 10  | 1     |

    # S2
    Scenario Outline: A bound event that fires every millisecond cannot flood the host
      Given a spec that binds the declared action "slide" to a carousel in a closed disclosure, where no one can see it
      And the carousel reports a slide change every millisecond
      When one second passes after <host> renders the spec
      Then <host> receives at most 12 "slide" actions

      Examples:
        | host                                    |
        | a page that renders the spec once       |
        | a live surface                          |
        | an MCP Apps host, as action tool calls  |

  Rule: The latest report of each binding arrives, and none starves another

    # S3
    Scenario: A code typed faster than the budget refills arrives as last typed
      Given a surface whose action budget is spent
      And a code field whose every edit reports the declared action "code"
      When a person types "482916" faster than the budget refills
      Then the last "code" action the host receives carries the code "482916"
      And it arrives within 500 ms of the last keystroke

    # S4
    Scenario: A flooding binding cannot starve a person's action
      Given a hidden carousel whose "slide" reports have spent the surface's action budget
      And a button bound to the declared action "confirm"
      When a person activates the button
      Then the host receives the "confirm" action within 1000 ms

  Rule: A held report never outlives its node

    # S5
    Scenario: A report held for a node the surface no longer shows is never sent
      Given a "slide" report that the action budget holds
      When the host renders a new spec without the carousel on the same surface
      Then the host never receives that "slide" report

    # S8
    Scenario: A held report names the surface revision its event fired on
      Given a surface at revision 1 whose action budget holds a "confirm" report
      When the host applies an update that takes the surface to revision 2
      Then the "confirm" action the host receives names revision 1

    # S9
    Scenario: A value committed in an A2UI form survives an update while the budget is spent
      Given an A2UI surface whose action budget is spent
      And a text field bound to the data model path "/name" in which a person has committed "Ana"
      When the agent updates the surface before the budget refills
      Then the next action the agent receives carries "Ana" from "/name"

  Rule: Exceeding the budget is diagnosable

    # S6
    Scenario: The first report the budget holds is diagnosed once
      Given a spec whose carousel at path "root" reports "slide" every millisecond
      When the surface's action budget holds a report for the first time
      Then the host receives one diagnostic naming the action-rate budget, the path "root" and the action "slide"
      And holding further reports adds no diagnostic

  Rule: The host sets the budget

    # S7
    Scenario: A host that tightens the budget receives fewer actions
      Given a host that sets the action budget to a burst of 1, then one more every 2000 ms
      And a spec that binds "slide" to a carousel that rotates every millisecond
      When one second passes after the host renders the spec
      Then the host receives exactly 1 "slide" action
```

### Scenario Family Coverage

This is guarded-renderer infrastructure, not a UI component.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S9 | |
| Keyboard path | | N/A — no interaction changes; S3's typing is the person's keyboard path to a held report |
| Assistive-tech outcome | | N/A — names, roles and states are each component's own contract |
| Form participation | | N/A — a spec owns no form (`152`) |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every render path (`renderUiSpec`, the streaming renderer and
  the live surface) MUST bound the actions it hands to the host with a
  declared action budget: a burst (`maxActionBurst`, default 10) and a refill
  interval (`actionRefillMs`, default 500). A surface delivers at most the
  burst at once, then at most one more action per interval. The budget
  belongs to one surface: one call of `renderUiSpec`, one streaming render,
  or one live surface for its whole life. It counts a dispatch at the point
  where the action would reach `onAction`, after a collecting binding's
  validity check (`153`).
- **FR-002**: An action beyond the budget MUST be held, not queued. Each
  binding (a node and the action it reports) keeps at most one held report,
  carrying the data of its latest event; a newer report of that binding
  replaces it. When the budget allows, held reports are delivered in the
  order their bindings were first held, and a binding held again after its
  delivery goes to the back. A held report MUST name the path and the
  surface revision of the moment its event fired, never those of the moment
  it leaves (S8). The MCP Apps bridge sends the latest page revision that
  showed the surface the action fired on: an update with no ops moves the
  page revision but not the live surface's, and the content stays the same.
- **FR-003**: A held report whose node is no longer in the surface, or whose
  surface has left the document, when its turn comes MUST be discarded, never
  delivered. A surface MUST keep no timer while nothing is held.
- **FR-004**: The first time a surface's budget holds a report, the renderer
  MUST report one diagnostic with the rule `action-rate-budget`, the node's
  path and the action's name as its value, through a new optional
  `onDiagnostic` callback of each render path. No further diagnostic is
  reported for that surface. The MCP Apps bridge forwards it through
  `onRefusal`, and the A2UI adapter through `onError`, as each already
  reports a refused render.
- **FR-005**: The host MAY lower or raise either value through `budgets`, as
  it does the other render budgets (`028` FR-006). The MCP Apps bridge and the
  A2UI adapter pass their budgets through unchanged, as they do today. A
  host MAY name, with `isLocalAction`, the actions it consumes itself and
  never sends on; those reach `onAction` at once and spend nothing. The A2UI
  adapter names its write-backs to its own data model this way, by the node
  paths it bound, never by action name, which a spec chooses (S9).
- **FR-006**: The `kimen-genui` skill, the UI spec guide and the MCP Apps and
  A2UI guides MUST say that a surface delivers at most its action budget and
  that a binding fired faster delivers its latest report.
- **FR-007**: Spec 028 MUST be amended as below.

### Amendment to spec 028 (applied)

`specs/028-guarded-renderer/spec.md`, FR-006, replace the first sentence
with:

> The renderer MUST enforce declared budgets for nesting depth, node count,
> total payload size and the rate at which a surface delivers actions
> (`162-action-rate-budget`), with safe package defaults the host may
> tighten.

and append:

> The action-rate budget bounds what a rendered surface sends, not what it
> renders: beyond it, an action is held, the latest report of each binding
> is delivered when the budget allows, and the first held report is
> diagnosed (`162`).

User Story 3, append to its first paragraph: "A spec that makes a component
fire its bound event hundreds of times a second still renders, but its
surface delivers no more actions than its action budget allows
(`162-action-rate-budget`)." (A rendered spec is not rejected for a rate it
has not yet shown, so the budget cannot act "before rendering starts".)

Key Entities, **Budget**, append: "and the action rate: a burst and a refill
interval per surface (`162`)."

### Key Entities

- **Action budget**: per surface, a burst and a refill interval that bound
  how many actions reach the host.
- **Binding**: a node and one action it reports; the unit that keeps at most
  one held report.
- **Held report**: an action the budget has not yet delivered: the latest of
  its binding, delivered when its turn comes or discarded with its node.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. Two optional fields on
  `RenderBudgets` (`maxActionBurst`, `actionRefillMs`) and their values in
  `DEFAULT_RENDER_BUDGETS`; an optional `onDiagnostic` on `RenderOptions`,
  the streaming renderer's options and `LiveSurfaceOptions`; a new refusal
  reason value in the MCP Apps bridge. Declared with `pnpm api:declare`. The
  delivery timing of actions changes only beyond the budget.
- **Bundle budget** (Art. IV): the renderer grows by the bucket and the held
  map. `@kimen/catalog`, the MCP Apps surface document and `kimen-mcp` are
  measured on the branch before merge (non-additive batch budgets).
- **Accessibility** (Art. V): none. The carousel floor (WCAG 2.3.1) is a
  separate change to spec 123.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): FR-006 tells agents the budget
  exists and how a fast binding behaves.
- **Guardrail/security boundary** (Art. VIII): adds a fourth budget to the
  guardrail. The founder confirmed S1–S9 explicitly; S9 came after a code
  review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The spec measured above (hidden carousel, `autoplay: 1`,
  `loop`) delivers at most 12 actions in its first second through each render
  path and at most 12 `tools/call` through MCP Apps, down from about 200.
- **SC-002**: S1–S9 pass: S2 in the Chromium browser suite with the real carousel, the others in the unit suites of the catalog and both adapters.
- **SC-003**: An idle surface schedules no timer (FR-003).

## Assumptions

- The defaults (a burst of 10, one more every 500 ms) are a proposal: a
  person's quickest bursts fit in the burst, and the sustained rate is a
  hundredth of the measured flood. The founder fixes them.
- No component changes. A carousel keeps rotating at the interval its spec
  sets; only the actions it causes are bounded.
- Spec 161 (an action is a report, not consent) is independent: it says what
  an action means; this spec bounds how many arrive.
- The in-flight cap in the bridge is deferred: with this budget, a server
  that never answers accumulates at most two outstanding calls per second.

## Founder decisions (2026-11-24)

1. The defaults are a burst of 10 and 500 ms.
2. The diagnostic (FR-004, S6) lands with this spec.
3. The carousel floor (spec 123, WCAG 2.3.1) is its own change, in its own
   session (PR #588).
4. S8 and the S3 wording, both written after approval, are approved.
5. The size bases are re-based by the cost measured against main 3329aea1:
   +1,299 / 598 / 771 B for the MCP Apps document and +1,488 / 605 / 656 B
   for kimen-mcp. Two review fixes (S8's empty update, S9) raised it to
   +1,472 / 664 / 577 B and +1,661 / 668 / 748 B, which the founder approved
   with S9 (2026-11-24).
