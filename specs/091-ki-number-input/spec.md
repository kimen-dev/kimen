# Feature Specification for NumberInput

**Feature branch** `feat/389-ki-number-input`  
**Issue** #389  
**Design source** Kimen design system, Components → Proposed → NumberInput

People can edit quantities, limits and prices with an optional unit, bounds
and stepper controls. The field displays locale-aware text and submits a plain
number through the enclosing form.

## Requirements

- The numeric field is the named spinbutton. An optional suffix describes it
  alongside help, validation and adjustment messages. Steppers use decorative
  Kimen icons and expose their own accessible names and disabled states.
- Keyboard and pointer adjustment use the same bounds and step behavior.
  Typed values outside the bounds are clamped on blur with a visible,
  politely announced reason. Invalid text remains available for correction.
- Form submission, validation, reset and disabled fieldsets use
  ElementInternals. `format` controls presentation and preserves the
  numeric precision of the submitted value.
- Semantic aliases provide both themes' colors and geometry. The field can
  shrink, follows direction and supports forced colors, reduced motion and
  touch density. The gallery covers the two themes in light and dark schemes.
- The neutral catalog and the three framework wrappers expose the documented
  surface. The [component contract](contracts/number-input.md) describes its use.

## Interpretations

- **Agent's choice, pending founder confirmation.** A missing value is empty,
  a missing or nonpositive step is 1, and a maximum below the minimum is
  ignored. Step is an increment, so manually entered values need not land on
  a step grid. An adjustment from empty starts at zero clamped to the bounds.
- **Agent's choice, pending founder confirmation.** Page Up and Page Down
  move ten steps, like Shift with the arrows. Home and End go to their
  respective bound when present and retain caret behavior otherwise. Enabled
  steppers are named native buttons and stay in tab order. The labels and
  feedback messages can be localized through props.
- **Agent's choice, pending founder confirmation.** The closest language
  declaration sets the locale, with the runtime locale as fallback. Focus uses
  an ungrouped, unrounded numeric edit string. Percentage edits use percentage
  points and submit the underlying ratio. Configured currency, unit and
  compact affixes are restored on commit. Malformed formatting falls back to
  the plain representation.
- **Agent's choice, pending founder confirmation.** Native input and composed
  change events follow the `ki-input` convention. Each step commits immediately.
  Enter commits before implicit form submission. An empty optional field
  submits an empty string. Reset restores the `value` attribute. The catalog
  accepts JSON formatting options and declares no slots or agent actions.
- **Agent's choice, pending founder confirmation.** Use the reference's two
  flanking steppers and trailing unit with the shipped medium field metrics.
  The current docs pipeline discovers `docs/site.mdx` and builds the NumberInput
  route from it.

## Scenario family coverage

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S5, S15 |
| Keyboard path | S3 |
| Assistive-tech outcome | S4, S5 |
| Form participation | S6, S7, S8, S9, S15 |
| Theming | S10, S11, S12, S13, S14 |

## Gherkin Scenarios

```gherkin
Feature: Number input edits a quantity and keeps its numeric form value
  People can enter a localized number or adjust it within optional bounds.

  # S1
  Scenario: Optional steppers adjust a quantity up to its limit
    Given Seats is 3 with bounds 1 and 4 and visible steppers
    When the person activates Increase Seats
    Then Seats becomes 4 and reports the new value
    And Increase Seats is disabled

  # S2
  Scenario: A number can display a unit without showing steppers
    Given Timeout is 30 with the suffix seconds and default controls
    When the field appears
    Then it shows 30 beside seconds without stepper buttons

  # S3
  Scenario Outline: The keyboard adjusts the focused quantity
    Given Seats is 12 with bounds 2 and 40 and step 2
    When the person presses <key>
    Then Seats becomes <result>

    Examples:
      | key             | result |
      | ArrowUp         | 14     |
      | ArrowDown       | 10     |
      | Shift+ArrowUp   | 32     |
      | Shift+ArrowDown | 2      |
      | PageUp          | 32     |
      | PageDown        | 2      |
      | Home            | 2      |
      | End             | 40     |

  # S4
  Scenario: Assistive technology can identify the value and its controls
    Given Seats is 3 with bounds 1 and 50, the suffix seats, help text, and steppers
    When the field is read by assistive technology
    Then Seats is a spinbutton with minimum 1, maximum 50 and current value 3
    And it describes the formatted value with its unit and references the unit and help
    And the buttons are named Decrease Seats and Increase Seats

  # S5
  Scenario Outline: Leaving an out-of-range edit corrects it and explains the limit
    Given Seats has bounds 1 and 50 and the person has entered <entered>
    When the person leaves the field
    Then Seats shows <limit>
    And a polite status explains that the value was adjusted to the <bound>

    Examples:
      | entered | limit | bound   |
      | -3      | 1     | minimum |
      | 85      | 50    | maximum |

  # S6
  Scenario: A localized percentage submits a plain number
    Given a German-language form with a percentage field named discount
    And the person has entered 12,5 percent
    When the form submits
    Then the field displays 12,5 percent with the locale's percent sign
    And the form data contains discount with value 0.125

  # S7
  Scenario: A required empty number blocks form submission
    Given a form with an empty required quantity and a configured error message
    When the person submits the form
    Then the form reports a missing value
    And the field shows and describes the configured error message

  # S8
  Scenario: Form reset restores the declared default
    Given Seats started at 3 and has been changed to 5
    When the form is reset
    Then Seats and its form value return to 3

  # S9
  Scenario: A disabled fieldset disables the number input
    Given a form with Seats and its steppers inside an enabled fieldset
    When the fieldset becomes disabled
    Then Seats and both steppers are disabled
    And Seats is excluded from form data

  # S10
  Scenario: Themes can recolor the steppers
    Given a theme with an overridden stepper background
    When a number input appears with steppers
    Then the steppers show the overridden background

  # S11
  Scenario: Right-to-left layout follows reading order
    Given a right-to-left page and a number input with a unit and steppers
    When the field appears
    Then decrease, the number, the unit and increase appear in right-to-left order

  # S12
  Scenario: Touch density gives both buttons larger targets
    Given a coarse-pointer page and a number input with steppers
    When the field is placed in a touch-density region
    Then both stepper targets are at least 44 by 44 pixels

  # S13
  Scenario: Forced colors keep the field and its focus visible
    Given a forced-colors page with a number input
    When the person focuses the field
    Then the field border and focus indicator are distinguishable

  # S14
  Scenario: Reduced motion keeps the control still while editing
    Given a number input on a page with reduced motion enabled
    When the person focuses the field
    Then the field and its steppers have no active motion

  # S15
  Scenario: Invalid text remains available for correction
    Given a form with a quantity containing an invalid numeric entry
    When the person leaves the field
    Then the entry remains visible with a numeric validation message
    And the field cannot submit the invalid entry
```
