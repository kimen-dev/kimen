Feature: Avatar
  An avatar identifies a person or entity at a glance — a portrait, initials
  or a generic figure inside one compact shape — and an avatar group stacks
  several with a "+N" overflow counter, all restyled through tokens alone.

  # Family: core behavior
  # S1
  Scenario: An avatar shows the person's portrait
    Given an avatar labeled "Ana García" with a reachable portrait
    When the page renders
    Then the portrait is visible inside the avatar shape

  # S2
  Scenario: A broken portrait falls back to the initials
    Given an avatar labeled "Ana García" with initials "AG" and a portrait that cannot be retrieved
    When the portrait fails to load
    Then the initials "AG" are visible instead of the portrait, with no broken-image artifact

  # S3
  Scenario: An avatar with no portrait and no initials shows the generic figure
    Given an avatar labeled "Guest" with no portrait and no initials
    When the page renders
    Then the generic person figure is visible inside the avatar shape

  # S4
  Scenario: Unknown size values fall back to the default
    Given an avatar declared with an unrecognized size value
    When the page renders
    Then the avatar renders at the default medium size

  # S5
  Scenario: A group stacks its avatars and summarizes the overflow
    Given an avatar group of eight labeled avatars limited to three visible
    When the page renders
    Then the first three avatars appear as one overlapping stack
    And a "+5" counter trails the stack

  # S6
  Scenario: The group renders every member at the group's size
    Given an avatar group sized "sm" whose avatars declare mixed sizes
    When the page renders
    Then every visible avatar renders at the group's "sm" metrics

  # Family: keyboard path
  # S7
  Scenario: Avatars never take keyboard focus
    Given a focused button, then an avatar group of three avatars, then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the group or its avatars

  # Family: assistive-tech outcome
  # S8
  Scenario: A labeled avatar exposes the person's name as an image
    Given an avatar labeled "Ana García" showing the initials "AG"
    When the accessibility tree is queried
    Then it exposes an image named "Ana García" with no interactive role
    And no separate "AG" text is exposed

  # S9
  Scenario: An unlabeled avatar stays out of the accessibility tree
    Given an avatar with no label beside the visible text "Ana García"
    When the accessibility tree is queried
    Then the avatar contributes no name, role or text of its own

  # S10
  Scenario: The group announces its visible members and the overflow
    Given an avatar group of eight labeled avatars limited to three visible
    When the accessibility tree is queried
    Then the three visible members' names are exposed
    And the overflow reaches assistive technology as the text "+5"

  # Family: form participation — N/A for ki-avatar and ki-avatar-group:
  # static, non-interactive identity visuals are not form controls, hold no
  # value and contribute no entry to submitted form data (justified in
  # spec.md's Scenario Family Coverage table).

  # Family: theming
  # S11
  Scenario: A second theme restyles avatars through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the avatar's shape, colors and metrics resolve from material3 token values

  # S12
  Scenario: The avatar honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the avatar's appearance resolves from the dark token values

  # S13
  Scenario: The group's stack follows the document's writing direction
    Given a right-to-left document with an avatar group of four avatars limited to three visible
    When the page renders
    Then the first avatar leads the stack from the right edge
    And the "+1" counter trails at the stack's left end

  # Family: core behavior (appended)
  # S14
  Scenario: A malformed visible cap shows every member and no counter
    Given an avatar group of three labeled avatars declared with the malformed visible cap "0"
    When the page renders
    Then all three avatars render and no counter appears

  # S15
  Scenario: A group with no cap shows every member and no counter
    Given an avatar group of three labeled avatars with no visible cap
    When the page renders
    Then all three avatars render
    And no counter appears, not even "+0"
