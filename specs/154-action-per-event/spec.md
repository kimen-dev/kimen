# Feature Specification: An action per event

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, VII and IX. -->

**Feature Branch**: `claude/action-per-event` (spec `154-action-per-event`)

**Created**: 2026-11-21

**Status**: Approved. The founder approved the scenarios and the amendment
to spec 028 below verbatim on 2026-11-21 ("Aprobado tal cual"); every
scenario is a guardrail scenario (Art. VIII).

**Input**: Founder decision of 2026-11-21 on the improvements to land before
`@kimen/catalog`, `@kimen/emitter` and the adapters are published:
improvement 3, "a confirmation also hears the no". A node's `action` may
also be a map from each event its component declares to the declared action
that event fires. The founder confirmed the same day the five existing
special-case bindings (`ki-chip`, `ki-dialog`, `ki-prompt-input`,
`ki-combobox`, `ki-pagination`).

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. The shape of a node is a closed list
(`028-guarded-renderer`), so widening `action` is a guardrail change and
every scenario requires explicit founder confirmation.

## Design-source analysis

Not applicable. No visual surface changes: the scenarios decide which
action an event fires and what a spec may say, not how anything looks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A dialog and a confirmation report both answers (Priority: P1)

Today a node binds one action. A `ki-dialog` reports either its
confirmation or its close, chosen by its confirm label, and a
`ki-confirmation` cannot be bound at all, because it declares two events.
An agent that asks "Delete the task?" never hears the "no".

**Why this priority**: a confirmation that cannot report a refusal is half
a confirmation; it is the second most common friction the probes found.

**Independent Test**: bind a dialog and a confirmation card per event,
answer each way, and read the action events.

**Acceptance Scenarios**: S1, S2, S3 and S4.

---

### User Story 2 - Every multi-event component can be bound (Priority: P1)

Nine catalog components are rejected today when bound, because they declare
several events and nothing says which one acts: `ki-code-input`,
`ki-confirmation`, `ki-file-upload`, `ki-message`, `ki-popover`,
`ki-search`, `ki-table`, `ki-time-input` and `ki-tree-item`. A binding per
event names the event, so nothing is ambiguous.

**Why this priority**: it turns a hard rejection into an explicit choice.

**Independent Test**: bind each of the nine per event, make the component
report that event, and read the action.

**Acceptance Scenarios**: S3, S5 and S6.

---

### User Story 3 - What a spec cannot name stays rejected (Priority: P1)

A binding per event is written by an agent, so it is untrusted: an event
the catalog does not declare, an action the spec does not declare, an empty
binding, or any binding on a native element is rejected before anything
renders.

**Why this priority**: the guarded renderer dispatches only declared
actions on declared events (Art. VIII).

**Independent Test**: validate specs carrying each defect.

**Acceptance Scenarios**: S7.

---

### User Story 4 - A binding by name keeps its meaning (Priority: P1)

Every spec that is valid today keeps its meaning, the five special cases
included: a chip acts on the event its kind implies, a dialog on its
confirmation when it has a confirm label and on its close otherwise, a
prompt input on submit while idle and on stop while streaming, a combobox
on its committed change, and a pagination on its page request.

**Why this priority**: additive only; specs written today must not change.

**Independent Test**: render each special case bound by name alone and
make it report each of its events.

**Acceptance Scenarios**: S8.

---

### User Story 5 - A confirmation card renders under an origin allow-list (Priority: P2)

`ki-confirmation` has a text prop named `action`, the identifier of the
tool it asks about. The URL policy treats any prop of that name as a URL
when the catalog declares no format, so under an origin allow-list the card
is rejected, and a tool identifier with a colon is rejected as a URL
scheme even without one. Confirmed on 2026-11-21 on `main` at 6033d934:
`url-origin` and `url-scheme` on `root.props.action`.

**Why this priority**: it blocks the component this spec makes bindable,
under the policy a careful host turns on.

**Independent Test**: validate a confirmation card under an allow-list and
with a colon in its tool identifier; validate a registered component whose
`href` declares no format.

**Acceptance Scenarios**: S9 and S10.

### Edge Cases

