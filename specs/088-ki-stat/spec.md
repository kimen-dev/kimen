# Feature Specification: Stat

**Feature branch** `feat/395-ki-stat`  
**Issue** #395  
**Design source** Kimen design system, Components → Proposed → Stat

People reading a dashboard can see the latest value of a metric and how it
changed since a reference period. A lower render time is an improvement, even
though its change points down.

## Requirements

- Show the metric label, its finite numeric value and its optional unit in the
  page locale. Accept number-format options for the value and delta.
- Show an optional delta as a magnitude with a sign-dependent trend glyph and an
  optional comparison period. Select the tone from the sign and the metric's
  preferred direction.
- Expose the label, value and optional comparison as one accessible phrase.
  Keep the card out of the tab sequence and leave slotted chart content accessible.
- Use semantic token aliases in both themes and preserve the reading order and
  visible trend in RTL, forced colors, reduced motion and touch density.
- Register the documented scalar attributes and chart slot in the neutral catalog,
  with no actions. Generate React, Vue and Angular bindings from the component.

## Interpretations

- **Agent's choice, pending founder confirmation.** Format is absent from this
  checkout. Use the platform's `Intl.NumberFormat` with the nearest nonempty
  `lang` as the provisional implementation. An invalid locale falls back to
  the runtime locale. Invalid options fall back to decimal formatting.
- **Agent's choice, pending founder confirmation.** `format` and
  `deltaFormat` are JavaScript properties. An omitted `deltaFormat` inherits
  `format`. Append the literal `unit` to decimal values, including decimals
  in compact or scientific notation. Currency, percent and Intl unit styles
  supply their own unit. The scalar catalog does not transport option objects.
- **Agent's choice, pending founder confirmation.** Treat zero as a neutral
  comparison without a glyph or direction word. Omit absent or non-finite
  deltas and their reference periods. A non-finite or absent main value leaves
  the label visible and suppresses the comparison. Unknown preferences use
  `higher-is-better`.
- **Agent's choice, pending founder confirmation.** Use the issue's heading-1
  typography for the value and the reference's card layout. The spoken summary is one visually hidden
  paragraph, and the chart retains its own accessible content. Use the shipped trend glyphs
  and provide overridable `up-label` and `down-label` props for translation.

## Scenario family coverage

| Family | Scenarios | Justification when N/A |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6, S7 | |
| Form participation | | N/A. A stat displays a metric and does not participate in a form. |
| Theming | S8, S9, S10, S11, S12 | |

## Gherkin Scenarios

```gherkin
Feature: ki-stat displays a key metric and its comparison
  The sign shows which way a metric moved.
  The metric's preference determines whether the change is favorable.

  # S1
  Scenario: A metric uses its locale and separate comparison format
    Given a German page with a value of 1234.5 milliseconds
    And its comparison of minus 0.12 uses percent formatting
    When the stat appears
    Then the value reads "1.234,5 ms"
    And the comparison shows "12 %" with a falling glyph

  # S2
  Scenario Outline: Metric preference assigns the tone independently of sign
    Given a metric with <preference> preference and a change of <change>
    When the stat appears
    Then the change shows a <trend> glyph in the <tone> tone

    Examples:
      | preference       | change | trend   | tone   |
      | higher-is-better | 9      | rising  | good   |
      | higher-is-better | -9     | falling | bad    |
      | lower-is-better  | 9      | rising  | bad    |
      | lower-is-better  | -9     | falling | good   |
      | neutral          | -9     | falling | neutral |

  # S3
  Scenario: A missing comparison leaves only the metric
    Given an active-surfaces stat of 1284 with a reference period but no comparison value
    When the stat appears
    Then it shows only the metric label and the value "1,284"

  # S4
  Scenario: An unchanged metric displays a neutral zero
    Given a render-time stat with a comparison of zero milliseconds
    When the stat appears
    Then the comparison shows a neutral "0 ms" with no trend glyph

  # S5
  Scenario: A static stat leaves the tab sequence intact
    Given a stat between the "Edit" and "Export" buttons
    And focus is on "Edit"
    When the user presses Tab
    Then focus moves to "Export"

  # S6
  Scenario: A falling comparison is available as one phrase
    Given a median render time of 84 milliseconds down 9 milliseconds since last week
    When assistive technology reads the stat
    Then it reads "Median render time, 84 ms, down 9 ms vs last week" once
    And it skips the decorative glyph

  # S7
  Scenario: A sparkline can have its own accessible description
    Given a sales stat with a sparkline described as "Revenue over seven days"
    When assistive technology reads the stat
    Then it can read the metric and the chart description separately

  # S8
  Scenario: A theme can recolor the metric card
    Given a theme with a white raised surface and contrasting metric text
    When the stat appears
    Then it paints its card white

  # S9
  Scenario: A forced-color palette preserves the trend
    Given a high-contrast palette that overrides author colors
    When a stat with a negative comparison appears
    Then the falling glyph and comparison text remain visible

  # S10
  Scenario: Reduced motion keeps the comparison still
    Given a reader who requests reduced motion
    When a stat with a comparison appears
    Then the metric and comparison are visible without animation

  # S11
  Scenario: Right-to-left reading order starts with the glyph
    Given a right-to-left dashboard
    When a stat with a comparison appears
    Then the trend glyph appears to the right of the comparison magnitude

  # S12
  Scenario: A coarse pointer preserves the stat's readability
    Given a touch-density dashboard on a coarse-pointer device
    When the stat appears
    Then its text and glyph remain legible without pointer interaction
```
