# Feature Specification: Compact catalog prompts

**Feature Branch**: `docs/specs-emitter-host-vocabularies`

**Created**: 2026-11-27

**Status**: Draft for 0.5.0.

## Problem and measurement

`catalogPrompt` includes the catalog’s descriptive prose and a validated
example. Component filtering already saves about 85% for the demo’s eight
tags. A host that needs additional savings can ask for shorter guidance for
the same components.

Measured against `72e2dea7` using `catalogPrompt` and UTF-8 byte counts.
Both standard examples passed `validateUiSpec`. The sizing estimate caps
each property description’s contribution at 80 bytes, leaving all other
bytes in the calculation. It estimates how much prose could be shortened.
The implementation must preserve meaning and is free to shorten other prose.

| Catalog | Standard | Prose estimate | Proposed compact ceiling |
|---|---:|---:|---:|
| Built-in catalog (122 tags) | 230,922 B | 180,335 B (78.09%) | 85% of standard |
| Demo subset (eight tags) | 34,511 B | 21,106 B (61.16%) | 85% of standard |

The demo subset is `ki-card`, `ki-icon`, `ki-button`, `ki-input`, `ki-select`,
`ki-option`, `ki-textarea` and `ki-table`. Compare prompts produced from the
same catalog and options, varying only verbosity. This accounts for catalog
growth between releases.

## Public API and decisions

- Add `verbosity?: 'compact'` to the options accepted by `catalogPrompt`.
  Omission keeps the standard prompt byte for byte for the same input.
  `components` still selects the available tags and `icons`, when provided,
  supplies the vocabulary defined in [spec 168](../168-emitter-icon-vocabulary/spec.md).
- Shorten descriptive prose. For every offered component, retain each prop’s
  type, enum members, required status, numeric bounds and format constraints,
  as well as its slots and action bindings. Keep essential usage and
  composition constraints, including where a choice option belongs and
  which event a bare action name reports. Keep the general rules for valid
  UI specs and a valid embedded example wherever the standard prompt has one.
- Compare byte counts, structured facts by component and prop, and embedded
  example validation locally. Check representative usage constraints and
  action guidance directly. A model call is outside the acceptance checks.

## Gherkin Scenarios

```gherkin
Feature: Hosts can request a compact catalog prompt
  Compact guidance uses fewer bytes while retaining the rules for a valid UI spec.

  # S1
  Scenario Outline: Compact guidance fits the size ceiling and includes a valid example
    Given the standard prompt for <catalog>
    When the host derives a compact prompt for the same catalog selection
    Then the compact prompt uses at most 85% of the standard prompt's UTF-8 bytes
    And its embedded UI-spec example validates for that catalog selection
    And each component retains its prop types, enum values, required fields, bounds, formats and slots

    Examples:
      | catalog                                                                               |
      | the full built-in catalog                                                             |
      | ki-card, ki-icon, ki-button, ki-input, ki-select, ki-option, ki-textarea and ki-table |

  # S2
  Scenario: Compact guidance preserves the catalog's emission rules
    Given the standard prompt for the full built-in catalog
    When the host derives a compact prompt for that catalog
    Then the prompt retains declared actions, event bindings and form collection rules
    And it explains that "ki-option" belongs inside "ki-select" or "ki-combobox"

  # S3
  Scenario: Omitting verbosity returns the standard prompt
    Given the standard prompt for "ki-card" and "ki-button" before compact mode was available
    When the host derives a prompt for that selection without a verbosity option
    Then it receives the same standard prompt byte for byte
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3 | |
| Keyboard path | | N/A. The option changes prompt text only. |
| Assistive-tech outcome | | N/A. The option adds no rendered UI. |
| Form participation | | N/A. The prompt describes the existing form rules. |
| Theming | | N/A. Prompt verbosity has no visual surface. |

## Constitutional surface and scope

This additive emitter API changes guidance text. Schema and render validation
still govern output. Hosts can keep their existing `catalogPrompt` call or
pass `{ components, verbosity: 'compact' }` when prompt length matters. No
new runtime dependency or browser bundle bytes for hosts omitting the option.
Provider token counts, live model evaluations, schema compaction and changes
to catalog metadata or the runtime guardrail are outside this contract.

At implementation, document the option and byte-based comparison in
`packages/emitter/README.md`, `docs/guides/emitting-specs.md`,
`site/docs/src/content/docs/guides/emitting-specs.mdx` and
`plugins/kimen/skills/kimen-genui/references/catalog-direct.md`.
Update `docs/genui-surfaces.json` and regenerate `llms/emitter.md` and
`llms-full.txt`.

## Open questions for the founder

1. Approve the proposed 85% ceiling for both catalog selections?
2. May compact prose paraphrase essential usage constraints when their
   meaning is preserved, or are there rules that must be reproduced verbatim?
