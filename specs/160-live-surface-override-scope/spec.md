# Feature Specification: A forced override hands back only the props it names

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (guardrails
     tested as a security boundary), with Arts. II and III. -->

**Feature Branch**: `claude/per-prop-user-state-release` (spec `160-live-surface-override-scope`)

**Created**: 2026-11-21

**Status**: Approved. The founder confirmed S1 to S3 verbatim on 2026-11-21
("Sí, aprobados"), including the Art. VIII security-boundary confirmation
and the amendment of `035-live-surface` D5 and FR-006 and of
`159-live-surface-unsent-input` FR-002.

**Input**: a clean-context review of PR #574 (spec 159). The defect is older
than 159 and is reproduced by `packages/catalog/tests/live-override-scope.spec.ts`,
which fails today on S1 and S2.

On a host created with `allowUserStateOverride: true`, a forced `set` that
overrides ONE user-state prop marks the whole element as untouched and drops
everything 159 holds for it. Every user-state prop of that element is handed
back to the agent. `ki-search` declares both `value` and `open`:

1. The person types "secret" and opens the search.
2. Batch 1 is `set { open: false }` with `force: true`: allowed.
3. Batch 2 is `set { value: "x" }` without `force`: accepted. The typed text
   is replaced. A `remove` or `replace` of the search without `force` is
   accepted too and discards it.

The host's permission already lets the agent force `value` directly, so the
agent gains no new power. The defect is that a force naming one prop
silently releases another, so the protection no longer follows what the op
says.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Forcing one prop leaves the person's other input theirs (Priority: P1)

The agent forces a search closed that the person opened and typed into. The
search closes; the text the person typed stays theirs. Changing, removing or
replacing it still needs a forced override of its own.

**Why this priority**: it is the user-state guarantee of `035` D5. Today a
force on `open` defeats it for `value`, without `force` on the batch that
replaces the text.

**Independent Test**: type into a search and open it; force it closed; then
apply an unforced `set` of the query, a `remove` and a `replace`, and check
that each is rejected and the search keeps the text. Force the query
instead, then close the search without force: rejected.

**Acceptance Scenarios**: S1, S2.

---

### User Story 2 - The prop the agent forced is the agent's again (Priority: P1)

After a forced override, the agent changes the prop it forced with an
ordinary `set`, as `159` FR-002 promises.

**Why this priority**: the fix must not over-correct and keep the forced
prop protected.

**Independent Test**: force a search closed, then set it open without
force, and check that it is open.

**Acceptance Scenarios**: S3.

### Edge Cases

- A forced `set` naming several user-state props hands back each of them.
- A forced `set` of a prop that is not user state (`label`) hands back
  nothing, as today.
- A forced `set` of a prop the person never changed still hands back only
  that prop.
- One batch was already safe: every op is checked against the state before
  the batch, so forcing `open` and then setting `value` in the same batch is
  rejected today.
- Input held by an agreeing `set` (159 FR-001) stays held unless the forced
  op names that prop.
- The person changes the forced prop again: it is theirs again, as today.
- A component that shows a value other than the one forced (it normalizes
  it) keeps that prop the person's until another forced override. The error
  is on the safe side.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A forced override hands back only the props it names
  A forced set the host allows replaces the user-state props it names and
  hands only those back to the agent. Whatever else the person typed,
  ticked, selected or opened on the same control stays theirs.

  Rule: The person's other input still needs force

    # S1
    Scenario Outline: After forcing a search closed, a batch that would discard its query is rejected
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced closed
      When the agent applies a batch that <op> without force
      Then the search keeps "secret" and the batch is rejected as "user-state-conflict"

      Examples:
        | op                              |
        | sets the query of "find" to "x" |
        | removes "find"                  |
        | replaces "find"                 |

    # S2
    Scenario: After forcing the query of a search, closing it is rejected
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced to the query "x"
      When the agent applies a batch setting "find" closed without force
      Then the search stays open and the batch is rejected as "user-state-conflict"

  Rule: The prop a forced override named is the agent's again

    # S3
    Scenario: After forcing a search closed, an ordinary set opens it again
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced closed
      When the agent applies a batch setting "find" open
      Then the search is open
```

### Scenario Family Coverage

This is a security boundary of the live surface, not a UI component. Like
`035-live-surface` and `159-live-surface-unsent-input`, it adds no
interaction pattern of its own.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S3 | |
| Keyboard path | | N/A — the person's input reaches the surface through the components' own contracts; the surface adds no interaction |
| Assistive-tech outcome | | N/A — names, roles and states are the rendered components' own |
| Form participation | | N/A — a spec has no form of its own (spec 152); the protected values are the components' live props |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (amends 035 FR-006 and 159 FR-002): a forced `set` that the
  host allows hands back only the user-state props it names. Every other
  user-state prop of that element that is the person's stays theirs: a later
  `set` that would change it, and a `replace` or `remove` of the node or of
  any ancestor, is rejected as `user-state-conflict` without `force`.
- **FR-002**: a prop that a forced override named is handed back as `159`
  FR-002 says today: an ordinary `set` of it applies until the person
  changes it again.
- **FR-003**: held input (`159` FR-001), `open` handed back by agreement
  (`159` FR-003 and the two batches of `155` S6) and diagnostics without the
  person's value (`159` FR-004) do not change. A forced override ends the
  hold only of the props it names.
- **FR-004**: the guide (`docs/guides/ui-spec.md`), spec 035 (D5, FR-006)
  and spec 159 (FR-002) state FR-001 and FR-002.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): behaviour only. No type, option, rule or
  diagnostic changes.
- **Bundle budget** (Art. IV): `live.ts` shrinks by a few bytes.
- **Accessibility** (Art. V): none.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the guide says that a forced
  override covers only the props it names.
- **Guardrail/security boundary** (Art. VIII): every scenario, S1 to S3,
  needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: in the happy-dom suite, no sequence of batches changes or
  discards a user-state prop the person entered unless a forced override
  the host allows names that prop, or names the node or an ancestor in a
  `replace` or `remove`.
- **SC-002**: `159` S1 to S5 and `155` S6 stay green.

## Assumptions

- Spec 159 (PR #574) merges first; this change builds on its branch.
- What the person changed is still detected per element, from its
  interaction events, and compared per prop with what the agent last wrote
  (035 Assumptions). After a forced override the forced prop shows exactly
  what the agent wrote, so nothing of the person's remains in it.
- A forced `replace` or `remove` discards the whole node, as today; it has
  no props to name.