- A binding per event on a component the renderer special-cases by name
  (chip, dialog, prompt input, toggle buttons, cards) does not use those
  rules: each listed event fires its own action whenever the component
  reports it. A dialog reports both events whatever its confirm label.
- A `ki-pagination` with `href-template` navigates natively, so it binds no
  action in either form, as today.
- A binding per event may name the same action for two events; the host
  cannot then tell them apart, which is the binding's choice.
- The data of an action fired per event follows today's rule for a
  declared-event activation (`028` FR-003): the node's props with its live
  `checked`, `selected` or `value`, and the fields it collects (`153`). An
  event's `detail` is never read, so `ki-table`'s sort does not say the
  column and `ki-confirmation` does not say whether "remember" was ticked.
- A `ki-dialog` reports every close, including one the host causes after a
  confirmation: the close action means "it closed", not "it was refused".

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: An action per event
  A bound node may name, for each event its catalog entry declares, the
  declared action that event fires. A binding by name alone keeps its
  meaning, the five components that pick their event from their own state
  included.

  Rule: A binding per event reports each event as its own action

    # S1
    Scenario Outline: A dialog bound per event reports a confirmation and a dismissal as different actions
      Given a spec with a dialog "Delete the task?" whose confirm label is "Yes, delete", bound to "delete.confirmed" on confirm and to "delete.closed" on close
      When the person <gesture>
      Then the host receives one "<action>" action and no other

      Examples:
        | gesture                 | action           |
        | activates "Yes, delete" | delete.confirmed |
        | dismisses the dialog    | delete.closed    |

    # S2
    Scenario Outline: A confirmation card bound to approve and deny reports each answer as its own action
      Given a spec with a confirmation card for the tool "delete_files", bound to "tool.approved" on approve and to "tool.denied" on deny
      When the person <answer>
      Then the host receives one "<action>" action and no other

      Examples:
        | answer   | action        |
        | approves | tool.approved |
        | denies   | tool.denied   |

    # S3
    Scenario: A dialog the host closes after a confirmation still reports the close
      Given a dialog bound to "delete.confirmed" on confirm and to "delete.closed" on close, whose confirmation the host has received
      When the host closes the dialog
      Then the host receives one "delete.closed" action

    # S4
    Scenario: Each bound event carries the fields its node collects
      Given a confirmation card bound to "tool.approved" on approve and to "tool.denied" on deny, collecting the note field "f-note" as "note"
      And the person typed "Too risky" in the note field
      When the person denies
      Then the host receives one "tool.denied" action whose data carries note "Too risky"

    # S5
    Scenario Outline: Each component rejected today with one action binds per event
      Given a spec binding the declared action "picked" to the "<event>" event of a <component>
      When the component reports "<event>"
      Then the host receives one "picked" action

      Examples:
        | component       | event        |
        | ki-code-input   | ki-complete  |
        | ki-confirmation | ki-deny      |
        | ki-file-upload  | ki-files-add |
        | ki-message      | ki-feedback  |
        | ki-popover      | ki-open      |
        | ki-search       | ki-search    |
        | ki-table        | ki-sort      |
        | ki-time-input   | change       |
        | ki-tree-item    | ki-expand    |

    # S6
    Scenario: A live surface binds per event too
      Given a live surface showing the confirmation card "c-1", bound to "tool.approved" on approve and to "tool.denied" on deny
      When the person approves
      Then the host receives one "tool.approved" action naming the node "c-1" and the current revision

  Rule: A binding names only what the catalog and the spec declare

    # S7
    Scenario Outline: A binding per event that names what is not declared renders nothing
      Given a spec that declares the action "pick"
      When the renderer validates the spec, whose <node> is bound to <binding>
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>" and <offender>

      Examples:
        | node              | binding                         | rule               | offender              |
        | confirmation card | "pick" on the event "ki-cancel" | undeclared-event   | the event "ki-cancel" |
        | badge             | "pick" on the event "click"     | undeclared-event   | the event "click"     |
        | confirmation card | "drop" on the event "ki-deny"   | undeclared-action  | the action "drop"     |
        | confirmation card | no event at all                 | malformed-spec     | the empty binding     |
        | paragraph         | "pick" on the event "click"     | action-not-allowed | the paragraph         |

  Rule: A binding by name alone keeps its meaning

    # S8
    Scenario Outline: A component that picks its event from its own state keeps that event
      Given a spec binding the declared action "pick" by name alone to <component>
      When the component reports "<event>"
      Then the host receives one "pick" action
      And none of the component's other declared events fires an action

      Examples:
        | component                             | event          |
        | an assist chip                        | ki-activate    |
        | a filter chip                         | ki-change      |
        | a removable input chip                | ki-remove      |
        | a dialog whose confirm label is "Yes" | ki-confirm     |
        | a dialog without a confirm label      | ki-close       |
        | an idle prompt input                  | ki-submit      |
        | a streaming prompt input              | ki-stop        |
        | a combobox                            | change         |
        | a pagination                          | ki-page-change |

  Rule: A text prop named like a URL attribute is text when the catalog says so

    # S9
    Scenario Outline: A confirmation card renders whatever its tool identifier looks like
      Given a host that <policy>
      When the renderer validates a confirmation card for the tool "<tool>"
      Then the card renders

      Examples:
        | policy                                          | tool                |
        | allows URLs only from "https://cdn.example.com" | delete_files        |
        | declares no URL origins                         | github:create_issue |

    # S10
    Scenario: A registered prop named href that declares no format stays a URL
      Given a host catalog that registers a component whose string prop "href" declares no format
      When the renderer validates a spec that sets that "href" to "javascript:alert(1)"
      Then no part of the spec renders
      And the diagnostic names the rule "url-scheme"
