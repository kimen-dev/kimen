# Feature Specification: An action is a report, not consent

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I and II. -->

**Feature Branch**: `claude/magical-gould-beb3c5` (spec `161-action-is-a-report`)

**Created**: 2026-11-24

**Status**: Approved. The founder approved the scenario and the amendments
to `028` and `040` below verbatim on 2026-11-24 ("Aprobado tal cual"); S1 is
a guardrail scenario (Art. VIII).

**Input**: An automated security review of the push of
`claude/package-api-gate` (PR #568), which merged `main` and so carried
#575, flagged `wireEventActions` in `packages/catalog/src/render.ts`
(spec 154): it dispatches a bound action on any event the catalog entry
declares, with no check that a person caused the event. An agent-written
spec could bind an action whose meaning is consent, such as
`tool.approved`, to an event that fires on its own, and the host would
receive it as if the person had chosen it.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. It changes no runtime behavior: it states what
the guarded renderer does not guarantee, pins the behavior that already
exists, and corrects the documents that promise more.

## Design-source analysis

Not applicable. No visual surface changes.

## Finding

Read on `main` at 41df76ad (catalog schema `1.9.0`).

**Events the catalog declares that fire without a gesture.** Every one can
carry a binding today.

| Component | Event | What fires it without the person |
|---|---|---|
| `ki-toast` | `ki-dismiss` | its time runs out (`duration`, 5000 ms by default) |
| `ki-image` | `ki-error` | its source fails to load, at render |
| `ki-carousel` | `ki-slide-change` | `autoplay` (any interval of 1 ms or more), or a new `current` |
| `ki-tree-item` | `ki-load` | the spec renders it `expanded` and `lazy` with no children |
| `ki-tree-item` | `ki-expand`, `ki-collapse` | a live update changes `expanded` |
| `ki-popover` | `ki-open`, `ki-close` | the spec renders it `open`, or a live update changes `open` |
| `ki-dialog` | `ki-close` | the host closes it (`154` S3), or a live update sets `open: false` |
| `ki-drawer` | `ki-close` | the host calls `close()`, or a live update sets `open: false` |
| `ki-audio` | `ended` | the recording ends, at a moment the person did not choose |
| `ki-details` | `ki-toggle` | an exclusive peer closes it |

**Before #575.** A binding by name already reached the same events on every
single-event entry: `ki-toast`, `ki-image`, `ki-carousel`, `ki-drawer` and
`ki-audio` were bindable by name in catalog `1.7.0` (`d1c9506f`), and so was
a `ki-dialog` without a confirm label, on `ki-close`. Spec 154 added
`ki-popover`, `ki-tree-item` and a dialog's close whatever its confirm
label. It widened the exposure; it did not create it.

**What the renderer cannot know.** Apart from the native `click` of
`ki-fab` and the click fallback, the component's own script dispatches every
event the catalog declares (a `CustomEvent`, or a plain `Event` for the form
controls' `change`), so `event.isTrusted` is `false` for a person's approval
as much as for a timer. A component's own `detail` does
not settle it either: `ki-dialog` reports `method` both for its close button
and for a host or property close.

**What Kimen tells integrators today.** Spec 028 S4 and the guides describe
an action as a user activation: the MCP Apps guide says "User activation of
a rendered, action-bound control dispatches" and "Tell the model what the
person chose"; the A2UI adapter README says "A user activation returns as an
A2UI `action` event". In MCP Apps the action tool is app-only
(`visibility: ["app"]`), so the model cannot call it, and a relayed action
reaches the model as a `ui/message` with role `user`. A spec that binds a
declared action to an event that fires on its own makes the surface call
that tool, and with a relay speak in the person's name, without the person.

**Why a gesture check would not make an action consent.** The agent that
writes a spec writes both a control's words and its binding:
`ki-confirmation`'s `approve-label` and `deny-label`, a button's text. A
person's real click on a control whose words the agent chose is not consent
to the effect a host attaches to its action. Consent to a consequential
effect can only come from something the agent does not write: the host's
own confirmation, or the server's own rules.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An integrator knows what an action is (Priority: P1)

A host or server author deciding what to do with an action reads, in the
specification and in every guide, that an action reports an event of a
rendered component, whatever caused it, and is never the person's consent;
and that the behavior is tested, so it does not change under them.

**Why this priority**: a host that reads `tool.approved` as approval can be
driven by a spec without the person. The guides now say the opposite.

**Independent Test**: bind an action to three events that fire without the
person and read the action events (S1); read the guides.

**Acceptance Scenarios**: S1.

---

### User Story 2 - An agent can see which events fire on their own (Priority: P2)

An agent choosing which event carries an action reads, in each event's
description in the catalog, whether that event can fire without the person.

**Why this priority**: an honest agent should not bind a decision to a
toast's timeout by mistake. The descriptions of `ki-toast` and `ki-image`
already say it; those of five other components do not.

**Independent Test**: read the generated catalog descriptions of the events
FR-003 lists.

**Acceptance Scenarios**: none (description text, FR-003).

### Edge Cases

- A binding that means "no answer" on a timer is honest and keeps working:
  a toast bound to `request.expired` on `ki-dismiss` reports its timeout.
- A dialog bound per event reports a host close as its close action (`154`
  S3); the close action means "it closed", not "it was refused" (`154`).
- A carousel with `autoplay` reports every automatic move. How many actions
  per second a spec may cause is a budget question, out of scope here.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: An action is a report, not consent
  A bound action reports that a rendered component fired the event it is
  bound to, whatever made the component fire it. The renderer cannot tell a
  person's gesture from a timer, a failed load or a property the spec set,
  so an action is never the person's consent.

  Rule: A bound event reports its action whatever caused it

    # S1
    Scenario Outline: An event the component fires on its own still reports its action
      Given a spec that binds the declared action "noted" to the "<event>" event of <component>
      When <cause>
      Then the host receives one "noted" action

      Examples:
        | component                                   | event      | cause                     |
        | a toast that stays for 2 seconds            | ki-dismiss | the toast's time runs out |
        | an image whose source cannot be loaded      | ki-error   | the image fails to load   |
        | a lazy tree item that is expanded and empty | ki-load    | the surface renders       |
```

### Scenario Family Coverage

This is guarded-renderer infrastructure, not a UI component. It adds no
interaction pattern and changes no behavior.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1 | |
| Keyboard path | | N/A — no interaction changes; each component keeps its own keyboard contract |
| Assistive-tech outcome | | N/A — names, roles and states are each component's own contract |
| Form participation | | N/A — a spec owns no form (`152`) |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A dispatched action MUST be specified as a report that a bound
  node's event fired (its declared event, or its click when the entry
  declares none), whatever caused it: a person's gesture, a timer, a failed
  load, a property the spec or a live update set, or a call by the host. It
  is never evidence that the person chose it, nor consent to any effect.
  The renderer keeps dispatching a bound action whenever the element reports
  its event (`154` FR-003), as today.
- **FR-002**: Every document that tells an integrator what an action means
  MUST say so, and that an effect needing the person's consent is confirmed
  by the host or the server outside the spec: the catalog README, the MCP
  Apps guide and adapter README, the A2UI adapter README, the UI spec guide,
  the hand-written agent-surfaces source `docs/genui-surfaces.json` (and so
  the `llms` files generated from it) and the `kimen-genui` skill with its
  MCP Apps server reference. The MCP
  Apps documents MUST stop calling an action a user activation or "what the
  person chose", and MUST tell servers to say, in the description of the
  tool that renders the surface, that a relayed `kimen-surface-action` line
  reports what the surface dispatched, not the person's words.
- **FR-003**: The component contract of each event that can fire without a
  gesture MUST say when it does, in the event's description, which the
  catalog carries to agents: `ki-carousel` `ki-slide-change`, `ki-popover`
  `ki-open` and `ki-close`, `ki-tree-item` `ki-expand`, `ki-collapse` and
  `ki-load`, `ki-dialog` `ki-close` and `ki-drawer` `ki-close`. The
  `kimen-genui` skill MUST tell agents to bind an action that stands for a
  decision only to an event a person causes (an approval, a confirmation, a
  click), and to read those descriptions.
- **FR-004**: Spec 028 and spec 040 MUST be amended as below.

### Amendment to spec 028 (applied)

`specs/028-guarded-renderer/spec.md`, FR-003, after the sentence "Exactly one
action dispatches per activation: the innermost bound node claims the
interaction and no enclosing bound node dispatches for it (S4)." Add:

> An action reports that the bound node's event fired, whatever caused it: a
> person's gesture, a timer, a failed load, a property the spec or a live
> update set, or a call by the host (`161-action-is-a-report`). It is never
> evidence that the person chose it, nor consent to any effect: the agent
> that writes a spec writes both a control's words and its binding.

Key Entities, **Declared action**, append:

> A dispatched action reports an event; it is never consent (`161`).

### Amendment to spec 040 (applied)

`specs/040-surface-action-relay/spec.md`, Edge Cases, append:

> - A bound event fires without the person (a toast's time runs out, an
>   image fails to load, a spec opens a popover; spec 161): the surface
>   dispatches, and the server may acknowledge and relay it, exactly as for a
>   gesture, because neither can tell them apart. The relay reports what the
>   surface dispatched; it carries the `user` role because `ui/message` has
>   no other, not because the person said it, and the tool description that
>   tells the model how to read the line says so.

### Rejected alternatives

- **Check `event.isTrusted`.** The component's script dispatches the
  declared events (only a native `click` is trusted), so the check is false
  for every declared-event binding: it would
  silence `028` S17 and `154` S1–S6, not only the host close of `154` S3.
- **Check `navigator.userActivation`.** Transient activation lasts seconds
  after any gesture, so a toast that times out just after the person typed
  would pass; Escape grants none, so a dialog dismissed with Escape would
  fail `154` S1; a host close (`154` S3) has none.
- **A per-entry list of the events that may carry a binding, generated from
  component metadata.** It must reject a dialog's close, which `154` S3
  requires, and it rejects specs valid under `1.7.0` that bind a toast, an
  image, a carousel, a drawer or an audio by name (`154` SC-002, Art. IX).
  It removes honest uses, such as an expired request or a broken image.
- **Mark the events that fire on their own as structured catalog data, and
  let a host require gesture-only events for the actions it names**, as
  `allowedUrlOrigins` tightens URLs. Sound and additive, but the agent still
  writes the control's words, so it turns a forged consent from silent into
  one the person clicks; it does not make it consent. Deferred until a host
  needs to accept a consequential action from a surface; the event
  descriptions carry the same fact to agents meanwhile (FR-003).

### Key Entities

- **Action**: the report the renderer dispatches when a bound node's event
  fires: the action's name, the node's path and id, and its data.
- **Consent**: the person's agreement to an effect, which only a party the
  agent does not control (the host or the server) can establish.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): none. Event description text changes in
  five component contracts and reaches the generated catalog, manifests and
  agent docs through `pnpm regen`.
- **Bundle budget** (Art. IV): none at runtime. The catalog carries the event
  descriptions, so the `kimen-mcp` and MCP Apps size budgets are measured
  before merge.
- **Accessibility** (Art. V): none.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): FR-003 tells agents which events
  fire on their own, through the generated descriptions and the skill.
- **Guardrail/security boundary** (Art. VIII): the four invariants are
  unchanged. This spec states what they do not cover: an action is not a
  person's consent. S1 needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: S1 passes in the browser suite for its three examples.
- **SC-002**: No guide, README or skill describes an action as a user
  activation or as what the person chose, and each one FR-002 names says
  that an action is not consent.
- **SC-003**: The generated catalog description of every event FR-003 lists
  says when it fires without a gesture.

## Assumptions

- The behavior is unchanged: this spec documents and pins it.
- How many actions a spec can cause per second is out of scope. A carousel
  with `autoplay: 1` and `loop` moves every few milliseconds, and each move
  dispatches a bound action; that belongs with the budgets of `028` (US3),
  as its own change.
- The deferred host policy (Rejected alternatives, last item) needs its own
  spec if a host asks for it.
