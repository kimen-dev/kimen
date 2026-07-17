Feature: Status
  A status dot marks the state of a nearby item at a glance — a tiny,
  non-interactive colored dot whose optional label carries its meaning to
  assistive technology and whose appearance any brand restyles through
  tokens alone.

  # Family: core behavior
  # S1
  Scenario Outline: The tone determines the dot's appearance
    Given a status dot labeled "<label>" with tone "<tone>"
    When the page renders
    Then a small filled dot is visible and its appearance resolves from the <tone> tone token values

    Examples:
      | label         | tone    |
      | Online        | success |
      | Build failing | danger  |

  # Retired: S2 (danger tone) was merged into the S1 outline on 2026-07-17 —
  # same rule (the tone determines the dot's appearance) over two data
  # points. The S2 ID is retired and never reused.

  # S3
  Scenario: Unknown tone values fall back to the neutral appearance
    Given a status dot declared with an unrecognized tone value
    When the page renders
    Then the dot renders with the neutral tone appearance

  # S4
  Scenario: The ring separates the dot from underlying media
    Given a status dot labeled "Online" with the ring enabled, overlaid on an avatar image
    When the page renders
    Then a contrasting ring surrounds the dot, separating it from the avatar beneath

  # Family: keyboard path
  # S5
  Scenario: The status dot never takes keyboard focus
    Given a focused button, then a status dot labeled "Online", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the dot

  # Family: assistive-tech outcome
  # S6
  Scenario: A labeled dot exposes its meaning as a named image
    Given a status dot labeled "Online" with tone "success"
    When the accessibility tree is queried
    Then it exposes an image named "Online" with no interactive role or state

  # S7
  Scenario: An unlabeled dot is decorative and exposes nothing
    Given a status dot with no label beside the text "Online"
    When the accessibility tree is queried
    Then the dot contributes nothing to the accessibility tree
    And the status meaning is carried by the adjacent text alone

  # Family: form participation — N/A for ki-status: a static, non-interactive
  # state marker is not a form control, holds no value and contributes no
  # entry to submitted form data (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S8
  Scenario: A second theme restyles the dot through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the dot's size, colors and ring resolve from material3 token values

  # S9
  Scenario: The status dot honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the dot's appearance resolves from the dark token values
