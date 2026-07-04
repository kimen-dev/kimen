---
name: gherkin-use-cases
description: Writes and reviews Gherkin .feature files as Kimen behavior contracts (constitution Art. II) — declarative business language, BRIEF scenarios, stable S-IDs, exactly one When per scenario, five scenario families for UI components, in the exact format the lint-feature and traceability CI gates accept. Use whenever writing use cases, user stories, acceptance criteria, BDD scenarios, or specs/<feature>/feature.feature files before implementation; when filling the Gherkin section of a spec during /speckit-specify; when reviewing existing Gherkin for approval; or when deriving tests from scenarios — even when the word "Gherkin" is never said.
---

# Gherkin use cases — Kimen behavior contracts

Constitutional skill: the executable elaboration of Art. II (Specs Before
Code) of `/kimen-constitution.md`. On any conflict, the constitution wins.

Behavior enters the system exactly once, as an approved `.feature`, BEFORE any
implementation. Reading 10 scenarios costs the founder minutes; reviewing 800
lines of drifted diff costs hours. The feature file is also an agent-readable
contract: badly written Gherkin poisons every agent that consumes it.

## When to use / not use

Use when: writing the Gherkin section of a spec (`/speckit-specify`, template
override `.specify/templates/overrides/spec-template.md`), creating or editing
`specs/<feature>/feature.feature`, reviewing scenarios before founder approval
(human gate 1), or mapping approved scenarios to tests.

