# Drawer

Issue #391 · Kimen constitution v2.0.0

Use a logical-edge sheet for editing in context and a bottom sheet for short
actions on narrow screens. Modal drawers make the background inert. Pages that
need continued interaction can open a non-modal drawer.

## Scenario family coverage

| Family | Scenarios |
| --- | --- |
| Core behavior | S1–S6 |
| Keyboard | S7–S8 |
| Assistive technology | S9 |
| Form participation | N/A. The drawer contributes no form value or validity. Slotted controls retain their own form behavior. |
| Theming | S10–S13 |

## Interpretations

- A drawer uses the same native dialog mechanism and focus utilities as
  `ki-dialog`. The scrim blocks interaction and does not dismiss the sheet.
  Agent's choice, pending founder confirmation.
- A single `ki-close` request precedes dismissal by button, Escape, swipe,
  method, or a change to the open state. It reports a reason and can be
  canceled. Non-modal Escape is handled while focus is in the drawer.
  Agent's choice, pending founder confirmation.
- The close button defaults to “Close” and exposes a `close-label` override.
  Focus starts in the content, preferring a field and respecting authored
  autofocus. The close button is the final fallback. Agent's choice, pending
  founder confirmation.
- Only bottom sheets show a handle. A swipe starts on that handle and moves
  down by at least 48 CSS pixels and farther down than sideways. The handle
  is decorative for assistive technology. Agent's choice, pending founder
  confirmation.
- The size sets the side width or bottom height cap, bounded by the viewport.
  The sheet animates on entry and closes synchronously after an accepted
  request. Agent's choice, pending founder confirmation.

## Gherkin

```gherkin
Feature: Drawer
  A sheet keeps the current page in view while someone edits details or
  chooses an action. It opens at a logical edge and can keep the page usable.

  # Family: core behavior
  # S1
  Scenario: Application state opens and closes a drawer
    Given a closed drawer headed "Edit incident"
    When the application opens the drawer with its method or open state
    Then the drawer is visible and its open state is reflected
    And the application can close it with its method or open state

  # S2
  Scenario Outline: A drawer follows the selected edge and text direction
    Given a <direction> page with a drawer placed at <placement>
    When the drawer opens
    Then the sheet meets the <edge> edge of the viewport
    And its title, body, header actions and footer are visible

    Examples:
      | direction | placement | edge   |
      | LTR       | start     | left   |
      | LTR       | end       | right  |
      | RTL       | start     | right  |
      | RTL       | end       | left   |
      | RTL       | bottom    | bottom |

  # S3
  Scenario: A non-modal drawer keeps the page usable
    Given a non-modal drawer beside a page action
    When the drawer opens
    Then the page action remains reachable and usable without closing the drawer
    And no scrim obscures the page

  # S4
  Scenario Outline: Unsaved changes can veto a close request
    Given an open drawer whose application vetoes close requests
    When the drawer receives a close request from <source>
    Then one cancelable ki-close event identifies the source
    And the drawer stays open until an unvetoed close request

    Examples:
      | source      |
      | its button  |
      | Escape      |
      | its method  |
      | open state  |
      | a swipe     |

  # S5
  Scenario: A bottom sheet closes on a deliberate downward swipe
    Given an open bottom sheet with a visible handle
    When a touch starts at the handle and swipes down
    Then the sheet closes and reports a swipe close request

  # S6
  Scenario: Short and sideways gestures leave a bottom sheet open
    Given an open bottom sheet with a visible handle
    When a touch ends without a deliberate downward swipe
    Then the sheet remains open and reports no close request

  # Family: keyboard
  # S7
  Scenario: A modal drawer receives, contains and restores keyboard focus
    Given a focused trigger for a modal drawer with a field and footer action
    When the trigger opens the drawer
    Then focus starts on its first field and cycles within the drawer
    And Escape closes the drawer and returns focus to the trigger

  # S8
  Scenario: A keyboard user can close a bottom sheet via its labeled button
    Given an open bottom sheet whose focused close button is labeled "Dismiss sheet"
    When the user presses Enter
    Then the bottom sheet closes

  # Family: assistive technology
  # S9
  Scenario Outline: The heading names the drawer and modality is announced
    Given a <mode> drawer headed "Edit incident"
    When the drawer opens
    Then assistive technology exposes a dialog named "Edit incident" with the corresponding modality
    And its named Close button is available

    Examples:
      | mode      |
      | modal     |
      | non-modal |

  # Family: theming
  # S10
  Scenario: Sizing and appearance can be customized
    Given a page that reassigns the raised surface color and drawer size token
    When its drawer opens
    Then the drawer uses the reassigned color and size
    And an explicit size takes precedence and limits the height of a bottom sheet

  # S11
  Scenario: Reduced motion removes the entrance slide
    Given a user who prefers reduced motion
    When the drawer opens
    Then it fades in at its final position

  # S12
  Scenario: A forced palette preserves the sheet and the Close control
    Given a user with a forced color palette
    When the drawer opens
    Then the sheet has a visible boundary and its Close control stays legible

  # S13
  Scenario: Touch density enlarges the Close control on a coarse pointer page
    Given an open drawer on a page with a coarse primary pointer
    When the page selects touch density
    Then the Close control grows to at least 44 CSS pixels on each axis
```
