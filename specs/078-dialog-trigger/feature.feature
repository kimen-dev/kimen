Feature: Open and close a Kimen dialog from an invoker
  A button connects to a modal dialog through markup so the application
  can present a decision and return the user to the original trigger.

  # S1
  Scenario: A pointer activation opens its target dialog
    Given the "Delete project…" button is linked to the closed "Delete project?" dialog
    When the user clicks "Delete project…"
    Then the "Delete project?" modal opens

  # S2
  Scenario: A focused icon button opens the modal from the keyboard
    Given the "Project details" icon button is focused and its dialog is closed
    When the user presses Enter
    Then the "Project details" modal opens

  # S3
  Scenario: The trigger exposes the expanded state of its named dialog
    Given the "Delete project…" button is linked to the closed "Delete project?" dialog
    When the user opens the dialog using the button
    Then the trigger exposes a dialog popup with expanded state
    And the modal dialog is named "Delete project?"

  # S4
  Scenario: A command button inside a form opens its dialog without submitting
    Given the form contains a "Preview" button linked to the "Preview changes" dialog
    When the user activates "Preview"
    Then the "Preview changes" dialog opens
    And the form is not submitted

  # S5
  Scenario: The invoker remains operable with forced colors
    Given the page uses forced colors and the "Delete project…" trigger is focused
    When the user activates the trigger
    Then the named modal is visible
    And its focused action has a visible focus indicator

  # S6
  Scenario: A close request respects the dialog's cancellation guard
    Given the open "Delete project?" modal has a guarded "Cancel" action
    When the user requests close using "Cancel"
    Then the modal stays open when the close request is canceled
    And no close notification is reported

  # S7
  Scenario: Escape restores focus to the opening trigger
    Given "Delete project…" has opened the "Delete project?" modal
    When the user presses Escape
    Then the modal closes with reason "escape"
    And the collapsed trigger receives focus

  # S8
  Scenario: An invoker inside a modal cannot open a second modal
    Given an action in the open "Project details" dialog links to another modal
    When the user activates the action
    Then only the original modal stays open

  # S9
  Scenario: A footer command closes its modal and restores the opening trigger
    Given "Delete project…" has opened the "Delete project?" modal
    When the user clicks its "Cancel" close action
    Then the modal closes with reason "command"
    And the collapsed trigger receives focus

  # S10
  Scenario: A guarded surface rejects a command targeting another surface
    Given a surface contains a "Preview" trigger and the target exists only in another surface
    When the surface is validated
    Then the reference is rejected

  # S11
  Scenario: An A2UI Modal becomes a dialog with a declarative entry point
    Given an A2UI "Modal" links to a "Details" button and its content
    When the A2UI surface is translated
    Then the neutral surface pairs the entry point with the content dialog
    And the entry point declares a show-modal command
