# Feature specification — Details and accordion

**Issue** #364. **Branch** `feat/364-ki-details`.

A disclosure keeps secondary content available without taking up room until the
reader needs it. An accordion presents related disclosures as one visual group.

## Requirements

- `ki-details` uses a native disclosure, exposes `summary`, `open`,
  `disabled` and optional `name`, and accepts a rich `summary` slot and a default content slot.
- `ki-accordion` groups direct `ki-details` members. Its `exclusive`
  property coordinates exclusive opening among direct members. Disclosures
  sharing a nonempty `name` also exclude one another within their DOM tree.
  Native disclosure controls live in shadow roots and use constructable
  stylesheets under the MCP Apps content policy.
- Native activation and native reveal keep the reflected `open` state in sync
  and report `ki-toggle` with `{ open }`. A disabled summary is unavailable
  for interaction. Content in an open panel remains usable.
- The surface, summary, focus indicator and decorative chevron follow the
  theme, reading direction, forced colors, density and motion preference.
- The catalog and generated framework wrappers expose both elements. Both
  elements have stories, public documentation and visual fixtures.

## Interpretations

- **Agent's choice, pending founder confirmation.** Serve explicit native
  `details` and `summary` markup when script-free operation is required.
  Browsers need literal native markup before custom-element registration.
- **Agent's choice, pending founder confirmation.** Keep the first open
  member when an exclusive group starts with multiple open members. Members
  work independently by default and can all be collapsed.
- **Agent's choice, pending founder confirmation.** Report native state
  changes, including a peer closing, after initialization. Direct writes to
  a member's `open` property or attribute are silent on that member.
- **Agent's choice, pending founder confirmation.** Disable activation and
  remove the summary from sequential focus. Native reveal and page-controlled
  state remain available, as do controls inside open content.
- **Agent's choice, pending founder confirmation.** Keep the generated
  disclosure and accordion entrypoints in sibling component folders, as
  required by the discovery registry. Both implement this contract.
- **Agent's choice, pending founder confirmation.** Use a single frame with
  row separators for an accordion and a complete outline for a standalone
  disclosure, following the design-system preview.

- **Agent's choice, pending founder confirmation.** Declare the public API
  as major because the protected baseline classifies changes to the generated
  loader `Components` and `JSX` namespaces that way. The new component APIs
  are additive.

- **Agent's choice, pending founder confirmation.** Charge the combined
  Details and Accordion MCP server bundle increase to the Details metadata.
  Relative to the pinned build at `3b58bbf`, the shadow DOM change adds
  725 raw bytes. The gzip and Brotli results fit their existing limits.

## Scenario Family Coverage

| Family | Scenarios | Justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S6, S16 | |
| Keyboard path | S7, S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | N/A | Neither element owns a form value or validation state. |
| Theming | S11, S12, S13, S14, S15 | |

## Gherkin

```gherkin
Feature: Details and accordion
  A disclosure shows supporting content on demand. An accordion groups related
  disclosures and can keep only one panel open.

  # Family: core behavior
  # S1
  Scenario: A summary opens and closes its disclosure
    Given a collapsed disclosure labeled "Who can see my workspace?"
    When the user activates its summary twice
    Then the answer is shown and hidden in turn
    And each change emits one ki-toggle event with the resulting open state

  # S2
  Scenario: The page controls a disclosure's open state
    Given a disclosure declared open
    When the page closes and reopens it through its open property
    Then the answer follows the property and the open attribute reflects it
    And the property writes do not emit ki-toggle

  # S3
  Scenario: A disabled disclosure retains the state set by the page
    Given a disabled disclosure that is open
    When the user activates its summary
    Then the answer remains visible and no ki-toggle event is emitted

  # S4
  Scenario: Opening an exclusive member closes its peer
    Given an exclusive accordion with "Permissions" open and "Exports" closed
    When the user opens "Exports"
    Then "Permissions" closes and "Exports" opens
    And each changed member reports its own open state

  # S5
  Scenario: Independent groups allow multiple open disclosures
    Given an open disclosure in a nonexclusive accordion and an open disclosure in another group
    When the user opens a second disclosure in the nonexclusive accordion
    Then all three disclosures remain open

  # S6
  Scenario: A native fallback works without JavaScript
    Given a workspace FAQ served as native details and summary markup with scripts disabled
    When the user activates a question in the native accordion
    Then the corresponding answer opens and the previously open answer closes

  # S16
  Scenario: Named disclosures share exclusivity within their DOM tree
    Given the "Permissions" disclosure is open and "Exports" shares its name
    And a separate shadow tree contains an open disclosure with that same name
    When the user opens "Exports"
    Then "Permissions" closes and "Exports" opens
    And the disclosure in the separate tree remains open

  # Family: keyboard path
  # S7
  Scenario Outline: The summary opens from the keyboard
    Given a collapsed disclosure whose summary received keyboard focus
    When the user presses <key>
    Then the answer becomes visible and focus stays on the summary

    Examples:
      | key   |
      | Enter |
      | Space |

  # S8
  Scenario: Tab skips a disabled summary
    Given a disabled disclosure before an enabled disclosure
    When the user tabs to the first available summary
    Then the enabled summary receives visible focus

  # Family: assistive-tech outcome
  # S9
  Scenario: A rich summary preserves its heading and exposes the expanded state
    Given a disclosure whose rich summary is headed "Workspace settings"
    When the user expands the disclosure
    Then the heading stays in the summary and the browser exposes the expanded state
    And the chevron contributes nothing to the accessible name

  # S10
  Scenario: Closed content remains available to native browser search
    Given a collapsed disclosure with the body text "Guests inherit workspace permissions"
    When the browser reveals the answer as a find-in-page match
    Then the disclosure opens and its open state reflects the change

  # Family: form participation
  # N/A: Neither element owns a form value or validation state.

  # Family: theming
  # S11
  Scenario: A theme can restyle the disclosure surface and summary
    Given a theme that assigns a background image, a backdrop filter, and a hover color
    When the user hovers over an enabled summary
    Then the surface and summary use the configured values

  # S12
  Scenario: The chevron follows the reading direction
    Given a right-to-left disclosure
    When its summary is shown
    Then the chevron appears at the end of the line, to the left of the text

  # S13
  Scenario: The chevron changes position without motion when requested
    Given the user prefers reduced motion
    When the disclosure opens
    Then the chevron points up without a transition

  # S14
  Scenario: Forced colors preserve the disclosure outline and focus indicator
    Given forced colors are active
    When the summary receives keyboard focus
    Then the outline and focus indicator remain visible in system colors

  # S15
  Scenario: Touch density gives a coarse pointer a comfortable summary target
    Given a touch-density page with a coarse pointer
    When the disclosure is displayed
    Then its summary offers a target at least 44 CSS pixels high
```
