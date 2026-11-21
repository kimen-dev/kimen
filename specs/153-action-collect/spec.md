# Feature Specification: An action collects the values of other fields

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, VII and IX. -->

**Feature Branch**: `claude/action-collect-b113f4` (spec `153-action-collect`)

**Created**: 2026-11-21

**Status**: Approved. The founder confirmed S1 to S12 verbatim on 2026-11-21
("Aprobado tal cual"), including the Art. VIII guardrail confirmation.

**Input**: Founder decision of 2026-11-21 on the improvements to land before
`@kimen/catalog`, `@kimen/emitter` and the adapters are published: a spec
must be able to hold a form. A bound node names the fields whose values its
action takes, the fields are checked first, and the action carries their
live values. Improvements 1 and 17 of the approved design, and the part of
improvement 2 that puts the node id on every action event.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. The shape of a UI-spec node is a closed list
(`028-guarded-renderer`), so adding a key to it is a guardrail change and
every scenario here requires explicit founder confirmation.

## Design-source analysis

Not applicable. No visual surface changes: the scenarios constrain what an
action carries and when it is dispatched, not how anything looks. The
messages a field shows are its own, under its own contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A button sends the fields of its form (Priority: P1)

An agent builds a small form: a title, a quantity, a checkbox and an "Add"
button. Today only the button's own props travel with its action, so the
host has to bind every field to an action of its own and keep a draft of
what the person typed. With `collect`, the button names the fields and its
action arrives with their values, typed as the controls hold them.

**Why this priority**: a form is the first thing anyone builds with a
generative surface. Without this, the documented way to submit one is one
action per field.

**Independent Test**: render a spec with fields and a collecting button,
type into the fields, activate the button and read the one action event.

**Acceptance Scenarios**: S1, S2, S3 and S12.

---

### User Story 2 - An invalid field stops the action (Priority: P1)

The person activates "Add" with a required field empty, or with text that
is not a number in a number field. The action must not leave: the host
would receive data the form itself calls invalid.

**Why this priority**: collecting values without asking the fields would
make every host re-implement the validation the controls already do.

**Independent Test**: leave collected fields invalid in a real browser,
activate the button, and observe that no action arrives, where the messages
show and where the focus lands.

**Acceptance Scenarios**: S4, S5, S6 and S11.

---

### User Story 3 - A collect that cannot work is rejected (Priority: P1)

`collect` is written by an agent, so it is untrusted. A reference to no
node, to a control that has no single value, a name that would overwrite
one of the node's own props, or a list without bound must reject the spec
before anything renders, and a live batch must not leave a reference
dangling.

**Why this priority**: the guarded renderer fails closed; a reference that
resolves to nothing would dispatch an action that silently lacks a field.

**Independent Test**: validate specs carrying each defect and apply a live
batch that removes a collected field.

**Acceptance Scenarios**: S7 and S8.

---

### User Story 4 - Every action event names its node (Priority: P2)

On a live surface an action event already carries the `id` of its node. A
rendered spec and a streamed node do not, so a host that renders the same
spec both ways has to tell nodes apart by path.

**Why this priority**: it removes a difference between entry points that a
host otherwise has to code around; nothing else depends on it.

**Independent Test**: bind a node that carries an id, activate it in a
rendered spec and in a stream, and read the event.

**Acceptance Scenarios**: S9 and S10.

### Edge Cases

- A stream validates each pushed node on its own, so a `collect` resolves
  only to nodes of the same pushed node, as a reference of spec 152 does.
- A node may collect itself. The entry carries its own live value under the
  chosen name; nothing else changes.
- Two names may point at the same node. Each gets the same value.
- A disabled field is barred from validation by the platform, so it never
  blocks; its live value is read like any other.
- A multiple-choice `ki-combobox` declares a text `value`, so it can be
  collected; its choices arrive as the JSON text a bound combobox already
  reports (`028` FR-003).
