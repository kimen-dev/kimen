Feature: Dialog
  A modal dialog interrupts the page for one focused decision, holds the
  person's attention until it is resolved, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Opening the dialog presents it above an inert page
    Given a page with a "Delete account" button that opens a confirmation dialog
    When the user activates the button
    Then the dialog appears above the page and the content behind it is inert

  # S2
  Scenario: A footer action dismisses the dialog
    Given an open dialog whose footer holds a "Cancel" action wired to close it
    When the user activates "Cancel"
    Then the dialog closes and a ki-close event reports a programmatic dismissal

  # S3
  Scenario: Clicking the backdrop does not close the dialog by default
    Given an open dialog without backdrop dismissal enabled
    When the user clicks the backdrop behind the dialog
    Then the dialog stays open

  # S4
  Scenario: Opt-in backdrop dismissal closes the dialog
    Given an open dialog with backdrop dismissal enabled
    When the user clicks the backdrop behind the dialog
    Then the dialog closes and a ki-close event reports a backdrop dismissal

  # S5
  Scenario: Unrecognized markup leaves the dialog at its documented defaults
    Given a dialog declared with an unrecognized attribute and value
    When the page renders
    Then the dialog renders closed with its default appearance

  # S15
  Scenario: Programmatic close reports exactly one close event
    Given an open dialog on a page that counts close events
    When the application closes it programmatically
    Then the dialog closes and exactly one ki-close event reports a programmatic dismissal

  # Family: keyboard path
  # S6
  Scenario: Opening the dialog moves focus into it
    Given a page with a "Delete account" button that opens a confirmation dialog
    When the user activates the button from the keyboard
    Then focus lands inside the dialog with visible focus indication

  # S7
  Scenario: Tab keeps focus inside the open dialog
    Given an open dialog whose last focusable action is "Delete"
    When the user presses Tab from "Delete"
    Then focus stays inside the dialog and never reaches the page behind

  # S8
  Scenario: Escape closes the dialog and returns focus to the opener
    Given a dialog opened from the "Delete account" button
    When the user presses Escape
    Then the dialog closes, the ki-close event reports an Escape dismissal, and focus returns to the "Delete account" button

  # Family: assistive-tech outcome
  # S9
  Scenario: The dialog is exposed as a named modal dialog
    Given an open dialog with heading "Delete account?"
    When the accessibility tree is queried
    Then it exposes a modal dialog whose accessible name is "Delete account?"

  # S10
  Scenario: Content behind the open dialog is hidden from assistive technology
    Given an open dialog over a page with a "Settings" navigation link
    When the accessibility tree is queried
    Then the "Settings" link is not exposed while the dialog is open

  # Family: theming
  # S11
  Scenario: A second theme restyles the dialog through tokens alone
    Given a page declaring the material3 theme with an open dialog
    When the page renders
    Then the dialog's appearance resolves from material3 token values

  # S12
  Scenario: The dialog honors a forced dark scheme
    Given an open dialog on a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the dialog's appearance resolves from the dark token values

  # S13
  Scenario: Dialog actions follow the document's writing direction
    Given a right-to-left document with an open dialog holding "Cancel" and "Delete" actions
    When the page renders
    Then the action order and alignment follow the right-to-left direction

  # S14
  Scenario: Reduced motion suppresses open and close transitions
    Given a person whose system requests reduced motion and a theme defining open and close transitions
    When the dialog opens
    Then the dialog appears without motion
