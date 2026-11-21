# Feature Specification: A live surface keeps the person's unsent input from the agent

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (guardrails
     tested as a security boundary), with Arts. II and III. -->

**Feature Branch**: `claude/gifted-northcutt-d639ae` (spec `159-live-surface-unsent-input`)

**Created**: 2026-11-21

**Status**: Approved. The founder confirmed S1 to S5 verbatim on 2026-11-21
("Sí, aprobados"), including the Art. VIII security-boundary confirmation
and the amendment of `035-live-surface` D5 and FR-006.

**Input**: the finding recorded while writing spec 155. Two defects in
`packages/catalog/src/live.ts` on `main` (`95e9d291`), both reproduced by
tests that fail today:

1. On a control the person touched, `set` accepts a value equal to the
   person's live value and records it as what the agent last wrote. A second
   `set` in a later batch then passes the check, because the live value now
   equals what the agent "wrote". Two batches replace text the person typed
   and never sent, with no `force` and no `allowUserStateOverride`. In
   Chromium the field visibly changes from "Buy milk" to "Buy bread".
2. Every `user-state-conflict` and `user-state-override-denied` diagnostic
   carries the person's live value in `value`. A host that forwards
   diagnostics to the model, which is what they are for, sends the unsent
   text to the model.

The design's anti-goal (spec 155) is that a model can never erase or change
what the person typed and has not sent. Defect 1 defeats it, and it would
also defeat the `reset` of spec 155 Task 4.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - What the person entered stays theirs (Priority: P1)

The person types into a field while the agent keeps updating the surface.
The agent may agree with what the person typed, but agreeing never makes the
text the agent's: only a forced override that the host allows replaces it.

**Why this priority**: it is the user-state guarantee of `035` D5, which the
two-batch path bypasses today.

**Independent Test**: type into a field, tick a checkbox and select a toggle
button; apply a `set` that agrees, then a `set` that differs, a `remove` and
a `replace`; check that each later batch is rejected and the control keeps
the person's input.

**Acceptance Scenarios**: S1, S2, S3.

---

### User Story 2 - A dialog the person closed can be reopened (Priority: P1)

The person closes a dialog the agent opened. The agent can still reopen it
with the two batches that spec 155 S6 names: closed first, then open.

**Why this priority**: the fix must not remove the only way to reopen a
dialog without `force`.

**Independent Test**: open a dialog, close it as the person, apply `open:
false` and then `open: true` in two batches, and check that it is open.

**Acceptance Scenarios**: S4.

---

### User Story 3 - A rejection never repeats the person's input (Priority: P1)

The rejection that protects the person's text does not hand that text to
the agent.

**Why this priority**: diagnostics exist to be read by the model; whatever
they carry, the model sees.

**Independent Test**: type into a field and apply each batch that the
protection rejects; check that no diagnostic contains the typed text.

**Acceptance Scenarios**: S5.

### Edge Cases

- One batch was already safe: every op is checked against the state before
  the batch, so `set` to the person's value and then to another value in the
  same batch is rejected today.
- The person edits again after an agreeing `set`: the new text is theirs.
- The person changes the control back to exactly what the agent first
  wrote: it stays theirs until a forced override. This is stricter than
  today, and only after an agreeing `set`.
- An agreeing `set` on a control the person never touched is an ordinary
  `set`.
- Other props in the same `set` apply as before. The agreeing value is
  recorded and appears in `snapshot()`.
- `open` is not held: a `set` that agrees with the person's open or closed
  state hands it back (S4). Opening or closing a dialog loses nothing the
  person entered, and the controls inside it keep their own protection.
