Feature: Reasoning keeps the assistant's plan available on demand

  # S1
  Scenario: Keep the plan collapsed while the assistant is thinking
    Given a reasoning disclosure contains an initial step
    When the disclosure appears with default settings
    Then its summary reads "Thinking…" and the step is hidden

  # S2
  Scenario: Display new steps while the thinking disclosure is open
    Given an open reasoning disclosure is showing the assistant's first step
    When the assistant adds a second step
    Then both steps are visible in order and the summary reads "Thinking…"

  # S3
  Scenario: Show elapsed time when the assistant finishes
    Given the assistant has been thinking for 12000 milliseconds in an open disclosure
    When the assistant finishes
    Then the summary reads "Thought for 12 seconds" and the steps remain visible

  # S4
  Scenario: Let the application control visibility
    Given a completed reasoning disclosure is closed
    When the page opens it
    Then its steps become visible

  # S5
  Scenario: Toggle the disclosure with the keyboard
    Given the closed reasoning summary has keyboard focus
    When the user presses Enter
    Then the steps become visible, the summary retains focus, and the disclosure reports that it opened

  # S6
  Scenario: Announce completion with the disclosure closed
    Given a closed reasoning disclosure is showing "Thinking…"
    When the assistant finishes without an elapsed time
    Then "Thought" is announced once and the steps stay hidden
    And the disclosure is named "Thought" and reports that it is collapsed

  # S7
  Scenario: Display application-supplied summary wording
    Given a completed reasoning disclosure has a one-second duration and a localized one-second label
    When the disclosure appears
    Then the summary uses the localized label with the elapsed seconds

  # S8
  Scenario: Apply the theme to the summary and step rule
    Given the theme overrides the reasoning foreground, surface and rule colors
    When an open reasoning disclosure is displayed
    Then the summary and steps use the supplied colors

  # S9
  Scenario: Keep thinking text readable with reduced motion
    Given the display requests reduced motion
    When a thinking disclosure is displayed
    Then "Thinking…" is readable and still

  # S10
  Scenario: Keep the summary and rule visible in forced colors
    Given the display uses forced colors
    When an open thinking disclosure is displayed
    Then the summary and the step rule are visible in system colors

  # S11
  Scenario: Follow the reading direction of the page
    Given the page reads right to left
    When an open reasoning disclosure shows its steps
    Then the step rule is at the right edge of the content

  # S12
  Scenario: Provide a larger summary target on a coarse pointer
    Given a touch-density region is viewed with a coarse pointer
    When a reasoning disclosure is displayed
    Then the summary target is at least 44 by 44 CSS pixels
