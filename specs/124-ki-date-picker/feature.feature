Feature: ki-date-picker selects a date or date range
  A booking field accepts a calendar selection or a date typed in the page locale.

  # S1
  Scenario: A single selection commits an ISO date
    Given the Departure calendar is open in November 2026
    When the user selects 20 November 2026
    Then the calendar closes and the field reports "2026-11-20" once

  # S2
  Scenario: A range waits for its second endpoint
    Given the Stay calendar has a provisional start of 12 November 2026
    When the user selects 16 November 2026
    Then the calendar closes and the field reports "2026-11-12/2026-11-16" once

  # S3
  Scenario: Apply commits a staged selection
    Given the Stay calendar requires confirmation and has a complete draft range
    When the user applies the draft
    Then the calendar closes and the field reports the draft range once

  # S4
  Scenario: Cancel discards a staged selection
    Given the Departure calendar has a draft of 20 November and a saved date of 12 November 2026
    When the user cancels
    Then the calendar closes and the field keeps "2026-11-12" without reporting a change

  # S5
  Scenario: Typed dates follow the locale
    Given an empty Departure field on an en-GB page
    When the user commits "20/11/2026"
    Then the field reports "2026-11-20" once

  # S6
  Scenario Outline: Grid navigation moves calendar focus
    Given the calendar starts on Thursday 12 November 2026 with a Monday week start
    When the user presses <key>
    Then calendar focus moves to <date>

    Examples:
      | key                | date                  |
      | ArrowLeft          | 11 November 2026      |
      | ArrowRight         | 13 November 2026      |
      | ArrowUp            | 5 November 2026       |
      | ArrowDown          | 19 November 2026      |
      | Home               | 9 November 2026       |
      | End                | 15 November 2026      |
      | PageUp             | 12 October 2026       |
      | PageDown           | 12 December 2026      |
      | Shift+PageUp       | 12 November 2025      |
      | Shift+PageDown     | 12 November 2027      |

  # S7
  Scenario: Boundaries keep unavailable days out of keyboard navigation
    Given the minimum date of 12 November 2026 is focused
    When the user presses Home
    Then focus stays on 12 November and 11 November is exposed as disabled

  # S8
  Scenario Outline: Keyboard activation commits a date
    Given the Departure calendar is open with focus on 20 November 2026
    When the user presses <key>
    Then the calendar closes and the field reports "2026-11-20"

    Examples:
      | key   |
      | Enter |
      | Space |

  # S9
  Scenario: Escape closes and returns focus to the text field
    Given the calendar is open and a day has focus
    When the user presses Escape
    Then the calendar closes and focus returns to the text field

  # S10
  Scenario: The calendar exposes its structure and date state
    Given a Departure field with 12 November 2026 saved
    When the user opens the calendar
    Then the expanded trigger controls a named non-modal dialog with a calendar grid
    And the month is announced politely
    And one fully named day is tabbable and exposed as selected

  # S11
  Scenario: A week-start override reorders weekday headings
    Given an en-GB Departure field with Sunday as its first weekday
    When the user opens the calendar
    Then the first weekday heading has the accessible name "Sunday"

  # S12
  Scenario: A submitted range is represented as one ISO value
    Given the Stay field in a form is named "stay" with the saved range 12 through 16 November 2026
    When the user submits the form
    Then its data contains "stay" with value "2026-11-12/2026-11-16"

  # S13
  Scenario: Invalid dates block submission
    Given a required Departure field contains "31/02/2026"
    When the user tries to submit the form
    Then the form is invalid and the field exposes its error

  # S14
  Scenario: Reset restores the initial value
    Given the initial Departure date was 12 November and the saved date is now 20 November 2026
    When the user resets the form
    Then the field restores "2026-11-12"

  # S15
  Scenario: The popup follows the raised surface semantic token
    Given the page reassigns the raised surface color
    When the user opens the calendar
    Then the popup paints the reassigned color

  # S16
  Scenario: RTL arrows follow the visual grid
    Given an RTL calendar with focus on 12 November 2026
    When the user presses ArrowLeft
    Then focus moves to 13 November 2026

  # S17
  Scenario: A forced color palette preserves the today indicator
    Given a high-contrast palette and today's calendar month
    When the user opens the calendar
    Then today has a visible border and is exposed as the current date

  # S18
  Scenario: The calendar works with reduced motion
    Given a user who requests reduced motion
    When the user opens the calendar
    Then the focused day is visible without an animation

  # S19
  Scenario: Calendar days honor coarse-pointer density
    Given a touch-density calendar on a coarse-pointer device
    When the user opens the calendar
    Then the day targets are at least 44 CSS pixels in both dimensions
