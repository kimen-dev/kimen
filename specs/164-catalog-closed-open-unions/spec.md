# Feature Specification: The built-in catalog closes its open unions

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II and V. -->

**Feature Branch**: `claude/catalog-closed-enums` (spec `164-catalog-closed-open-unions`)

**Created**: 2026-11-25

**Status**: Approved. The founder approved S1 to S6 as written on 2026-11-25
(dictated as "Y sí lo pruebo", meaning "Y sí, lo apruebo"), answering
whether they approved the spec 164 contract as it stood. S1 to S4 are
guardrail scenarios (Art. VIII): they narrow what the guarded renderer
accepts.

**Input**: Feedback from an integrator building a React 19 app with Kimen
GenUI (2026-11-25). Their review found that `validateUiSpec` accepts any
string as the `tone` of `ki-alert`, so a model's invented tone passes
validation and `repairPrompt` never runs.

## Design-source analysis

Not applicable. No component, token or style changes.

## Finding

Checked on `origin/main` at `4990f81e`:

- Three component props are typed as deliberately open unions,
  `"a" | "b" | (string & {})`: `ki-alert` `tone`, `ki-toast` `tone` and
  `ki-toaster` `placement`. Markup may carry any string; an unknown value
  falls back by CSS construction.
- `packages/catalog/scripts/generate-catalog.mjs` (around line 123) maps that
  shape to `{ type: 'string', documentedValues: [...] }`. They are the only
  three props of the built-in catalog with `documentedValues`; every other
  `tone`, `variant` and `placement` is already a closed `enum`, although
  their elements also tolerate unknown values in markup.
- `validateUiSpec` does not check `documentedValues`. `catalogPrompt` prints
  these props as `string`, and `uiSpecJsonSchema` gives them
  `{ type: 'string' }`, so neither the prompt nor constrained decoding shows
  the model the allowed values.
- The consequence goes beyond a missed repair. A model that writes
  `tone: "error"` on a failure message gets an alert with the neutral
  appearance and `role="status"` instead of `role="alert"`: the failure is
  not announced with urgency. `ki-toast` behaves the same way.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A model cannot invent a tone (Priority: P1)

An agent writes a spec with a tone that does not exist. Validation rejects
it with the allowed values and the repair prompt asks for one of them, so
the person sees an alert with the tone the model meant.

**Why this priority**: it is the defect the integrator found, and it hides
an accessibility downgrade.

**Independent Test**: validate a spec with an undocumented tone and build
its repair prompt.

**Acceptance Scenarios**: S1, S2, S3, S4.

---

### User Story 2 - Nothing else becomes stricter (Priority: P2)

Hand-written markup and consumer catalogs behave as before.

**Independent Test**: render the same unknown tone in markup, and validate
an open string declared by a consumer definition.

**Acceptance Scenarios**: S5, S6.

### Edge Cases

- A spec stored before this change with an undocumented value is rejected
  on its next validation. `@kimen/catalog` is not published yet, so no
  consumer holds such specs; after publication the same change would be
  breaking.
- A live update (`createLiveSurface`) that sets an undocumented tone is
  rejected like any other invalid `set`, and the surface stays unchanged.
