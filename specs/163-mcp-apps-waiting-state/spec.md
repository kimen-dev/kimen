# Feature Specification: An MCP Apps surface with nothing to paint shows that it is waiting

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. II, IV, V and VI. -->

**Feature Branch**: `claude/mcp-apps-waiting-state` (spec `163-mcp-apps-waiting-state`)

**Created**: 2026-11-24

**Status**: Approved. The founder approved S1 to S6 and the change that adds
S7 on 2026-11-24 ("Sí, con ese cambio"), answering whether the waiting
placeholder should be added and should stop moving when nothing arrives.

**Input**: The real-host test of the MCP Apps adapter in the Claude desktop
app (2026-11-24, improvements plan Task 9). After several idle minutes the
host re-creates a card's View from its cached document, completes the
handshake and sends `tool-input`, but does not send `tool-result` again; the
pinned protocol revision does not oblige it to (`apps.mdx`:1155, "if the
View is displayed during tool execution"; state restoration is a deferred
extension, `apps.mdx`:1573). The packaged document then paints nothing and
the person sees an empty dark rectangle, which they cannot tell from a broken
card. Reproduced with the reference `AppBridge` 2.0.4: a used card, torn down,
re-created from the same document, `tool-input` and no result.

**Constitution check**: no catalog, element or protocol change. The document
gains a text-free placeholder made of a catalog component it already carries.

## Design-source analysis

Not applicable. The placeholder is the catalog's `ki-skeleton` under its own
contract; nothing new is drawn.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A card that is waiting looks like it is waiting (Priority: P1)

A person returns to a conversation whose card the host re-created without its
result. Today they see an empty dark rectangle. With this feature they see
the skeleton lines of a card that has nothing to show yet, still after ten
seconds, and they know to ask for it again.

**Why this priority**: it is the defect the real-host test found; the empty
rectangle reads as a broken product.

**Independent Test**: embed the packaged document with the reference host,
complete the handshake, send no result (with and without a prior teardown)
and look at the mount point.

**Acceptance Scenarios**: S1, S4, S7.

---

### User Story 2 - The placeholder never stays on top of a painted card (Priority: P1)

The first spec that paints replaces the placeholder; a refused spec does not.

**Independent Test**: deliver an accepted and a refused result to a document
showing the placeholder.

**Acceptance Scenarios**: S2, S3.

---

### User Story 3 - The placeholder respects the person's settings (Priority: P2)

Under reduced motion it never animates, and it follows the host's dark theme.

**Acceptance Scenarios**: S5, S6.

### Edge Cases

- A result arrives before the handshake completes: the bridge refuses it
  (`not-initialized`, spec 030) and the placeholder stays.
- A host that never completes the handshake (an unsupported protocol
  version): the placeholder stays; the document paints nothing else, as today.
- The 10-second limit is counted from the document's start, not from the
  handshake: a host that is slow to answer `ui/initialize` sees a still
  placeholder sooner, which is the honest signal.
- A host that runs the document without the token stylesheet is out of scope:
  the document always carries it.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: An MCP Apps surface with nothing to paint shows that it is waiting
  The packaged surface document shows a text-free waiting placeholder from
  the moment it loads until a tool result paints a spec, so a host that has
  not delivered a result, or will not deliver it again, shows a card that is
  waiting instead of an empty page.

  Rule: Until a spec paints, the surface shows a waiting placeholder

    # S1
    Scenario: A surface that has received no result shows the waiting placeholder
      Given a host that embeds the Kimen surface document
      When the handshake completes and no tool result has arrived
      Then the surface shows a waiting placeholder with no text
      And the surface is marked busy for assistive technology

    # S2
    Scenario: The first accepted result replaces the waiting placeholder
      Given a surface showing the waiting placeholder
      When a tool result arrives whose spec the guarded renderer accepts
      Then the spec is painted and no part of the placeholder remains
      And the surface is no longer marked busy

    # S3
    Scenario: A refused result leaves the waiting placeholder in place
      Given a surface showing the waiting placeholder
      When a tool result arrives whose spec the guarded renderer refuses
      Then the surface still shows the waiting placeholder and stays marked busy

    # S4
    Scenario: A re-created surface whose host sends no result again shows the placeholder, not an empty page
      Given a host that tore down a painted surface and embedded the document again
      When the handshake completes and the host sends the tool input but no tool result
      Then the surface shows the waiting placeholder

    # S7
    Scenario: A placeholder that has waited 10 seconds without a result stops animating
      Given a surface showing the waiting placeholder
      When 10 seconds pass without a tool result
      Then the placeholder stays in place and stops animating

  Rule: The placeholder follows the person's settings

    # S5
    Scenario: With reduced motion the placeholder does not animate
      Given the person prefers reduced motion
      When the surface shows the waiting placeholder
      Then the placeholder does not animate

    # S6
    Scenario: The placeholder follows the host's dark theme
      Given a host whose theme is dark
      When the surface shows the waiting placeholder
      Then the placeholder uses the dark color scheme of the default theme
