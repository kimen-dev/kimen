# TimeInput

Issue #388. `<ki-time-input>` collects a wall-clock time, supports locale-aware typing, and offers suggested slots. The dial supplements typing on touch layouts.

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S11, S12 | |
| Keyboard path | S3, S4, S9 | |
| Assistive-tech outcome | S5, S10 | |
| Form participation | S6, S7 | |
| Theming | S8 | |

## Interpretations

- Agent's choice, pending founder confirmation. Honor the issue's explicit dial acceptance criteria in this branch. The clock trigger opens a dialog on primary coarse-pointer layouts when `picker="dial"`. Fine-pointer layouts use the list. Arrow Down on the editable field opens the list in both layouts.
- Agent's choice, pending founder confirmation. Use the nearest declared `lang`, falling back to the browser locale. Accept localized digits, separators and day periods, plus canonical `HH:mm` as a fallback. `time-zone` appends text to the help line and leaves wall-clock values in place.
- Agent's choice, pending founder confirmation. Slots start at `min` (or midnight), advance by integer `step`, and stop at inclusive `max` (or `23:59`). Invalid step falls back to 30. Bounds constrain typed and dial values. The default range is a single calendar day.
- Agent's choice, pending founder confirmation. Blur commits valid typed text, Enter commits a selected slot, and Apply commits the dialog draft. Cancel and Escape dismiss the dialog without a commit. The clock presents hour and minute faces, with five-minute pointers on the minute face and full precision in its spinbutton. `ki-change` reports a committed value that changed.
- Agent's choice, pending founder confirmation. A2UI 0.9.1 and 1.0 map time-only inputs. Date-enabled inputs retain the adapter's unsupported-variant fallback until DatePicker is available on the integration branch. Time values with seconds are reduced to minute precision.

## Behavior contract

```gherkin
Feature: ki-time-input collects a local time of day
  People can type an exact time, choose a suggested slot, or use a clock on touch layouts.

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

  # S9
  Scenario: The clock dial can be used entirely by keyboard
    Given a touch layout clock dialog has hour and minute spinbuttons adjusted by keyboard to "09:31"
    When the person activates Apply with the keyboard
    Then the dialog closes and the field commits "09:31"

  # S10
  Scenario Outline: The clock announces its localized draft time
    Given the clock dialog is open with time "09:30" in <locale>
    When the person increments the minute spinbutton
    Then a polite status announces <announcement> and the clock reflects the new minute

    Examples:
      | locale | announcement |
      | en-US  | 9:31 AM      |
      | en-GB  | 09:31        |

  # S11
  Scenario: Desktop layouts use the list even when the dial is requested
    Given a fine-pointer time field is configured with the dial picker
    When the person activates Choose time
    Then the suggested times list opens

  # S12
  Scenario: A2UI time-only fields render as TimeInput
    Given A2UI describes a time-only input with value "09:30"
    When the surface is mapped
    Then it contains a labeled time field with canonical value "09:30"
```
