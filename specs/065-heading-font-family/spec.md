# Feature Specification: Component heading typography

**Feature Branch** `feat/347-heading-font-token`

**Created** 2026-11-19

**Input** Issue #347, Give component headings a font-family token.

## Gherkin Scenarios

```gherkin
Feature: Component heading typography
  Themes can choose a typeface for dialog and alert headings independently
  of body copy.

  # S1
  Scenario Outline: Default headings retain the theme's body typeface
    Given a <theme> page in the <scheme> scheme with a dialog and an alert
    When their headings are rendered with default tokens
    Then both headings use their component's body typeface
    And the dialog heading keeps its normal tracking

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S2
  Scenario: A theme chooses a shared heading typeface
    Given a themed region that sets --ki-typography-family-heading to serif
    When a dialog and an alert render headings in the region
    Then both headings use serif
    And their body copy keeps the theme's body typeface

  # S3
  Scenario: Component heading typefaces take precedence over the shared typeface
    Given a theme whose heading typeface is sans-serif
    And a dialog and an alert whose component heading family tokens are set to serif
    When their headings render
    Then both headings use serif
    And their body copy keeps the theme's body typeface

  # S4
  Scenario: A dialog heading has its own tracking
    Given a dialog with --ki-dialog-heading-letter-spacing set to 2px
    When its heading renders
    Then its heading has 2px letter spacing
    And its body copy keeps normal tracking
```

### Scenario Family Coverage

| Family | Scenarios | Applicability |
|---|---|---|
| Core behavior | S1 | Default heading typography |
| Keyboard path | — | The change only affects heading typography. |
| Assistive-tech outcome | — | Existing heading and accessible name contracts are owned by specs 011 and 012. |
| Form participation | — | Heading typography has no effect on form participation. |
| Theming | S2, S3, S4 | Theme and component token overrides |

## Token Defaults

- `--ki-typography-family-heading` aliases `--ki-typography-family-body`.
- `--ki-dialog-heading-font-family` and `--ki-alert-heading-font-family` alias
  `--ki-typography-family-heading`.
- `--ki-dialog-heading-letter-spacing` aliases
  `--ki-typography-letter-spacing-none` at `0em`. This matches the unmodified
  dialog's inherited tracking in both shipped themes. Agent's choice, pending
  founder confirmation.

The four tokens are additive public API. The dialog and alert visual baselines
must match in the shipped themes, and headings retain their 4.5:1 contrast
requirement.

After #341 lands, the onmars v2 theme assigns the dialog heading to
`--ki-typography-family-display` with
`--ki-typography-weight-display-semibold`. Alert headings keep the body
family. The design system re-sync verifies Newsreader and heading contrast.
