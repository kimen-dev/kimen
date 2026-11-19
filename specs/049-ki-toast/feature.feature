Feature: Toast
  A toast confirms something the person just did, out of the flow of the
  page and only for as long as it is useful: its urgency reaches eyes and
  assistive technology alike, it never closes under a person who is reading
  or reaching for it, a toaster stacks and queues the toasts in one place,
  and any theme restyles both through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The tone lives in the icon alone
    Given an onmars page with a success toast "Changes saved" and the message "Workspace settings are up to date."
    When the toast appears
    Then the heading and the message are visible beside an icon in the success ink
    And the toast's surface, heading and message look as they do on a neutral toast

  # S2
  Scenario: The toast is a flat raised surface with a hairline edge
    Given an onmars page with an info toast "Export ready"
    When the toast appears
    Then the toast has 12px of padding, 16px corners, a hairline border and the level-4 elevation
    And nothing behind it is blurred and it is no wider than 360px

  # S3
  Scenario: A toast leaves when its time runs out
    Given a toast "Draft saved" with a duration of 4 seconds
    When 4 seconds pass without the pointer or the focus on it
    Then the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "timeout"

  # S4
  Scenario: A toast without a duration leaves after five seconds
    Given an info toast "Sync complete" with no duration
    When 5 seconds pass
    Then the toast is no longer displayed

  # S5
  Scenario Outline: A toast that needs the person never leaves on its own
    Given a toast "Upload finished" <waiting reason>
    When 30 seconds pass
    Then the toast is still displayed

    Examples:
      | waiting reason                                     |
      | holding the action "Undo"                          |
      | in the danger tone                                 |
      | with a duration of 0                               |
      | holding the action "Undo" with a duration of 4000  |
      | in the danger tone with a duration of 4000         |

  # S6
  Scenario: Pointing at any toast holds every toast of the toaster
    Given a toaster showing "Draft saved" and "Photo uploaded", each with a duration of 4 seconds, and the pointer resting on "Photo uploaded"
    When 6 seconds pass
    Then both toasts are still displayed

  # S7
  Scenario: The remaining time runs again when the pointer leaves
    Given a toast "Draft saved" with a duration of 4 seconds that the pointer held after 3 seconds and has just left
    When 1 more second passes
    Then the toast is no longer displayed

  # S8
  Scenario: A hidden page holds the time
    Given a toast "Draft saved" with a duration of 4 seconds on a page that went to the background after 1 second
    When 10 seconds pass while the page is hidden
    Then the toast is still displayed

  # S9
  Scenario: The dismiss button removes the toast and says so
    Given a toast "Backup completed"
    When the user activates the dismiss button
    Then the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "button"

  # S10
  Scenario: Activating the action runs it and the toast leaves
    Given a toast "Message archived" holding the action "Undo"
    When the user activates "Undo"
    Then the page's undo runs once and the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "action"

  # S11
  Scenario: A toast that is not dismissible has no dismiss button
    Given a toast "Connected" that is not dismissible
    When the toast appears
    Then no dismiss button is present

  # S12
  Scenario: Clearing the dismissed state shows the toast again with its full time
    Given a toast "Draft saved" with a duration of 4 seconds that left when its time ran out
    When the page clears the toast's dismissed state
    Then the toast is displayed again and stays for another 4 seconds

  # S13
  Scenario: Unknown tone values fall back to the neutral appearance
    Given a toast declared with an unrecognized tone value
    When the toast appears
    Then the toast renders with the neutral tone appearance

  # S14
  Scenario: The toaster stacks toasts in arrival order in its corner
    Given a left-to-right page with a toaster placed "bottom-end"
    When the toasts "First" and "Second" arrive in that order
    Then both are displayed in the bottom right corner of the viewport, "First" above "Second"

  # S15
  Scenario Outline: The placement chooses the edge and the side of the stack
    Given a left-to-right page with a toaster placed "<placement>"
    When the toast "Draft saved" arrives
    Then the toast sits at the <edge> of the viewport, <side>

    Examples:
      | placement     | edge   | side         |
      | top-center    | top    | centered     |
      | top-end       | top    | on the right |
      | bottom-center | bottom | centered     |
      | bottom-end    | bottom | on the right |

  # S16
  Scenario: Unknown placement values fall back to the bottom end
    Given a left-to-right page with a toaster declared with an unrecognized placement value
    When the toast "Draft saved" arrives
    Then the toast sits at the bottom of the viewport, on the right

  # S17
  Scenario: On a narrow touch screen the stack sits at the bottom center
    Given a 414-pixel-wide touch screen with a toaster placed "top-end"
    When the toast "Draft saved" arrives
    Then the toast sits at the bottom of the viewport, centered

  # S18
  Scenario: The toaster shows its newest toasts and queues the older ones
    Given a toaster with a maximum of 2 showing the toasts "One" and "Two"
    When the toast "Three" arrives
    Then "Two" and "Three" are displayed and "One" is not

  # S19
  Scenario: A queued toast comes back when a place frees, with its full time
    Given a toaster with a maximum of 2 showing "Two" and "Three" while "One", with a duration of 4 seconds, waits
    When the user dismisses "Three"
    Then "One" and "Two" are displayed
    And "One" stays for its full 4 seconds

  # S20
  Scenario: The page raises a toast through the toaster
    Given a toaster on the page
    When the page shows a success toast titled "Changes saved" with the message "Workspace settings are up to date." and the action "Undo"
    Then a success toast with that heading, message and an "Undo" button is displayed
    And once it leaves, the toast is removed from the page

  # S21
  Scenario: The toaster never covers the page beside its toasts
    Given a toaster placed "bottom-end" showing the toast "Draft saved" and a button "Help" at the bottom of the page beside it
    When the user clicks "Help"
    Then the "Help" button is activated

  # Family: keyboard path
  # S22
  Scenario: Tab reaches the action and then the dismiss button, with visible focus
    Given a page whose only interactive content is a toast holding the action "Undo"
    When the user tabs through the toast
    Then focus visits "Undo" and then the dismiss button, each with visible focus indication

  # S23
  Scenario: Keyboard focus inside a toast holds its time
    Given a toast "Draft saved" with a duration of 4 seconds whose dismiss button has keyboard focus
    When 6 seconds pass
    Then the toast is still displayed

  # S24
  Scenario: F6 moves focus into the toaster
    Given a page where the button "Save" has focus and a toaster shows a toast holding the action "Undo"
    When the user presses F6
    Then focus lands on "Undo"

  # S25
  Scenario: Escape dismisses the focused toast and returns focus to where it was
    Given a page where focus moved from the button "Save" into the only toast of a toaster
    When the user presses Escape
    Then the toast is no longer displayed and focus lands on "Save"
    And the page observes exactly one ki-dismiss event whose reason is "escape"

  # S26
  Scenario: Keyboard dismissal hands focus to the next toast
    Given a toaster showing "Draft saved" and "Photo uploaded", with focus on the dismiss button of "Draft saved"
    When the user activates that dismiss button from the keyboard
    Then focus lands on the dismiss button of "Photo uploaded"

  # Family: assistive-tech outcome
  # S27
  Scenario Outline: Calm tones are exposed as polite status updates without moving focus
    Given a page where the person is working in a form
    When a <tone> toast "Changes saved" appears
    Then the toast is exposed to assistive technology with status (polite) semantics
    And focus stays where it was

    Examples:
      | tone    |
      | neutral |
      | info    |
      | success |
      | warning |

  # S28
  Scenario: A danger toast is exposed assertively without moving focus
    Given a page where the person is working in a form
    When a danger toast "Upload failed" appears
    Then the toast is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S29
  Scenario: Only the heading and the message are announced
    Given a page where the storage is filling up
    When a warning toast appears with the heading "Storage almost full", the message "1 GB left" and the action "Upgrade"
    Then the toast's live region exposes only "Storage almost full" and "1 GB left"
    And the tone icon is hidden from assistive technology

  # S30
  Scenario: The dismiss button is named Dismiss
    Given a toast using the default dismiss label
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Dismiss"

  # S31
  Scenario: The built-in words are overridable for localization
    Given a toaster labeled "Avisos" holding a toast whose dismiss label is "Descartar"
    When the accessibility tree is queried
    Then the toaster is named "Avisos" and the dismiss button "Descartar"

  # S32
  Scenario: The toaster is a named group, not a landmark
    Given a toaster with the default label showing the toast "Draft saved"
    When the accessibility tree is queried
    Then it exposes a group named "Notifications" that contains the toast
    And no landmark is added to the page

  # S33
  Scenario: An empty toaster exposes nothing
    Given a toaster whose toasts have all left
    When the accessibility tree is queried
    Then no "Notifications" group is exposed

  # S34
  Scenario: A queued toast is not exposed until its turn
    Given a toaster with a maximum of 1 showing "Two" while "One" waits
    When the accessibility tree is queried
    Then "Two" is exposed and "One" is not

  # Family: form participation — N/A, justified in spec.md (neither element is a form control)

  # Family: theming
  # S35
  Scenario: A second theme restyles the toast through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When a toast appears
    Then the toast's appearance resolves from material3 token values

  # S36
  Scenario: The toast honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When a toast appears
    Then the toast's appearance resolves from the dark token values

  # S37
  Scenario: Toasts follow a right-to-left document
    Given a right-to-left page with a toaster placed "bottom-end"
    When a toast holding the action "Undo" arrives
    Then the stack sits at the bottom left of the viewport
    And the icon leads at the right of the toast and the dismiss button trails at its left

  # S38
  Scenario: The toaster's distance from the viewport edges comes from tokens
    Given a page whose theme sets the toaster's edge distance to 32px
    When a toast arrives in a toaster placed "bottom-end"
    Then the stack sits 32px from the bottom and from the end of the viewport

  # S39
  Scenario: A theme paints the surface, the backdrop and the heading typeface through tokens
    Given a page whose theme gives the toast a background image, a backdrop blur and a serif heading typeface
    When a toast "Changes saved" appears
    Then the toast paints that background image over its color, blurs what is behind it and sets its heading in the serif typeface

  # S40
  Scenario: A toast appears without sliding under a reduced-motion preference
    Given a page under a "reduce" motion system preference
    When a toast arrives
    Then the toast is displayed at its final place without animating

  # S41
  Scenario: Reduced transparency keeps the toast opaque and raised
    Given an onmars dark page with a success toast
    When the toast appears under a "reduce" transparency system preference
    Then the toast paints an opaque surface without blurring what is behind it
    And it keeps its elevation

  # S42
  Scenario: Under forced colors the toast keeps its edge and a visible icon
    Given forced colors are active and an info toast
    When the toast appears
    Then the toast's edge is drawn in the forced text color
    And the icon is painted in the forced text color

  # S43
  Scenario: Touch density gives the toast's controls touch-sized targets
    Given a page declaring the touch density with a toast holding the action "Undo"
    When the toast appears
    Then the dismiss button and "Undo" each offer a target of at least 44 by 44 pixels
