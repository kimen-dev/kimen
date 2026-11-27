# Feature Specification: Host-declared keys for strict action collection

**Feature Branch**: `docs/specs-emitter-host-vocabularies`

**Created**: 2026-11-27

**Status**: Draft for 0.5.0. S1–S7 require explicit founder confirmation (Art. VIII).

## Problem

A form can already report live values in `ActionEvent.data` through `collect`
(spec 153). The prompt describes this behavior and `draft-2020-12` offers an
open map of data keys to node IDs. `openai-strict` requires closed objects
with every property listed as required, so the strict emitter omits the map.

## Public API and decisions

- Add `collect?: Readonly<Record<string, readonly string[]>>` to the options
  for `uiSpecJsonSchema` and `uiSpecTool`. Under `openai-strict`, a declaration
  such as `{ collect: { save: ['customerName', 'region', 'notes'] } }` permits a
  collecting node with a single `save` binding and those exact data keys.
  Each value is a UI-spec node ID, such as `f-name`. The tool exposes the same
  schema. The `draft-2020-12` schema and `catalogPrompt` retain their existing
  collection guidance and behavior.
- Collection itself is optional. Where the strict schema offers `collect`,
  the entire value is `null` when absent. A populated map requires every
  declared key and forbids extra keys. A non-null map is available only for
  a configured single named action on a cataloged custom element. Native
  primitives and per-event bindings get no collection map under this option.
  Without the option, the strict schema still omits `collect`.
- A declaration uses nonblank action names and lists 1 to 32 distinct,
  nonblank data keys per action, excluding forbidden UI-spec keys. An empty
  declaration is equivalent to omission. Reject invalid declarations using
  `invalid-option`. Only offer maps on nodes whose props do not conflict
  with the keys. The save button uses `customerName` because `ki-button`
  already declares a prop named `name`. Apply existing provider limits to
  the result and report `provider-limit` for an oversized artifact.
- `normalizeEmission` removes the outer `collect: null` placeholder. It
  preserves populated maps, including inadmissible values for validation.
  Hosts still normalize and validate, then render. Every bound action still
  appears in top-level `actions`, and collected fields resolve and pass
  validation under the existing rules in spec 153.
- A collection is data for the existing callback. It supplies no destination.
  Dispatch reports the action under [spec 161](../161-action-is-a-report/spec.md)
  and remains subject to [spec 162](../162-action-rate-budget/spec.md).
  The host validates action names and payloads for its application and
  independently authorizes consequential effects. This option constrains
  the emitted schema. A host accepting specs through other paths checks the
  allowed fields itself.

## Gherkin Scenarios

```gherkin
Feature: Hosts declare collection keys for strict UI-spec emission
  A strict schema can describe which form values belong to each action report.

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S1
  Scenario: The strict tool exposes collection keys for each declared action
    Given a host allowing "customerName", "region" and "notes" for "save", and only "region" for "preview"
    When the host derives the strict UI-spec tool
    Then its input schema matches the strict schema for those options
    And a populated "collect" map requires exactly the keys for its bound action, with node IDs as values

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S2
  Scenario Outline: The strict schema rejects collection outside the host's declaration
    Given a strict schema allowing "customerName", "region" and "notes" for "save", and only "region" for "preview"
    When the host checks a button with "action" set to <binding> and "collect" set to <map>
    Then the strict schema rejects the button's collection

    Examples:
      | binding              | map                                                                                   |
      | "preview"            | {"customerName":"f-name","region":"f-region","notes":"f-notes"}                       |
      | "export"             | {"region":"f-region"}                                                                 |
      | "save"               | {"customerName":"f-name","region":"f-region"}                                         |
      | "save"               | {"customerName":"f-name","region":"f-region","notes":"f-notes","destination":"f-url"} |
      | "preview"            | {"region":"https://example.com/receive"}                                              |
      | {"ki-change":"save"} | {"customerName":"f-name","region":"f-region","notes":"f-notes"}                       |
      | null                 | {"region":"f-region"}                                                                 |

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S3
  Scenario: A strict action can report without collecting fields
    Given a strict emission binding "save" with "collect" set to null
    When the host normalizes the emission
    Then the resulting spec still binds "save" and has no "collect" member on that node

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S4
  Scenario: The strict collection declaration does not declare the action in the spec
    Given a normalized spec with fields "f-name", "f-region" and "f-notes"
    And a button binding "save" and collecting those fields as "customerName", "region" and "notes"
    And the spec's top-level actions list contains only "preview"
    When the host validates the spec
    Then validation rejects the undeclared "save" binding

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S5
  Scenario: A valid collection reaches the host as an action report
    Given a validated "save" button collecting "customerName" from "f-name", "region" from "f-region" and "notes" from "f-notes"
    And those fields currently hold "Ana", "Madrid" and "Pickup after 5" with budget available for a report
    When the user activates "save"
    Then the host receives one "save" action report with those three live field values in its data
    And collection supplies no destination and performs no submission

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S6
  Scenario: Strict guidance still omits collection when the host declares no keys
    Given a catalog offering "ki-button"
    When the host derives an openai-strict schema without the "collect" option
    Then the schema offers no "collect" member on that button

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S7
  Scenario: A forbidden collection key fails strict derivation
    Given a host declaring "constructor" as a collection key for "save"
    When the host derives an openai-strict schema with that declaration
    Then derivation reports "invalid-option" for the forbidden key and returns no schema
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7 | |
| Keyboard path | | N/A. The option adds no activation path. |
| Assistive-tech outcome | | N/A. The option changes emitted data guidance. |
| Form participation | | N/A. S5 checks the existing action report. Form participation is unchanged. |
| Theming | | N/A. The option has no visual surface. |

## Constitutional surface and scope

Additive emitter API. No runtime dependency or additional browser bundle
bytes for hosts omitting the option. Existing collection for handwritten or
non-strict specs remains available. New submission destinations, a new form
API, renderer and protocol changes, and optional keys within a populated
strict map are outside this contract.

At implementation, document a strict form example and the existing host
responsibilities in `packages/emitter/README.md`,
`docs/guides/emitting-specs.md`, `site/docs/src/content/docs/guides/emitting-specs.mdx`,
and `plugins/kimen/skills/kimen-genui/references/catalog-direct.md`.
Update `docs/genui-surfaces.json` and regenerate `llms/emitter.md` and
`llms-full.txt`.

## Open questions for the founder

1. Approve one exact key set per action and a single named binding for 0.5.0?
   Does the demo need collection on per-event bindings or optional keys in a
   populated map?
2. Explicitly confirm S1–S7, including that the strict schema narrows the
   emission while the host remains responsible for validation and authorization.
