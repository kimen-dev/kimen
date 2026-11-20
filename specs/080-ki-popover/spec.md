# Feature specification for ki-popover

**Branch** `feat/363-ki-popover` · **Created** 2026-11-19 · **Issue** [#363](https://github.com/kimen-dev/kimen/issues/363)

Use a popover to present filters, details, supplementary text, or a small form beside its trigger. A popover leaves the page available for interaction.

## Gherkin scenarios

```gherkin
Feature: ki-popover opens non-modal content beside a trigger

  # S1
  Scenario: Toggle filters from their trigger
    Given closed filters anchored to the "Filters" button
    When the user activates the button
    Then the filters open beside it
    And the button is expanded and one open event is emitted

  # S2
  Scenario: Dismiss filters with an outside click
    Given the filters are open beside the "Filters" button
    When the user clicks a button outside the filters
    Then the filters close and emit one close event
    And the "Filters" button is collapsed

  # S3
  Scenario: Move keyboard focus into interactive filters
    Given the closed filters contain a "Search" field and the "Filters" button has focus
    When the user presses Enter
    Then the "Search" field receives focus

  # S4
  Scenario: Return keyboard focus to the trigger on Escape
    Given a field inside the open filters has focus
    When the user presses Escape
    Then the filters close and the "Filters" button receives focus

  # S5
  Scenario: Reach the page with Tab
    Given the last control in the open filters has focus
    When the user presses Tab
    Then focus moves to the next control on the page

  # S6
  Scenario: Expose a named non-modal dialog
    Given a filter popover labelled "Incident filters"
    When the user opens it
    Then assistive technology exposes a dialog named "Incident filters"
    And the button exposes the expanded state

  # S7
  Scenario: Announce a toggletip without moving focus
    Given the "About retention" button has focus and its toggletip is closed
    When the user presses Space
    Then a status region receives "Logs are kept for 30 days."
    And focus stays on "About retention"

  # S8
  Scenario: Flip a bottom placement near the viewport edge
    Given the trigger is at the bottom of the viewport
    When the popover opens at bottom-start
    Then the popover appears above the trigger

  # S9
  Scenario: Follow a semantic surface override
    Given a theme overrides the raised surface colour
    When the popover opens
    Then its surface paints the overridden colour

  # S10
  Scenario: Fit the user’s direction and display preferences
    Given a bottom-start popover in a right-to-left layout
    When it opens with forced colours, reduced motion and coarse pointer density
    Then its inline start aligns with the trigger's inline start
    And the surface has a visible border and no motion
    And its padding follows the region's declared density

  # S11
  Scenario: Open and close through application state
    Given a closed popover with a valid trigger
    When the application sets open to true
    Then the popover opens with one open event
    And the trigger is expanded

  # S12
  Scenario: Submit a slotted form
    Given open filters contain a form with a named search field
    When the user submits the form
    Then the form data includes the search field alone

  # S13
  Scenario: Collapse filters by activating the trigger again
    Given a popover is open by activation of its trigger
    When the user activates that trigger again
    Then the popover closes and emits one close event
    And the trigger is collapsed
```

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S2, S8, S11, S13 |
| Keyboard path | S3, S4, S5 |
| Assistive-tech outcome | S1, S4, S6, S7 |
| Form participation | S12 (slotted form; the overlay has no form value) |
| Theming | S9, S10 |

## Requirements

- A button identified by `for` in the same tree toggles the native auto popover. Its expanded state tracks actual visibility. The `open` attribute and property reflect changes from the trigger, application, and native dismissal. Each visible transition emits `ki-open` or `ki-close`.
- Placement supports top, bottom, start, and end, all with optional start/end alignment. The default is bottom-start. The shared anchored-overlay geometry handles the opposite-side flip and viewport clamping. CSS anchor positioning uses the trigger where the engine resolves the native implicit anchor.
- Dialog content is named by `label`. Opening focuses the first available control, respecting autofocus. Native Tab traversal stays available to the page. Escape closes and restores focus to the trigger.
- A toggletip exposes its text as a polite status update without moving focus. Native light dismissal closes both kinds.
- Both themes support semantic overrides, the contrast and reduced-transparency modes, and forced colours. The surface uses token-backed padding, size, border, radius, and elevation. The optional arrow faces the trigger after a flip.
- The public surface discovers the component in wrappers, docs, and the guarded catalog. Open and close actions report UI transitions.

## Decisions

- **Agent's choice, pending founder confirmation.** Supply the overridable fallback label “Popover” for dialogs. Use button triggers in the same document or shadow tree, and close when an open anchor disappears. An unresolved trigger leaves the popover closed.
- **Agent's choice, pending founder confirmation.** Treat toggletip content as text. A persistent status region receives the text on open and clears on close. Interactive content belongs in the dialog kind.
- **Agent's choice, pending founder confirmation.** Prefer an eligible autofocus control, then the first eligible control in content order. Keep native Tab traversal, with no focus trap.
- **Agent's choice, pending founder confirmation.** Use the same raised-surface semantics in both themes, scale padding with density, and render the surface without motion. The arrow uses a token-backed diamond at the edge facing the trigger. Omit the arrow with `arrow=false`.
- **Agent's choice, pending founder confirmation.** Keep the guarded surface passive except for its declared open and close events. Authors supply a stable trigger ID and the default slot content.
- **Agent's choice, pending founder confirmation.** Preserve the neutral catalog's one-event action binding rule. The catalog exposes both lifecycle events for host DOM listeners. Slotted controls can accept ordinary neutral action bindings. The renderer writes explicit false and removes the attribute on unset. Popover restores its own arrow default when the attribute is removed.
- **Agent's choice, pending founder confirmation.** Use a major API declaration because the version comparator classifies the generated loader Components and JSX namespace changes as major. The Popover API is additive.
