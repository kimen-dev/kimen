# Slider

**2026-11-27 founder decision (F4).** The gate-driven.dev integrator report led to one boolean attribute rule for both builds. An absent attribute uses the property default. A present attribute is true unless its value is exactly `"false"`. The same parsing applies to markup and later writes.

**Feature branch** `feat/387-ki-slider`  
**Issue** #387  
**Design source** Kimen design system, Components → Proposed → Slider

A slider lets people adjust an approximate value or an interval. Use a number
input for precise entry and a radio group or segmented control for a short
list of choices.

## Requirements

- Expose a single thumb or two non-crossing thumbs with step-based pointer and
  keyboard adjustment. Pointer changes preview during the gesture and commit
  once on release. Programmatic updates are silent.
- Offer interval marks, midpoint fill with a center tick, and a vertical scale.
  Horizontal placement follows writing direction. The vertical maximum is at
  the top in both directions.
- Expose a name, bounds, current value, and formatted value for each thumb.
  Keep both range thumbs in stable tab order. Associate the help with each.
- Submit through ElementInternals, restore initial selection on form reset and
  omit disabled controls, including controls inside a disabled fieldset.
- Use closed tokens, honor forced colors and reduced motion, and meet the
  pointer target minimum in both themes and schemes.
- Generate the neutral catalog and React, Vue and Angular wrappers. Map the
  supported A2UI Slider shapes through the existing adapter.

## Interpretations

- **Agent's choice, pending founder confirmation.** An unset single value uses
  the minimum. An unset range spans the scale. Invalid entries use the
  corresponding endpoint. Reversed range values are sorted. Values clamp and
  snap from the minimum, with the maximum reachable even on a partial step.
- **Agent's choice, pending founder confirmation.** A range submits one
  comma-separated entry under its name. Keyboard adjustments commit each
  changed value. Cancelled pointer gestures restore the starting selection.
- **Agent's choice, pending founder confirmation.** Centered fill applies to a
  single thumb. For a range the selected interval determines the fill.
  Horizontal arrows follow the physical direction in RTL. Up increases in
  both orientations and directions.
- **Agent's choice, pending founder confirmation.** Format percent values as
  percentages of one hundred (60 displays as 60%). Currency defaults to EUR.
  Formatting uses the closest declared language, with the browser locale as a
  fallback. The visible label falls back to “Slider” when empty. Minimum
  and maximum naming suffixes can be localized.
- **Agent's choice, pending founder confirmation.** Render at most 100 mark
  intervals. The larger thumb target applies on coarse pointers by default
  and in regions that use touch density.
- **Agent's choice, pending founder confirmation.** A2UI 1.0 `steps` is an interval count. Divide
  the scale span by it to get the increment. The adapter uses the existing value resolution
  rules for each dialect and adds no slider-specific action or model writeback.
  The catalog exposes `change` as the commit action event and adds a scalar
  number-or-string constraint in schema 1.5.0 for the two value shapes.
- **Agent's choice, pending founder confirmation.** The API gate classifies
  the added Stencil loader namespace members as major. Both themes use
  high-emphasis readout and help ink to clear 7:1 in contrast-more.

## Scenario family coverage

| Family | Scenarios | Justification when N/A |
| --- | --- | --- |
| Core behavior | S1, S2, S11, S13 | |
| Keyboard path | S2, S3, S9 | |
| Assistive-tech outcome | S4, S9 | |
| Form participation | S5, S6, S12 | |
| Theming | S7, S8, S10 | |

## Gherkin Scenarios

```gherkin
Feature: ki-slider selects one value or an interval
  A person can adjust a bounded scale by pointer or keyboard and submit the selection.

  # S1
  Scenario: Pointer movement previews a value and release commits it
    Given a Volume slider set to 20
    When the person drags the thumb to 75
    Then the slider reports 75 during the drag
    And release reports one committed value of 75

  # S2
  Scenario: The two ends of an interval cannot cross
    Given a Price slider set to 20 through 80 with its lower thumb focused
    When the person presses End
    Then the selection is 80 through 80
    And the lower thumb reports 80 as its upper limit

  # S3
  Scenario Outline: The focused thumb responds to navigation keys
    Given a focused Volume slider from 0 through 100 with step 2 and value 50
    When the person presses <key>
    Then the selected value is <value>

    Examples:
      | key        | value |
      | ArrowRight | 52    |
      | ArrowUp    | 52    |
      | ArrowLeft  | 48    |
      | ArrowDown  | 48    |
      | PageUp     | 70    |
      | PageDown   | 30    |
      | Home       | 0     |
      | End        | 100   |

  # S4
  Scenario: Each end of a formatted interval is named and described
    Given a Price slider set to 20 through 80 euros with the help "Price per night"
    When the person navigates to the interval
    Then its thumbs are named "Price minimum" and "Price maximum"
    And each thumb reports its currency value and "Price per night"

  # S5
  Scenario: The form carries both slider value shapes
    Given a form with Volume set to 60 and Price set to 20 through 80
    When the person submits the form
    Then form data contains "volume" with "60" and "price" with "20,80"

  # S6
  Scenario: Reset restores the initial selection
    Given a form with Volume initially 60 and currently 75
    When the person resets the form
    Then Volume is set to 60 again

  # S7
  Scenario: A theme supplies the rail and fill colors
    Given a theme with a navy slider rail and a gold slider fill
    When a Volume slider appears at 60
    Then it shows a navy rail behind a gold fill

  # S8
  Scenario: A centered scale fills toward its negative side in RTL
    Given a right-to-left Exposure slider from -50 through 50 set to -20
    When the centered scale appears
    Then a tick marks the midpoint
    And the fill joins the midpoint to the thumb on its right

  # S9
  Scenario: Up increases a vertical value
    Given a focused vertical Bass slider from 0 through 10 set to 4
    When the person presses ArrowUp
    Then the vertical slider reports value 5
    And the thumb moves upward

  # S10
  Scenario: Touch gives both range thumbs large targets
    Given a page with a coarse pointer
    When a Price interval appears
    Then each thumb has a target of at least 44 by 44 CSS pixels

  # S11
  Scenario: An A2UI scale becomes an interactive slider
    Given a supported A2UI surface
    When the agent sends a Volume slider from 10 through 50 with five divisions and value 34
    Then the surface shows a Volume slider with limits 10 and 50, step 8 and value 34

  # S12
  Scenario: A disabled fieldset makes the slider unavailable
    Given a form with a Volume slider in a fieldset
    When the fieldset is disabled
    Then the slider is skipped in the keyboard sequence
    And form data omits Volume

  # S13
  Scenario Outline: Boolean attributes read consistently from markup and script
    Given a slider
    When an attribute (disabled) is <write> <moment>
    Then the corresponding property reads <state>

    Examples:
      | write                    | moment                 | state        |
      | absent                   | in the initial markup  | its default  |
      | set to exactly "false"   | in the initial markup  | false        |
      | set to an empty value    | in the initial markup  | true         |
      | set to "true"            | in the initial markup  | true         |
      | set to exactly "false"   | after the first render | false        |
      | set to an empty value    | after the first render | true         |
      | set to "true"            | after the first render | true         |
```
