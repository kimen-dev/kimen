Feature: Divider
  A divider draws a subtle rule that visually separates adjacent content —
  stacked sections or side-by-side groups — stays invisible to keyboard and
  assistive technology, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A divider separates stacked content with a horizontal rule
    Given a settings page whose "Profile" and "Notifications" sections are separated by a divider
    When the page renders
    Then a horizontal rule spans the available width between the two sections

  # S2
  Scenario: A vertical divider separates side-by-side content
    Given a toolbar whose "Edit" and "Share" action groups are separated by a divider with orientation "vertical"
    When the page renders
    Then a vertical rule spans the toolbar's height between the two groups

  # S3
  Scenario: Unknown attribute values fall back to the default appearance
    Given a divider declared with an unrecognized orientation copied from another design system
    When the page renders
    Then the divider renders as the default horizontal rule

  # Family: keyboard path
  # S4
  Scenario: The divider adds no keyboard stop
    Given a page whose only interactive elements are the buttons "Save" and "Cancel" separated by a divider
    When the user tabs through the page
    Then focus visits "Save" and then "Cancel", never the divider

  # Family: assistive-tech outcome
  # S5
  Scenario: The divider stays silent in the accessibility tree
    Given a settings page whose two sections are separated by a divider
    When the accessibility tree is queried
    Then the divider contributes no role, name or announcement between the sections

  # Family: form participation — N/A for ki-divider: a static, purely visual
  # separation rule never carries user input, contributes no value to form
  # data and is not form-associated (justified in spec.md's Scenario Family
  # Coverage table).

  # Family: theming
  # S6
  Scenario: A second theme restyles the divider through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the divider's thickness, color and spacing resolve from material3 token values

  # S7
  Scenario: The divider honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the divider's color resolves from the dark token values
