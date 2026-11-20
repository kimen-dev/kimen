Feature: Rich tooltip and toggletip
  A short explanation can have a heading. When the explanation has actions,
  the user opens it deliberately and can move focus into it.

  # Family: core behavior
  # S1
  Scenario: Hover reveals a rich tooltip and the pointer can cross onto it
    Given a "Retention" button with a rich tooltip headed "Grace period"
    When the user hovers the button and moves onto the revealed tooltip
    Then the heading and its explanatory text stay visible

  # S2
  Scenario: Tooltip body content is text only
    Given a rich tooltip whose body includes text and an interactive link
    When its trigger receives focus
    Then the explanation is shown and the link is unavailable

  # S3
  Scenario: A rich toggletip opens by click
    Given a button for a rich toggletip with a "Learn more" action
    When the user clicks the button
    Then the panel opens and "Learn more" receives focus

  # S4
  Scenario: A rich toggletip closes by outside click
    Given an open rich toggletip
    When the user clicks another button outside it
    Then the panel closes and the other button keeps focus

  # Family: keyboard path
  # S5
  Scenario: Focusing the trigger reveals the rich tooltip
    Given the first focusable element is a button with a rich tooltip
    When the user presses Tab
    Then the rich tooltip appears and the trigger keeps focus

  # S6
  Scenario: Escape dismisses the rich tooltip
    Given a visible rich tooltip on a focused trigger
    When the user presses Escape
    Then the tooltip disappears and the trigger keeps focus

  # S7
  Scenario: Enter opens a rich toggletip and moves focus into it
    Given the trigger of a closed rich toggletip with a "Learn more" action has focus
    When the user presses Enter
    Then "Learn more" receives focus inside the open panel

  # S8
  Scenario: Escape returns focus from a rich toggletip
    Given the "Learn more" action in an open rich toggletip has focus
    When the user presses Escape
    Then the panel closes and focus returns to the trigger

  # Family: assistive-tech outcome
  # S9
  Scenario: A rich tooltip describes the trigger
    Given a "Retention" button with a rich tooltip headed "Grace period"
    When the trigger receives focus
    Then the accessibility tree exposes a tooltip and a button named "Retention"
    And the button's description includes the heading and the explanatory text

  # S10
  Scenario: A rich toggletip exposes a named non-modal dialog
    Given a rich toggletip labeled "About contrast mode" with a "Learn more" action
    When the user opens it
    Then the trigger is expanded and the named non-modal dialog exposes its action

  # Family: form participation — N/A (see spec.md)

  # Family: theming
  # S11
  Scenario: The two rich surfaces share their theme
    Given a theme with custom rich surface tokens
    When the rich tooltip and rich toggletip are shown
    Then both surfaces use the configured fill, ink, radius and width

  # S12
  Scenario: A rich tooltip honors forced colours and reduced motion
    Given a page requesting forced colours and reduced motion
    When the rich tooltip opens
    Then its boundary remains visible and it opens without animation

  # S13
  Scenario: Logical placements mirror in RTL
    Given rich overlays placed at inline-start in a right-to-left document
    When the overlays open
    Then they appear to the right of their triggers

  # S14
  Scenario: A coarse pointer gets the rich toggletip's larger inset
    Given a page with automatic density and a coarse pointer
    When the user taps the rich toggletip trigger
    Then the panel opens with the coarse-density inset