```

### Scenario Family Coverage

This is guarded-renderer infrastructure, not a UI component. It adds no
interaction pattern: the person uses each component exactly as before, and
only what the host hears changes.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S10 | |
| Keyboard path | | N/A — activation by keyboard or pointer reaches the same component contract; the renderer adds no interaction |
| Assistive-tech outcome | | N/A — names, roles and states are each component's own contract; nothing here changes them |
| Form participation | | N/A — a spec owns no form (`152`); collected fields keep the rules of `153` |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A node's `action` MUST accept either a declared action name,
  as today, or an object whose keys are events the node's catalog entry
  declares and whose values are declared action names. An empty object is
  `malformed-spec`.
- **FR-002**: Validation MUST reject, naming the path and the offending
  value: a key that is not an event the entry declares (new code
  `undeclared-event`, looked up as an own key of `events`); a value that is
  not in the spec's `actions` list (`undeclared-action`, at
  `<node>.action.<event>`); and any binding, in either form, on a native
  element, a decorative glyph, `ki-markdown` or a source reference
  (`action-not-allowed`, unchanged).
- **FR-003**: A binding per event MUST wire one listener per listed event,
  on the element itself, and dispatch that event's action whenever the
  element reports it, with the data of a declared-event activation (`028`
  FR-003) and the fields the node collects (`153`, its validity check
  included). The per-component rules that pick an event for a binding by
  name alone (chip kind, dialog confirm label, prompt-input status,
  toggle buttons, cards) MUST NOT apply to it. A click on the element is
  claimed, so no enclosing bound node fires for it, and never cancelled.
- **FR-004**: A binding by name alone MUST keep exactly its present
  meaning, and `ki-pagination` with `href-template` MUST stay unbindable in
  both forms. A binding by name alone on an entry that declares several
  events and has no rule of its own stays `ambiguous-activation-event`
  (`028` S19); its message MUST name the events and say that a binding per
  event can name them.
- **FR-005**: The action event MUST keep its shape: `action` is the name of
  the action that fired, so adapters and hosts need no change.
- **FR-006**: On a live surface the binding per event MUST be part of the
  node, its snapshot and its validation; like a binding by name, only a
  `replace` changes it.
- **FR-007**: A catalog prop constraint MAY declare `format: "text"`: a
  value that is never a URL. The URL policy MUST apply to a prop when its
  constraint declares `format: "url"`, or when it declares no format and
  its name is one of the URL attribute names, as today; a declared
  `"text"` or `"idref"` is authoritative. `ki-confirmation`'s `action`
  MUST declare `format: "text"` in its component contract.
- **FR-008**: The catalog schema version MUST advance to `1.8.0` (additive:
  the event map and the `text` format). A spec declaring `1.7.0` keeps its
  meaning. The emitter's schema, prompt and tool description, the MCP
  server's format text and outline, the guides, the catalog README, the
  `ki-confirmation` usage examples, the plugin skill and its eval grader
  MUST describe the two forms.
- **FR-009**: The notes that call the five special-case bindings "pending
  founder confirmation" MUST record the founder's confirmation of
  2026-11-21 (`075-ki-chip`, `095-ki-combobox`, `100-ki-pagination`,
  `116-ki-prompt-input` I-5, `126-fullscreen-dialog`), and spec 028 MUST be
  amended as below.

### Amendment to spec 028 (applied)

`specs/028-guarded-renderer/spec.md`, FR-003, the sentences from "The
activation event of a bound node" to "rejects the spec (S19)." Before:

> The activation event of a bound node derives from its catalog entry: the
> one event the entry declares (`change` on the form controls, `ki-change`
> on `ki-tabs`, `ki-dismiss`/`ki-close` on `ki-alert`/`ki-dialog`), or the
> platform `click` when the entry declares none (buttons, cards). A binding
> on an entry declaring more than one event is ambiguous and rejects the
> spec (S19).

After:

> A binding names one declared action, or, per declared event, the action
> that event fires (`154-action-per-event`). A binding by name alone fires
> on the event its catalog entry derives: the entry's `activationEvent`
> when it declares one (`change` on `ki-combobox`, `ki-page-change` on
> `ki-pagination`), else the one event it declares (`change` on the form
> controls, `ki-change` on `ki-tabs`, `ki-dismiss` on `ki-alert`), else the
> platform `click`. Buttons and cards fire on `click` unless a toggle
> button is toggled or a card is interactive. Three components pick the
> event from their own state: `ki-chip` by its kind, `ki-dialog` by its
> confirm label and `ki-prompt-input` by its status. A binding by name
> alone on any other entry declaring more than one event is ambiguous and
> rejects the spec (S19); a binding per event names its events and is
> never ambiguous.

Scenario S19, in `feature.feature` and in the Gherkin block of `spec.md`,
keeps its id, its `When` and its outcome; only its two `Given` lines change.
Before:

```text
      Given a catalog component that declares more than one event
      And a spec binding the declared action "pick" to that component
