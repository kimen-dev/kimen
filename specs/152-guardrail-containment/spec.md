# Feature Specification: Guarded surfaces stay contained

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II and IX. -->

**Feature Branch**: `fix/guardrail-containment` (spec `152-guardrail-containment`)

**Created**: 2026-11-20

**Status**: Approved. The founder confirmed S1 to S7 verbatim on 2026-11-20
("Sí, confirmados"), including the Art. VIII guardrail confirmation.

**Input**: Founder decision of 2026-11-20 ("Sí, ábrelas") on findings H3a and
H3b of the generative UI audit: a rendered spec must only touch what it
inserted. A prop that names another element resolves only to a node of the
same spec or surface, never to an element of the host page, and a spec never
submits or resets a form of the host page.

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. Every scenario here is a guardrail scenario and
requires explicit standalone founder confirmation.

## Design-source analysis

Not applicable. No visual surface changes: the scenarios constrain what a
rendered spec may reach, not how anything looks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A spec's references stay inside the spec (Priority: P1)

Some catalog components point at another element by id: a menu at the button
that opens it, a popover or a tooltip at its trigger, a counter at the
control it decorates, a copy button at the field it copies from, a chip group
at the entry field that follows it. An agent writes those ids, so they are
untrusted. When the surface sits in a host page, a raw id resolves in the
host's document and can attach a spec component to the host's own controls.

**Why this priority**: the guarded renderer promises that a surface only
touches what it inserted (`028-guarded-renderer`, `035-live-surface`). An id
that reaches the host page breaks that promise.

**Independent Test**: render specs whose reference props name a node of the
same spec and, separately, an id that only the host page carries, inside a
host page that has elements with those ids.

**Acceptance Scenarios**: S1, S2, S3 and S4.

---

### User Story 2 - A spec never drives a host form (Priority: P1)

A surface may be mounted inside a host page's `<form>`. A spec owns no form
of its own, so a submit or reset button in a spec can only ever act on the
host's form.

**Why this priority**: a spec that submits the host's form posts data the
person never meant to send.

**Independent Test**: mount surfaces inside a host form, render spec buttons
bound and unbound to actions, activate them, and observe that the host form
is neither submitted nor reset; validate specs that ask for submit or reset
buttons.

**Acceptance Scenarios**: S5, S6 and S7.

### Edge Cases

- A reference names the node that carries it (a menu anchored to itself): it
  resolves to a node of the spec, so it is valid and harmless.
- The host page already uses the id the renderer would allocate for a
  reference target: the renderer allocates another one.
- A live batch removes the node another node references: the batch is
  rejected, as a dangling reference would fall back to the host page.
- A consumer catalog declares its own reference props: they follow the same
  rule.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Guarded surfaces stay contained
  A rendered spec touches only what it inserted: a prop that names another
  element resolves only to a node of the same spec or surface, and a spec
  never submits or resets a form of the host page.

  Rule: A reference resolves only to a node of the same surface

    # S1
    Scenario: A menu anchored to a button of its own spec opens from that button
      Given a spec with a button "Actions" identified as "actions" and a menu anchored to "actions"
      When the person activates the "Actions" button
      Then the menu opens next to the spec's "Actions" button

    # S2
    Scenario Outline: A reference to an id that no node of the spec carries is rejected
      Given a host page with its own element whose id is "checkout"
      When the renderer validates a spec whose <component> sets <reference> to "checkout"
      Then no part of the spec renders
      And the diagnostic names <reference> as a reference to no node of the spec

      Examples:
        | component      | reference    |
        | ki-menu        | anchor       |
        | ki-popover     | for          |
        | ki-tooltip     | for          |
        | ki-counter     | for          |
        | ki-copy-button | from         |
        | ki-chip-group  | focus-target |

    # S3
    Scenario: A host element that shares a spec id is never reached
      Given a host page with its own password field whose id is "secret"
      And a spec whose copy button copies from its own field identified as "secret"
      When the person activates the copy button
      Then the copied text is the spec field's value
      And the host's password field is untouched

    # S4
    Scenario: A live batch that references no node of the surface is rejected
      Given a live surface showing a button identified as "share"
      When the agent applies a batch adding a tooltip for "checkout"
      Then the whole batch is rejected naming the reference "checkout"
      And the surface keeps showing what it showed before

  Rule: A spec never submits or resets a host form

    # S5
    Scenario: A spec button inside a host form does not submit it
      Given a host form "payment" that contains the surface
      And a spec with a button "Continue" bound to no action
      When the person activates "Continue"
      Then the host form "payment" is not submitted

    # S6
    Scenario Outline: A spec that asks for a form-action button is rejected
      Given a host form "payment" that contains the surface
      When the renderer validates a spec with a button whose type is "<type>"
      Then no part of the spec renders
      And the diagnostic names the button type "<type>"

      Examples:
        | type   |
        | submit |
        | reset  |

    # S7
    Scenario: A bound spec button inside a host form dispatches only its action
      Given a host form "payment" that contains the surface
      And a spec with a button "Confirm" bound to the declared action "confirm"
      When the person activates "Confirm"
      Then the host receives the action "confirm"
      And the host form "payment" is not submitted
