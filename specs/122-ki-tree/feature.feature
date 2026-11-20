Feature: Tree exposes an expandable hierarchy
  People browse nested files and categories, select entries, or follow links.

  # S1
  Scenario Outline: Pointer disclosure changes a branch
    Given the src branch is <initial> and contains ki-dialog.ts
    When the user clicks the src disclosure
    Then src becomes <result> and ki-dialog.ts is <visibility>
    And the tree reports a <event> event for src

    Examples:
      | initial  | result    | visibility | event       |
      | closed   | open      | visible    | ki-expand   |
      | open     | closed    | hidden     | ki-collapse |

  # S2
  Scenario: Single selection replaces the previous selection
    Given ki-dialog.ts is selected in the Files tree
    When the user selects README.md
    Then README.md is the only selected item
    And the tree reports README.md in a ki-selection-change event

  # S3
  Scenario Outline: Multiple selection summarizes enabled descendants
    Given src contains enabled items ki-dialog.ts and ki-button.ts
    And the branch starts <initial>
    When the user toggles <item>
    Then the branch is <result>
    And the tree reports <selected> as selected

    Examples:
      | initial   | item         | result  | selected                           |
      | unchecked | src          | checked | src, ki-dialog.ts and ki-button.ts |
      | checked   | ki-dialog.ts | mixed   | only ki-button.ts                  |

  # S4
  Scenario Outline: A lazy branch requests children once
    Given the empty lazy tokens branch is closed <history>
    When the user opens tokens
    Then a loading indicator appears under tokens
    And the tree reports <requests> new ki-load requests for tokens

    Examples:
      | history                   | requests |
      | for the first time        | one      |
      | with a request in progress | zero     |

  # S5
  Scenario Outline: Completing a lazy branch removes its loading status
    Given the open tokens branch is waiting for children
    When the host app <completion>
    Then the loading indicator disappears
    And tokens <result>

    Examples:
      | completion               | result                     |
      | adds semantic.json       | shows semantic.json        |
      | clears its lazy setting  | becomes an empty leaf      |

  # S6
  Scenario: A navigation tree follows a linked item
    Given the Files tree has selection disabled and README links to "#readme"
    When the user activates the README link
    Then the browser follows the "#readme" destination
    And the tree reports no selection change

  # S7
  Scenario: A disabled branch can be discovered without activation
    Given the disabled archive branch is focused and closed
    When the user presses Enter
    Then archive stays closed and unselected
    And the tree reports no expansion or selection event

  # S8
  Scenario: Tab enters a tree at its visible selected item
    Given the Files tree follows a focused control and ki-dialog.ts is its visible selected item
    When the user presses Tab
    Then ki-dialog.ts receives focus
    And the tree has one tab stop

  # S9
  Scenario Outline: Vertical navigation visits visible items without selecting
    Given Files shows the closed src branch, package.json and README.md in that order
    And focus is on <start>
    When the user presses <key>
    Then focus moves to <end>
    And selection is unchanged

    Examples:
      | start        | key       | end          |
      | src          | ArrowDown | package.json |
      | package.json | ArrowUp   | src          |
      | README.md    | Home      | src          |
      | src          | End       | README.md    |

  # S10
  Scenario Outline: Logical horizontal keys traverse a branch
    Given the Files tree reads <direction> and focus is on <start>
    When the user presses <key>
    Then <result>

    Examples:
      | direction     | start           | key        | result                            |
      | left to right | closed src      | ArrowRight | src opens and keeps focus         |
      | left to right | open src        | ArrowRight | ki-dialog.ts receives focus       |
      | left to right | open src        | ArrowLeft  | src closes and keeps focus        |
      | left to right | ki-dialog.ts    | ArrowLeft  | src receives focus                |
      | right to left | closed src      | ArrowLeft  | src opens and keeps focus         |
      | right to left | open src        | ArrowRight | src closes and keeps focus        |

  # S11
  Scenario: Type-ahead wraps across visible names
    Given Files shows package.json and the closed src branch before the focused README.md
    And src contains a hidden preview.ts
    When the user types "pa"
    Then focus moves to package.json

  # S12
  Scenario Outline: Activation keys select the focused item
    Given README.md is focused and unselected in the single-selection Files tree
    When the user presses <key>
    Then README.md is selected
    And the tree reports a selection change

    Examples:
      | key   |
      | Space |
      | Enter |

  # S13
  Scenario: Assistive technology can read the named hierarchy and its states
    Given Files contains open src with selected ki-dialog.ts and disabled archive
    When an assistive technology user inspects Files
    Then Files is named as a tree and src exposes an expanded level-one branch
    And ki-dialog.ts exposes a selected level-two leaf without an expandable state
    And archive is announced as disabled

  # S14
  Scenario: Assistive technology can distinguish partial selection
    Given the multiple-selection Files tree has one checked child under src
    And another child under src is unchecked
    When an assistive technology user inspects src
    Then Files exposes multiple selection
    And src is announced as partially checked

  # S15
  Scenario: The tree's accessible structure satisfies automated checks
    Given the Files tree contains selected, expanded, disabled and loading items
    When automated accessibility checks inspect Files
    Then no accessibility violations are reported

  # S16
  Scenario: Selection follows reassigned semantic colors
    Given the semantic colors for the selected surface and its text have been reassigned
    When the user selects README.md
    Then README.md is painted with the reassigned background and text colors

  # S17
  Scenario: System colors preserve focus and selection
    Given forced colors are active and README.md is selected
    When the user focuses README.md
    Then README.md has a visible focus indicator and a distinguishable selected state

  # S18
  Scenario: Reduced motion switches the disclosure without animation
    Given reduced motion is active and src is closed
    When the user opens src
    Then the disclosure changes direction without a transition

  # S19
  Scenario: Coarse pointers receive touch-sized rows
    Given the Files tree is on a coarse-pointer device
    When the tree renders
    Then its rows are at least 44 CSS pixels tall