```

After:

```text
      Given a catalog component that declares more than one event and no rule that picks one
      And a spec binding the declared action "pick" to that component by name alone
```

### Key Entities

- **Binding by name**: `action` as a declared action name.
- **Binding per event**: `action` as a map from declared events to declared
  action names.
- **Text format**: a prop constraint that declares its value is never a URL.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): `UiSpecNode.action` widens to
  `string | Readonly<Record<string, string>>`; validation issues gain the
  code `undeclared-event`; `CatalogPropConstraint.format` gains `"text"`;
  the catalog schema version becomes `1.8.0`. All additive. The
  `ki-confirmation` prop gains a JSDoc `@format` tag only, which the
  elements API snapshot does not record (as with `idref` in `152`).
- **Bundle budget** (Art. IV): the listener wiring and validation in the
  catalog and the MCP Apps document; measured before merge and absorbed as
  approved shared-code growth if it exceeds the headroom. No new dependency.
- **Accessibility** (Art. V): none; no interaction changes.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the two forms reach agents through
  the emitter's schema (per component, the map's keys are that component's
  declared events) and prompt, and through `kimen-mcp`.
- **Guardrail/security boundary** (Art. VIII): only declared events wire,
  only declared actions dispatch, natives never bind, and the URL policy
  keeps its backstop for any prop that declares no format. Every scenario
  needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every catalog component that declares an event can be bound
  to an action on each of its events.
- **SC-002**: Every spec that validates under catalog schema `1.7.0`
  validates and dispatches the same under `1.8.0`.

## Assumptions

- An event's `detail` stays out of the action data (design, non-goal): a
  sort without its column, or an approval without "remember", is what a
  binding per event can report.
- `ki-list` selection (improvement 7) is deferred by the founder and is not
  addressed here.
- The A2UI adapter writes `action` as a name and keeps doing so.