Do NOT gherkinize: unit/implementation tests ("Given the validator receives an
empty string" is a Vitest test, write it there); typos, dependency bumps,
mechanical refactors, docs (Art. II escape hatch). If behavior changes, a
scenario exists first — otherwise no scenario.

## Kimen rules (gate-enforced)

| Rule | Exact requirement | Enforced by |
|---|---|---|
| Location | `specs/<feature>/feature.feature` | `scripts/gates/lint-feature.sh` (default lookup) |
| Stable ID | Comment line `# S<n>` immediately before each `Scenario:` / `Scenario Outline:` | lint: ID count == scenario count, IDs unique |
| ID stability | Never renumber. Retired IDs are never reused; new scenarios take the next unused number, appended | founder review; git history is the record |
| Retired scenarios | Delete the whole block INCLUDING its `# S<n>` line — a dangling ID comment fails the lint count | lint |
| One When | Exactly one line starting with `When ` per scenario block | lint (awk) |
| Brevity | ≤5 step lines per scenario, real data | review |
| Style | Declarative business language; observable outcomes only | review |
| Families | UI components: five families, ≥1 scenario each, N/A needs written justification | spec-template family table; review |
| Traceability | Every S-ID appears as a word (`\bS<n>\b`) in ≥1 test under `packages/` (`*.spec.ts`, `*.spec.tsx`, `*.e2e.ts`) | `scripts/gates/check-traceability.sh` |

Format gotchas the gates impose:

- Never write a prose comment starting `# S<digit>` — lint counts it as an ID.
- One `Scenario Outline` = one S-ID covering all its `Examples` rows.
- Don't hide a second action behind `And` after a `When` ("When the user fills
  the field / And submits") — lint can't see it, review must reject it. One
  action; setup goes in `Given`.
- No `When` in `Background` (and `Background` only for state shared by ALL
  scenarios, ≤4 lines).

**"Observable" for a component library** = the public contract: rendered
state, computed styles, emitted events, submitted form data, the accessibility
tree. Never internals: private state, implementation props, CSS classes,
shadow DOM structure.

## The five scenario families (UI components, Art. II)

| Family | What it proves | Typical Then |
|---|---|---|
| Core behavior | The component's reason to exist | rendered state / emitted event |
| Keyboard path | Every pointer behavior has a keyboard equivalent (Art. V) | same outcome via keys |
| Assistive-tech outcome | Name, role, state exposed/announced | accessibility tree content |
| Form participation | ElementInternals: value submits, validity blocks, reset restores (Art. IV) | submitted form data |
| Theming | Token reassignment alone restyles (Art. VI) | computed visual under overridden token |

N/A only with written justification in the spec's Scenario Family Coverage
table (e.g. form participation on a non-form `ki-badge`).

## Worked example (the standard to copy)

`specs/007-ki-switch/feature.feature` — passes `lint-feature.sh` as written:

```gherkin
Feature: ki-switch toggles a boolean setting
  A switch that reports its state to forms and assistive technology
  and restyles through semantic tokens alone.

  # S1
  Scenario: Toggling the switch turns it on
    Given a ki-switch labeled "Email notifications" that is off
    When the user toggles the switch
    Then the switch is on
    And a change event reports the new state "on"

  # S2
  Scenario: Space toggles the focused switch
    Given the "Email notifications" switch is focused and off
    When the user presses Space
    Then the switch is on

  # S3
  Scenario: The switch exposes its name, role and state to assistive technology
    Given a ki-switch labeled "Email notifications" that is off
    When the switch receives focus
    Then the accessibility tree exposes name "Email notifications", role switch, state off

  # S4
  Scenario: The switch submits its value with the form
    Given a form containing a ki-switch named "marketing" that is on
    When the user submits the form
    Then the submitted form data contains "marketing" with value "on"

  # S5
  Scenario: Resetting the form restores the switch's initial state
    Given the "marketing" switch was on when the form loaded and is now off
    When the user resets the form
    Then the switch is on

  # S6
  Scenario: Reassigning the semantic accent token restyles the on state
    Given a page themed with --ki-color-accent set to "#7a1fa2"
    And a ki-switch named "marketing" that is off
    When the user toggles the switch
    Then the on-state track renders in "#7a1fa2"
```

Family table for the spec: core S1 · keyboard S2 · assistive tech S3 · form
S4, S5 · theming S6.

Traceability: each test carries the ID in its title, e.g.
`it("S2: Space toggles the focused switch", ...)` in
`packages/elements/src/components/switch/switch.spec.tsx`.

## Anti-patterns (reject in review)

**Imperative, UI-coupled script** — breaks on every redesign:

```gherkin
# BAD
When the user clicks the input
And the user types "on"
And the user clicks the button with class ".ki-switch__submit"
# GOOD
When the user toggles the switch
```

**Multiple When / conjunctive action** — two behaviors, zero clarity:

```gherkin
# BAD
When the user toggles the switch
When the user submits the form
# GOOD: two scenarios (S1 toggling, S4 submission), one When each
```

**Internal-state assertion** — invisible to users and agents:

```gherkin
# BAD
Then the component's internal "checked" state is true
And the host has class "ki-switch--on"
# GOOD
Then the switch is on
And a change event reports the new state "on"
```

**Incidental detail** — drowns the rule it illustrates:

```gherkin
# BAD
Given a user "Ana García" aged 34 on the "Settings" page at 09:14
# GOOD (age and time don't affect the rule)
Given a ki-switch labeled "Email notifications" that is off
```

**Vague placeholders** — hide boundary conditions:

```gherkin
# BAD
Then the form submits with a valid value
# GOOD
Then the submitted form data contains "marketing" with value "on"
```

**Renumbering after retirement** — breaks traceability history:

```gherkin
# BAD: S3 retired, so S4 becomes S3
# GOOD: S3's block is deleted entirely; S4 keeps its number; the next new
# scenario is S7. Gaps are normal and expected.
```

**Outline stapling / row explosion**: `Scenario Outline` only for the SAME
rule over multiple data points, never for stapling unrelated behaviors, and
never as a cheap way to multiply slow browser scenarios.

## Generative UI specs (Art. VIII)

Specify the contract, not the model. Assert the guardrail — "Then the rendered
UI contains only components from the catalog", "Then only declared actions
dispatch" — never "the AI generates exactly X". Scenarios touching the
guardrail or security boundary require standalone founder approval (Workflow).

## Pre-approval checklist

Before presenting scenarios for founder approval (human gate 1):

- [ ] File at `specs/<feature>/feature.feature`
- [ ] `scripts/gates/lint-feature.sh specs/<feature>/feature.feature` exits 0
- [ ] Every scenario: one `When`, ≤5 step lines, real data, observable outcome
- [ ] No implementation vocabulary (selectors, CSS classes, DOM events,
      internal props); third person, present tense, no "I"
- [ ] Titles read as a behavior index: rule + outcome
- [ ] IDs stable: appended numbering, no renumber, no dangling or reused IDs
- [ ] Five families covered or N/A justified in the spec's family table
- [ ] Guardrail/security-boundary scenarios flagged for standalone approval
- [ ] Open questions batched for the founder — never idle waiting (Workflow)

After implementation: `scripts/gates/check-traceability.sh` exits 0 (every
S-ID referenced by ≥1 test). A scenario that no longer matches behavior is a
bug in one of the two — fix it, never delete it to make CI green.

## Going deeper

`references/authoring-guide.md` — BRIEF principles explained, Example Mapping
(solo-founder adaptation), declarative vs imperative in depth, Scenario
Outline guidance, living-documentation maintenance, and all sources.