- The prop descriptions keep saying how the element treats unknown values.
  That remains true for markup and does not invite a model to use one,
  because the prompt and the schema now list the allowed values.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: The built-in catalog accepts only the documented values of its open unions
  Three component props accept any string in markup: ki-alert tone, ki-toast
  tone and ki-toaster placement. A spec written by a model may use only their
  documented values, so an invented value is rejected and repaired instead of
  rendering as a neutral, unannounced message.

  Rule: A spec checked against the built-in catalog uses only documented values

    # S1
    Scenario: A spec whose alert has an undocumented tone is rejected with the allowed tones
      Given a spec whose root is a ki-alert with tone "error"
      When the spec is validated against the built-in catalog
      Then the spec is rejected at "root.props.tone"
      And the issue lists the tones "danger", "info", "neutral", "success" and "warning"

    # S2
    Scenario Outline: Every documented value of an open union is accepted
      Given a spec whose root is a <component> with <prop> "<value>"
      When the spec is validated against the built-in catalog
      Then the spec is accepted

      Examples:
        | component  | prop      | value         |
        | ki-alert   | tone      | danger        |
        | ki-alert   | tone      | neutral       |
        | ki-toast   | tone      | warning       |
        | ki-toast   | tone      | success       |
        | ki-toaster | placement | top-center    |
        | ki-toaster | placement | bottom-end    |

    # S3
    Scenario: The repair prompt for an undocumented toast tone names the allowed tones
      Given a validation report that rejects a ki-toast whose tone is "critical"
      When the repair prompt is built from that report
      Then the prompt names the toast's tone and lists its five allowed tones

    # S4
    Scenario: The spec JSON Schema offers a model only the documented placements
      Given the spec JSON Schema generated from the built-in catalog
      When a schema validator checks a ki-toaster whose placement is "middle"
      Then the schema rejects the placement and lists "bottom-center", "bottom-end", "top-center" and "top-end"

  Rule: Markup and consumer catalogs keep their open values

    # S5
    Scenario: Hand-written markup with an unknown alert tone still renders as a neutral status
      Given a page whose markup holds a ki-alert with tone "error" and the message "Save failed"
      When the page renders the alert
      Then the alert shows the neutral appearance and exposes role status

    # S6
    Scenario: A consumer definition may still declare an open string with documented values
      Given a consumer definition whose acme-kpi-card tone is an open string documenting "up" and "down"
      When a spec giving that card the tone "flat" is validated against the extended catalog
      Then the spec is accepted
```

S1 to S4 change what the guarded renderer accepts and needed the founder's
explicit confirmation, given on 2026-11-25.

### Scenario Family Coverage

This is catalog infrastructure, not a UI component.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S6 | |
| Keyboard path | | N/A — no interaction changes |
| Assistive-tech outcome | S5 | S1 protects the `alert` role a model means; S5 pins the role markup keeps |
| Form participation | | N/A — none of the three props belongs to a form control |
| Theming | | N/A — no styles change |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog generator MUST emit a prop typed as an open union
  of string literals and `string & {}` as a closed `enum` whose values are
  those literals, in the generator's existing order. The generated built-in
  catalog then declares no `documentedValues`.
- **FR-002**: `validateUiSpec`, `preflightUiSpec`, `renderUiSpec` and live
  updates MUST reject a value outside those literals with the existing
  enum issue (`invalid-prop-type`, its path and the allowed values). No new
  issue code.
- **FR-003**: `catalogPrompt` and `uiSpecJsonSchema` MUST present the three
  props as enums through their existing enum paths. No emitter code
  changes.
- **FR-004**: The elements MUST keep their open types and their fallback
  for unknown values in markup.
- **FR-005**: A consumer definition MAY still declare an open string with
  `documentedValues`; `registerCatalog` and validation of consumer props are
  unchanged.
- **FR-006**: The catalog schema version stays `1.9.0`: the format does not
  change, only the data the generator writes.

### Rejected alternatives

- **Check `documentedValues` in the validator**: it would also make every
  consumer's open string strict, which FR-005 keeps open.
- **Close the element types**: narrowing `KiAlertTone | (string & {})` to
  `KiAlertTone` changes the public TypeScript API of three elements and
  removes a tolerance hand-written markup relies on, to fix a problem that
  only exists for generated specs.
- **A warning instead of a rejection**: a warning does not run the repair
  loop and does not reach constrained decoding, so the model's value would
  still render.

### Key Entities

- **Open union**: a prop typed `"a" | … | (string & {})` in a component's
  source.
- **Built-in catalog**: `catalogData`, generated from the component
  manifests.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): the generated `catalogData` changes for
  three props; the catalog API snapshot is regenerated if its declared type
  carries the literals. No function signature changes.
- **Bundle budget** (Art. IV): the catalog data and the `kimen-mcp` and MCP
  Apps bundles change by a few bytes; the size gates are measured before
  merge.
- **Accessibility** (Art. V): an invented tone can no longer turn a failure
  alert into an unannounced status.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): the prompt and the JSON Schema list
  the allowed values.
- **Guardrail/security boundary** (Art. VIII): the renderer accepts less.
  S1 to S4 need the founder's explicit confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: S1 to S4 and S6 pass in the catalog and emitter suites; S5
  passes in the elements browser suite.
- **SC-002**: The generated built-in catalog contains no `documentedValues`.

## Assumptions

- No published package depends on the open behaviour: `@kimen/catalog` and
  `@kimen/emitter` are still `private`.
- Adding a value to one of these unions later goes through the generator as
  for any other enum.
