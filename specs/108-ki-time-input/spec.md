# TimeInput

Issue #388. `<ki-time-input>` collects a wall-clock time, supports locale-aware typing, and offers suggested slots. The issue allows this field and list to ship before the clock dial.

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S12, S13 | |
| Keyboard path | S3, S4 | |
| Assistive-tech outcome | S5 | |
| Form participation | S6, S7 | |
| Theming | S8 | |

## Interpretations

- Agent's choice, pending founder confirmation. Ship the editable field and suggestions in this PR. The dial prototype measured 14.41 kB marginal and 33.23 kB worst case against limits of 9 kB and 25 kB. The dial, including the `picker` prop, can follow once it fits both limits. S9–S11 are retired from this delivery.
- Agent's choice, pending founder confirmation. Use the nearest declared `lang`, falling back to the browser locale. Accept localized digits, separators and day periods, plus canonical `HH:mm` as a fallback. `time-zone` appends text to the help line and leaves wall-clock values in place.
- Agent's choice, pending founder confirmation. Slots start at `min` (or midnight), advance by integer `step`, and stop at inclusive `max` (or `23:59`). Invalid step falls back to 30. An invalid bound falls back to its day endpoint. Bounds constrain typed values. The default range is a single calendar day.
- Agent's choice, pending founder confirmation. Blur commits valid typed text, and Enter or a click commits a selected slot. `ki-change` and native `change` report a changed user commit.
- Agent's choice, pending founder confirmation. A2UI 0.9.1 and 1.0 map time-only inputs with a visible label. Date-enabled inputs retain the adapter's unsupported-variant fallback until DatePicker is available on the integration branch. Time values with seconds are reduced to minute precision.
- Agent's choice, pending founder confirmation. The suggestion popup uses the shared top-layer utilities and the CSS anchoring pattern from `ki-select`. Its theme tokens use the semantic palette from the Menu reference. Menu and Popover are absent from this checkout.

## Behavior contract

```gherkin
Feature: ki-time-input collects a local time of day
  People can type an exact time or choose a suggested slot.

  # S1
  Scenario: Typing preserves precise minutes
    Given an empty time field in US English with 30-minute suggestions
    When the person types "9:17 AM" and leaves the field
    Then the committed value is "09:17" and the suggestions remain closed

  # S2
  Scenario: Out-of-range input replaces help with an error after blur
    Given the field describes "Europe/Madrid" and accepts "08:00" through "18:00"
    And the person has typed "20:00"
    When the person leaves the field
    Then the configured error is visible in place of the help line

  # S3
  Scenario: The keyboard can select a suggested slot
    Given the person opened the suggestions with Arrow Down and highlighted "09:30" with the arrow keys
    When the person presses Enter
    Then the suggestions close and the field commits "09:30"

  # S4
  Scenario: Escape dismisses suggestions without replacing a draft
    Given the field contains the typed draft "09:17" and its suggestions are open
    When the person presses Escape
    Then the suggestions close and the typed draft remains available

  # S5
  Scenario: Assistive technology can distinguish the current time and focused option
    Given the time field is named "Start time" and its current value is "09:00"
    When the person opens its suggestions with Arrow Down
    Then the named combobox is expanded and controls the "Suggested times" listbox
    And "09:00" is selected and reported as the active option

  # S6
  Scenario: A form submits the canonical time
    Given a form has a field named "start" displaying "9:30 AM"
    When the person submits the form
    Then the form data contains "start" with value "09:30"

  # S7
  Scenario: Reset restores the declared time
    Given the time field default was "09:30" and the person selected "10:00"
    When the person resets the form
    Then the field and form data return to "09:30"

  # S8
  Scenario: The selected slot follows theme tokens
    Given the theme assigns a different background and foreground to selected slots
    When the person opens the suggestions
    Then the selected slot is visibly painted with the assigned colour pair

  # S12
  Scenario: A2UI time-only fields render as TimeInput
    Given A2UI describes a time-only input with value "09:30"
    When the surface is mapped
    Then it contains a labeled time field with canonical value "09:30"

  # S13
  Scenario: The picker button offers suggested slots
    Given a time field suggests "09:30" between "09:00" and "10:00"
    When the person uses Choose time to pick "09:30"
    Then the field commits "09:30" and closes the list
```