- A native element can be neither side: it never binds an action (`037`
  S9), and it declares no value to collect.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: An action collects the values of other fields
  A node bound to an action may name other nodes of its spec by id. When the
  person activates it, every named field is asked whether it is valid, and
  the action carries the fields' live values next to the node's own props.
  A spec that is valid today keeps its meaning.

  Rule: A bound node delivers the live values of the fields it names

    # S1
    Scenario: A button that collects two fields delivers both values with its own props
      Given a spec with a text field "Title" identified as "f-title" and a number field "Quantity" identified as "f-qty"
      And a "primary" button "Add" bound to the declared action "add" that collects "f-title" as "title" and "f-qty" as "quantity"
      And the person typed "Buy milk" in "Title" and 2 in "Quantity"
      When the person activates "Add"
      Then the host receives one "add" action whose data is exactly variant "primary", title "Buy milk" and quantity 2

    # S2
    Scenario: A collected number arrives as a number and a collected checkbox as true or false
      Given a spec whose "Add" button collects a number field as "quantity" and two checkboxes as "urgent" and "gift"
      And the person typed 2 in the number field and checked only the "urgent" checkbox
      When the person activates "Add"
      Then the action data carries quantity as the number 2, urgent as true and gift as false

    # S3
    Scenario: An empty number field contributes no entry and an empty text field contributes empty text
      Given a spec whose "Add" button collects an optional text field as "notes" and an optional number field as "quantity"
      And the person left both fields empty
      When the person activates "Add"
      Then the action data carries notes as the empty text ""
      And the action data has no entry named "quantity"

    # S12
    Scenario: On a live surface the button collects from the field the surface holds now
      Given a live surface whose button "Add", bound to the declared action "add", collects the text field "f-title" as "title"
      And a later batch replaced "f-title" with a new text field, where the person typed "Buy milk"
      When the person activates "Add"
      Then the host receives one "add" action whose data carries title "Buy milk"

  Rule: Every collected field is asked for validity before the action leaves

    # S4
    Scenario: Required collected fields left empty block the action and show their messages
      Given a spec whose "Add" button collects the required text fields "Title" and "Owner", shown in that order
      And the person left both fields empty
      When the person activates "Add"
      Then the host receives no action
      And "Title" and "Owner" each show their own validation message, and the focus is on "Title"

    # S5
    Scenario: Text that is not a number in a collected number field blocks the action
      Given a spec whose "Add" button collects the number field "Quantity"
      And the person typed "two" in "Quantity"
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Quantity"

    # S6
    Scenario: Text that is not a date in a collected date field blocks the action
      Given a spec whose "Add" button collects the date field "Due"
      And the person typed "tomorrow" in "Due"
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Due"

    # S11
    Scenario: An invalid collected control that cannot show its message on request still blocks the action
      Given a spec whose "Add" button collects a required control "Assignee" that offers no way to report its validity
      And the person left "Assignee" empty
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Assignee"

  Rule: A collect that cannot work is rejected whole

    # S7
    Scenario Outline: A spec whose collect cannot work renders nothing and names the rule
      Given a spec with a text field identified as "f-title" and a checkbox group identified as "f-topics"
      When the renderer validates the spec, whose "primary" button <problem>
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>"

      Examples:
        | problem                                                           | rule                   |
        | collects "f-title" while bound to no action                       | collect-without-action |
        | is bound to "add" and collects "f-missing", an id no node carries | collect-unknown-node   |
        | is bound to "add" and collects the checkbox group "f-topics"      | collect-no-value       |
        | is bound to "add" and collects "f-title" under the name "variant" | collect-key-conflict   |
        | is bound to "add" and collects 33 values                          | collect-budget         |

    # S8
    Scenario: A live batch that removes a collected field is rejected whole
      Given a live surface showing a text field identified as "f-title" and a button "Add" that collects it
      When the agent applies a batch removing "f-title"
      Then the whole batch is rejected naming the rule "collect-unknown-node" and the id "f-title"
      And the surface keeps showing what it showed before

  Rule: An action event names its node, and older specs keep their meaning

    # S9
    Scenario Outline: An action event names the id of its node outside the live surface too
      Given <surface> with a button identified as "add-task" bound to the declared action "add"
      When the person activates the button
      Then the host receives one "add" action naming the node "add-task"

      Examples:
        | surface         |
        | a rendered spec |
        | a streamed node |

    # S10
    Scenario: A spec written for catalog schema 1.6.0 renders and acts as before
      Given a spec declaring the catalog schema version "1.6.0" with a "primary" button "Add" bound to the declared action "add" and no collect
      When the person activates "Add"
      Then the host receives one "add" action whose data is exactly variant "primary"
