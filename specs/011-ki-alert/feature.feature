Feature: Alert
  An alert keeps a person informed with a persistent inline message whose
  tone conveys urgency to eyes and assistive technology alike, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The alert presents its message with the tone's appearance
    Given an alert with tone "danger" and the message "We could not save your changes"
    When the page renders
    Then the message is visible with the danger tone appearance

  # S2
  Scenario: An optional heading introduces the message
    Given an alert with the heading "Update available" and a message body
    When the page renders
    Then the heading "Update available" is displayed before the message
    And the heading is not exposed as a document heading

  # S3
  Scenario: Dismissing the alert removes it and notifies the page
    Given a dismissible alert with the message "Backup completed"
    When the user activates the dismiss control
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S4
  Scenario: A non-dismissible alert offers no dismiss control
    Given an alert that is not dismissible
    When the page renders
    Then no dismiss control is present

  # S5
  Scenario: Unknown tone values fall back to the default
    Given an alert declared with an unrecognized tone value
    When the page renders
    Then the alert renders with the neutral tone appearance

  # S19
  Scenario: Clearing the dismissed state shows the alert again
    Given a dismissed alert that remains on the page
    When the page clears the alert's dismissed state
    Then the alert is displayed again with its message

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches the dismiss control with visible focus
    Given a page whose first interactive element is a dismissible alert
    When the user presses Tab
    Then the dismiss control is focused and its focus indication is visible

  # S7
  Scenario: The keyboard dismisses the focused alert
    Given a dismissible alert whose dismiss control is focused
    When the user activates it from the keyboard
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S8
  Scenario: A non-dismissible alert adds no tab stop
    Given a non-dismissible alert placed before a button labeled "Save"
    When the user presses Tab
    Then focus lands on the "Save" button

  # S16
  Scenario: Keyboard dismissal hands focus to the next focusable element
    Given a dismissible alert whose dismiss control is focused, placed before a button labeled "Save"
    When the user activates the dismiss control from the keyboard
    Then focus lands on the "Save" button
    And focus is not left inside the dismissed alert

  # Family: assistive-tech outcome
  # S9
  Scenario: An urgent alert is exposed assertively without moving focus
    Given a page where saving preferences fails
    When a danger alert "We could not save your changes" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S10
  Scenario: A calm alert is exposed as a polite status update
    Given a page where the profile was saved
    When a success alert "Profile saved" appears
    Then the alert is exposed to assistive technology with status (polite) semantics
    And focus stays where it was

  # S17
  Scenario: A warning alert is exposed with urgent semantics
    Given a page where the session is about to expire
    When a warning alert "Your session expires in one minute" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S18
  Scenario Outline: Calm tones are exposed as polite status updates
    Given a page publishing a service notice
    When a <tone> alert "Maintenance starts at midnight" appears
    Then the alert is exposed to assistive technology with status (polite) semantics

    Examples:
      | tone    |
      | info    |
      | neutral |

  # S11
  Scenario: The dismiss control is exposed as a named button
    Given a dismissible alert using the default dismiss label
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Dismiss"

  # S12
  Scenario: The dismiss label is overridable for localization
    Given a dismissible alert whose dismiss label is set to "Descartar"
    When the accessibility tree is queried
    Then the dismiss control's accessible name is "Descartar"

  # Family: form participation — N/A, justified in spec.md (ki-alert is not a form control)

  # Family: theming
  # S13
  Scenario: A second theme restyles the alert through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the alert's appearance resolves from material3 token values

  # S14
  Scenario: The alert honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the alert's appearance resolves from the dark token values

  # S15
  Scenario: Alert content follows the document's writing direction
    Given a right-to-left document with a dismissible alert
    When the page renders
    Then the message leads and the dismiss control trails the writing direction