```

Scenario vocabulary: "waiting placeholder" is the catalog's `ki-skeleton`
(FR-001) as the only child of the document's mount point; "marked busy" is
`aria-busy="true"` on the mount point; "stops animating" is the skeleton's
`animated` set to false, so no shimmer animation runs.

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a protocol-adapter feature, not a UI component; the families apply
to the placeholder the document shows.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S7 | |
| Keyboard path | | N/A — the placeholder holds nothing focusable, and S2 hands the mount point to the painted spec |
| Assistive-tech outcome | S1, S2 | |
| Form participation | | N/A — no field |
| Theming | S5, S6 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (placeholder)**: when the packaged surface document starts, before
  it sends `ui/initialize`, its runtime MUST make the mount point's only
  child a `ki-skeleton` with three lines and set `aria-busy="true"` on the
  mount point. The skeleton is `aria-hidden` under its own contract; the
  placeholder carries no user-visible text (Art. VI).
- **FR-002 (replacement)**: the first full paint replaces the mount point's
  children in one operation (spec 157 FR-002), which removes the
  placeholder; the runtime MUST then remove `aria-busy`. A refused result
  changes nothing (spec 030 S4), so the placeholder and `aria-busy` stay.
- **FR-003 (stillness)**: 10 seconds after the document starts, if the
  placeholder is still the mount point's child, the runtime MUST set its
  `animated` to false. The first paint cancels that timer. The 10 seconds
  are a constant of the adapter, not a host option.
- **FR-004 (settings)**: under reduced motion and forced colours the
  skeleton does not animate (its own contract); its colours come from the
  token stylesheet, so it follows the color scheme the host's `theme`
  selects (spec 030 S19).
- **FR-005 (boundaries)**: the bridge, the protocol messages, the outbound
  allowlist and the catalog do not change. Only `surface-runtime.ts`, the
  code that wires the packaged document, changes; a custom document built
  with `createSurfaceBridge` is unaffected.

### Key Entities

- **Waiting placeholder**: the `ki-skeleton` the packaged document shows in
  its mount point until the first full paint.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): none. `@kimen/adapter-mcp-apps` exports
  nothing new; its packaged document changes. `@kimen/mcp-server` embeds the
  document, so its surface changes the same way.
- **Bundle budget** (Art. IV): measured with a prototype on 2026-11-24 against
  `main` at `41df76ad`: document +327 B raw and +114 B gzip (brotli within
  noise). Measured again on this branch before merging; a re-base, if needed,
  is the founder's decision.
- **Accessibility** (Art. V): `aria-busy` marks the mount point while it
  waits; the skeleton is `aria-hidden`; no animation under reduced motion.
- **Tokens** (Art. VI): none added; no user-visible string.
- **Guardrail/security boundary** (Art. VIII): none. Nothing crosses the
  boundary that did not before.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a document that has received no result shows the placeholder
  in 100% of the S1 and S4 runs, and none of it after an accepted result (S2).
- **SC-002**: after 10 seconds without a result, no animation runs on the
  placeholder (S7).

## Assumptions

- **Not a recovery.** The placeholder fetches nothing and does not tell the
  person what to do. A card re-created without its result still has to be
  asked for again; `COMPAT.md` records the Claude behaviour.
- **Restoring from storage** (studied on 2026-11-24, not decided): if a later
  spec restores a card's last delivered state, a restored state paints
  instead of the placeholder; the placeholder is what shows when there is
  nothing to restore.
- **Ten seconds** is long enough for an ordinary first result and short
  enough that a card that will never get one stops promising progress.
