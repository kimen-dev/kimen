Feature: Merge-friendly records and faster local checks
  Parallel changes can be combined while the quality workflow keeps its required evidence.

  # S1
  Scenario: Independent public changes combine at the highest release class
    Given a baseline and two independently declared public API changes
    When the combined candidate is checked
    Then both declared changes are accepted at the higher release class

  # S2
  Scenario: Missing or insufficient declarations block a public change
    Given a candidate with a public delta that has no adequate declaration
    When the candidate is checked
    Then the public API gate fails

  # S3
  Scenario: Generated surfaces match the merged sources
    Given merged sources and generated files selected from one parent
    When the generated surfaces are rebuilt
    Then their synchronization checks pass

  # S4
  Scenario: A themed assertion follows the resolved token
    Given a component whose visual token has a different value in its theme
    When its appearance is checked
    Then the expected style comes from the resolved token

  # S5
  Scenario: Worktrees can share a validated cache
    Given two local worktrees configured with the same secure cache root
    When their checks initialize the cache
    Then Nx, pnpm and Playwright use that shared root

  # S6
  Scenario: Non-Linux local checks report omitted visual specs
    Given a local non-Linux run without a visual override
    When the browser checks select their specs
    Then the run reports the number of visual specs excluded

  # S7
  Scenario: Affected checks select changed projects and their dependents
    Given a local project change and an unrelated project
    When the local affected checks run
    Then they check the changed project and its dependents
    And the run is identified as limited verification

  # S8
  Scenario: Missing cross-filesystem prerequisites are visible
    Given no designated temporary directory on another filesystem
    When the cross-filesystem check runs
    Then a local run reports a skip and names the missing prerequisite
    And a CI run fails
