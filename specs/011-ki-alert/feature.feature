Feature: Alert
  An alert keeps a person informed with a persistent inline message whose
  tone conveys urgency to eyes and assistive technology alike, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The alert presents its message with the tone's appearance
    Given an alert with tone "danger", an icon and the message "We could not save your changes"
    When the page renders
    Then the message is visible and its icon wears the danger tone appearance

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

  # Amendment A1 (decided 2026-11-19): the Alert master anatomy, icon and actions
  # Family: core behavior
  # S20
  Scenario: The alert paints its content as one flat card
    Given an onmars page with an info alert "Backup completed"
    When the page renders
    Then no frame shows around the card
    And the card has 12px of padding, 12px corners, a hairline edge and no elevation

  # S21
  Scenario: A slotted icon heads the card in a round 32px frame
    Given an onmars page with an alert holding an icon, the heading "Backup completed" and a message
    When the page renders
    Then the icon sits at the top of the card in a round 32px frame, above the heading
    And the heading starts 12px below the icon

  # S22
  Scenario: An alert without an icon reserves no space for one
    Given an onmars page with an alert holding the heading "Backup completed" and no icon
    When the page renders
    Then the heading starts at the top of the card, 12px from its edge

  # S23
  Scenario: Slotted actions sit in a row after the message
    Given an onmars page with an alert "Your session expires in one minute" holding the actions "Sign out" and "Stay signed in"
    When the page renders
    Then "Sign out" and "Stay signed in" are displayed in that order in one row at the bottom of the card
    And the row starts 12px below the message

  # S24
  Scenario: An alert without actions reserves no space for them
    Given an onmars page with an alert "Profile saved" holding no actions
    When the page renders
    Then the card ends 12px below the message

  # S25
  Scenario: Activating an action leaves the alert in place
    Given a dismissible alert holding the action "Retry"
    When the user activates the "Retry" action
    Then the alert is still displayed
    And the page observes no ki-dismiss event

  # S26
  Scenario Outline: Every tone keeps the same anatomy and wears its own colors
    Given an onmars page with a <tone> alert holding an icon, the heading "Heads up", a message and the action "Review"
    When the page renders
    Then the alert is laid out, and its heading, message and dismiss control look, as they do under the neutral tone
    And the card, its edge, the icon frame and its glyph take the <tone> tone's colors

    Examples:
      | tone    |
      | info    |
      | success |
      | warning |
      | danger  |

  # S35
  Scenario: Without an icon the heading leaves room for the dismiss control
    Given an onmars page with a dismissible alert holding no icon and a heading long enough to fill its line
    When the page renders
    Then the heading wraps before it reaches the dismiss control
    And no part of the heading sits under the dismiss control

  # Family: keyboard path
  # S27
  Scenario: Tab reaches the dismiss control and then the actions, in reading order
    Given a page whose first interactive element is a dismissible alert holding the actions "Sign out" and "Stay signed in"
    When the user tabs through the alert
    Then focus visits the dismiss control, "Sign out" and "Stay signed in", in that order

  # S28
  Scenario: Dismissing the alert from a focused action hands focus to the next element
    Given an alert whose focused action "Undo" makes the application dismiss it, placed before a button labeled "Save"
    When the user activates "Undo" from the keyboard
    Then the alert is no longer displayed
    And focus lands on the "Save" button
    And the page observes no ki-dismiss event

  # Family: assistive-tech outcome
  # S29
  Scenario: The icon is never part of the announcement
    Given a page where a payment fails
    When a danger alert appears holding an icon labeled "Error", the heading "Payment failed" and the message "Your card was declined"
    Then the alert's live region exposes only "Payment failed" and "Your card was declined"
    And the icon is hidden from assistive technology

  # S30
  Scenario: Actions are reachable buttons outside the announcement
    Given a page where the session is about to expire
    When a warning alert "Your session expires in one minute" appears holding the action "Stay signed in"
    Then the alert's live region exposes only "Your session expires in one minute"
    And a button named "Stay signed in" is exposed after the live region

  # Family: theming
  # S31
  Scenario: A theme flattens the shell and the card into one box through tokens alone
    Given a page whose theme gives the alert shell no padding, fill or blur and the card no elevation
    When the page renders
    Then the alert paints as one box with the card's corners and no frame around it

  # S32
  Scenario: Icon, dismiss control and actions follow a right-to-left document
    Given a right-to-left document with a dismissible alert holding an icon and the actions "Sign out" and "Stay signed in"
    When the page renders
    Then the icon sits at the top right of the card and the dismiss control in its top left corner
    And "Sign out" is the rightmost action

  # S33
  Scenario: Under forced colors the alert keeps its edge and a visible icon
    Given forced colors are active and an info alert holding an icon drawn in the current text color and the action "Review"
    When the page renders
    Then the alert's outer edge is drawn in the forced text color
    And the icon is painted in the forced text color

  # S34
  Scenario: Reduced transparency makes the shell opaque and keeps the card's elevation
    Given an onmars dark page with an info alert holding an icon, under a theme that raises the card
    When the page renders under a "reduce" transparency system preference
    Then the shell and the card paint opaque surfaces without blurring what is behind them
    And the card keeps the elevation its theme gives it

  # Amendment A2 (decided 2026-11-20): the tone on the card, and a glyph per tone
  # Family: core behavior
  # S36
  Scenario Outline: A non-neutral alert without an icon draws its tone's glyph
    Given a <tone> alert holding the heading "Heads up" and no icon
    When the page renders
    Then the icon frame shows the "<glyph>" glyph in the <tone> tone's colors
    And the glyph is hidden from assistive technology

    Examples:
      | tone    | glyph          |
      | info    | info           |
      | success | circle-check   |
      | warning | triangle-alert |
      | danger  | octagon-alert  |

  # S37
  Scenario: A slotted icon replaces the tone's glyph
    Given a danger alert holding its own icon and the heading "Payment failed"
    When the page renders
    Then the icon frame shows the slotted icon and no other glyph
