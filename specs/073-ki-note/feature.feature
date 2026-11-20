Feature: Note
  A compact static explanation gives people context beside a control or inside a card.

  # S1
  Scenario Outline: A note presents the explanation with the tone's decorative icon
    Given a <tone> note with the text "Only owners can change billing"
    When the page renders
    Then the explanation is visible in the standard text ink with the <icon> icon
    And the background and icon ink follow the selected tone

    Examples:
      | tone    | icon           |
      | neutral | info           |
      | primary | sparkles       |
      | info    | info           |
      | success | circle-check   |
      | warning | triangle-alert |
      | danger  | circle-alert   |

  # S2
  Scenario: A decorative icon can be replaced
    Given a note with a custom decorative icon
    When the page renders
    Then the custom icon is visible in place of the default icon

  # S3
  Scenario: A note can omit the icon
    Given a note with its icon turned off and a custom icon supplied
    When the page renders
    Then the explanation starts at the note's padding without a gap for the icon

  # S4
  Scenario: Small notes use a compact caption
    Given a small and a medium note with the same explanation
    When the page renders
    Then the small note has smaller text and tighter padding than the medium note

  # S5
  Scenario: Unknown values use the default appearance
    Given a note with an unknown tone and size
    When the page renders
    Then the note looks like a neutral medium note with the info icon

  # S6
  Scenario: A note adds no tab stop
    Given a note with a decorative icon between "Cancel" and "Save" buttons
    When the user presses Tab from "Cancel"
    Then focus lands on "Save"

  # S7
  Scenario: The explanation is ordinary readable text
    Given a warning note "Changing the slug breaks existing links" with a decorative icon
    When the page renders
    Then assistive technology exposes the explanation as ordinary text
    And the note creates no role, live region or accessible icon

  # S8
  Scenario: A theme can restyle the note through tokens
    Given a theme that overrides the warning note's background, image, filter and text ink
    When the page renders
    Then the note uses that appearance and its text stays readable

  # S9
  Scenario: The icon leads in right-to-left text
    Given a right-to-left note with a decorative icon and a wrapping explanation
    When the page renders
    Then the icon sits at the right of the explanation alongside the first line

  # S10
  Scenario: A forced palette preserves the note's boundary and content
    Given a warning note in a forced-color palette
    When the page renders
    Then the note has a visible boundary, readable text and a visible icon in the forced palette

  # S11
  Scenario: A note stays still under reduced motion
    Given a warning note on a page with reduced motion
    When the page renders
    Then the text and icon are visible without transitions or animations

  # S12
  Scenario: Touch input keeps the note compact
    Given a small note on a page with a coarse pointer
    When the page renders
    Then the note keeps its small metrics and offers no pointer target
