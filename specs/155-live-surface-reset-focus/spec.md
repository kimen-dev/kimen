# Feature Specification: Live surface keeps focus and empties fields safely

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. II, V, VII and IX. -->

**Feature Branch**: `claude/live-surface-focus-f62b98` (Task 3), `claude/live-surface-reset`
(Task 4) (spec `155-live-surface-reset-focus`)

**Created**: 2026-11-21

**Status**: Approved. The founder approved S1 to S14 verbatim on 2026-11-21
("Aprobados los 14; arranca la tarea 3"), including the Art. VIII guardrail
confirmation of S2, S3 and S5 to S14. S1 to S8 landed with Task 3 (#566);
S9 to S14 land, verbatim, with Task 4.

**Input**: Founder decision of 2026-11-21 to land the improvements to the
generative layer before `@kimen/catalog` is published, design package B1
(improvements 6, 10, 11, 12, 13, 15 and 16). Three prototypes and the phase 2
probes of Generative Services found that a live surface loses keyboard focus
after a confirmed delete in Chromium, Firefox and WebKit, cannot empty a
number field, gives no hint when a dialog the person closed must be reopened,
documents its budgets as "may tighten" while the host may raise them, and
exports no type for the batches a producer writes.

**Constitution check**: behavior enters the system exactly once, here
(Art. II). This spec extends a guardrail surface (Art. VIII, spec 035): S2,
S3 and S5 to S14 constrain what an agent's batch may do to focus, to the
person's own input and to the surface's budgets, and require explicit
founder confirmation. S9 to S14 introduce the only new path by which an
agent empties a control without the host's override permission.

## Design-source analysis

Not applicable. No visual surface changes. The sources are the approved
design (B1, 2026-11-21), the phase 2 probe findings on keyboard focus and on
emptying a form, and the code of `035-live-surface` as it stands on `main`
at `618df310`.

## Decisions *(founder, 2026-11-21)*

Decided in the approved design and not reopened here:

- **D1** Focus is **repaired, never moved**: a batch may name the node that
  receives focus, and that is honoured only when, after the batch has
  settled, focus is nowhere. Letting any batch move focus was rejected: a
  model could move focus while the person types.
- **D2** A **`reset` op** empties a control without any host permission,
  and only when nothing the person typed and did not send would be lost. A
  narrower override permission was rejected: reset-then-set would equal the
  broad permission in two steps.
- **D3** The batch and op types are **hand-written** readonly interfaces, as
  the package's other public types are; the private schemas are checked
  against them.
- **D4** No new op to reopen a dialog: the rejection names the remedy that
  already works, and the guide documents it.
- **D5** The budgets stay host options; the documentation stops saying they
  may only be tightened.

The names `focus`, `reset` and `unsent-user-input` are proposals shown to
the founder in this contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A keyboard user keeps their place after a change (Priority: P1)

The person deletes a task with the keyboard: Tab to its Delete button, Enter,
confirm in the dialog. The agent closes the dialog and removes the row.
Today focus falls to the page body and the next Tab starts from the top of
the page, or skips the rest of the list, depending on the engine. With the
batch naming the next row's Delete button as its focus, the person lands
there. A person typing anywhere else is never interrupted.

**Why this priority**: losing focus on every delete fails WCAG 2.2 focus
order for every keyboard user of every list an agent manages.

**Independent Test**: in a real browser, focus a control inside the surface,
apply batches that remove or replace it with and without `focus`, including
one where a closing component drops focus a task after the batch; assert
where focus is once the change has rendered.

**Acceptance Scenarios**: S1, S2, S3, S4.

---

### User Story 2 - A form is emptied after it was sent, and only then (Priority: P1)

After a create, the dispatcher empties the add form. A reset does it without
the host's override permission, because what the person typed has already
reached its destination. If the person typed again in between, the reset is
refused and the new text stays. A number field, which a forced `set` cannot
empty today, empties too.

**Why this priority**: every form an agent builds needs it the first day,
and the only way today is the broad override permission over the whole
surface.

**Independent Test**: deliver a field's value through an action, then reset
it; type again, then reset it; reset an untouched field, a number field, a
date field and a field with a spec value.

**Acceptance Scenarios**: S5, S9, S10, S11, S12, S13, S14.

---

### User Story 3 - The agent learns from a rejection and the host sizes the surface (Priority: P2)

A rejected batch tells the agent what to do next, comes back as the return
value of `apply`, and leaves every earlier batch applied. A host that needs a
whole page in one batch raises the budgets at creation.

**Acceptance Scenarios**: S6, S7, S8.

### Edge Cases

- `focus` is checked against the **resulting** surface: a node the same
  batch inserts may be named; a node it removes may not (S3).
- The named node takes focus as the browser gives it. A node that cannot
  take focus itself (a list row, a card) leaves focus where it is: the batch
  names the control.
- Focus counts as nowhere when the page's active element is the body or
  nothing. Focus anywhere else (inside the surface, in the host page, in a
  dialog that is still closing) is never moved.
- The batch's `focus`, when present, takes precedence over the replacement
  of a focused node (S4 applies to batches that name none).
- The repair happens once, after the batch has settled, and only if the
  named node is still on the surface. A later batch that names its own focus
  replaces a repair that has not happened yet. A rejected batch repairs
  nothing.
- An empty batch (`ops: []`) may carry `focus`; it is checked against the
  current surface and the revision does not advance.
- Only a forced `set` on a surface that allows overrides writes the
  component's own property (S5). An unforced `null` keeps today's behaviour:
  the attribute is removed and the property is left alone.
- The remedy named for `open` (S6) holds for any component that declares
  `open`; the conflict messages for `checked`, `selected` and `value` keep
  pointing to `force`.
- Raising `batchBudgets.maxBytes` beyond 8 MiB, or the nesting of a batch
  beyond 256 JSON levels, has no effect: the purity wall's fixed ceilings
  apply first.
- A reset needs neither `force` nor `allowUserStateOverride`.
- A reset is also accepted when the field already shows what the reset
  would write: nothing is lost. Not when a `set` agreed with what the person
  entered (spec 159): that value stays the person's, so the reset is rejected
  until an action delivers it.
- Like every op, a reset is checked against the state before its batch: a
  `set` or `remove` of the same node in the same batch still meets the
  person's input. A new value goes in a later batch.
- What an action carries counts as delivered only when the action leaves: a
  collected field that blocks it, or a surface without `onAction`, delivers
  nothing.
- A reset of a node that declares none of `checked`, `open`, `selected` and
  `value` is rejected as `unknown-prop`.
- No action reports a dialog's `open`, so a reset of a dialog the person
  closed is rejected; it is reopened with the two batches of S6.
- Replacing or removing a node forgets what it delivered.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Live surface keeps focus and empties fields safely
  A batch may name the node that receives focus when the batch leaves focus
  nowhere, and it never takes focus from where the person is. A forced
  removal empties a field, a rejection is a return value that says what to
  do, the host may raise every budget, and a reset clears only what an action
  already delivered, so nothing the person typed and did not send is lost.

  Rule: A batch repairs lost focus and never takes it

    # S1
    Scenario Outline: When a batch leaves focus nowhere, it goes to the node the batch names
      Given a live surface listing the tasks "t1", "t2" and "t3", each with a Delete button
      And <situation>
      When the agent applies a batch that <change> and names the Delete button of "t3" as its focus
      Then the Delete button of "t3" has focus once the change has rendered

      Examples:
        | situation                                                                     | change                             |
        | the person's focus is on the Delete button of "t2"                            | removes "t2"                       |
        | the person confirmed deleting "t2" in a dialog opened from its Delete button  | closes the dialog and removes "t2" |

    # S2
    Scenario Outline: A batch's focus never takes focus from where the person is
      Given a live surface listing the tasks "t1", "t2" and "t3"
      And the person is typing "Buy milk" into <field>
      When the agent applies a batch that removes "t2" and names the Delete button of "t3" as its focus
      Then <field> keeps focus and the typed "Buy milk" once the change has rendered

      Examples:
        | field                            |
        | the surface's field "title"      |
        | the host page's own message box  |

    # S3
    Scenario Outline: A batch whose focus names no node of the resulting surface is rejected whole
      Given a live surface listing the tasks "t1" and "t2"
      When the agent applies a batch that removes "t2" and names "<focus>" as its focus
      Then the batch is rejected as "unknown-id" naming "<focus>"
      And "t2" is still listed

      Examples:
        | focus |
        | t9    |
        | t2    |

    # S4
    Scenario: Replacing the node that has focus leaves focus on its replacement
      Given a live surface where the person's focus is on the button "follow" reading "Follow"
      When the agent applies a batch replacing "follow" with a button reading "Following"
      Then the "Following" button has focus once the change has rendered

  Rule: A forced removal of a value empties the field

    # S5
    Scenario: A forced removal of a number the person typed empties the number field
      Given a live surface whose host allows user-state overrides
      And the number field "quantity" the person has typed 42 into
      When the agent applies a batch forcing the removal of the value of "quantity"
      Then the field "quantity" is empty and holds no value

  Rule: A rejection says how to proceed

    # S6
    Scenario: Reopening a dialog the person closed is rejected with the way to reopen it
      Given a live surface whose dialog "confirm-delete" the agent opened and the person closed with Escape
      When the agent applies a batch setting "confirm-delete" open
      Then the dialog stays closed and the batch is rejected as "user-state-conflict"
      And the diagnostic says to set it closed in a batch of its own first

  Rule: The host may raise every budget

    # S7
    Scenario Outline: A host may raise each budget above its default
      Given a batch that goes one past the default <limit>, which the defaults reject as "<rule>"
      And a live surface whose host raised that limit
      When the agent applies the batch
      Then the batch applies whole

      Examples:
        | limit                         | rule              |
        | 64 ops per batch              | batch-op-budget   |
        | 65,536 bytes per batch        | batch-size-budget |
        | 512 nodes on the surface      | node-count-budget |
        | 32 levels of nesting          | depth-budget      |
        | 262,144 bytes on the surface  | size-budget       |

  Rule: A rejected batch is a return value and changes nothing

    # S8
    Scenario: A rejected batch is returned, not thrown, and leaves earlier batches applied
      Given a live surface at revision 4 where an earlier batch renamed the task "t1" to "Buy milk"
      When the agent applies a batch that removes "t1" and sets a prop of the unknown node "t9"
      Then the call returns a result that is not ok and names "unknown-id", without throwing
      And "t1" still reads "Buy milk" and the revision stays 4

  Rule: A reset clears only what an action already delivered

    # S9
    Scenario: After an action delivered a field's text, a reset empties the field without host permission
      Given a live surface whose host does not allow user-state overrides
      And the field "title" whose typed "Buy milk" the button "add" delivered with its action
      When the agent applies a batch resetting "title"
      Then the field "title" is empty

    # S10
    Scenario: A reset after the person typed again is rejected and keeps the new text
      Given the field "title" whose "Buy milk" the button "add" delivered, and the person then typed "Buy bread"
      When the agent applies a batch resetting "title"
      Then the field keeps "Buy bread" and the batch is rejected as "unsent-user-input"
      And the diagnostic does not repeat "Buy bread"

    # S11
    Scenario: A reset of a field the person never touched succeeds and changes nothing
      Given a live surface showing the empty field "title" the person never touched
      When the agent applies a batch resetting "title"
      Then the batch applies and the field "title" is still empty

    # S12
    Scenario Outline: A reset empties a delivered number field and a delivered date field
      Given the <kind> field "<id>" whose <entry> the button "add" delivered with its action
      When the agent applies a batch resetting "<id>"
      Then the field "<id>" is empty and holds no value

      Examples:
        | kind   | id       | entry      |
        | number | quantity | 42         |
        | date   | due      | 2026-12-24 |

    # S13
    Scenario: A reset restores the value the spec gave the field
      Given the field "status" the spec filled with "Draft", whose "Ready" the button "save" delivered
      When the agent applies a batch resetting "status"
      Then the field "status" shows "Draft"

    # S14
    Scenario: A reset of an id no node of the surface carries is rejected whole
      Given a live surface showing the field "title" whose "Buy milk" the button "add" delivered
      When the agent applies a batch resetting "title" and the unknown "t9"
      Then the batch is rejected as "unknown-id" naming "t9"
      And the field "title" keeps "Buy milk"
```

### Scenario Family Coverage

This extends guardrail infrastructure, not a UI component. The live surface
draws nothing of its own; what it adds is where focus lands after a change,
which is the keyboard path.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S3, S5–S14 | |
| Keyboard path | S1, S2, S4 | |
| Assistive-tech outcome | | N/A — names, roles and states come from the rendered catalog components under their own contracts; focus landing (S1, S4) is what a screen reader then announces |
| Form participation | | N/A — a spec has no native form (spec 152); emptying a control is core behavior of the surface (S5, S9–S13), and form association stays the components' own |
| Theming | | N/A — the surface emits no styles |

## Requirements *(mandatory)*

### Functional Requirements

Task 3 (first pull request):

- **FR-001** (D3): `@kimen/catalog` exports hand-written readonly interfaces
  `LiveBatch` (`ifRevision?`, `ops`, `focus?`), `LiveOp` (the union) and
  `LiveInsertOp`, `LiveSetOp`, `LiveTextOp`, `LiveRemoveOp`,
  `LiveReplaceOp`, field for field the private schemas; `insert` and
  `replace` type their `node` as `UiSpecNode`. The private schemas are
  checked against the interfaces at compile time. `apply` keeps taking
  `unknown`: a batch is untrusted data whatever its type.
- **FR-002** (D1): a batch may carry `focus`, a node id. It is checked
  against the resulting state, after the ops; an id no node of that state
  carries rejects the whole batch as `unknown-id` at `batch.focus`.
- **FR-003** (D1): after an applied batch has settled (the components it
  created or changed have rendered and finished moving focus in response to
  it; a closing dialog returns focus one task later), and only if focus is
  then nowhere, focus goes to the node the batch names in `focus`, or,
  without one, to the node that replaced the node that held focus when the
  batch was applied. Focus is never moved away from an element that has it,
  inside or outside the surface.
- **FR-004**: a forced `set` that removes a user-state prop (`null`), on a
  surface that allows overrides, writes the catalog default to the
  component's property, or `undefined` when the entry declares none.
- **FR-005** (D4): a `user-state-conflict` on `open` names the remedy: a
  batch of its own setting `open` to the person's value, then the agent's
  value in a later batch.
- **FR-006** (D5): `budgets` and `batchBudgets` raise or lower each of the
  five limits (ops and bytes per batch; nodes, depth and bytes of the
  surface). The fixed ceilings of the purity wall (8 MiB, 256 JSON levels)
  are not options.
- **FR-007**: every rejection is the return value of `apply`
  (`{ ok: false, diagnostics, revision }`); `apply` never throws for a
  rejected batch and reports it through no callback. Atomicity ends at the
  batch: a rejected batch leaves every earlier batch applied.
- **FR-008**: the guide (`docs/guides/ui-spec.md`), the site guide (which
  gains its missing live-surface section), the catalog README,
  `docs/genui-surfaces.json`, the `kimen-genui` skill reference where it
  repeats the live surface, and spec 035 say: the five limits, their
  defaults and codes, and that the host may raise them; that a rejection is
  a return value; that several batches are not one change; that the
  protected props are four (`checked`, `open`, `selected`, `value`); that
  `apply` also accepts a JSON string; how to reopen a dialog; and `focus`.
- **FR-009**: Task 3 accepted no `reset` op; Task 4 adds it (FR-010).

Task 4 (second pull request, after `153-action-collect` and the
`ki-date-picker` fix are merged):

- **FR-010** (D2): a `reset` op `{ op: 'reset', id }`, exported as
  `LiveResetOp` and added to `LiveOp`.
- **FR-011**: whenever the surface dispatches an action, it records, for
  the bound node and for every node a `collect` of that action names, the
  live value of each user-state prop the action reports: what was
  delivered.
- **FR-012**: a reset is accepted when the node is untouched, or when each
  user-state prop it declares shows what was last delivered or what the
  reset would write, the latter only while no `set` agreed with the person
  since they entered it (spec 159). Otherwise the batch is rejected as
  `unsent-user-input` at `ops[i].id`; the diagnostic names the node and the
  prop and never carries the person's live value.
- **FR-013**: an accepted reset writes to each user-state prop the node
  declares the model's value, else the catalog default, else `undefined`,
  to the attribute and to the component's property, and clears the touched
  mark and what was delivered. It needs no `force` and no
  `allowUserStateOverride`.

### Key Entities

- **Batch focus**: an optional node id on a batch; the node that receives
  focus if the batch leaves focus nowhere.
- **Delivered value**: per node, the live value of each user-state prop
  that the last dispatched action carried.
- **Reset**: an op that returns one control to its spec value and forgets
  the person's input, accepted only when nothing undelivered is lost.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive on `@kimen/catalog`: the batch
  and op types, `LiveBatch.focus`, the `reset` op and its type (Task 4), the
  diagnostic code `unsent-user-input` (Task 4), and a clearer message on an
  `open` conflict. The UI-spec format and the catalog schema version do not
  change: a batch is not part of the spec format. `@kimen/catalog` is not
  part of the elements/tokens public-API snapshot, so no `changes/api`
  declaration.
- **Bundle budget** (Art. IV): a few hundred bytes of plain TypeScript in the
  catalog; no new dependency.
- **Accessibility** (Art. V): focus is no longer lost after a confirmed
  delete (WCAG 2.2, 2.4.3 Focus Order). The pull request documents a
  keyboard-only walkthrough of the delete flow.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the hand-written GenUI surface
  description and the `kimen-genui` skill gain `focus`, `reset` and the
  budgets, so an agent can write a batch from them alone.
- **Guardrail/security boundary** (Art. VIII): S2, S3 and S5 to S14 need
  explicit founder confirmation. S9 to S14 add a way to empty a control
  without the host's permission, bounded by what an action already
  delivered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: after a keyboard-only confirmed delete whose batch names the
  next Delete button, that button has focus in every run, in Chromium on
  every pull request and in Firefox and WebKit at release.
- **SC-002**: no test moves focus away from an element that had it.
- **SC-003** (Task 4): a property-based run of random type, deliver and
  reset sequences never loses text the person typed after the last
  delivery.
- **SC-004**: S1 to S8 are traced to tests when Task 3 merges, S9 to S14
  when Task 4 merges.

## Assumptions

- Client-side only, like `035-live-surface`.
- "Settled" is implemented as a watch of up to eight rendered frames after
  the batch: at each frame, focus that is nowhere goes to the target, and
  the watch ends when focus lands, when the person presses a key or a
  pointer, when a later batch asks for focus, or at the eighth frame. The
  browser tests include a dialog that keeps focus for two frames after the
  batch and then hands it to the page body, as `ki-dialog` does when the
  control that opened it is gone; with a one-frame watch that test fails.
- The catalog browser suite does not load `@kimen/elements` (module
  boundaries), so its focus and reset tests use test-local elements. The
  real number and date fields of S12 run in the MCP Apps adapter's browser
  suite, where the packaged surface document registers every component in a
  frame and the live surface renders into that frame's document, as spec 152
  does for its containment tests.
- The traceability gate requires every scenario of a committed feature to
  be traced. The Task 3 pull request therefore committed S1 to S8 and kept S9
  to S14 verbatim in a section of their own; the Task 4 pull request moved
  them, unchanged, to the end of the Gherkin block.