- The message of a conflict on `open` that spec 155 FR-005 adds still says
  whether the person opened or closed the dialog, because the remedy needs
  it. No diagnostic carries the person's value in `value`.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A live surface keeps the person's unsent input from the agent
  What the person typed, ticked or selected and has not sent stays theirs: a
  set that agrees with it does not hand it to the agent, and no rejection
  repeats it. Only a forced override the host allows replaces it.

  Rule: Agreeing with the person's input leaves it theirs

    # S1
    Scenario Outline: After a set agreed with the person, setting other input is still rejected
      Given a live surface whose host does not allow user-state overrides
      And <control> the person <entered>, which an earlier batch set to the same without force
      When the agent applies a batch setting <control> to <other>
      Then <control> keeps what the person entered and the batch is rejected as "user-state-conflict"

      Examples:
        | control                  | entered               | other       |
        | the field "note"         | typed "Buy milk" into | "Buy bread" |
        | the checkbox "agree"     | ticked                | unticked    |
        | the toggle button "bold" | selected              | unselected  |

    # S2
    Scenario Outline: After a set agreed with the person, removing or replacing what holds their input is still rejected
      Given a live surface whose host does not allow user-state overrides
      And the card "card" holding the field "note" the person typed "Buy milk" into, which an earlier batch set to "Buy milk"
      When the agent applies a batch that <op>
      Then the field keeps "Buy milk" and the batch is rejected as "user-state-conflict"

      Examples:
        | op              |
        | removes "card"  |
        | replaces "note" |

    # S3
    Scenario: A forced override the host allows still replaces input a set agreed with
      Given a live surface whose host allows user-state overrides
      And the field "note" the person typed "Buy milk" into, which an earlier batch set to "Buy milk"
      When the agent applies a batch forcing "note" to "Buy bread"
      Then the field shows "Buy bread"

  Rule: A dialog the person closed can still be reopened

    # S4
    Scenario: After a set agreed that the person closed a dialog, a later set reopens it
      Given a live surface whose dialog "confirm-delete" the agent opened and the person closed
      And an earlier batch that set "confirm-delete" closed
      When the agent applies a batch setting "confirm-delete" open
      Then the dialog is open

  Rule: A rejection never repeats the person's input

    # S5
    Scenario Outline: A rejection that protects the person's input does not repeat it
      Given a live surface whose host does not allow user-state overrides
      And the card "card" holding the field "note" the person typed "Buy milk" into
      When the agent applies a batch that <op>
      Then the batch is rejected as "<rule>"
      And no part of the diagnostic repeats "Buy milk"

      Examples:
        | op                           | rule                       |
        | sets "note" to "Buy bread"   | user-state-conflict        |
        | forces "note" to "Buy bread" | user-state-override-denied |
        | removes "card"               | user-state-conflict        |
        | replaces "card" with force   | user-state-override-denied |
```

### Scenario Family Coverage

This is a security boundary of the live surface, not a UI component. Like
`035-live-surface`, it adds no interaction pattern of its own.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S5 | |
| Keyboard path | | N/A — the person's input reaches the surface through the components' own contracts; the surface adds no interaction |
| Assistive-tech outcome | | N/A — names, roles and states are the rendered components' own |
| Form participation | | N/A — a spec has no form of its own (spec 152); the protected values are the components' live props |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (amends 035 D5): on an element the person interacted with, a
  `set` whose `checked`, `selected` or `value` equals the person's live value
  is accepted and recorded, and that value stays the person's. A later `set`
  of another value, and a `replace` or `remove` of the node or of any
  ancestor, is rejected as `user-state-conflict` without `force`, and as
  `user-state-override-denied` with `force` unless the host allows
  overrides.
- **FR-002**: a forced override that the host allows hands the control back,
  as today: afterwards an ordinary `set` applies until the person interacts
  with the control again. *Amended by `160-live-surface-override-scope`
  (approved by the founder on 2026-11-21): a forced `set` hands back only
  the props it names; the person's other input on the control stays
  theirs.*
- **FR-003**: `open` keeps the behaviour of 035: a `set` that agrees with the
  person's open or closed state hands it back, so the two batches of spec 155
  S6 reopen a dialog the person closed.
- **FR-004** (amends 035 FR-006): `user-state-conflict` and
  `user-state-override-denied` diagnostics carry no `value`. `path` and
  `message` name the op, the node and the prop, never the person's live
  value.
- **FR-005**: the guide (`docs/guides/ui-spec.md`) and spec 035 (D5, FR-006)
  state FR-001 to FR-004.

### Key Entities

- **Held input**: a user-state prop of a touched element that an agreeing
  `set` left the person's. It ends with a forced override that names it
  (spec 160), and with an
  accepted `reset` once spec 155 Task 4 lands.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): behaviour only. No type changes. The two
  diagnostic rules stop carrying `value`, which `RenderDiagnostic` declares
  optional. `@kimen/catalog` is not published yet, so no consumer depends on
  the old field.
- **Bundle budget** (Art. IV): tens of bytes in `live.ts`. Once spec 157 is
  merged, `live.ts` also counts in the MCP Apps document and `kimen-mcp`
  budgets; whichever change merges second measures on the merged branch.
- **Accessibility** (Art. V): none.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the guide and the live-surface
  documentation say what the agent can and cannot do with the person's
  input.
- **Guardrail/security boundary** (Art. VIII): every scenario, S1 to S5,
  needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: no sequence of batches without an allowed forced override
  changes or discards a `checked`, `selected` or `value` the person entered,
  in the happy-dom suite and in Chromium.
- **SC-002**: no live-surface diagnostic contains text the person typed.

## Assumptions

- Spec 155 Task 3 (PR #566) merged first and added the remedy message for
  `open`; this change builds on it, and its S6 test no longer expects
  `value: 'false'`.
- Spec 155 Task 4 (`reset`) clears the held input together with the touched
  mark.
- An accepted agreeing `set` still tells the agent that its guess equals
  the person's value. Rejecting every `set` of a held prop, agreeing or not,
  would remove that signal, but it would also reject the agreeing `set` that
  035 S13 accepts today. The approved contract keeps the agreeing `set`
  accepted; the signal is a known residual.
