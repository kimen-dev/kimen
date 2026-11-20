# Feature specification for ki-timeline

**Branch** `feat/410-ki-timeline` · **Created** 2026-11-20 · **Issue** #410

Timeline presents dated activity, audit entries and run history in reading order. Each event has its own summary, decorative marker and optional expandable details.

## Gherkin scenarios

```gherkin
Feature: Timeline presents a chronological activity history

  # S1
  Scenario: Show the newest dated events first by default
    Given Activity contains events in mixed date order, including matching dates and an undated event
    When the timeline appears
    Then the dated events run from newest to oldest
    And matching dates retain their source order and the undated event follows

  # S2
  Scenario: Switch an existing feed to oldest first
    Given Activity shows Deploy after Review in chronological time
    When the page sets the display order to oldest-first
    Then Review appears before Deploy in the list

  # S3
  Scenario: Display recent and older event times
    Given Activity contains an event from minutes ago, an older event and an invalid date
    When the timeline appears
    Then the recent time is relative and the older time is absolute
    And both expose their original dates as machine-readable times
    And the invalid date displays no time

  # S4
  Scenario: Replace a decorative marker icon with an avatar
    Given an event specifies a marker icon and a decorative avatar
    When the event appears
    Then the avatar fills the marker in place of the icon

  # S5
  Scenario Outline: Open event details from the keyboard
    Given the closed event details control has received focus by Tab
    When the user presses <key>
    Then the event details become available

    Examples:
      | key   |
      | Space |
      | Enter |

  # S6
  Scenario: Expose a named ordered list with a text failure message
    Given Activity contains the message "Deploy to preview failed" and a danger icon
    When assistive technology explores the timeline
    Then it encounters a list named "Activity" containing the failure message
    And the marker icon is decorative

  # S7
  Scenario: Announce a batch of incoming events once
    Given Activity is showing its initial history without a live announcement
    When two new events arrive together
    Then a polite live region announces the two new event summaries in one update

  # S8
  Scenario: Restyle the marker, connector and timestamp through tokens
    Given a theme overrides the marker fill, connector and timestamp colour
    When Activity appears
    Then the three surfaces use those colours

  # S9
  Scenario: Preserve the marker and connector in forced colours
    Given Activity has multiple events and uses forced colours
    When the timeline appears
    Then the marker outline and connector remain visible

  # S10
  Scenario: Reveal details immediately with reduced motion
    Given Activity has closed event details and the user requests reduced motion
    When the user opens the event details
    Then the details appear without motion

  # S11
  Scenario: Place markers at the reading start in RTL
    Given Activity is right-to-left
    When the timeline appears
    Then the markers and connector are on the right of the event summaries

  # S12
  Scenario: Provide a touch-sized details target with coarse input
    Given Activity is in a touch-density region on a coarse pointer
    When an event with details appears
    Then its details control is at least 44 by 44 CSS pixels
```

## Scenario family coverage

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S3, S4 |
| Keyboard | S5 |
| Assistive technology | S6, S7 |
| Form participation | N/A. Timeline reports activity and its disclosure holds no form value. |
| Theming and input modes | S8, S9, S10, S11, S12 |

## Interpretations pending founder confirmation

- Agent's choice, pending founder confirmation. Sort direct timeline item children by timestamp, keep source order for matching timestamps, and place invalid or missing dates at the end. Valid date edits reorder the entries.
- Agent's choice, pending founder confirmation. The branch has no Format elements. Use native internationalization in the item while keeping its real time element. Past events less than 24 hours old use relative minutes or hours, then switch to an absolute date and time. Date-only values use the local calendar date and stay absolute. Future dates are absolute, and invalid dates omit the timestamp.
- Agent's choice, pending founder confirmation. The optional details slot uses a collapsed native disclosure with a localizable `details-label` prop defaulting to “Details”. The event summary stays outside the disclosure so it can contain links. The start slot provides a decorative marker replacement.
- Agent's choice, pending founder confirmation. After the initial history renders, coalesce newly inserted items for 200 ms and announce their event summaries in display order in a polite atomic region. A change of order or timestamp alone leaves that region unchanged.
- Agent's choice, pending founder confirmation. Catalog entries expose both tags. Disclosure is local UI and emits no surface action.
