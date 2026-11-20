# DialogTrigger

**Issue** #368

Authors can connect `ki-button` or `ki-icon-button` to a shipped `ki-dialog` through markup. The same relationship lets the A2UI adapter translate a Modal without application event handlers.

## Scenario Family Coverage

| Family | Scenarios | Evidence |
| --- | --- | --- |
| Core behavior | S1, S6, S8, S9, S10, S11 | Modal lifecycle, guarded references and A2UI translation |
| Keyboard path | S2, S7 | Keyboard entry and Escape dismissal |
| Assistive-tech outcome | S3, S7, S9 | Dialog role and name, trigger state and focus restoration |
| Form participation | S4 | A form-associated trigger does not submit while invoking a command |
| Theming | S5 | The shipped controls remain visible and operable in forced colors |

## Interpretations

Each interpretation is an agent's choice, pending founder confirmation.

- Authors need no application JavaScript. The client-side Kimen elements still run their component code. A native inner button cannot resolve a target outside its shadow tree through an HTML ID reference, so the components bridge that boundary with a command event.
- The existing `ki-close` payload keeps its `reason` field. Both command close paths add `reason: 'command'`. The dialog's native cancel event provides the guard for `request-close`, while `close` dismisses directly.
- A recognized command paired with `commandfor` takes precedence over the button's form action. A disabled or loading invoker stays inactive. The three supported commands target the first matching `ki-dialog` ID in the invoker's own tree under standard ID lookup.
- Command opening refuses nested dialogs and triggers inside an already open dialog. Commands can still close the active dialog from its footer. The opener publishes the target dialog's live expanded state and regains focus. The dialog waits for the previous command close to finish before accepting another open command.
- A guarded surface uses the neutral node ID for `commandfor`. Rendering assigns a DOM ID unique to the rendered surface and limits the relationship to a dialog in that surface. A command can coexist with an explicitly declared surface action. A command click does not activate an ancestor action.
- Streaming references stay within one validated chunk. Live surface references can link roots in the validated batch result.
- The public API gate classifies the widened exported close-reason union as major. The declaration uses that classification.
- A2UI Modal accepts Button and Text entry points. The translated dialog derives its heading from the entry point text when available and uses English fallback labels when it cannot resolve usable text. The adapter provides a visible Close command and degrades unsupported entry-point components.

## Gherkin

```gherkin
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
```