```

### Scenario Family Coverage

This is security-boundary infrastructure, not a UI component. Like
`028-guarded-renderer`, it adds no interaction pattern of its own.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S7 | |
| Keyboard path | | N/A — activation by keyboard or pointer reaches the same component contract; the renderer adds no interaction |
| Assistive-tech outcome | | N/A — accessible names and relations are produced by the rendered components under their own contracts |
| Form participation | S5–S7 | The scenarios constrain what a spec may do to a host form |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog MUST mark every component prop whose value names
  another element by id as a reference (`format: "idref"`), derived from the
  component source (`@format idref`), never hand-listed. The built-in props
  are `ki-menu.anchor`, `ki-popover.for`, `ki-tooltip.for`, `ki-counter.for`,
  `ki-copy-button.from` and `ki-chip-group.focus-target`.
- **FR-002**: Validation MUST accept a reference only when its value is the
  `id` of a node of the same spec, or, for a live surface, of a node the
  surface holds after the batch. Any other value MUST be rejected with the
  issue code `invalid-reference`, naming the prop path and the value. The
  existing `commandfor` rule keeps its own code and checks.
- **FR-003**: The renderers MUST never write a spec id to the DOM. Each
  referenced node MUST receive an id the renderer allocates, unused in the
  surface's document or shadow root at allocation, and every reference MUST
  be written as that allocated id.
- **FR-004**: A live batch that removes or replaces a node still referenced
  by a node that remains MUST be rejected whole.
- **FR-005**: Validation MUST reject, for any catalog in use, the values
  `submit` and `reset` of a component's `type` prop when that prop is an enum
  that also offers `button` (a form-action type), naming the value.
- **FR-006**: The generated catalog MUST offer agents only `button` for a
  form-action type, so prompts and schemas derived from it never suggest
  `submit` or `reset`.
- **FR-007**: The renderers MUST set `type="button"` on every rendered node
  with a form-action type that the spec leaves unset, whether or not the node
  is bound to an action.
- **FR-008**: The catalog schema version MUST advance to `1.6.0` (additive:
  the `idref` format). The elements public API snapshot does not change (the
  component props only gain a JSDoc `@format` tag), so the public API ledger
  needs no declaration; the catalog surface changes are recorded here.

### Key Entities

- **Reference prop**: a string prop whose value names another element of the
  same surface by its spec node id.
- **Form-action type**: a `type` enum prop offering `button` together with
  `submit` or `reset`.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): `CatalogPropConstraint.format` gains
  `"idref"`; validation issues gain the code `invalid-reference`; the catalog
  schema version becomes `1.6.0`; the built-in catalog narrows `ki-button`'s
  `type` to `button`. The elements API snapshot is unchanged (`check:api`
  passes without a declaration).
- **Bundle budget** (Art. IV): a few hundred bytes in the catalog and the MCP
  Apps document; no new dependency.
- **Accessibility** (Art. V): none.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the reference format and the
  narrowed type are generated from component source and reach agents through
  the catalog, the emitter and `kimen-mcp`.
- **Guardrail/security boundary** (Art. VIII): every scenario is a guardrail
  scenario and needs explicit founder confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No rendered spec resolves a reference to an element it did not
  insert, for every reference prop of the built-in catalog.
- **SC-002**: No rendered spec submits or resets a host form, bound or
  unbound, in the real-browser suite.

## Assumptions

- Form-associated spec controls joining a host form's data (a `name`d
  `ki-input` inside a host form) is out of scope here; it was not part of the
  approved findings and stays a recorded audit finding.
- `ki-link` `target`/`rel` hardening (H3c) and the purity-wall allocation
  cost (H3d) are separate, not yet approved findings.
