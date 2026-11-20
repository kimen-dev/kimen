# Feature specification for ki-rating

**Branch** `feat/412-ki-rating` · **Issue** [#412](https://github.com/kimen-dev/kimen/issues/412)

Rating presents an average or collects a score on a small scale. It fits answer feedback, reviews and satisfaction prompts. Use MessageActions for yes/no feedback.

## Gherkin scenarios

```gherkin
Feature: Rating displays a score or collects a choice on a small scale

  # S1
  Scenario: Show the score with half-step artwork
    Given an average rating of 4.3 out of 5
    When the read-only rating appears
    Then the visible score reads "4.3"
    And the artwork shows four and a half filled stars

  # S2
  Scenario: Choose a whole-star rating
    Given Usefulness has no selection and offers five stars
    When the person selects three stars
    Then three stars fill and the visible score reads "3 of 5"
    And one change event reports 3

  # S3
  Scenario: Choose a half-star rating
    Given Usefulness offers half-star steps
    When the person selects the first half of the third star
    Then two and a half stars fill and the visible score reads "2.5 of 5"
    And one change event reports 2.5

  # S4
  Scenario: Enter at the selected radio
    Given Usefulness has three stars selected
    When the person tabs into the rating
    Then focus lands on the radio for three stars
    And the value stays the same

  # S5
  Scenario: Wrap forward with the arrow keys
    Given the focused rating is at five of five stars
    When the person presses ArrowRight
    Then focus moves to one star and selects it
    And one change event reports 1

  # S6
  Scenario: Select the focused option with Space
    Given focus is on the first radio of an unrated score
    When the person presses Space
    Then one star is selected and one change event reports 1

  # S7
  Scenario: Move visually right in right-to-left content
    Given three stars are focused in a right-to-left rating
    When the person presses ArrowRight
    Then focus moves to two stars and selects them

  # S8
  Scenario: Describe a read-only score with one image
    Given an average rating of 4.2 out of 5
    When assistive technology reads the rating
    Then it finds one image named "Rated 4.2 out of 5"

  # S9
  Scenario: Expose the group and its selected choice
    Given Usefulness has three stars selected
    When assistive technology reads the rating
    Then it finds a radiogroup named "Usefulness"
    And its radio named "3 stars" is checked

  # S10
  Scenario: Submit the selected score under the field name
    Given a form contains the field "usefulness" with a selected rating of 2.5
    When the person submits the form
    Then the submitted data contains one "usefulness" value of "2.5"

  # S11
  Scenario: Require a choice before submitting
    Given a required rating has no selection
    When the person attempts to submit its form
    Then the form reports that a rating is required

  # S12
  Scenario: Restore the initial score on reset
    Given Usefulness started at two stars and now has four stars selected
    When the person resets its form
    Then the checked choice and submitted value return to two stars

  # S13
  Scenario: Skip a rating in a disabled fieldset
    Given Usefulness has three stars selected in a disabled fieldset
    When the person tabs forward from before the rating
    Then focus skips the rating
    And the form data omits Usefulness

  # S14
  Scenario: Use the theme's filled and empty colours
    Given a theme overrides the rating's filled and empty colours
    When a three-star score is displayed on a five-star scale
    Then the filled and empty glyphs use the respective overrides

  # S15
  Scenario: Preserve filled and empty shapes in forced colours
    Given the display uses forced colours
    When a three-star score is displayed on a five-star scale
    Then filled and outlined glyphs remain distinguishable

  # S16
  Scenario: Change the score without motion
    Given the display requests reduced motion and two stars are selected
    When the person selects three stars
    Then the artwork updates without animation or transition

  # S17
  Scenario: Enlarge touch targets in a touch-density region
    Given a coarse pointer and a whole-star rating in a touch-density region
    When the rating appears
    Then every choice has a target at least 44 by 44 CSS pixels
```

| Family | Scenarios |
| --- | --- |
| Core behavior | S1–S3 |
| Keyboard path | S4–S7 |
| Assistive-tech outcome | S8–S9 |
| Form participation | S10–S13 |
| Theming | S14–S17 |

## Requirements

- Provide a `label` and a score scale with `value` defaulting to 0 and `max` defaulting to 5. Show the actual read-only value in text and round only its artwork to the nearest half.
- Give every input step a named radio choice. Show the selected score in text and with filled glyphs. Emit one bubbling, composed `ki-change` carrying `{ value }` per changed user choice.
- Participate in forms through ElementInternals. Support `name`, `required`, `disabled`, reset and browser restoration. Keep programmatic and form-driven changes silent.
- Use the registered Lucide star by default and accept a registered alternative. Use theme tokens and exercise both themes in both schemes.
- Register the leaf component with the catalog and generated framework wrappers.

## Decisions

- **Agent's choice, pending founder confirmation.** The scale accepts up to 10 glyphs to keep declarative surfaces and their radio groups bounded. Fractional maxima round down, nonfinite maxima fall back to 5 and the minimum is 1. Scores clamp to scale and editable values round to the nearest allowed step. The catalog supports numeric props. Expose precision as a number and use half steps only for 0.5.
- **Agent's choice, pending founder confirmation.** Zero means unselected. An optional unrated or read-only score contributes no field data. A required editable score needs a positive selection. Re-selecting the current option keeps it and emits no event.
- **Agent's choice, pending founder confirmation.** Horizontal arrows follow reading direction, vertical arrows follow score order, and arrows wrap. Tab enters on the selected or first choice. Half steps use two targets per glyph in reading order.
- **Agent's choice, pending founder confirmation.** Read-only uses the supplied context label as the image description. Overridable text patterns name the image, singular and plural choices, input score and required error. An unavailable custom icon falls back to the star.
- **Agent's choice, pending founder confirmation.** Changes are instantaneous. Whole-star targets start at 32 CSS pixels, half-star targets start at 24 CSS pixels wide, and the Kimen touch density minimum applies to every choice. Glyph groups can wrap as space narrows.

- **Agent's choice, pending founder confirmation.** Declare the API change as major because the protected API comparator classifies additions to the generated loader namespaces that way.
