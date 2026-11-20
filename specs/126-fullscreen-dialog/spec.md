# Fullscreen dialog

**Issue** #403

A single opt-in variant of `ki-dialog` supports longer modal tasks. In fullscreen it has a leading close button, an accessible heading and an optional confirming action. The header stays in view while the body scrolls.

## Scenario Family Coverage

| Family | Scenarios | Evidence |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S10 | Responsive placement, scroll, confirmation |
| Keyboard path | S5, S6, S7, S8, S9 | Entry, dismissal, focus return and wrap |
| Assistive-tech outcome | S1, S5, S8, S12 | Modal role, accessible names, focus, axe |
| Form participation | S10 | Confirmation leaves submission to the application |
| Theming | S11, S12, S13, S14, S15 | Motion, forced colors, RTL, touch and visual matrix |

## Interpretations

Each item is an agent's choice, pending founder confirmation.

- The shipped component reports a noncancelable, post-close `ki-close`. Escape and the built-in close button emit one cancelable event before dismissal while fullscreen is active. Centered dialogs and other close paths keep the existing notification. The built-in button uses the existing `method` reason and Escape uses `escape`.
- The default and unrecognized `fullscreen` values use the centered layout. An explicitly supplied, nonblank `confirm-label` provides a confirm button even in the centered layout. Slotted footer actions remain in the footer.
- Confirmation emits a bubbling, composed `ki-confirm` signal. Applications own validation, submission and dismissal. A blank `close-label` falls back to `Close` so the icon button stays named.
- Existing explicit autofocus takes precedence over first-field focus. If no body control is focusable, entry uses the existing footer focus policy, with the fullscreen close control as a fallback.
- Fullscreen uses the raised `surface.s1` token with contrasting text and a solid default fill. The header can grow past its 3.5rem minimum to fit its controls and wrapping text.
- The close control is a native button with a decorative `ki-icon`. The dialog reuses the ghost treatment and density tokens to fit the component bundle budget. Confirm uses the registered `ki-button`. A native fallback keeps it operable when a direct consumer only registers `ki-dialog`.
- A catalog node with a declared action and a nonblank confirm label binds that action to `ki-confirm`. Without a label, the action keeps its existing `ki-close` binding.
- The API gate classifies the changed published TypeScript signatures as major. The API declaration records that classification.

## Gherkin

```gherkin
Feature: Complete a longer task in a fullscreen dialog
  The modal uses the whole window when requested and keeps its actions
  available while the user works through longer content.

  Rule: Fullscreen layout is opt-in

    # S1
    Scenario: A compact dialog adapts as the window changes size
      Given the open "New event" dialog uses compact mode and offers "Save"
      When the window changes from below 600 pixels to 600 pixels or wider
      Then the dialog changes from fullscreen to centered
      And "Save" moves from the header to the footer
      And the dialog keeps its content and accessible name

    # S2
    Scenario: An always-fullscreen dialog fills a wide window
      Given "New event" uses always-fullscreen mode
      When the user opens it in a wide window
      Then the dialog fills the window

    # S3
    Scenario: A default dialog keeps its centered layout on a small screen
      Given "New event" uses the default layout
      When the user opens it in a window narrower than 600 pixels
      Then the dialog remains centered

    # S4
    Scenario: The header remains visible while long content scrolls
      Given the open fullscreen "New event" dialog has content longer than the window
      When the user scrolls the dialog body
      Then the content scrolls beneath the header
      And the close and confirm actions remain visible

  Rule: The user can operate the modal by keyboard and assistive technology

    # S5
    Scenario: Opening the modal focuses its first field
      Given the "Add event" trigger is focused
      When the user opens the fullscreen "New event" dialog
      Then a modal named "New event" is exposed
      And the first field receives focus
      And the close button exposes its configured name

    # S6
    Scenario: Escape offers a cancelable dismissal
      Given the fullscreen "New event" dialog is open with unsaved changes
      When the user presses Escape
      Then the application receives one cancelable close event
      And the modal stays open when the application vetoes the request

    # S7
    Scenario: The close button offers a cancelable dismissal
      Given the fullscreen "New event" dialog is open with unsaved changes
      When the user activates its close button
      Then the application receives one cancelable close event
      And the modal stays open when the application vetoes the request

    # S8
    Scenario: Accepting a dismissal returns focus to the trigger
      Given "Add event" opened the fullscreen "New event" dialog
      When the user dismisses it without a veto
      Then the modal closes
      And "Add event" receives focus again

    # S9
    Scenario: Sequential navigation stays in the dialog
      Given the fullscreen "New event" dialog has fields and a confirm action
      When the user tabs through its controls
      Then the user can reach the header actions and the fields
      And focus wraps inside the modal in either direction

  Rule: The application controls what confirming does

    # S10
    Scenario: Confirmation signals the application
      Given the open "New event" dialog contains a form and offers "Save"
      When the user activates "Save"
      Then the application receives one confirm event
      And the form is not submitted
      And the modal stays open

  Rule: The fullscreen layout follows user and theme preferences

    # S11
    Scenario: Reduced motion removes the entrance motion
      Given the user prefers reduced motion
      When the fullscreen dialog opens
      Then the surface appears without an entrance transition

    # S12
    Scenario: The named modal and its actions work with forced colors
      Given the page uses forced colors
      When the fullscreen "New event" dialog opens
      Then the named modal and its header actions are visible
      And the focused control has a visible focus indicator

    # S13
    Scenario: The header follows right-to-left reading order
      Given the page reads right to left
      When the fullscreen dialog opens
      Then the close button is at the inline start
      And the confirm action is at the inline end

    # S14
    Scenario: A coarse pointer can reach both header controls
      Given the user has a coarse pointer
      When the fullscreen dialog opens
      Then both header actions meet the touch target minimum

    # S15
    Scenario: Both layouts use their selected theme and color scheme
      Given the page uses a supported theme and color scheme
      When "New event" opens in compact mode
      Then the dialog and its actions are legible at compact and wide widths
```
