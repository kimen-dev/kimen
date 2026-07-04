# Feature Specification: [FEATURE NAME]

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: /kimen-constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE.
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Gherkin Scenarios *(mandatory, Art. II)*

<!--
  ACTION REQUIRED. The scenarios below become `specs/[###-feature-name]/feature.feature`
  and are THE behavior contract. Rules (constitution Art. II, gherkin-use-cases skill):
  - Declarative, business-language scenarios; observable outcomes only.
  - Stable IDs S1..Sn (never renumber; retired IDs are not reused).
  - Exactly ONE `When` per scenario. BRIEF: real data, essential, focused, ≤5 lines.
  - Scenario-to-test traceability is a CI gate: every ID appears in at least one test.
-->

```gherkin
Feature: [Feature name]

  # S1
  Scenario: [Intention-revealing name]
    Given [context]
    When [single action]
    Then [observable outcome]
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

<!-- Every UI component covers these five families, one scenario minimum each.
     Mark N/A only with justification (e.g. form participation on a non-form component). -->

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S_ | |
| Keyboard path | S_ | |
| Assistive-tech outcome | S_ | |
| Form participation | S_ | |
| Theming | S_ | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]

*Mark unclear requirements with [NEEDS CLARIFICATION: question].*

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]

## Constitutional Surface *(mandatory)*

<!-- Declare the constitutional obligations this feature touches, so plan and
     review check them explicitly instead of discovering them late. -->

- **Public API delta** (Art. IX): [new/changed props, events, parts, slots, tokens; SemVer impact]
- **Bundle budget** (Art. IV): [expected KB impact; new runtime dependency? justify or "none"]
- **Accessibility** (Art. V): [APG pattern followed; new interaction pattern? → manual walkthrough required]
- **Tokens** (Art. VI): [new tokens introduced, layer they belong to; "none"]
- **Catalog/agent legibility** (Art. I): [when-to-use / when-NOT-to-use description for the catalog]
- **Guardrail/security boundary** (Art. VIII): [touches spec rendering, actions or adapter surface? → standalone scenario approval required]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable, technology-agnostic metric]
- **SC-002**: [Measurable, technology-agnostic metric]

## Assumptions

- [Assumption or reasonable default chosen when description did not specify]
