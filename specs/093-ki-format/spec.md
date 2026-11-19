# Format values for display

**Issue** #386 · **Branch** `feat/386-ki-format`

A generated timeline, table, or stat can pass an ISO date or a raw number
to a formatter and display it in the locale of the surrounding content.
The three formatters are passive inline text and use the platform's Intl data.

## Scenario Family Coverage

| Family | Scenarios | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S6, S7 | |
| Keyboard path | S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | | Display-only elements with no input, name, validation, or submission value. |
| Theming | S11 | |

## Interpretations

Each decision below is an agent's choice, pending founder confirmation.

- **Number option.** Use `format-style` / `formatStyle` for decimal, percent
  and unit. HTML reserves `style` for inline CSS, and the catalog rejects it.
  A supplied currency selects currency formatting when format style is omitted.
- **Date inputs.** Accept ISO calendar dates and ISO date-times. Calendar dates
  retain their day in every zone. Offsetless date-times use local time. Date-only
  formatting defaults to a medium date when neither style is set. Invalid inputs
  or incompatible options produce an empty result. An invalid locale falls back
  to the platform locale. Formatters resolve the language on each render.
  The date formatter maps its typed `locale` property to the native `lang`
  attribute.
- **Relative wording.** Default to `numeric="auto"` and a static render. Select
  the largest elapsed unit and truncate toward zero. Units span seconds through
  years, using fixed durations of 7, 30 and 365 days for weeks, months and years.
  `threshold` is a nonnegative number of seconds in either direction, inclusive
  at the cutoff, with no cutoff by default. The absolute timestamp uses a medium
  date and short time in the reader's locale. A synchronized value updates at
  formatting boundaries and stops scheduling work when disconnected.
- **Markup and styling.** Dates use native `time` elements. Numbers use inline
  text with tabular figures, as in the reference preview. The visible relative
  wording has a stable, visually hidden absolute timestamp for assistive
  technology. All three use semantic body-font aliases for bare pages
  and inherit surrounding color, size, line height and direction.
- **Source layout.** Scaffold each shipped tag in its discovery directory, as
  with Layout, and use one shared Format token pair and overview page.
- **API declaration.** The public API gate classifies the expanded Stencil loader
  `Components` and `JSX` namespaces as major, as for the Layout components.
  Declare the change at that level.
- **MCP server budget.** The three catalog entries and their renderer assets
  add 13,578 raw bytes and 3,978 gzip bytes to the built server. Record their
  measured joint allowance on the date formatter's discovery entry.

## Gherkin contract

```gherkin
Feature: Format raw dates, numbers and relative times
  A generated surface displays values in the reader's language using native formatting.

  # S1
  Scenario: A date uses the nearest language and keeps its calendar day
    Given a Spanish section inside an English page
    When the surface displays the long date for 2026-11-19
    Then the date reads "19 de noviembre de 2026"

  # S2
  Scenario: An explicitly localized timestamp respects the requested time zone
    Given an English section and a timestamp of 2026-11-19T23:41:00Z
    When the surface displays the timestamp in Spanish and in Europe/Madrid
    Then it shows November 20 at 00:41 in Spanish

  # S3
  Scenario: Number formats use the requested options and locale
    Given a Spanish section
    When the surface displays decimal, currency, percent, unit and compact values
    Then each value uses Spanish number conventions and its requested precision

  # S4
  Scenario: Relative time offers automatic and always-numeric wording
    Given a timestamp one day before the current time
    When the surface displays it with automatic and always-numeric wording
    Then the English values read "yesterday" and "1 day ago"

  # S5
  Scenario: Synchronized text changes to an absolute date at its threshold
    Given a synchronized timestamp that is 59 seconds old with a 60-second threshold
    When the clock advances to 60 seconds past the timestamp
    Then the value displays the absolute date

  # S6
  Scenario: A static relative time keeps its initial wording
    Given a relative timestamp one minute old with synchronization disabled
    When another minute passes
    Then the value still reads "1 minute ago"

  # S7
  Scenario: Unavailable values leave the surface empty
    Given an impossible ISO date and a non-finite number
    When the surface displays those values
    Then the unavailable values produce no text

  # S8
  Scenario: Format values preserve the page's keyboard order
    Given a date, a number and a relative time between two focused-by-Tab controls
    When the user tabs from the first control
    Then focus moves directly to the second control

  # S9
  Scenario: A formatted date exposes its machine-readable date
    Given a surface with the raw calendar date 2026-11-19
    When the surface displays the localized date
    Then it exposes a native time element with the machine-readable date 2026-11-19

  # S10
  Scenario: The relative value exposes its absolute date without a live announcement
    Given a timestamp whose relative wording updates as time passes
    When the surface displays the relative timestamp
    Then its tooltip and assistive text expose the absolute timestamp
    And the value has no live announcement

  # S11
  Scenario: Format values inherit surrounding text styling in right-to-left content
    Given a right-to-left themed section with its own text color and size
    When the surface displays a date, a number and a relative time
    Then the values inherit the text color, size and direction
    And the number uses tabular figures
```
