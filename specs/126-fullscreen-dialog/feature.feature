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
