# Feature Specification: Kimen theme checker

**Feature Branch**: `feat/theme-checker-060`

**Created**: 2026-11-27

**Status**: Approved on 2026-11-27.

## Problem

Integrator feedback A3 and P1 identified overrides that silently fail: names
inferred from sibling tokens, bare numbers in dimension tokens used by CSS
math, and assignments to tokens with no Kimen readers. Preference modes can
also override a theme's assignments to their base tokens.

## Public API and decisions

- `kimen-tokens check-theme <file.css…>` reports each finding with its file,
  line, column and fix. `npx @kimen/tokens check-theme <file.css…>` runs the
  same command. `--json` emits an array of findings in input
  order. The process exits 1 for errors and 0 for a clean or warnings-only run.
- `checkTheme(css, { file? })` from `@kimen/tokens/check-theme` returns the
  same findings as data. The MCP tool `check_theme` accepts CSS text as `css`
  and an optional `file` label, and returns the same array under `findings`.
  The MCP tool accepts up to 65,536 UTF-16 code units of CSS per call.
- Unknown and private declarations, unitless dimensions, definite type
  mismatches and preference overrides of mode-controlled base tokens are
  errors. Give nearby public names where possible, and prefer the unprefixed
  name when a guessed `md-` infix is the only difference.
- Accept CSS keywords used for sizing, including `auto`, and leave the
  arithmetic and substitution inside CSS functions to the browser. Issue an
  `unread-token` warning only for a token in the inventory's component layer
  that no Kimen component reads and no shipped token aliases. Applications
  can override semantic, palette and primitive tokens for their own CSS
  without receiving unread warnings. Kimen's own Material 3 stylesheet
  follows the same rule.
- Suggest the mode value token that wins in the active preference. Generate
  the token types, reads and mode mappings from the same build that emits the
  installed stylesheets. Checking runs offline.

## Gherkin Scenarios

```gherkin
Feature: Check Kimen theme CSS
  Theme authors and agents can correct token overrides before shipping them.

  # S1
  Scenario: An unknown default-size token gets a public replacement
    Given a theme declares "--ki-switch-md-track-width"
    When the author checks the stylesheet
    Then the finding identifies the file and line and suggests "--ki-switch-track-width" as an error

  # S2
  Scenario: Unitless zero gets a length fix
    Given a theme sets "--ki-button-label-padding-inline" to "0"
    When the author checks the stylesheet
    Then the checker reports an error and suggests "0px"

  # S3
  Scenario: Only unread component tokens yield advisories
    Given a theme overrides semantic, primitive and component tokens that Kimen does not read
    When the author runs the theme checker
    Then the checker warns about the component override and exits successfully

  # S4
  Scenario: A more-contrast override gets the mode token as a fix
    Given a theme overrides "--ki-text-supporting" inside the more-contrast media query
    When the author checks the stylesheet
    Then the checker reports an error and suggests "--ki-contrast-more-text-supporting"

  # S5
  Scenario: Material 3 follows the same rules as any theme
    Given Kimen's built Material 3 stylesheet and a copy with an extra comment
    When the author runs the theme checker
    Then neither version reports errors or warnings

  # S6
  Scenario: Every interface reports the same findings
    Given a stylesheet with token mistakes and the same filename on all interfaces
    When the author checks it via MCP, the CLI and the function export
    Then all three interfaces return the same findings in source order

  # S7
  Scenario: Palette, primitive and aliased tokens pass their unread checks
    Given a theme overrides unused palette and primitive tokens and a component token read through an alias
    When the author checks the stylesheet
    Then the checker returns no findings

  # S8
  Scenario: The installed checker has a Kimen-specific command
    Given the @kimen/tokens package is installed
    When the author looks up its executable
    Then kimen-tokens is the package's only command
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8 | |
| Keyboard path | | This tool has no component interaction. |
| Assistive-tech outcome | | This tool has no rendered surface. |
| Form participation | | This tool has no form control. |
| Theming | | The tool checks CSS declarations without rendering components. |

## Constitutional surface and scope

This is an additive tooling API. The token build owns the generated data and
the CLI, and the MCP binary bundles the same checker for use over stdio.
