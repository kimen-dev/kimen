# Feature Specification: Host icon vocabulary for the emitter

**Feature Branch**: `docs/specs-emitter-host-vocabularies`

**Created**: 2026-11-27

**Status**: Approved for 0.5.0 on 2026-11-27.

## Problem

A 0.4.0 demo emitted `shopping-bag`, `tag` and `search` before the host
registered and selected them. The standard catalog exposes icon names as
strings, so the prompt and schema cannot tell the model which icons the
surface offers. The guarded renderer rejects unavailable glyphs.

## Public API and decisions

- Add `icons?: readonly string[]` to the options for `catalogPrompt`,
  `uiSpecJsonSchema` and `uiSpecTool`. With the option present, the prompt
  lists exactly these names as choices, including in any embedded example.
  The schema uses the same enum for `ki-icon`’s `name` and every cataloged
  `icon-name` prop in the effective component set. The tool uses that schema.
- Preserve required and optional props, including the strict target’s null
  placeholder for optional props. An out-of-vocabulary glyph mentioned as a
  component default must not be offered as a value the model can emit.
- Hosts can provide custom glyph names. A vocabulary that conflicts with a
  cataloged icon prop’s constraints fails derivation with a named issue.
  Every successful artifact must offer the exact vocabulary without widening
  those constraints. Repeated names count once. Empty lists and blank names
  fail with `invalid-option` at `options.icons`. Omission retains the current
  output, including existing catalog enums and open strings.
- The host registers its per-icon modules and passes the same list to
  `selectSpecIcons()` and the emitter. With MCP Apps, derive the artifacts
  with `surface.catalog` and `icons: surface.icons`. The list guides emission.
  The existing `unavailable-icon` preflight and atomic rejection still
  enforce registration and surface selection.

## Gherkin Scenarios

```gherkin
Feature: The host supplies the emitter's icon vocabulary
  A host offers the same glyph names to the model and the rendering surface.

  # S1
  Scenario: The prompt offers exactly the host's glyph names
    Given a catalog containing "ki-icon" and "ki-fab"
    When the host derives a prompt with "shopping-bag", "tag" and "search" as its icon vocabulary
    Then those are the only icon names offered for emission
    And any icon named by the embedded example belongs to that vocabulary

  # S2
  Scenario Outline: The schema closes every icon prop over the host's vocabulary
    Given a host icon vocabulary of "shopping-bag", "tag" and "search"
    When the host derives a "<target>" schema for the full catalog
    Then "ki-icon"'s required "name" and every "icon-name" prop offer exactly those three names
    And optional icon props still allow the target's representation of omission

    Examples:
      | target        |
      | draft-2020-12 |
      | openai-strict |

  # S3
  Scenario: The tool exposes the schema for the same vocabulary
    Given a draft-2020-12 schema for "ki-icon" with the vocabulary "shopping-bag", "tag" and "search"
    When the host derives the UI-spec tool with the same options
    Then the tool exposes that exact input schema

  # Guardrail: explicit founder confirmation required (Art. VIII).
  # S4
  Scenario Outline: An unavailable glyph leaves the rendered surface intact
    Given a surface displaying "Cart" and offering "shopping-bag", "tag" and "search"
    And "<icon>" is <status>
    When the host renders a spec naming "<icon>" on that surface
    Then rendering reports "unavailable-icon" for "<icon>"
    And the surface still displays "Cart"

    Examples:
      | icon   | status                     |
      | search | offered but unregistered   |
      | plus   | registered but not offered |

  # S5
  Scenario: An empty icon list fails derivation explicitly
    Given a catalog containing "ki-icon"
    When the host derives a prompt with an empty icon list
    Then derivation reports "invalid-option" for "options.icons"
    And returns no prompt

  # S6
  Scenario: A host without an icon vocabulary still gets open strings
    Given the built-in catalog containing "ki-icon" and "ki-fab"
    When the host derives a draft-2020-12 schema without an icon vocabulary
    Then "ki-icon"'s "name" and "ki-fab"'s "icon-name" remain open strings
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6 | |
| Keyboard path | | N/A. Emission guidance adds no keyboard interaction. |
| Assistive-tech outcome | | N/A. The icon accessibility contract is owned by the component. |
| Form participation | | N/A. The vocabulary affects icon props only. |
| Theming | | N/A. Glyph styling follows existing component tokens. |

## Constitutional surface and scope

This additive emitter API has no new runtime dependency and imports no
glyphs. Hosts that omit the option carry no additional browser bundle bytes.
Automatic glyph registration or loading, changes to the icon inventory, and
renderer or component changes are outside this contract.

At implementation, document the shared list and per-icon imports in
`packages/emitter/README.md`, `docs/guides/emitting-specs.md`,
`site/docs/src/content/docs/guides/emitting-specs.mdx`, and the catalog and
MCP Apps recipes under `plugins/kimen/skills/kimen-genui/references/`
(`catalog-direct.md` and `mcp-apps-server.md`). Update `docs/genui-surfaces.json`
and regenerate `llms/emitter.md` and `llms-full.txt`.

## Founder decisions (2026-11-27)

- An empty list returns `invalid-option` at `options.icons`. A host with no
  icons leaves `ki-icon` out of `components`.
- S4 is approved under Art. VIII. Registration and surface selection remain
  the renderer's checks for whether a glyph is available.