```

### Scenario Family Coverage

This is guarded-renderer infrastructure, not a UI component. It adds no
interaction pattern: the person activates a control and uses fields exactly
as before.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S3, S7–S10, S12 | |
| Keyboard path | S4–S6, S11 | Activation by keyboard or pointer reaches the same component contract; these scenarios fix where the focus lands when a field blocks the action |
| Assistive-tech outcome | | N/A — the invalid state and its message are exposed by each field under its own contract; the renderer only asks the field to report |
| Form participation | S4–S6, S11 | Each field's own constraint validation is consulted; no native form exists or is submitted (`152`) |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A UI-spec node MUST accept the optional key `collect`: an
  object whose keys are the names the action data will carry and whose
  values are node ids. Any other shape is `malformed-spec`. The node shape
  stays a closed list.
- **FR-002**: Validation MUST reject, naming the path and the offending
  value, with these codes:
  - `collect-without-action`: the node has no `action`;
  - `collect-unknown-node`: a value is not the `id` of a node of the same
    spec; on a live surface, of a node the surface holds after the batch;
    in a stream, of a node of the same pushed node;
  - `collect-no-value`: the named node's catalog entry declares none of
    `checked`, `selected` and `value`;
  - `collect-key-conflict`: a name equals a prop the node's own catalog
    entry declares;
  - `collect-budget`: more than 32 entries.
- **FR-003**: Before a node with `collect` dispatches, on whichever
  activation it has, the renderer MUST ask every named field for validity:
  `reportValidity()` when the element offers it, otherwise whether it
  matches `:invalid`. Every field is asked, so each invalid one shows its
  own message. If any is invalid, nothing is dispatched and the focus moves
  to the first invalid field in document order.
- **FR-004**: The action data MUST be what the node dispatches today (`028`
  FR-003) plus one entry per `collect` name: the named field's live
  `checked` when its entry declares one, else `selected`, else `value`,
  read as `028` FR-003 reads a control's own live state, so only a value of
  the declared type crosses. A field with no such value contributes no
  entry. The data stays an object of scalars and an event's `detail` is
  never read.
- **FR-005**: On a live surface `collect` MUST be part of the node: it
  appears in the snapshot, the FR-002 checks run on the resulting state so
  a batch that leaves a reference dangling is rejected whole, and the
  fields are resolved at the gesture against the nodes the surface holds
  then. A `set` op does not change `collect`, as it does not change
  `action`; a `replace` does.
- **FR-006**: The action event of `renderUiSpec` and of a streaming
  renderer MUST carry the `id` of the bound node when it has one, as the
  live surface's event already does.
- **FR-007**: The catalog schema version MUST advance to `1.7.0` (additive:
  the `collect` key and the event `id`). A spec declaring `1.6.0` keeps its
  meaning. The emitter, which demands the exact version, moves with it.
- **FR-008**: The emitter's schema, prompt and tool description, the MCP
  server's format text and outline, the guides, the catalog README and the
  plugin skill MUST describe `collect`.
- **FR-009**: Specs `152` and `037` stay as they are: every rendered button
  is `type="button"`, a spec owns no form, and a native element never binds
  an action.

### Key Entities

- **Collect map**: on a bound node, names mapped to the ids of the nodes
  whose live values the action carries.
- **Collected field**: a node named by a collect map; its catalog entry
  declares `checked`, `selected` or `value`.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): `UiSpecNode` gains `collect`;
  `ActionEvent` gains `id`; validation issues gain five codes; the catalog
  schema version becomes `1.7.0`. All additive. `@kimen/elements` is
  untouched, so `check:api` passes without a declaration.
- **Bundle budget** (Art. IV): measured against `main` 618df310, the MCP
  Apps document grows by 2,350 / 744 / 685 B and `kimen-mcp`, which also
  carries the document, by 5,770 / 1,764 / 1,285 B (raw / gzip / brotli);
  the base budgets absorb it as approved shared-code growth. No new
  dependency.
- **Accessibility** (Art. V): no new interaction pattern. A blocked action
  moves the focus to the first invalid field, where the field's own message
  is exposed.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): `collect` reaches agents through
  the emitter's schema and prompt and through `kimen-mcp`. Which controls
  can be collected derives from the catalog, never from a hand-kept list.
- **Guardrail/security boundary** (Art. VIII): the node shape widens by one
  key. Only declared actions dispatch, the data stays scalar, only catalog
  props of the declared type are read, and a reference resolves only to a
  node of the same spec or surface. Every scenario needs explicit founder
  confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A form of several fields is submitted with one action and no
  action bound to any field.
- **SC-002**: No action leaves while a collected field is invalid, in the
  real-browser suite.
- **SC-003**: Every spec that validates under catalog schema `1.6.0`
  validates and behaves the same under `1.7.0`.

## Assumptions

- Enter in a field does not activate the button; the person goes to the
  button. A native form was considered and discarded (it contradicts `152`
  and `037`).
- No data model and no bindings: `collect` names nodes of the same spec and
  reads their live value once, at the gesture (`035` D9 stands).
- `ki-number-input`, `ki-date-picker` and `ki-combobox` offer no public
  `reportValidity()` today, so they block the action and take the focus
  without being asked to show a message. Spec `156` adds the method; this
  contract does not depend on it.
- The A2UI adapter writes `action` and keeps its own form aggregation; it
  does not emit `collect`.
- The MCP Apps relay bound (`040` D5) is unchanged: an action whose data
  exceeds it is refused as today.
