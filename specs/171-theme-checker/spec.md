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

- `npx @kimen/tokens check-theme <file.css…>` reports each finding with its
  file, line, column and fix. `--json` emits an array of findings in input
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
  arithmetic and substitution inside CSS functions to the browser. Warn
  about tokens that have no reader in Kimen's shipped component and token
  styles. Applications may still read those tokens in their own CSS. The
  exact shipped Material 3 stylesheet defines the reference palette and
  receives no unread-override warnings.
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
  Scenario: An unread token yields an advisory
    Given a stylesheet whose only finding is an override of an unread public token
    When the author runs the theme checker
    Then the checker warns about the override and exits successfully

  # S4
  Scenario: A more-contrast override gets the mode token as a fix
    Given a theme overrides "--ki-text-supporting" inside the more-contrast media query
    When the author checks the stylesheet
    Then the checker reports an error and suggests "--ki-contrast-more-text-supporting"

  # S5
  Scenario: The Material 3 theme passes
    Given the Material 3 stylesheet built from Kimen's theme sources
    When the author runs the theme checker
    Then the checker returns no findings and exits successfully

  # S6
  Scenario: The MCP tool agrees with the command line
    Given a stylesheet with token mistakes and the same filename on both interfaces
    When the author checks it via MCP and the CLI
    Then both interfaces return the same findings in source order
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6 | |
| Keyboard path | | This tool has no component interaction. |
| Assistive-tech outcome | | This tool has no rendered surface. |
| Form participation | | This tool has no form control. |
| Theming | | The tool checks CSS declarations without rendering components. |

## Constitutional surface and scope

This is an additive tooling API. The token build owns the generated data and
the CLI, and the MCP binary bundles the same checker for use over stdio.
