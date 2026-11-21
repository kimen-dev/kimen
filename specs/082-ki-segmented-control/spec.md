# Feature specification for ki-segmented-control

**Branch** `feat/381-ki-segmented-control` · **Created** 2026-11-19 · **Issue** [#381](https://github.com/kimen-dev/kimen/issues/381)

People can choose a range, view mode or other setting that takes effect in place. The control presents two to five options and applies one choice at a time.

## Gherkin scenarios

```gherkin
Feature: Segmented control applies one in-place choice

  # S1
  Scenario: Use the first available option by default
    Given Range offers unavailable Day and available Week and Month with no requested value
    When the control appears
    Then Week is the sole selected option

  # S2
  Scenario: Apply a pointer choice once
    Given Range has Week selected
    When the user clicks Month
    Then Month is the sole selected option
    And one change event reports "month"

  # S3
  Scenario: Enter the group at the selection
    Given Range has Week selected between two focusable controls
    When the user tabs into Range
    Then focus lands on Week
    And no change event occurs

  # S4
  Scenario: Move focus and select with the arrows
    Given Week is focused and selected with unavailable Month next and Day available at the start
    When the user presses ArrowRight
    Then focus wraps to Day and selects it
    And one change event reports "day"

  # S5
  Scenario: Name an icon-only choice
    Given View offers a text option and an icon-only option named "Board"
    When the icon-only option receives focus
    Then assistive technology exposes a radio named "Board" in the radiogroup named "View"
    And the tooltip shows "Board"

  # S6
  Scenario: Keep in-place choices out of form data
    Given a form contains a selected range and a named query field
    When form data is collected
    Then it contains the query field alone

  # S7
  Scenario: Style selection through the component theme
    Given the theme overrides the selected surface, ink and elevation
    When Range displays Week as selected
    Then Week uses the overridden surface, ink and elevation

  # S8
  Scenario: Preserve a selection indicator in forced colours
    Given the display uses forced colours
    When Range displays Week as selected
    Then Week has a Highlight border that the other options lack

  # S9
  Scenario: Keep changes free of motion with reduced motion
    Given the display requests reduced motion and Range has Week selected
    When the user clicks Month
    Then Month shows its selection without an animation or transition

  # S10
  Scenario: Follow reading direction for horizontal navigation
    Given Week is focused and selected in a right-to-left Range
    When the user presses ArrowRight
    Then focus moves to Day and selects it

  # S11
  Scenario: Enlarge the dense option on a coarse pointer
    Given the display has a coarse pointer and a region opts into touch density
    When an extra-small control is displayed
    Then each option has a touch target at least 44 by 44 CSS pixels

  # S12
  Scenario: Share the width across the options
    Given an available row contains a full-width View control
    When a short and a long option are displayed
    Then both options occupy equal widths and the control fills the row

  # S13
  Scenario: Update the selected value through the public property
    Given Range has Week selected
    When the page changes the Range value to "month"
    Then Month is the sole selected option
    And no change event occurs

  # S14
  Scenario: Recover when the selected option is disabled
    Given Range has Week selected and Day is available
    When Week becomes disabled
    Then Day is the sole selected option and the group tab stop
    And no change event occurs
```

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S12, S13, S14, S15 |
| Keyboard path | S3, S4, S10 |
| Assistive-tech outcome | S5 |
| Form participation | S6 |
| Theming | S7, S8, S9, S11 |

## Requirements

- Supply a group label and two to five direct `ki-segment` children with distinct nonempty values. Give each segment visible text or an accessible name with `aria-label`. A leading icon belongs in the `start` slot.
- The selected option owns the single tab stop. Arrow keys move focus and select with wrapping. Space and Enter activate the focused option. Activation of the current option is silent.
- Selection applies immediately. `ki-change` bubbles and carries the resolved string in `detail.value`. Programmatic changes and fallback selection are silent.
- The three track sizes default to 28, 32 and 40 CSS pixels. Full width shares the row equally. A label wider than its share wraps onto a second line, the options keep one height, and only text that needs a third line ends with an ellipsis. A selected option changes surface, ink and elevation together. Forced colours use a Highlight border.
- Token-backed surfaces accept solid colour, image and backdrop filter overrides. Validate text pairs in both themes and schemes across standard, contrast-more and reduced-transparency modes. Capture the onmars and Material 3 galleries in both schemes.
- Ship both elements in the catalog and generated framework wrappers. Authors use tabs for panel navigation, a radio group for submitted form values and a select for longer lists.

## Decisions

- **Agent's choice, pending founder confirmation.** The first enabled option is the fallback for omitted, missing or disabled values. A nonempty value that has no matching option is retained as a request for asynchronously supplied children until another request or user selection replaces it. Blank or later duplicate child values are unavailable. An empty or all-unavailable set has no selection or tab stop. The two-to-five range is authoring guidance.
- **Agent's choice, pending founder confirmation.** Horizontal arrows follow writing direction and vertical arrows keep document order. Space and Enter use native button activation. Built-in tooltip display is for enabled, icon-only segments with a supplied accessible name.
- **Agent's choice, pending founder confirmation.** Apply Kimen's 44px touch density floor to the inner target in an opt-in touch region. A coarse pointer alone preserves the specified track size. Keep the selection change instantaneous and let the shipped tooltip handle its own motion preference.
- **Agent's choice, pending founder confirmation.** Use `item-bg` with `item-fg` for the unselected text pair. Its default matches the track surface. Supporting ink preserves the reference's medium emphasis in standard mode and strengthens it in contrast-more. Use the reference's scheme-specific selected surface and add a high-contrast selected border where the fill and elevation offer a subtle difference.

- **Agent's choice, pending founder confirmation.** Keep the shared `ki-tooltip` independently registered for icon-only usage. The all-elements loader already registers it. With direct element imports or framework wrappers, register it alongside the control before mounting the icon-only option.
- **Agent's choice, pending founder confirmation.** The API declaration uses major because the existing comparator classifies the generated loader's `Components` and `JSX` namespace additions as major.
