# Counter

**Issue** #356  
**Branch** `feat/356-ki-counter`

Use `ki-counter` for unread or pending items on an icon button, avatar, or
navigation trigger. Use plain text or `ki-badge` for counts within list rows,
and `ki-badge` for object status.

## Behavior contract

```gherkin
Feature: ki-counter marks new items on a trigger
  A decorative counter shows a count or presence while the surrounding application
  owns its accessible meaning.

  # S1
  Scenario: Positive counts show their value up to an inclusive cap
    Given counters for 3, 99 and 120 unread items
    When the screen displays those counts
    Then the counters read "3", "99" and "99+"

  # S2
  Scenario: A count disappears at zero
    Given a counter showing 3 unread items
    When the unread count becomes zero
    Then the counter is absent from the visible layout

  # S3
  Scenario: A presence dot takes precedence over a number
    Given Ana García's avatar has a success counter with a value of 3
    When the counter is set to dot mode
    Then a dot without digits sits at the avatar's block-end inline-end corner

  # S4
  Scenario: An external counter follows the trigger named by its ID
    Given an inbox link and an external counter targeting its ID
    When the link scrolls within its container
    Then the counter stays aligned to the link's block-start inline-end corner
    And it hides when the link touches the scrollport edge with no visible area

  # S5
  Scenario: The notification button keeps its place in the tab order
    Given a notification button with a slotted counter followed by another button
    When the user tabs from the notification button
    Then focus moves directly to the next button

  # S6
  Scenario: The host label supplies the count and presence to assistive technology
    Given a notification button labeled "Notifications, 3 unread" and an avatar labeled "Ana García, online"
    When the screen exposes the hosts and their counters
    Then assistive technology receives the two host labels and no separate counter content

  # S7
  Scenario: The application announces an important count update once
    Given a notification button and a page-owned polite status region
    When another notification arrives
    Then the button's name and the status region report the new count
    And the counter supplies no additional live region

  # S8
  Scenario: A theme can repaint the counter surface and its digits
    Given a counter showing 3 unread items
    When the theme overrides the counter's background and foreground tokens
    Then the counter repaints both colors

  # S9
  Scenario: The counter follows the notification button's logical corner
    Given a notification button with a slotted count
    When the notification button is shown in right-to-left layout
    Then the counter overlaps the block-start inline-end corner

  # S10
  Scenario: A numeric counter sits at the avatar's top-end corner
    Given the team inbox avatar has a counter for 12 pending items
    When the screen displays the avatar
    Then the count overlaps the avatar's block-start inline-end corner
```

### Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S10 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6, S7 | |
| Form participation | — | The decorative counter holds no form value and has no controls. |
| Theming | S8, S9 | |

## Requirements

- Show the finite positive whole count, or show the cap followed by `+` for a
  count above it. Hide an empty count. A dot shows independently of the count.
- Offer danger, primary, success and neutral tones, all backed by theme
  tokens. Keep the indicator legible in forced colors. Keep its size and
  placement stable under pointer density with no motion.
- Expose neither counter content nor live semantics. Keep pointer and keyboard
  interaction on the associated trigger. The application supplies its
  complete localized name and a polite status region for important changes.
- Support a `counter` slot on the shipped `ki-icon-button` and `ki-avatar`,
  and a `for` ID for standalone association. See the
  [public contract](contracts/counter.md).
- Register the element in the neutral catalog and framework wrappers. Verify
  the visual states in both themes and schemes.

## Interpretations (agent's choice, pending founder confirmation)

- A missing, non-finite or nonpositive value hides the numeral. Finite
  fractional values round down. A cap below one or an invalid cap uses 99.
  An unrecognized tone uses danger.
- A dot takes precedence over `value`. Avatar dots use the block-end corner.
  Avatar counts, icon button counters, and ID-linked counters use block-start.
- Unslotted counters without `for` render inline for custom composition.
  An explicit `for` associates with a literal ID in the same document or
  shadow root. The indicator hides while the target is missing. Authors set
  the label and status text, including their own pluralization.
- ID placement uses a viewport-fixed counter in its existing stacking context.
  It follows scroll, resize and DOM changes, and hides when the trigger is
  outside the visible scroll area. Use the named slot or inline composition
  in layouts that redefine the viewport-fixed containing block.
- Success uses the semantic success ink on the base surface in reverse so its
  dot keeps contrast against the ring in dark onmars. Neutral uses the inverse
  surface and ink roles. The count box can grow for user text spacing.
- Implement the slots on the existing icon button and avatar. The Sidebar
  and MobileNav issues own their future components and can consume the same
  counter composition.
- The API declaration is major because the gate classifies changes to its
  generated loader `Components` and `JSX` namespaces that way.
